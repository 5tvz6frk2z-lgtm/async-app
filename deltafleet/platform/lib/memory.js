// Memory Engine — the learning layer. What the fleet knows about THIS client
// that it didn't know at install time.
//
// Design (see ADR §13; aligned with 2026 practice — typed memory, importance
// scoring, dynamic forgetting, curator-style injection):
// - Four kinds, standard taxonomy:
//     rule        (procedural)  standing instruction; strongest authority
//     preference  (procedural)  how the client wants things done
//     fact        (semantic)    stable truth about the client's world
//     pattern     (episodic→semantic) observed regularity; weakest authority
// - Memories are EVENTS in the same append-only ledger as everything else
//   (memory.add / memory.update / memory.retire). State is derived by replay;
//   history and audit come free; nothing is ever silently rewritten.
// - Every memory carries provenance (onboarding | operator | correction |
//   observation), confidence, and confirmation counts. Duplicates confirm
//   instead of duplicating. Low-value memories decay and retire — stale
//   memory is worse than none.
// - THE FLYWHEEL: every human `edited`/`rejected` gate verdict is a learning
//   event. The engine turns repeated corrections into preferences/rules that
//   are injected into future prompts — interventions teach the fleet, so the
//   same edit shouldn't be needed twice.
// - No embeddings at this scale (hundreds of entries/client, scoped scans).
//   The seam for them is retrieve(); see ADR before reaching for a vector DB.
import { newId } from './ledger.js';

export const KINDS = ['rule', 'preference', 'fact', 'pattern'];
const KIND_RANK = { rule: 0, preference: 1, fact: 2, pattern: 3 };
const DEFAULTS = { maxPerScope: 200, decayAfterDays: 60, retireBelow: 0.3, decayStep: 0.1 };

const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
const short = (v) => { const s = typeof v === 'string' ? v : JSON.stringify(v); return s.length > 90 ? s.slice(0, 90) + '…' : s; };

export class MemoryEngine {
  /** Shares the client's Ledger — memory events live in the same audit trail. */
  constructor(ledger, opts = {}) {
    this.ledger = ledger;
    this.opts = { ...DEFAULTS, ...opts };
    this.mems = new Map();      // id -> record
    this.byKey = new Map();     // dedupe key -> id
    for (const e of ledger.events) this.#apply(e);
    ledger.onEvent((e) => this.#apply(e));
  }

  #apply(e) {
    if (e.type === 'memory.add') {
      const m = { ...e.mem, status: 'active', created: e.t, updated: e.t, confirms: e.mem.confirms ?? 1 };
      this.mems.set(m.id, m);
      this.byKey.set(m.key || norm(m.text), m.id);
    } else if (e.type === 'memory.update') {
      const m = this.mems.get(e.id);
      if (m) Object.assign(m, e.patch, { updated: e.t });
    } else if (e.type === 'memory.retire') {
      const m = this.mems.get(e.id);
      if (m) { m.status = 'retired'; m.retiredBy = e.by; m.retiredReason = e.reason; m.updated = e.t; }
    }
  }

  /** Add or confirm. scope: 'client' or a blueprint id. Returns the record. */
  add({ kind, text, scope = 'client', source = { type: 'operator' }, confidence, key }) {
    if (!KINDS.includes(kind)) throw new Error(`kind must be one of ${KINDS.join('/')}`);
    if (!text || typeof text !== 'string') throw new Error('memory text required');
    const k = key || norm(text);
    const existingId = this.byKey.get(k);
    const existing = existingId && this.mems.get(existingId);
    if (existing && existing.status === 'active') {
      // Confirmation, not duplication: bump confidence, refresh text/recency.
      const conf = Math.min(0.95, (existing.confidence ?? 0.5) + 0.15);
      this.ledger.append({ type: 'memory.update', id: existing.id, patch: { text, confidence: conf, confirms: (existing.confirms || 1) + 1 } });
      return this.mems.get(existing.id);
    }
    const defaults = { onboarding: 0.9, operator: 0.9, correction: 0.55, observation: 0.4 };
    const mem = {
      id: newId('mem'), kind, text, scope, source, key: key || undefined,
      confidence: confidence ?? defaults[source.type] ?? 0.5,
    };
    this.ledger.append({ type: 'memory.add', mem });
    return this.mems.get(mem.id);
  }

  update(id, patch) {
    if (!this.mems.has(id)) throw new Error(`unknown memory ${id}`);
    this.ledger.append({ type: 'memory.update', id, patch });
    return this.mems.get(id);
  }

  retire(id, { by = 'operator', reason = '' } = {}) {
    const m = this.mems.get(id);
    if (!m) throw new Error(`unknown memory ${id}`);
    if (m.status !== 'active') throw new Error(`memory ${id} already ${m.status}`);
    this.ledger.append({ type: 'memory.retire', id, by, reason });
    return this.mems.get(id);
  }

  active(scope) {
    return [...this.mems.values()].filter((m) => m.status === 'active' && (scope === undefined || m.scope === scope));
  }

  /** Active memory by its dedupe key (used by the version-controlled sources
   *  sync to update in place rather than duplicate). */
  findByKey(key) {
    const id = this.byKey.get(key);
    const m = id && this.mems.get(id);
    return m && m.status === 'active' ? m : undefined;
  }

