// Gate Engine — classifies every agent action, runs the approval workflow,
// and computes the trust curve that justifies relaxing gates over time.
//
// Levels: auto    — executes silently (still ledgered)
//         log     — executes, surfaced in the run feed
//         approve — parks the run until a human verdict (approve/edit/reject)
//
// Relaxation doctrine (visible, evidence-based, reversible):
// a gated tool becomes a relaxation CANDIDATE when it has ≥ MIN_VERDICTS
// human verdicts in the trailing window and its intervention rate
// (edits + rejects) / verdicts is below MAX_INTERVENTION. Proposals are
// surfaced in the console; a human applies them (gate.change) — never automatic.
import { gateFor } from './blueprint.js';
import { newId } from './ledger.js';
import { calibrate, shouldEscalate } from './confidence.js';

export const RELAX_POLICY = { MIN_VERDICTS: 20, MAX_INTERVENTION: 0.05, WINDOW: 100 };

export class GateEngine {
  constructor(ledger, blueprints) {
    this.ledger = ledger;
    this.blueprints = blueprints;           // Map id -> blueprint
    this.waiters = new Map();               // action id -> resolve(verdictEvent)
    // Incremental confidence calibration per `${blueprint} ${tool}`, folded on
    // each decided confidence-bearing action. Keeps confidenceStats() and the
    // per-action calibration lookup in request() off the O(all-actions) scan
    // that would otherwise run inside the live agent loop.
    this._calib = new Map();
    for (const e of ledger.events) this.#foldConfidence(e);
    ledger.onEvent((e) => this.#foldConfidence(e));
  }

  #foldConfidence(e) {
    if (e.type !== 'gate.verdict') return;
    const s = this.ledger.state();
    const a = s.actions.get(e.action);
    if (!a || typeof a.confidence !== 'number') return;
    const run = s.runs.get(a.run);
    if (!run) return;
    const key = `${run.blueprint} ${a.tool}`;
    let c = this._calib.get(key);
    if (!c) { c = { samples: 0, agree: 0, confSum: 0, brier: 0 }; this._calib.set(key, c); }
    const ok = a.verdict === 'approved' ? 1 : 0; // edited/rejected = disagreement
    c.samples++; c.agree += ok; c.confSum += a.confidence; c.brier += (a.confidence - ok) ** 2;
  }

