// The Curator — self-improving agent instructions, MEASURED (FRONTIER-PLAN Bet 4).
//
// The memory flywheel already captures every human correction. The Curator turns
// that passive context into an active improvement to an agent's own standing
// instructions — but only when it can PROVE the change helps. The loop:
//
//   1. curate()   — one inference distills an agent's correction history into a
//                   proposed instruction overlay (concise standing rules).
//   2. abTest()   — run the Shadow Eval Harness (Bet 2) TWICE on the same
//                   scenarios: current instructions vs current + overlay. Score
//                   both. This is the whole safety story — no proposal lands
//                   without a measured A/B on held-out scenarios.
//   3. evaluate() — accept only on measurable lift AND no new silent failure.
//   4. propose()  — ledger it; a human accepts/rejects; accepted overlays are
//                   versioned, injected into future runs, and reversible.
//
// Naive "curator" prompt-rewriting shows ~+10% gains but risks silent drift and
// regressions. Gating it behind a measured A/B on the eval harness is the novel,
// safe version — compounding per-client quality a static-prompt competitor
// can't match, with a hard rule: a change that makes anything ship silently
// wrong is rejected no matter how much accuracy it adds.
import { newId } from './ledger.js';
import { shadowEval } from './shadow.js';

export const CURATE_MIN_LIFT = 0.05; // a change must earn its keep: ≥5 points of accuracy

export function curatorSystem() {
  return [
    'You improve an AI agent\'s STANDING INSTRUCTIONS from its correction history.',
    'You are given the agent\'s role and a list of corrections — times a human edited or rejected its output.',
    'Write a concise instruction overlay (a few imperative standing rules) that would prevent these corrections in future, stated generally so it applies beyond the specific cases.',
    'Do not restate the agent\'s existing role. Do not invent rules the corrections do not support. Output only the overlay text — no preamble, no markdown fences.',
  ].join('\n');
}

/** One inference: corrections → a proposed instruction overlay (plain text). */
export async function curate({ adapter, agent, corrections = [], model, signal }) {
  const user = [
    `Agent: ${agent.callsign ? agent.callsign + ' — ' : ''}${agent.name} (${agent.role})`,
    '',
    'Correction history:',
    ...corrections.map((c, i) => `${i + 1}. ${typeof c === 'string' ? c : c.text}`),
    '',
    'Write the instruction overlay.',
  ].join('\n');
  const res = await adapter.complete({ model: model || agent.model, system: curatorSystem(), messages: [{ role: 'user', content: user }], tools: [], signal });
  return (res.text || '').trim();
}

/** A/B the overlay on the eval harness: score the corridor with the current
 *  context vs current + overlay, on the same scenarios. Everything else equal. */
export async function abTest({ bp, scenarios, overlay, baseContext = [], ...opts }) {
  const before = (await shadowEval(bp, scenarios, { ...opts, context: baseContext })).report;
  const after = (await shadowEval(bp, scenarios, { ...opts, context: [...baseContext, overlay] })).report;
  return { before, after, delta: after.accuracy - before.accuracy };
}

/** Accept only on measured lift AND no new silent-wrong output. The safety gate
 *  is absolute: a candidate that introduces an unguarded failure (or turns the
 *  corridor "unsafe") is rejected regardless of accuracy gain. */
export function evaluate({ before, after, minLift = CURATE_MIN_LIFT }) {
  const delta = after.accuracy - before.accuracy;
  const newUnguarded = (after.gateSafetyNet?.unguarded ?? 0) > (before.gateSafetyNet?.unguarded ?? 0);
  const unsafe = after.verdict === 'unsafe';
  let accept = false, reason;
  if (newUnguarded) reason = 'rejected: the candidate introduces a failure no gate would catch';
  else if (unsafe) reason = 'rejected: the candidate corridor is unsafe';
  else if (delta < minLift) reason = `rejected: +${(delta * 100).toFixed(0)}% lift is below the ${(minLift * 100).toFixed(0)}% bar`;
  else { accept = true; reason = `accepted: +${(delta * 100).toFixed(0)}% accuracy, no new silent failures`; }
  return { accept, delta, reason };
}

/** One call: distill → A/B → evaluate. `curatorAdapter` distills the overlay;
 *  the harness opts (including its own `adapter`) drive the eval — they are two
 *  different model roles and must not be conflated. */
