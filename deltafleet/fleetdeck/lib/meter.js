// Meter — token/cost FinOps rollups and budget alarms, as a pure view over the
// spine. It reads every event that carries usage (tokensIn / tokensOut / costUsd)
// — Tollgate.record() writes those on each tool.result — and maintains rollups
// by agent, by model, by day, and in total. Cost is taken verbatim when an event
// already carries `costUsd`, otherwise derived from tokens × a price table.
//
// Meter is a READ-MODEL: it never writes to the spine (a view must not mutate the
// timeline it observes). Budget "alarms" are computed states returned by report();
// a daemon or CLI is free to turn an `exceeded` status into a spine event.
import { Spine } from './spine.js';

const empty = () => ({ tokensIn: 0, tokensOut: 0, costUsd: 0, calls: 0 });
const day = (ts) => String(ts).slice(0, 10); // YYYY-MM-DD bucket from the ISO stamp
const usageBearing = (e) => e.tokensIn != null || e.tokensOut != null || e.costUsd != null;

/** Cost of one event: its own costUsd if present, else tokens × pricing[model].
 *  pricing is USD per 1e6 tokens: { 'claude-fable-5': { in: 3, out: 15 } }. */
// Sanitize an untrusted usage number: coerce (so a provider's stringified "10" counts), then
// reject anything not a FINITE, NON-NEGATIVE value. A NaN/±Infinity would poison the total (and
// every budget comparison against NaN is false — silently disabling alarms); a NEGATIVE would
// drive the total down and silence an exceeded alarm; a string would be dropped to 0 or, for
// tokens, string-concatenated into garbage. `null`/`undefined`/`absent` returns NaN so the
// caller can distinguish "no value" (fall back to token pricing) from "zero".
const money = (v) => { const n = Number(v); return v != null && Number.isFinite(n) && n >= 0 ? n : NaN; };
const tokens = (v) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : 0; };

export function costOf(e, pricing = {}) {
  const c = money(e.costUsd);
  if (Number.isFinite(c)) return c; // a valid (incl. numeric-string) non-negative cost wins
  const p = pricing[e.model];
  if (!p) return 0;
  return (tokens(e.tokensIn) / 1e6) * (p.in || 0) + (tokens(e.tokensOut) / 1e6) * (p.out || 0);
}

const SCOPES = new Set(['total', 'agent', 'model']);
const WINDOWS = new Set(['total', 'day']);

/** Validate a budget list; returns problem strings (empty = valid). */
export function validateBudgets(budgets = []) {
  const errs = [];
  if (!Array.isArray(budgets)) return ['budgets must be an array'];
  budgets.forEach((b, i) => {
    const at = `budget[${i}]${b && b.id ? ` (${b.id})` : ''}`;
    if (!b || typeof b !== 'object') { errs.push(`${at} must be an object`); return; }
    if (!SCOPES.has(b.scope)) errs.push(`${at}.scope must be one of ${[...SCOPES].join(', ')}`);
    if (!WINDOWS.has(b.window)) errs.push(`${at}.window must be one of ${[...WINDOWS].join(', ')}`);
    if (typeof b.limitUsd !== 'number' || b.limitUsd <= 0) errs.push(`${at}.limitUsd must be a positive number`);
    if ((b.scope === 'agent' || b.scope === 'model') && !b.key) errs.push(`${at}.key is required for scope "${b.scope}"`);
    if (b.window === 'day' && b.scope !== 'total') errs.push(`${at}: window "day" is only supported for scope "total"`);
    if (b.warnAt !== undefined && (b.warnAt <= 0 || b.warnAt >= 1)) errs.push(`${at}.warnAt must be between 0 and 1`);
  });
  return errs;
}

export class Meter {
  /** @param {object} opts { spine, pricing?, budgets? } */
  constructor({ spine, pricing = {}, budgets = [] }) {
    const errs = validateBudgets(budgets);
    if (errs.length) throw new Error('invalid budgets:\n  ' + errs.join('\n  '));
    this.spine = spine;
    this.pricing = pricing;
    this.budgets = budgets;
    const price = (e) => costOf(e, this.pricing);
    this.rollup = spine.project('meter', {
      init: () => ({ total: empty(), byAgent: {}, byModel: {}, byDay: {}, latestDay: null }),
      apply: (st, e) => {
        if (!usageBearing(e)) return;
        const cost = price(e);
        const agent = e.agent || 'unknown';
        const model = e.model || 'unknown';
        const d = day(e.ts);
        const tIn = tokens(e.tokensIn), tOut = tokens(e.tokensOut); // coerce/clamp: a string token would string-concatenate the accumulator
        for (const bucket of [st.total, at(st.byAgent, agent), at(st.byModel, model), at(st.byDay, d)]) {
          bucket.tokensIn += tIn;
          bucket.tokensOut += tOut;
          bucket.costUsd += cost;
          bucket.calls += 1;
        }
        if (!st.latestDay || d > st.latestDay) st.latestDay = d;
      },
    });
  }

