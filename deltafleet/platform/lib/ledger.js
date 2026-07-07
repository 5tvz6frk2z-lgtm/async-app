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
  static SAMPLE_WINDOW = 200; // metric samples retained hot in the projection (full history stays on disk)

  constructor(file) {
    this.file = file;
    this.events = [];
    this.listeners = new Set();
    this.version = 0; // bumps on every append; lets consumers cache derived views cheaply
    if (file && fs.existsSync(file)) {
      // Crash-safe load: a process killed mid-append can leave a torn final
      // line. Tolerate that one partial trailing record (drop it with a warning
      // — the next append writes cleanly after it) rather than failing to boot.
      // A malformed line anywhere BUT the end is real corruption and must not be
      // silently skipped — that would rewrite history — so it throws.
      const lines = fs.readFileSync(file, 'utf8').split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;
        try {
          this.events.push(JSON.parse(line));
        } catch (err) {
          const isLastNonEmpty = lines.slice(i + 1).every((l) => !l.trim());
          if (isLastNonEmpty) {
            // Truncate the torn bytes from disk so the next append writes cleanly
            // after the last intact record (a partial line has no newline).
            const validBytes = lines.slice(0, i).reduce((n, l) => n + Buffer.byteLength(l, 'utf8') + 1, 0);
            try { fs.truncateSync(file, validBytes); } catch { /* read-only fs: in-memory drop still correct */ }
            console.warn(`ledger: dropped torn final record in ${path.basename(file)} (crash mid-append?), truncated to ${validBytes} bytes`);
            break;
          }
          throw new Error(`ledger ${path.basename(file)} corrupt at line ${i + 1}: ${err.message}`);
        }
      }
    } else if (file) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
    }
  }

  append(event) {
    const e = { t: new Date().toISOString(), ...event };
    this.events.push(e);
    this.version++;
    if (this.file) fs.appendFileSync(this.file, JSON.stringify(e) + '\n');
    // Keep the materialized view current so state() is O(1) amortized rather
    // than an O(events) replay on every call. Applied BEFORE listeners fire so a
    // listener (e.g. correction capture) that calls state() sees this event.
    if (this._proj) this.#applyOne(this._proj, e);
    for (const fn of this.listeners) fn(e);
    return e;
  }

  onEvent(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }

  #emptyProjection() {
    return {
      runs: new Map(),       // run id -> {id, blueprint, agent, callsign, trigger, status, start, end, tokensIn, tokensOut, actions:[], notes:[], thread}
      actions: new Map(),    // action id -> {id, run, tool, input, gate, verdict?, ..., verification?}
      metrics: new Map(),    // blueprint -> key -> {baseline?, samples:[{t,value}]}
      overrides: new Map(),  // blueprint -> {tool: level}
      gateChanges: [],
      threads: new Map(),    // orchestration thread id -> {type, blueprint, children:[runId], start, end}
      pending: new Map(),    // action id -> action, for approve-gated actions still awaiting a verdict (incremental)
      len: 0,
    };
  }

  /** Apply one event to the projection in place. This is the single source of
   *  the derivation rules; the full-replay build and the incremental append both
   *  route through it, so they can never diverge. */
  #applyOne(p, e) {
    const { runs, actions, metrics, overrides, gateChanges, threads, pending } = p;
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
        if (typeof e.confidence === 'number') { a.confidence = e.confidence; a.calibrated = e.calibrated; }
        if (e.escalated) a.escalated = true;
        actions.set(e.action, a);
        const r = runs.get(e.run);
        if (r) r.actions.push(e.action);
        if (e.gate === 'approve') { if (r) r.status = 'awaiting-approval'; pending.set(e.action, a); }
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
        pending.delete(e.action);
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
        for (const [id, a] of pending) if (a.run === e.run) pending.delete(id); // ended run's approvals are void
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
        if (!m.has(e.key)) m.set(e.key, { baseline: undefined, samples: [], count: 0 });
        m.get(e.key).baseline = e.value;
        break;
      }
      case 'sample': {
        if (!metrics.has(e.blueprint)) metrics.set(e.blueprint, new Map());
        const m = metrics.get(e.blueprint);
        if (!m.has(e.key)) m.set(e.key, { baseline: undefined, samples: [], count: 0 });
        const rec = m.get(e.key);
        rec.count = (rec.count || 0) + 1;
        rec.samples.push({ t: e.t, value: e.value });
        // Bounded window: only the latest value and total count are ever read
        // (proofFor), so retaining every sample forever is pure bloat. The full
        // history remains in the JSONL audit trail.
        if (rec.samples.length > Ledger.SAMPLE_WINDOW) rec.samples.shift();
        break;
      }
      case 'gate.change': {
        if (!overrides.has(e.blueprint)) overrides.set(e.blueprint, {});
        overrides.get(e.blueprint)[e.tool] = e.to;
        gateChanges.push(e);
        break;
      }
    }
    p.len++;
  }

  /** Queryable state. Backed by an incrementally-maintained materialized view:
   *  built once (full replay) on first call, then kept current by append(), so
   *  repeated reads on the request hot path don't re-replay the whole log.
   *  The returned Maps/arrays are the LIVE projection — callers must treat them
   *  as read-only. */
  state() {
    if (!this._proj) {
      this._proj = this.#emptyProjection();
      for (const e of this.events) this.#applyOne(this._proj, e);
    }
    const p = this._proj;
    // An undecided approval whose run has already ended is void, not pending.
    // `pending` already tracks approve-gated, unverdicted actions incrementally
    // and drops them at run.end; the alive filter is a belt-and-suspenders check.
    const alive = (id) => { const r = p.runs.get(id); return r && !r.end; };
    const pendingApprovals = [...p.pending.values()].filter((a) => !a.verdict && alive(a.run));
    return { runs: p.runs, actions: p.actions, metrics: p.metrics, overrides: p.overrides, gateChanges: p.gateChanges, threads: p.threads, pendingApprovals };
  }
}