export async function runCuration({ curatorAdapter, bp, agent, corrections, scenarios, baseContext = [], ...harness }) {
  const overlay = await curate({ adapter: curatorAdapter, agent, corrections, signal: harness.signal });
  if (!overlay) return { overlay: '', skipped: 'curator produced no overlay' };
  const ab = await abTest({ bp, scenarios, overlay, baseContext, ...harness });
  const verdict = evaluate(ab);
  return { overlay, ...ab, verdict };
}

/** Ledger-backed store of instruction proposals — versioned and reversible,
 *  exactly like a gate change or a memory. State is derived by replay. */
export class Curator {
  constructor(ledger) {
    this.ledger = ledger;
    this.props = new Map(); // instr id -> record
    for (const e of ledger.events) this.#apply(e);
    ledger.onEvent((e) => this.#apply(e));
  }

  #apply(e) {
    if (e.type === 'instruction.proposed') {
      this.props.set(e.instr, { id: e.instr, blueprint: e.blueprint, agent: e.agent, overlay: e.overlay, corrections: e.corrections || [], before: e.before, after: e.after, delta: e.delta, recommend: e.recommend, reason: e.reason, status: 'proposed', version: null, created: e.t });
    } else if (e.type === 'instruction.accepted') {
      const p = this.props.get(e.instr);
      if (p && p.status === 'proposed') { p.status = 'accepted'; p.acceptedBy = e.by; p.version = this.#nextVersion(p.blueprint, p.agent); }
    } else if (e.type === 'instruction.rejected') {
      const p = this.props.get(e.instr);
      if (p && p.status === 'proposed') { p.status = 'rejected'; p.rejectedBy = e.by; p.rejectReason = e.reason; }
    } else if (e.type === 'instruction.reverted') {
      const p = this.props.get(e.instr);
      if (p && p.status === 'accepted') { p.status = 'reverted'; p.revertedBy = e.by; }
    }
  }

  #nextVersion(blueprint, agent) {
    let n = 0;
    for (const p of this.props.values()) if (p.blueprint === blueprint && p.agent === agent && (p.status === 'accepted' || p.status === 'reverted')) n++;
    return n; // this one has just been counted via status change, so it's the latest
  }

  propose({ blueprint, agent, overlay, corrections = [], before, after, verdict }) {
    if (!overlay) throw new Error('cannot propose an empty overlay');
    const instr = newId('instr');
    this.ledger.append({
      type: 'instruction.proposed', instr, blueprint, agent, overlay, corrections,
      before: before?.accuracy, after: after?.accuracy, delta: after && before ? after.accuracy - before.accuracy : undefined,
      recommend: verdict?.accept ?? null, reason: verdict?.reason,
    });
    return this.props.get(instr);
  }

  accept(id, { by = 'operator' } = {}) {
    const p = this.props.get(id);
    if (!p) throw new Error(`unknown instruction proposal ${id}`);
    if (p.status !== 'proposed') throw new Error(`proposal ${id} already ${p.status}`);
    this.ledger.append({ type: 'instruction.accepted', instr: id, by });
    return this.props.get(id);
  }

  reject(id, { by = 'operator', reason = '' } = {}) {
    const p = this.props.get(id);
    if (!p) throw new Error(`unknown instruction proposal ${id}`);
    if (p.status !== 'proposed') throw new Error(`proposal ${id} already ${p.status}`);
    this.ledger.append({ type: 'instruction.rejected', instr: id, by, reason });
    return this.props.get(id);
  }

  revert(id, { by = 'operator' } = {}) {
    const p = this.props.get(id);
    if (!p) throw new Error(`unknown instruction proposal ${id}`);
    if (p.status !== 'accepted') throw new Error(`only an accepted overlay can be reverted (${id} is ${p.status})`);
    this.ledger.append({ type: 'instruction.reverted', instr: id, by });
    return this.props.get(id);
  }

  proposals() { return [...this.props.values()].sort((a, b) => (a.created < b.created ? 1 : -1)); }

  /** Accepted-and-not-reverted overlays for a blueprint (optionally one agent). */
  activeOverlays({ blueprint, agent } = {}) {
    return [...this.props.values()].filter((p) => p.status === 'accepted'
      && (blueprint === undefined || p.blueprint === blueprint)
      && (agent === undefined || p.agent === agent));
  }

  /** Formatted context lines for injection into a run (the cascade's top layer). */
  contextLines({ blueprint, agent } = {}) {
    const active = this.activeOverlays({ blueprint, agent });
    if (!active.length) return [];
    return ['Curated instructions (learned from your corrections, each measured to improve outcomes before it was applied):',
      ...active.map((p) => `- ${p.overlay}`)];
  }
}