  /** Current rollups plus per-budget status. `day` overrides which day a
   *  day-window budget is measured against (defaults to the latest seen). */
  report({ day: onDay } = {}) {
    const r = this.rollup;
    const budgets = this.budgets.map((b) => this.#status(b, onDay));
    const total = round(r.total); // total.costUsd = round2(raw grand total)
    // EVERY partition (by agent/model/day) must sum to the grand total. Independent 6-decimal
    // rounding breaks that at sub-micro-dollar magnitudes (0.0000005 rounds UP to 0.000001 in
    // its own single-event bucket, so N parts sum to more than the once-rounded total). Round
    // each bucket, then apply the residual (rounded total − Σ rounded parts) to the largest
    // bucket — the largest-remainder method — so Σ parts === total exactly for each partition.
    return {
      total,
      byAgent: reconcileRound(r.byAgent, total.costUsd),
      byModel: reconcileRound(r.byModel, total.costUsd),
      byDay: reconcileRound(r.byDay, total.costUsd),
      latestDay: r.latestDay,
      budgets,
      alarms: budgets.filter((b) => b.state !== 'ok'),
    };
  }

  #status(b, onDay) {
    const r = this.rollup;
    let spend = 0;
    if (b.window === 'day') {
      const d = onDay || r.latestDay;
      spend = (r.byDay[d] || empty()).costUsd;
    } else if (b.scope === 'total') spend = r.total.costUsd;
    else if (b.scope === 'agent') spend = (r.byAgent[b.key] || empty()).costUsd;
    else if (b.scope === 'model') spend = (r.byModel[b.key] || empty()).costUsd;

    // Compare the ROUNDED spend against the limit: `bucket.costUsd += cost` accumulates float
    // drift, so a spend that exactly equals the limit can land at 9.999999… and miss `>= limit`,
    // silently skipping the 'exceeded' alarm at the boundary. round2 snaps it to the real value.
    spend = round2(spend);
    const warnAt = b.warnAt ?? 0.8;
    const pct = b.limitUsd ? spend / b.limitUsd : 0;
    const state = spend >= b.limitUsd ? 'exceeded' : pct >= warnAt ? 'warning' : 'ok';
    return {
      id: b.id, scope: b.scope, key: b.key || null, window: b.window,
      limitUsd: b.limitUsd, spendUsd: round2(spend), pct: round2(pct), state,
    };
  }
}

// Build a rollup from a plain event list without a live spine (one-shot analysis).
export function meterEvents(events, { pricing = {}, budgets = [] } = {}) {
  const spine = new Spine(null);
  const m = new Meter({ spine, pricing, budgets });
  for (const e of events) spine.append(e.kind || 'usage', e);
  return m.report();
}

function at(map, key) { return (map[key] ||= empty()); }
function round(b) { return { ...b, costUsd: round2(b.costUsd) }; }
function mapRound(m) { const o = {}; for (const k of Object.keys(m)) o[k] = round(m[k]); return o; }
function round2(n) { return Math.round(n * 1e6) / 1e6; } // sub-cent precision, no float drift in display

// Round a partition's buckets, then nudge the largest-cost bucket by the residual so the parts
// sum EXACTLY to `totalCost` (largest-remainder). A no-op for realistic costs (residual 0); it
// only matters below the 1e-6 rounding granularity, where independent rounding would drift.
function reconcileRound(m, totalCost) {
  const out = mapRound(m);
  const keys = Object.keys(out);
  if (!keys.length) return out;
  const residual = round2(totalCost - keys.reduce((s, k) => s + out[k].costUsd, 0));
  if (residual !== 0) {
    let big = keys[0];
    for (const k of keys) if (out[k].costUsd > out[big].costUsd) big = k;
    out[big] = { ...out[big], costUsd: round2(out[big].costUsd + residual) };
  }
  return out;
}
