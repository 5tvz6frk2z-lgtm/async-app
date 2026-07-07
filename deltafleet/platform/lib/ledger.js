// Run Ledger — the append-only record of everything every agent does.
// One JSONL file per client deployment. Events are never mutated or deleted;
// all state (runs, actions, approvals, metrics, gate overrides) is derived by
// replaying the log. This is deliberate: the audit trail IS the product.
//
// Event types:
//   run.start      {run, blueprint, agent, callsign, trigger}
//   note           {run, text}                          agent narration
//   action.request {run, action, tool, input, gate}     gate = auto|log|approve
//   gate.verdict   {action, verdict, by, editedInput?, reason?}  verdict = approved|edited|rejected
//   action.result  {action, ok, output?, error?}
//   run.end        {run, status, tokensIn, tokensOut}   status = done|killed|error
//   kill           {run, by}
//   baseline       {blueprint, key, value}              captured during Recon
//   sample         {blueprint, key, value}              ongoing measurement
//   gate.change    {blueprint, tool, from, to, by, reason}
import fs from 'node:fs';
import path from 'node:path';

let SEQ = 0;
export const newId = (prefix) => `${prefix}_${Date.now().toString(36)}${(SEQ++ % 1296).toString(36).padStart(2, '0')}`;

export class Ledger {
  constructor(file) {
    this.file = file;
    this.events = [];
    this.listeners = new Set();
    if (file && fs.existsSync(file)) {
      for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
        if (line.trim()) this.events.push(JSON.parse(line));
      }
    } else if (file) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
    }
  }

  append(event) {
    const e = { t: new Date().toISOString(), ...event };
    this.events.push(e);
    if (this.file) fs.appendFileSync(this.file, JSON.stringify(e) + '\n');
    for (const fn of this.listeners) fn(e);
    return e;
  }

  onEvent(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }

  /** Replay all events into a queryable state snapshot. */
  state() {
    const runs = new Map();      // run id -> {id, blueprint, agent, callsign, trigger, status, start, end, tokensIn, tokensOut, actions: [], notes: []}
    const actions = new Map();   // action id -> {id, run, tool, input, gate, verdict?, verdictBy?, editedInput?, reason?, ok?, output?, error?, t, vt?}
    const metrics = new Map();   // blueprint -> key -> {baseline?, samples: [{t, value}]}
    const overrides = new Map(); // blueprint -> {tool: level}
    const gateChanges = [];
    const threads = new Map();   // orchestration thread id -> {type, blueprint, children:[runId], start, end}

    for (const e of this.events) {
      switch (e.type) {
        case 'run.start':
          runs.set(e.run, { id: e.run, blueprint: e.blueprint, agent: e.agent, callsign: e.callsign, trigger: e.trigger, status: 'running', start: e.t, actions: [], notes: [], tokensIn: 0, tokensOut: 0, thread: e.thread || null });
          if (e.thread && threads.has(e.thread)) threads.get(e.thread).children.push(e.run);
          break;
        case 'orchestration.start':
          threads.set(e.thread, { thread: e.thread, type: e.otype, blueprint: e.blueprint, children: [], start: e.t });
          break;
        case 'orchestration.end': {
          const th = threads.get(e.thread);
          if (th) th.end = e.t;
          break;
        }
        case 'note': {
          const r = runs.get(e.run);
          if (r) r.notes.push({ t: e.t, text: e.text });
          break;
        }
        case 'action.request': {
          const a = { id: e.action, run: e.run, tool: e.tool, input: e.input, gate: e.gate, t: e.t };
          actions.set(e.action, a);
          const r = runs.get(e.run);
          if (r) r.actions.push(e.action);
          if (e.gate === 'approve' && r) r.status = 'awaiting-approval';
          break;
        }
        case 'gate.verdict': {
          const a = actions.get(e.action);
          if (a) {
            a.verdict = e.verdict; a.verdictBy = e.by; a.vt = e.t;
            if (e.editedInput !== undefined) a.editedInput = e.editedInput;
            if (e.reason) a.reason = e.reason;
            const r = runs.get(a.run);
            if (r && r.status === 'awaiting-approval') r.status = 'running';
          }
          break;
        }
        case 'action.result': {
          const a = actions.get(e.action);
          if (a) { a.ok = e.ok; a.output = e.output; a.error = e.error; }
          break;
        }
        case 'verification.result': {
          const a = actions.get(e.action);
          if (a) a.verification = { outcome: e.outcome, refuted: e.refuted, clean: e.clean };
          break;
        }
        case 'run.end': {
          const r = runs.get(e.run);
          if (r) { r.status = e.status; r.end = e.t; r.tokensIn = e.tokensIn || 0; r.tokensOut = e.tokensOut || 0; }
          break;
        }
        case 'kill': {
          const r = runs.get(e.run);
          if (r && !r.end) r.status = 'killing';
          break;
        }
        case 'baseline': {
          if (!metrics.has(e.blueprint)) metrics.set(e.blueprint, new Map());
          const m = metrics.get(e.blueprint);
          if (!m.has(e.key)) m.set(e.key, { baseline: undefined, samples: [] });
          m.get(e.key).baseline = e.value;
          break;
        }
        case 'sample': {
          if (!metrics.has(e.blueprint)) metrics.set(e.blueprint, new Map());
          const m = metrics.get(e.blueprint);
          if (!m.has(e.key)) m.set(e.key, { baseline: undefined, samples: [] });
          m.get(e.key).samples.push({ t: e.t, value: e.value });
          break;
        }
        case 'gate.change': {
          if (!overrides.has(e.blueprint)) overrides.set(e.blueprint, {});
          overrides.get(e.blueprint)[e.tool] = e.to;
          gateChanges.push(e);
          break;
        }
      }
    }

    // An undecided approval whose run has already ended (killed/errored) is void,
    // not pending — it must not linger in the operator's queue.
    const alive = (id) => { const r = runs.get(id); return r && !r.end; };
    const pendingApprovals = [...actions.values()].filter((a) => a.gate === 'approve' && !a.verdict && alive(a.run));
    return { runs, actions, metrics, overrides, gateChanges, threads, pendingApprovals };
  }
}