  /** Observability for clean scaling: counts by kind / scope / provenance, plus
   *  active vs retired. Bloat shows up here before it shows up in a prompt. */
  stats() {
    const all = [...this.mems.values()];
    const active = all.filter((m) => m.status === 'active');
    const tally = (fn) => active.reduce((o, m) => { const k = fn(m); o[k] = (o[k] || 0) + 1; return o; }, {});
    return {
      total: all.length, active: active.length, retired: all.length - active.length,
      byKind: tally((m) => m.kind), byScope: tally((m) => m.scope), bySource: tally((m) => m.source?.type || 'unknown'),
    };
  }

  /** Ranked, budgeted retrieval for a run: client-wide + this corridor.
   *  Rank = kind authority, then confidence, then recency. charBudget ≈ 4×tokens. */
  retrieve({ blueprint, charBudget = 3200 } = {}) {
    const pool = [...this.mems.values()].filter((m) =>
      m.status === 'active' && (m.scope === 'client' || m.scope === blueprint));
    pool.sort((a, b) =>
      (KIND_RANK[a.kind] - KIND_RANK[b.kind])
      || ((b.confidence ?? 0) - (a.confidence ?? 0))
      || (a.updated < b.updated ? 1 : -1));
    const out = [];
    let used = 0;
    for (const m of pool) {
      const line = `[${m.kind.toUpperCase()}] ${m.text}`;
      if (used + line.length > charBudget) break;
      used += line.length;
      out.push({ ...m, line });
    }
    return out;
  }

  /** Prompt block for a run; empty string when nothing is known yet. */
  contextBlock({ blueprint, charBudget } = {}) {
    const mems = this.retrieve({ blueprint, charBudget });
    if (!mems.length) return '';
    return [
      'Client memory (rules and preferences are standing instructions; facts are ground truth unless fresh data contradicts them; patterns are hints, not commitments):',
      ...mems.map((m) => `- ${m.line}`),
    ].join('\n');
  }

  /* ---------------- the flywheel: corrections → memory ---------------- */

  /** Subscribe to gate verdicts on the ledger; every human edit/rejection
   *  becomes a candidate memory keyed so repeats CONFIRM rather than pile up. */
  enableCorrectionCapture() {
    this.ledger.onEvent((e) => {
      if (e.type !== 'gate.verdict' || (e.verdict !== 'edited' && e.verdict !== 'rejected')) return;
      const s = this.ledger.state();
      const action = s.actions.get(e.action);
      const run = action && s.runs.get(action.run);
      if (!action || !run) return;
      if (e.verdict === 'edited' && e.editedInput && typeof e.editedInput === 'object' && action.input && typeof action.input === 'object') {
        for (const field of Object.keys(e.editedInput)) {
          if (JSON.stringify(e.editedInput[field]) === JSON.stringify(action.input[field])) continue;
          this.add({
            kind: 'preference', scope: run.blueprint,
            key: `corr:${run.blueprint}:${action.tool}:${field}`,
            source: { type: 'correction', ref: e.action },
            text: `Operator edits on ${action.tool}: "${field}" — last change ${short(action.input[field])} → ${short(e.editedInput[field])}. Match the corrected style without being asked.`,
          });
        }
      }
      if (e.verdict === 'rejected' && e.reason) {
        this.add({
          kind: 'rule', scope: run.blueprint,
          key: `corr-reject:${run.blueprint}:${action.tool}:${norm(e.reason)}`,
          source: { type: 'correction', ref: e.action },
          text: `A ${action.tool} action was rejected: "${e.reason}". Avoid producing work with this problem.`,
        });
      }
    });
    return this;
  }

  /* ---------------- forgetting: decay + caps ---------------- */

  /** Deterministic consolidation (run on a cadence): decay stale low-authority
   *  memories, retire what falls below the floor, cap per scope. */
  consolidate({ now = new Date() } = {}) {
    const { decayAfterDays, retireBelow, decayStep, maxPerScope } = this.opts;
    const cutoff = now.getTime() - decayAfterDays * 86400_000;
    let decayed = 0, retired = 0;
    for (const m of this.active()) {
      if ((m.kind === 'pattern' || m.source?.type === 'observation') && new Date(m.updated).getTime() < cutoff) {
        const conf = +((m.confidence ?? 0.5) - decayStep).toFixed(2);
        if (conf < retireBelow) { this.ledger.append({ type: 'memory.retire', id: m.id, by: 'consolidation', reason: 'decayed below confidence floor' }); retired++; }
        else { this.ledger.append({ type: 'memory.update', id: m.id, patch: { confidence: conf } }); decayed++; }
      }
    }
    const byScope = new Map();
    for (const m of this.active()) {
      if (!byScope.has(m.scope)) byScope.set(m.scope, []);
      byScope.get(m.scope).push(m);
    }
    for (const [, list] of byScope) {
      if (list.length <= maxPerScope) continue;
      list.sort((a, b) => (KIND_RANK[a.kind] - KIND_RANK[b.kind]) || ((b.confidence ?? 0) - (a.confidence ?? 0)));
      for (const m of list.slice(maxPerScope)) {
        this.ledger.append({ type: 'memory.retire', id: m.id, by: 'consolidation', reason: 'scope cap' });
        retired++;
      }
    }
    return { decayed, retired };
  }
}