  #calibFor(blueprintId, tool) {
    const c = this._calib.get(`${blueprintId} ${tool}`);
    return c && c.samples ? { samples: c.samples, agreementRate: c.agree / c.samples } : undefined;
  }

  levelFor(blueprintId, tool) {
    const bp = this.blueprints.get(blueprintId);
    if (!bp) throw new Error(`unknown blueprint ${blueprintId}`);
    const overrides = this.ledger.state().overrides.get(blueprintId) || {};
    return gateFor(bp, tool, overrides);
  }

  /** Record an action request. Returns {action, gate, promise?}.
   *  For approve-gated actions the promise resolves with the verdict event.
   *  An optional self-reported `confidence` can only ESCALATE the gate to
   *  approve (never relax it) — calibrated against this agent's track record. */
  request(runId, blueprintId, tool, input, { confidence } = {}) {
    let gate = this.levelFor(blueprintId, tool);
    let escalated = false;
    let calibrated;
    if (typeof confidence === 'number' && gate !== 'approve') {
      calibrated = calibrate(confidence, this.#calibFor(blueprintId, tool)); // O(1), not a full scan
      if (shouldEscalate(gate, calibrated)) { gate = 'approve'; escalated = true; }
    }
    const action = newId('act');
    const evt = { type: 'action.request', run: runId, action, tool, input, gate };
    if (typeof confidence === 'number') { evt.confidence = confidence; evt.calibrated = calibrated; }
    if (escalated) evt.escalated = true;
    this.ledger.append(evt);
    if (gate !== 'approve') return { action, gate, escalated };
    const promise = new Promise((resolve) => this.waiters.set(action, resolve));
    return { action, gate, escalated, promise };
  }

  /** Per blueprint+tool calibration of self-reported confidence vs human
   *  agreement — how well the agent knows what it doesn't know. Served from the
   *  incrementally-folded aggregate (O(keys)), not a scan over all actions. */
  confidenceStats() {
    const out = [];
    for (const [key, c] of this._calib) {
      const [blueprint, tool] = key.split(' ');
      const n = c.samples;
      out.push({
        blueprint, tool, samples: n,
        agreementRate: +(c.agree / n).toFixed(3),
        meanConfidence: +(c.confSum / n).toFixed(3),
        brier: +(c.brier / n).toFixed(3),
        gap: +((c.confSum / n) - (c.agree / n)).toFixed(3),
      });
    }
    return out.sort((a, b) => b.samples - a.samples);
  }

  /** Human verdict on a parked action. verdict = approved|edited|rejected. */
  verdict(actionId, { verdict, by = 'operator', editedInput, reason }) {
    const a = this.ledger.state().actions.get(actionId);
    if (!a) throw new Error(`unknown action ${actionId}`);
    if (a.gate !== 'approve') throw new Error(`action ${actionId} is not approval-gated`);
    if (a.verdict) throw new Error(`action ${actionId} already decided (${a.verdict})`);
    if (!['approved', 'edited', 'rejected'].includes(verdict)) throw new Error(`bad verdict ${verdict}`);
    if (verdict === 'edited' && editedInput === undefined) throw new Error('edited verdict requires editedInput');
    const e = this.ledger.append({ type: 'gate.verdict', action: actionId, verdict, by, editedInput, reason });
    const resolve = this.waiters.get(actionId);
    if (resolve) { this.waiters.delete(actionId); resolve(e); }
    return e;
  }

  /** Trust curve per blueprint+tool: verdict counts, intervention rate, proposal. */
  trustStats() {
    const { actions, runs } = this.ledger.state();
    const byKey = new Map(); // `${blueprint} ${tool}` via run lookup
    for (const a of actions.values()) {
      if (a.gate !== 'approve' || !a.verdict) continue;
      const run = runs.get(a.run);
      if (!run) continue;
      const key = `${run.blueprint} ${a.tool}`;
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key).push(a);
    }
    const out = [];
    for (const [key, list] of byKey) {
      const [blueprint, tool] = key.split(' ');
      list.sort((x, y) => (x.vt < y.vt ? -1 : 1));
      const window = list.slice(-RELAX_POLICY.WINDOW);
      const interventions = window.filter((a) => a.verdict !== 'approved').length;
      const rate = window.length ? interventions / window.length : 0;
      const current = this.levelFor(blueprint, tool);
      const propose = current === 'approve'
        && window.length >= RELAX_POLICY.MIN_VERDICTS
        && rate <= RELAX_POLICY.MAX_INTERVENTION;
      out.push({ blueprint, tool, verdicts: window.length, interventions, interventionRate: rate, current, propose });
    }
    return out.sort((a, b) => b.verdicts - a.verdicts);
  }

  /** Verification trust curve. Per blueprint+tool: how many verify-gated actions
   *  ran, how many passed the adversarial check vs were held, and — mirroring the
   *  human trust curve — whether a clean-enough record justifies relaxing the
   *  `verify` gate to `log`. `caught` is the fleet-wide count of actions the
   *  verifiers held before they executed ("caught before you"). */
  verificationStats() {
    const { actions, runs } = this.ledger.state();
    const byKey = new Map();
    let caught = 0, verified = 0;
    for (const a of actions.values()) {
      if (!a.verification) continue;
      verified++;
      if (a.verification.outcome === 'refuted') caught++;
      const run = runs.get(a.run);
      if (!run) continue;
      const key = `${run.blueprint} ${a.tool}`;
      if (!byKey.has(key)) byKey.set(key, { clean: 0, held: 0 });
      const b = byKey.get(key);
      if (a.verification.outcome === 'clean') b.clean++; else b.held++;
    }
    const byTool = [];
    for (const [key, b] of byKey) {
      const [blueprint, tool] = key.split(' ');
      const n = b.clean + b.held;
      const cleanRate = n ? b.clean / n : 0;
      const current = this.levelFor(blueprint, tool);
      const propose = current === 'verify'
        && n >= RELAX_POLICY.MIN_VERDICTS
        && cleanRate >= 1 - RELAX_POLICY.MAX_INTERVENTION;
      byTool.push({ blueprint, tool, verifications: n, clean: b.clean, held: b.held, cleanRate, current, propose });
    }
    return { caught, verified, byTool: byTool.sort((x, y) => y.verifications - x.verifications) };
  }

  /** Apply a gate change (human decision — e.g. accepting a relaxation proposal). */
  changeGate(blueprintId, tool, to, { by = 'operator', reason = '' } = {}) {
    const from = this.levelFor(blueprintId, tool);
    if (from === to) throw new Error(`gate for ${tool} is already ${to}`);
    return this.ledger.append({ type: 'gate.change', blueprint: blueprintId, tool, from, to, by, reason });
  }
}
