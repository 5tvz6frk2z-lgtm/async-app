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
    jsonLdValid: rep.signals?.jsonLd?.valid ?? 0,
    likelyShell: rep.signals?.contentDensity?.likelyShell ? 1 : 0,
    llmsTxt: rep.llms?.valid ? 1 : 0,
  };
}

// Detector rules — each fires only on a worsening CHANGE between two checks.
export const AGENT_READY_RULES = [
  (p, c) => {
    const drop = (p.score ?? 0) - (c.score ?? 0);
    if (drop >= 15) return { signal: 'score', severity: 'critical', from: p.score, to: c.score, message: `Agent-Ready score fell ${drop} points (${p.score}→${c.score})` };
    if (drop >= 5) return { signal: 'score', severity: 'warning', from: p.score, to: c.score, message: `Agent-Ready score fell ${drop} points (${p.score}→${c.score})` };
    return null;
  },
  (p, c) => (c.blockedCrawlers > p.blockedCrawlers
    ? { signal: 'crawler-access', severity: 'critical', from: p.blockedCrawlers, to: c.blockedCrawlers, message: `${c.blockedCrawlers - p.blockedCrawlers} more AI crawler(s) now blocked in robots.txt (${p.blockedCrawlers}→${c.blockedCrawlers})` }
    : null),
  (p, c) => (p.jsonLdValid > 0 && c.jsonLdValid === 0
    ? { signal: 'structured-data', severity: 'warning', from: p.jsonLdValid, to: 0, message: 'All JSON-LD structured data disappeared' }
    : null),
  (p, c) => (p.likelyShell === 0 && c.likelyShell === 1
    ? { signal: 'content-density', severity: 'warning', from: 'content', to: 'shell', message: 'Page now reads as a JS shell — agents may not see the content' }
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
