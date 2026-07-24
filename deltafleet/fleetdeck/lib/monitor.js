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
import { fetchSite, analyze, AI_AGENT_ROLES } from './agentready.js';

const SEVERITY_RANK = { none: 0, info: 1, warning: 2, critical: 3 };

// Detector helpers: numeric coercion (so a stringy "10" never lexicographically
// out-sorts "2") and a string-normalized set (so [1,2] and ['1','2'] compare equal).
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const strSet = (a) => new Set((Array.isArray(a) ? a : []).map(String));

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
    // The SETS of blocked bots (not just counts) so a same-count SWAP — one bot unblocked
    // as a different one is blocked — still trips the alert. Counts kept for fallback.
    blockedList: Object.entries(rep.robots?.agents || {}).filter(([, a]) => a.blocked).map(([name]) => name).sort(),
    blockedRetrievalList: Object.entries(rep.robots?.agents || {}).filter(([, a]) => a.blocked && a.role === 'retrieval').map(([name]) => name).sort(),
    jsonLdValid: rep.signals?.jsonLd?.valid ?? 0,
    likelyShell: rep.signals?.contentDensity?.likelyShell ? 1 : 0,
    llmsTxt: rep.llms?.valid ? 1 : 0,
    // Non-indexable for ALL agents, by X-Robots-Tag header OR in-HTML meta-robots
    // (fall back to the header flag if an older report predates the unified `noindexed`).
    noindex: (rep.noindexed ?? rep.headers?.blocks) ? 1 : 0,
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
  // Set comparison (string-normalized) when both checks carry the list — catches a same-count
  // swap; numeric-coerced count fallback for legacy/injected metrics that predate the list.
  (p, c) => {
    // Each side's retrieval-blocked count from the best signal it carries, in priority order:
    // the retrieval list length (authoritative) > the explicit numeric count > the count of
    // RETRIEVAL-role bots named in blockedList (so a legacy prev that recorded a retrieval bot
    // only in blockedList is credited, symmetric with the identity branch's union baseline —
    // else a no-change looked like a 0→N block) > 0 (truly absent metric).
    const retCount = (m) => Array.isArray(m.blockedRetrievalList) ? m.blockedRetrievalList.length
      : m.blockedRetrieval != null ? Number(m.blockedRetrieval)
      : Array.isArray(m.blockedList) ? m.blockedList.filter((n) => AI_AGENT_ROLES[n] === 'retrieval').length
      // No retrieval-specific signal at all. If the legacy metric still recorded SOME blocking
      // (blockedCrawlers > 0) we cannot know how many were retrieval bots — return UNKNOWN (NaN)
      // so a steady state doesn't read as a 0→N block. Only a truly blank prev (nothing blocked/
      // recorded) is a real 0 baseline, so a genuine first-seen block from nothing still fires.
      : (Number(m.blockedCrawlers) > 0 ? NaN : 0);
    // IDENTITY comparison — only when we can NAME the blocked bots on BOTH sides: cur carries
    // the retrieval list AND prev carries some identity (its blockedList and/or retrieval
    // list). Subtracting identities lets a role re-tag on an already-blocked bot, or a
    // reclassification, stay silent. A count-only prev has NO identities to subtract, so
    // identity subtraction there would wrongly read every already-blocked bot as new — that
    // case must fall through to the count comparison, NOT default prev to an empty set.
    const prevHasIdentity = Array.isArray(p.blockedList) || Array.isArray(p.blockedRetrievalList);
    if (Array.isArray(c.blockedRetrievalList) && prevHasIdentity) {
      // Baseline = every bot blocked last check, by EITHER list (union), so an inconsistent
      // hand-fed metric where blockedRetrievalList ⊄ blockedList can't look like a new block.
      const wasBlocked = strSet([...(p.blockedList || []), ...(p.blockedRetrievalList || [])]);
      const newly = c.blockedRetrievalList.map(String).filter((n) => !wasBlocked.has(n));
      return newly.length
        ? { signal: 'retrieval-access', severity: 'critical', from: p.blockedRetrievalList, to: c.blockedRetrievalList, message: `Answer-engine RETRIEVAL bot(s) newly blocked: ${newly.join(', ')} — kills AI-search citations` }
        : null;
    }
    // COUNT comparison (a side lacks identity, e.g. a legacy count-only prev). A truly
    // absent metric (no list, no count) is a 0 baseline so a first-seen block still fires;
    // a PRESENT but non-numeric count ('two') stays uncomparable (never coerced to 0, which
    // would misread an improvement or fabricate a block).
    const pr = retCount(p), cr = retCount(c);
    if (!Number.isFinite(pr) || !Number.isFinite(cr)) return null;
    return cr > pr
      ? { signal: 'retrieval-access', severity: 'critical', from: p.blockedRetrieval, to: c.blockedRetrieval, message: `${cr - pr} more answer-engine RETRIEVAL bot(s) now blocked — kills AI-search citations` }
      : null;
  },
  // Any OTHER newly-blocked crawler (training/user) is a warning. Set-diff on the full
  // blocked list (minus the retrieval bots the rule above owns) catches a same-count SWAP
  // — a training bot that could read the page yesterday is blocked today. Count fallback
  // requires the TOTAL to rise, so a flat total never fabricates a bogus "N more blocked".
  (p, c) => {
    // Retrieval bots the rule above owns — derived from the list if present, else by role from
    // blockedList (symmetric with retrieval-access's retCount; without this a retrieval bot
    // named only in c.blockedList leaks through and is mislabeled a generic crawler).
    const retrievalNames = (m) => Array.isArray(m.blockedRetrievalList) ? m.blockedRetrievalList
      : Array.isArray(m.blockedList) ? m.blockedList.filter((n) => AI_AGENT_ROLES[n] === 'retrieval') : [];
    if (Array.isArray(p.blockedList) && Array.isArray(c.blockedList)) {
      // Union both lists (as the retrieval rule does) so a bot blocked-as-retrieval last
      // check and merely reclassified non-retrieval this check (still blocked, no access
      // change) isn't misread as a newly-blocked crawler.
      const wasAll = strSet([...p.blockedList, ...(p.blockedRetrievalList || [])]);
      const retrievalNow = strSet(retrievalNames(c));
      const newlyOther = c.blockedList.map(String).filter((n) => !wasAll.has(n) && !retrievalNow.has(n));
      return newlyOther.length
        ? { signal: 'crawler-access', severity: 'warning', from: p.blockedList, to: c.blockedList, message: `${newlyOther.length} more AI crawler(s) now blocked in robots.txt: ${newlyOther.join(', ')}` }
        : null;
    }
    if (typeof p.blockedCrawlers !== 'number' || typeof c.blockedCrawlers !== 'number') return null;
    if (c.blockedCrawlers <= p.blockedCrawlers) return null;
    // "Newly blocked NON-retrieval crawlers" = (cur non-retrieval) − (prev non-retrieval),
    // where non-retrieval = blockedCrawlers − retrieval. When a side's retrieval count is
    // UNKNOWN (null), bound conservatively so we never over-count the crawler delta: assume the
    // unknown side is ALL retrieval on cur (min cur non-retrieval) and NONE on prev (max prev
    // non-retrieval). Fire only if even that lower bound is positive — so a change that is purely
    // a retrieval block (owned by the rule above) never also cries a bogus crawler warning.
    const retNum = (m) => m.blockedRetrieval == null ? NaN : Number(m.blockedRetrieval);
    const cRet = Number.isFinite(retNum(c)) ? retNum(c) : c.blockedCrawlers;
    const pRet = Number.isFinite(retNum(p)) ? retNum(p) : 0;
    const newOther = (c.blockedCrawlers - cRet) - (p.blockedCrawlers - pRet);
    return newOther > 0
      ? { signal: 'crawler-access', severity: 'warning', from: p.blockedCrawlers, to: c.blockedCrawlers, message: `${newOther} more AI crawler(s) now blocked in robots.txt (${p.blockedCrawlers}→${c.blockedCrawlers})` }
      : null;
  },
  // The page went non-indexable (X-Robots-Tag: noindex) — kills indexing/citations for
  // ALL agents, strictly worse than blocking one crawler, and NOT reliably reflected in
  // the net score (same-cycle markup gains can mask it), so it needs its own rule.
  (p, c) => (c.noindex === 1 && p.noindex !== 1
    ? { signal: 'noindex', severity: 'critical', from: 0, to: 1, message: 'Page is now marked noindex (X-Robots-Tag) — non-indexable and uncitable by every AI agent' }
    : null),
  // A page turning into a JS shell is impact rank #2 (agents don't run JS) — critical.
  // Negated guard (c===1 && p!==1) so a check predating the likelyShell metric (p
  // undefined) still fires, matching the noindex rule above.
  (p, c) => (c.likelyShell === 1 && p.likelyShell !== 1
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
  // WATCH FOR A CONTROL LEAVING 'satisfied': the regression signal is simply that
  // SATISFIED dropped (a control left the clean tier) WITHOUT gap rising (that case is
  // the gap rule's, and firing both would double-report). This catches the case rules 1
  // & 2 are blind to — e.g. a tool-poisoning drift pushing supply-chain satisfied →
  // attention while overall-rank and gap stay flat. A gap → attention IMPROVEMENT keeps
  // satisfied flat, so it never trips this. (Do NOT also require attention to rise: an
  // offsetting attention-control retirement in the same cycle keeps attention flat and
  // would silence a real regression — the bug this rule was re-verified to close.)
  (p, c) => (typeof c.satisfied === 'number' && typeof p.satisfied === 'number' && typeof c.gap === 'number' && typeof p.gap === 'number'
    && c.satisfied < p.satisfied && c.gap <= p.gap
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
