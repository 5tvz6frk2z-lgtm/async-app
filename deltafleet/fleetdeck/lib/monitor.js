// Monitor — the recurring-check engine that turns a one-shot checker into a
// subscription. A "check" is a snapshot of some target's health (a URL's
// agent-legibility, the fleet's compliance posture) recorded as a spine event; the
// engine compares each new check to the previous one for the same target and, per a
// monitor's detector rules, emits regression alerts. A cron (the customer's, or a
// Fleet Deck Routine) fires `record()` on a schedule; the value is "we watched it
// and told you the moment it slipped."
//
// Product-agnostic: a monitor is `define(name, { rules })` where each rule is a
// pure detector `(prevMetrics, curMetrics) => alert|null`. Only alert on CHANGE
// (a rule sees prev and cur), so a steady-state check is silent — no alert fatigue.
//
// Events:
//   monitor.check  { monitor, target, summary, metrics }
//   monitor.alert  { monitor, target, signal, severity, from, to, message }
import { fetchSite, analyze } from './agentready.js';

const SEVERITY_RANK = { none: 0, info: 1, warning: 2, critical: 3 };

export class Monitor {
  constructor({ spine }) {
    this.spine = spine;
    this.defs = new Map(); // name -> { rules }
  }

  /** Register a monitor with its detector rules. Returns this for chaining. */
  define(name, { rules = [] } = {}) {
    this.defs.set(name, { rules });
    return this;
  }

  /**
   * Record a check result for (monitor, target) and auto-detect regressions vs the
   * previous check. `result` is { summary, metrics }. Returns { check, alerts }.
   */
  record(monitor, target, result) {
    const def = this.defs.get(monitor);
    if (!def) throw new Error(`unknown monitor "${monitor}" — define() it first`);
    const metrics = result.metrics || {};
    const prev = this.latest(monitor, target);
    const check = this.spine.append('monitor.check', { monitor, target, summary: result.summary || '', metrics });
    const alerts = [];
    if (prev) {
      for (const rule of def.rules) {
        let hit;
        try { hit = rule(prev.metrics || {}, metrics); } catch { hit = null; } // a detector must never break a check
        if (hit) {
          const ev = this.spine.append('monitor.alert', {
            monitor, target, signal: hit.signal, severity: hit.severity || 'warning',
            from: hit.from, to: hit.to, message: hit.message,
          });
          alerts.push({ ...hit, id: ev.id });
        }
      }
    }
    return { check, alerts, firstCheck: !prev };
  }

  #checks(monitor, target) {
    return this.spine.query({ kind: 'monitor.check' })
      .filter((e) => e.monitor === monitor && (target === undefined || e.target === target));
  }

  /** The most recent check for (monitor, target), or null. */
  latest(monitor, target) {
    const all = this.#checks(monitor, target);
    return all.length ? all[all.length - 1] : null;
  }

  /** All checks for (monitor, target), oldest first. */
  history(monitor, target) { return this.#checks(monitor, target); }

  /** A time series of one metric: [{ at, value }] oldest first. */
  trend(monitor, target, metric) {
    return this.#checks(monitor, target).map((e) => ({ at: e.ts, value: e.metrics?.[metric] }));
  }

  /** Open alerts, newest first, optionally scoped to a monitor/target. */
  alerts(monitor, target) {
    return this.spine.query({ kind: 'monitor.alert', reverse: true })
      .filter((e) => (monitor === undefined || e.monitor === monitor) && (target === undefined || e.target === target));
  }

  /** Worst alert severity seen for a target since a given check count (for a status badge). */
  worstSeverity(monitor, target) {
    const a = this.alerts(monitor, target);
    return a.reduce((s, e) => (SEVERITY_RANK[e.severity] > SEVERITY_RANK[s] ? e.severity : s), 'none');
  }
}

// ── Agent-Ready Monitor product ───────────────────────────────────────────────
// Watches a URL's legibility to AI agents. Metrics are a pure function of an
// analyze() report so tests need no network; the probe adds the fetch.

export function agentReadyMetrics(rep) {
  const blocked = Object.values(rep.robots?.agents || {}).filter((a) => a.blocked).length;
  const gradeNum = { A: 5, B: 4, C: 3, D: 2, F: 1 }[rep.grade] ?? 0;
  return {
    score: rep.score,
    grade: rep.grade,
    gradeNum,
    blockedCrawlers: blocked,
    blockedRetrieval: rep.robots?.blockedRetrieval ?? 0, // answer-engine bots — the citation-killer
    // The SET of blocked retrieval bots, not just the count — so a swap (one unblocked
    // as another is blocked, count flat) still trips the alert. Count is kept for fallback.
    blockedRetrievalList: Object.entries(rep.robots?.agents || {}).filter(([, a]) => a.blocked && a.role === 'retrieval').map(([name]) => name).sort(),
    jsonLdValid: rep.signals?.jsonLd?.valid ?? 0,
    likelyShell: rep.signals?.contentDensity?.likelyShell ? 1 : 0,
    llmsTxt: rep.llms?.valid ? 1 : 0,
  };
}

