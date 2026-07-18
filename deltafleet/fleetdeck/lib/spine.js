// The Spine — the one append-only timeline every Fleet Deck tool reads and writes.
//
// Fleet Deck is deliberately NOT a stack of separate apps. Tollgate, Flight
// Recorder, Meter and the Approvals Inbox are all *views* over a single event
// log: one file, one ordering, one source of truth. A tool never owns state; it
// registers a projection and the spine keeps it current. This is what makes the
// suite cohere — an approval, the tool call it gated, and its token cost are the
// same three events seen through three lenses, not three databases to reconcile.
//
// Events are append-only JSONL. They are never mutated or deleted; every derived
// view is a pure function of the log replayed in order. An event is:
//   { id, seq, ts, kind, ...payload }
//     seq   monotonic 0-based integer — the canonical order (survives restart)
//     ts    ISO-8601 wall-clock stamp (for humans; never used for ordering)
//     kind  dotted namespace, e.g. "tool.call", "mcp.snapshot", "approval.requested"
//
// Design mirrors the platform ledger's proven derivation discipline: a single
// #apply path both builds a projection from scratch (full replay) and advances
// it on append, so the two can never diverge.
import fs from 'node:fs';
import path from 'node:path';

export class Spine {
  /**
   * @param {string|null} file  JSONL path, or null for an in-memory spine (tests).
   * @param {object} [opts]
   * @param {string[]} [opts.indexBy]  payload fields to build equality indexes on
   *   for fast query() (kind is always indexed). Defaults to ['agent'].
   */
  constructor(file, opts = {}) {
    this.file = file;
    this.events = [];
    this.version = 0;                 // bumps on every append; cheap cache key for consumers
    this.listeners = new Set();
    this._projections = new Map();    // name -> { reducer, state }
    this._indexFields = ['kind', ...(opts.indexBy || ['agent'])];
    this._index = new Map();          // field -> value -> seq[]
    for (const f of this._indexFields) this._index.set(f, new Map());

    if (file && fs.existsSync(file)) {
      this.#load(file);
    } else if (file) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
    }
  }

  #load(file) {
    // Crash-safe load, identical policy to the platform ledger: a process killed
    // mid-append can leave one torn final line — tolerate exactly that (truncate
    // it so the next append writes cleanly). Anything corrupt earlier throws
    // rather than silently rewrite history. A line that parses as JSON but is not
    // a plain object (null, a number, an array, a string) is NOT an event and is
    // treated as corruption on the same path — dropping it silently would be the
    // very history-rewrite we refuse.
    const raw = fs.readFileSync(file, 'utf8');
    const lines = raw.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      let e, bad = false, why = '';
      try { e = JSON.parse(line); } catch (err) { bad = true; why = err.message; }
      if (!bad && !isEvent(e)) { bad = true; why = 'not a JSON object'; }
      if (bad) {
        if (lines.slice(i + 1).every((l) => !l.trim())) {
          const validBytes = lines.slice(0, i).reduce((n, l) => n + Buffer.byteLength(l, 'utf8') + 1, 0);
          try { fs.truncateSync(file, validBytes); } catch { /* read-only fs: in-memory drop still correct */ }
          console.warn(`spine: dropped torn final record in ${path.basename(file)} (crash mid-append?), truncated to ${validBytes} bytes`);
          break;
        }
        throw new Error(`spine ${path.basename(file)} corrupt at line ${i + 1}: ${why}`);
      }
      this.events.push(e);
      this.#index(e);
      this.version++;
    }
    // If the file's last complete record lost only its trailing newline (a plausible
    // torn write), the record still parsed above — but appending now would fuse it
    // with the next record. Remember to write a separating newline first.
    this._needsLeadingNewline = raw.length > 0 && !raw.endsWith('\n');
  }

  /** Append one event. Returns the stored, fully-stamped record. */
  append(kind, payload = {}) {
    if (typeof kind !== 'string' || !kind) throw new Error('append(kind, payload): kind must be a non-empty string');
    const seq = this.events.length;
    // Stamp id/seq/ts/kind LAST so a caller's payload can never forge them — these
    // fields ARE the audit trail, and the spine is their sole authority.
    const e = { ...payload, id: `evt_${seq.toString(36).padStart(6, '0')}`, seq, ts: new Date().toISOString(), kind };
    // Persist BEFORE mutating memory: if the disk write throws (full/read-only),
    // in-memory state must not diverge from what's durably on disk.
    if (this.file) {
      const line = (this._needsLeadingNewline ? '\n' : '') + JSON.stringify(e) + '\n';
      fs.appendFileSync(this.file, line);
      this._needsLeadingNewline = false;
    }
    this.events.push(e);
    this.version++;
    this.#index(e);
    // Advance every registered projection BEFORE listeners fire, so a listener
    // that reads view() sees a state that already accounts for this event.
    for (const p of this._projections.values()) this.#advance(p, e);
    for (const fn of this.listeners) fn(e);
    return e;
  }

  #index(e) {
    for (const field of this._indexFields) {
      const v = e[field];
      if (v === undefined || v === null) continue;
      const bucket = this._index.get(field);
      const key = String(v);
      if (!bucket.has(key)) bucket.set(key, []);
      bucket.get(key).push(e.seq);
    }
  }

  #advance(p, e) {
    const next = p.reducer.apply(p.state, e);
    if (next !== undefined) p.state = next; // reducers may mutate-in-place (return void) or return new state
  }

  onEvent(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }

  /**
   * Register a named incremental view. Built once by full replay, then kept
   * current on every append. `reducer` is { init:()=>state, apply:(state,event)=>state|void }.
   * Registering the same name again replaces it and rebuilds (idempotent — safe
   * to call on every process start).
   */
  project(name, reducer) {
    if (!reducer || typeof reducer.init !== 'function' || typeof reducer.apply !== 'function') {
      throw new Error(`project(${name}): reducer needs { init(), apply(state, event) }`);
    }
    const p = { reducer, state: reducer.init() };
    for (const e of this.events) this.#advance(p, e);
    this._projections.set(name, p);
    return this.view(name);
  }

  /** Read a projection's current state (the live object — treat as read-only). */
  view(name) {
    const p = this._projections.get(name);
    if (!p) throw new Error(`no projection named "${name}" — call project() first`);
    return p.state;
  }

  hasProjection(name) { return this._projections.has(name); }

  /**
   * Ordered event query with maintained indexes.
   * @param {object} [filter]
   * @param {string} [filter.kind]     exact kind (uses the kind index)
   * @param {object} [filter.where]    { field: value } equality; each field must be in indexBy
   * @param {number|string} [filter.since]  inclusive lower bound: seq (number) or ISO ts (string)
   * @param {number|string} [filter.until]  inclusive upper bound: seq (number) or ISO ts (string)
   * @param {number} [filter.limit]    cap results (after ordering)
   * @param {boolean} [filter.reverse] newest-first (default oldest-first)
   * @returns {object[]} matching events in seq order
   */
  query(filter = {}) {
    const { kind, where = {}, since, until, limit, reverse = false } = filter;

    // Intersect index buckets for every equality constraint, cheapest path first.
    const constraints = [];
    if (kind !== undefined) constraints.push(['kind', kind]);
    for (const [field, value] of Object.entries(where)) constraints.push([field, value]);

    let seqs = null; // null = "all events"
    for (const [field, value] of constraints) {
      const bucket = this._index.get(field);
      if (!bucket) throw new Error(`query where.${field}: not an indexed field (indexBy: ${this._indexFields.join(', ')})`);
      const hits = bucket.get(String(value)) || [];
      seqs = seqs === null ? hits.slice() : intersectSorted(seqs, hits);
      if (seqs.length === 0) break;
    }

    let out = seqs === null ? this.events.slice() : seqs.map((s) => this.events[s]);

    // Index keys are String(value), so values that stringify alike (number 1 vs
    // string "1", true vs "true") share a bucket. Re-verify every constraint with
    // strict === so query() is exactly the maintained view of a linear scan.
    if (constraints.length) out = out.filter((e) => constraints.every(([f, v]) => e[f] === v));

    if (since !== undefined) out = out.filter((e) => afterOrEqual(e, since));
    if (until !== undefined) out = out.filter((e) => beforeOrEqual(e, until));
    if (reverse) out.reverse();
    if (limit !== undefined) out = out.slice(0, limit);
    return out;
  }

  all() { return this.events; }
  get length() { return this.events.length; }
}

// A stored event must be a plain object; null / arrays / primitives are not events.
function isEvent(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }

// Two ascending seq lists -> their intersection, ascending. O(n+m).
function intersectSorted(a, b) {
  const out = [];
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { out.push(a[i]); i++; j++; }
    else if (a[i] < b[j]) i++;
    else j++;
  }
  return out;
}

// Bounds accept a seq (number, compared to e.seq) or an ISO ts (string, compared to e.ts).
function afterOrEqual(e, bound) { return typeof bound === 'number' ? e.seq >= bound : e.ts >= bound; }
function beforeOrEqual(e, bound) { return typeof bound === 'number' ? e.seq <= bound : e.ts <= bound; }