// Detector rules — each fires only on a worsening CHANGE between two checks.
export const AGENT_READY_RULES = [
  // A missing score must NOT read as 0 (that would fabricate an 80→undefined "critical").
  (p, c) => {
    if (typeof p.score !== 'number' || typeof c.score !== 'number') return null;
    const drop = p.score - c.score;
    if (drop >= 15) return { signal: 'score', severity: 'critical', from: p.score, to: c.score, message: `Agent-Ready score fell ${drop} points (${p.score}→${c.score})` };
    if (drop >= 5) return { signal: 'score', severity: 'warning', from: p.score, to: c.score, message: `Agent-Ready score fell ${drop} points (${p.score}→${c.score})` };
    return null;
  },
  // A newly-blocked ANSWER-ENGINE retrieval bot is the citation-killer (impact rank #1) — critical.
  // Set comparison when both checks carry the list (catches a same-count swap); count fallback otherwise.
  (p, c) => {
    if (Array.isArray(p.blockedRetrievalList) && Array.isArray(c.blockedRetrievalList)) {
      const was = new Set(p.blockedRetrievalList);
      const newly = c.blockedRetrievalList.filter((n) => !was.has(n));
      return newly.length
        ? { signal: 'retrieval-access', severity: 'critical', from: p.blockedRetrievalList, to: c.blockedRetrievalList, message: `Answer-engine RETRIEVAL bot(s) newly blocked: ${newly.join(', ')} — kills AI-search citations` }
        : null;
    }
    return (c.blockedRetrieval ?? 0) > (p.blockedRetrieval ?? 0)
      ? { signal: 'retrieval-access', severity: 'critical', from: p.blockedRetrieval, to: c.blockedRetrieval, message: `${(c.blockedRetrieval ?? 0) - (p.blockedRetrieval ?? 0)} more answer-engine RETRIEVAL bot(s) now blocked — kills AI-search citations` }
      : null;
  },
  // Any other newly-blocked crawler (training/user) is a warning. Requires the TOTAL
  // blocked count to actually rise, so a metric going missing or a retrieval/other
  // reclassification at flat total (e.g. "2→2") never fabricates a bogus "N more blocked".
  (p, c) => {
    if (typeof p.blockedCrawlers !== 'number' || typeof c.blockedCrawlers !== 'number') return null;
    if (c.blockedCrawlers <= p.blockedCrawlers) return null;
    const newOther = (c.blockedCrawlers - (c.blockedRetrieval ?? 0)) - (p.blockedCrawlers - (p.blockedRetrieval ?? 0));
    return newOther > 0
      ? { signal: 'crawler-access', severity: 'warning', from: p.blockedCrawlers, to: c.blockedCrawlers, message: `${newOther} more AI crawler(s) now blocked in robots.txt (${p.blockedCrawlers}→${c.blockedCrawlers})` }
      : null;
  },
  // A page turning into a JS shell is impact rank #2 (agents don't run JS) — critical.
  (p, c) => (p.likelyShell === 0 && c.likelyShell === 1
    ? { signal: 'content-density', severity: 'critical', from: 'content', to: 'shell', message: 'Page now reads as a JS shell — AI crawlers do not run JS and may see nothing' }
    : null),
  (p, c) => (p.jsonLdValid > 0 && c.jsonLdValid === 0
    ? { signal: 'structured-data', severity: 'warning', from: p.jsonLdValid, to: 0, message: 'All JSON-LD structured data disappeared' }
    : null),
  (p, c) => (p.llmsTxt === 1 && c.llmsTxt === 0
    ? { signal: 'llms-txt', severity: 'info', from: 1, to: 0, message: '/llms.txt is no longer present or valid' }
    : null),
];

/** Live probe for the Agent-Ready monitor (fetch + analyze). */
export async function agentReadyProbe(url, opts = {}) {
  const rep = analyze(await fetchSite(url, opts));
  return { summary: `${rep.score}/100 (grade ${rep.grade})`, metrics: agentReadyMetrics(rep), report: rep };
}

// ── AI Register Monitor product ───────────────────────────────────────────────
// Watches the fleet's compliance posture over time; alerts when a control slips.

export function registerMetrics(reg) {
  const OVERALL = { satisfied: 0, attention: 1, gap: 2 };
  return {
    overall: reg.overall,
    overallRank: OVERALL[reg.overall] ?? 0,
    satisfied: reg.summary.satisfied,
    attention: reg.summary.attention,
    gap: reg.summary.gap,
  };
}

export const AI_REGISTER_RULES = [
  (p, c) => (c.overallRank > p.overallRank
    ? { signal: 'overall', severity: c.overall === 'gap' ? 'critical' : 'warning', from: p.overall, to: c.overall, message: `Compliance posture worsened: ${p.overall} → ${c.overall}` }
    : null),
  (p, c) => (c.gap > p.gap
    ? { signal: 'gap-count', severity: 'critical', from: p.gap, to: c.gap, message: `${c.gap - p.gap} more control(s) now failing (gap ${p.gap}→${c.gap})` }
    : null),
  // WATCH FOR A CONTROL LEAVING 'satisfied': when overall is already 'attention' and a
  // second control degrades from satisfied → attention (gap and overall-rank unchanged),
  // the two rules above are blind — e.g. a critical tool-poisoning drift pushing
  // supply-chain to attention. The regression signal is that SATISFIED dropped (a control
  // left the clean tier); attention merely rising can also be an improvement (gap →
  // attention), which must stay silent.
  (p, c) => (typeof c.satisfied === 'number' && typeof p.satisfied === 'number' && c.satisfied < p.satisfied && c.attention > p.attention
    ? { signal: 'attention-count', severity: 'warning', from: p.satisfied, to: c.satisfied, message: `${p.satisfied - c.satisfied} control(s) left 'satisfied' for 'attention' (satisfied ${p.satisfied}→${c.satisfied})` }
    : null),
];

/** Probe for the AI Register monitor: snapshot a Deck's register. */
export function registerProbe(register) {
  const reg = register.register();
  return { summary: `${reg.overall} (${reg.summary.gap} gap, ${reg.summary.attention} attention)`, metrics: registerMetrics(reg), report: reg };
}

/** Convenience: a Monitor with both products' rules pre-defined. */
export function standardMonitor(spine) {
  return new Monitor({ spine })
    .define('agent-ready', { rules: AGENT_READY_RULES })
    .define('ai-register', { rules: AI_REGISTER_RULES });
}
