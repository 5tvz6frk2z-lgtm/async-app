// Flight Recorder — one chronological timeline of every agent action, read off
// the shared spine, with an OpenTelemetry GenAI export.
//
// It correlates each tool.call with the tool.result that followed it (FIFO per
// agent+server+tool), so the timeline shows request→outcome as a single enriched
// entry with a duration and cost — while the raw two-event record stays intact on
// the spine. Nothing here writes to the spine; the Recorder is a pure view.
//
// The OTel attribute names below follow the GenAI semantic conventions (semconv
// ~1.40, Apr 2026). Those conventions are still marked "Development"/experimental
// and actively churn, so every name lives behind OTEL_SEMCONV so a future rename
// is one edit, not a scatter.

export const OTEL_SEMCONV = {
  version: '1.40',
  stability: 'experimental', // GenAI conventions are not yet stable — pin the version you target
  attr: {
    operation: 'gen_ai.operation.name',
    provider: 'gen_ai.provider.name',   // replaced the deprecated gen_ai.system
    model: 'gen_ai.request.model',
    inputTokens: 'gen_ai.usage.input_tokens',
    outputTokens: 'gen_ai.usage.output_tokens',
    toolName: 'gen_ai.tool.name',
    toolCallId: 'gen_ai.tool.call.id',
  },
};

const isCall = (e) => e.kind === 'tool.call';
const isResult = (e) => e.kind === 'tool.result';
const key = (e) => JSON.stringify([e.agent ?? '', e.server ?? '', e.tool ?? '']); // JSON, not `|`-join — a value containing '|' would otherwise collide two distinct tuples
const ms = (ts) => Date.parse(ts); // ISO -> epoch ms (NaN-safe: guarded before use)

export class Recorder {
  /** @param {object} opts { spine, pricing? } — pricing only used to fill a
   *  cost when an event carries tokens but no costUsd. */
  constructor({ spine, pricing = {} }) {
    this.spine = spine;
    this.pricing = pricing;
  }

  /**
   * The enriched, ordered timeline. Filters: { agent, server, tool, kind, since,
   * until, limit, reverse }. Each tool.call entry gains { result } when its
   * matching tool.result is found.
   */
  timeline(filter = {}) {
    const { agent, server, tool, kind, since, until, limit, reverse } = filter;
    // Pull the WHOLE ordered log (NOT windowed by since/until) and correlate on it — so a
    // tool.call still finds its result even when the caller filters to just tool.calls, AND a
    // result never binds to the wrong call because the window sliced its true call out of view.
    // since/until are applied to the correlated ENTRIES at the end.
    const events = this.spine.query({});
    // A tool.result can ONLY come from a call that actually executed. A denied call never
    // executes, and a review call executes only once a human approval is consumed — so
    // neither may sit in the correlation queue and steal a later allowed call's result
    // (which would attribute real tokens/cost, and an OTel usage span, to a blocked action).
    const pending = new Map();     // key -> [callEntry,...] eligible for a result (executed)
    const heldReview = new Map();  // key -> [callEntry,...] review calls awaiting approval.consumed
    const enq = (m, k, v) => { const q = m.get(k) || []; q.push(v); m.set(k, q); };
    const entries = [];

    for (const e of events) {
      const entry = this.#entry(e);
      if (isCall(e)) {
        if (e.decision === 'deny') { /* never executes — never eligible for a result */ }
        else if (e.decision === 'review') enq(heldReview, key(e), entry); // eligible only once consumed
        else enq(pending, key(e), entry); // allow (or any executing decision): eligible now
      } else if (e.kind === 'approval.consumed') {
        // A human approved a held review; the proxy logs a FRESH review tool.call on the retry
        // that actually executes, so the executor is the MOST RECENT held attempt (the retry),
        // not the first (which Tollgate blocked and never forwarded). Promote newest (pop), so
        // the result — and its tokens/cost/duration — binds to the call that really ran.
        const promoted = (heldReview.get(key(e)) || []).pop();
        if (promoted) enq(pending, key(e), promoted);
      } else if (isResult(e)) {
        const q = pending.get(key(e));
        const call = q && q.shift();
        if (call) {
          call.result = { ok: e.ok, error: e.error, costUsd: entry.costUsd, tokensIn: e.tokensIn || 0, tokensOut: e.tokensOut || 0 };
          const a = ms(call.ts), b = ms(e.ts);
          call.durationMs = Number.isFinite(a) && Number.isFinite(b) ? Math.max(0, b - a) : null;
        }
      }
      entries.push(entry);
    }

    const inWindow = (x) => {
      if (since !== undefined && (typeof since === 'number' ? x.seq : x.ts) < since) return false;
      if (until !== undefined && (typeof until === 'number' ? x.seq : x.ts) > until) return false;
      return true;
    };
    let out = entries.filter((x) =>
      (agent === undefined || x.agent === agent) &&
      (server === undefined || x.server === server) &&
      (tool === undefined || x.tool === tool) &&
      (kind === undefined || x.kind === kind) && inWindow(x));
    if (reverse) out.reverse();
    if (limit !== undefined) out = out.slice(0, limit);
    return out;
  }

  #entry(e) {
    return {
      seq: e.seq, id: e.id, ts: e.ts, kind: e.kind,
      agent: e.agent ?? null, server: e.server ?? null, tool: e.tool ?? null,
      thread: e.thread ?? null, // carried through so toOtelSpans' traceId can group by thread
      model: e.model ?? null, decision: e.decision ?? null,
      tokensIn: e.tokensIn ?? null, tokensOut: e.tokensOut ?? null,
      costUsd: cost(e, this.pricing),
      summary: summarize(e),
    };
  }

  /**
   * Export tool executions as OpenTelemetry GenAI spans (execute_tool). Returns
   * plain span objects whose attribute keys are the semconv names — ready to hand
   * to an OTLP JSON exporter. traceId groups an agent's spans (or use event.thread
   * if present); spanId is the call event's id.
   */
  toOtelSpans(filter = {}) {
    const A = OTEL_SEMCONV.attr;
    const calls = this.timeline(filter).filter(isCall);
    return calls.map((c) => {
      const start = ms(c.ts);
      const durMs = c.durationMs ?? 0;
      const attributes = {
        [A.operation]: 'execute_tool',
        [A.toolName]: c.tool,
        [A.toolCallId]: c.id,
        'fleetdeck.agent': c.agent,
        'fleetdeck.server': c.server,
        'fleetdeck.decision': c.decision,
      };
      if (c.model) attributes[A.model] = c.model;
      if (c.result) {
        if (c.result.tokensIn) attributes[A.inputTokens] = c.result.tokensIn;
        if (c.result.tokensOut) attributes[A.outputTokens] = c.result.tokensOut;
        if (c.result.costUsd) attributes['fleetdeck.cost_usd'] = c.result.costUsd;
      }
      const failed = c.result ? c.result.ok === false : false;
      const denied = c.decision === 'deny';
      // A review with no result was HELD (blocked, never executed) — it must never export an OK
      // execute_tool span attributing a successful tool run to an action that never ran.
      const held = !c.result && c.decision === 'review';
      const status = denied ? { code: 'ERROR', message: 'blocked by Tollgate policy' }
        : held ? { code: 'ERROR', message: 'held for human review (not executed)' }
        : failed ? { code: 'ERROR', message: c.result?.error || 'tool call failed' }
        : { code: 'OK' };
      return {
        name: `execute_tool ${c.tool}`,
        traceId: traceId(c),
        spanId: c.id,
        kind: 'INTERNAL',
        startTimeUnixNano: Number.isFinite(start) ? start * 1e6 : null,
        endTimeUnixNano: Number.isFinite(start) ? (start + durMs) * 1e6 : null,
        attributes,
        status,
      };
    });
  }

  /** A compact, human-readable timeline for the CLI. */
  render(filter = {}) {
    return this.timeline(filter).map((x) => {
      const when = (typeof x.ts === 'string' ? x.ts : '').slice(11, 19) || '--:--:--'; // a loaded/foreign event may lack a sliceable ts
      const who = x.agent ? ` ${x.agent}` : '';
      const dur = x.durationMs != null ? ` ${x.durationMs}ms` : '';
      const cost = x.costUsd ? ` $${x.costUsd}` : '';
      const res = x.result ? (x.result.ok === false ? ' ✗' : ' ✓') : '';
      return `${when} [${x.kind}]${who} ${x.summary}${res}${dur}${cost}`;
    }).join('\n');
  }
}

function summarize(e) {
  switch (e.kind) {
    case 'tool.call': return `${e.tool}@${e.server} → ${e.decision}`;
    case 'tool.result': return `${e.tool}@${e.server} ${e.ok === false ? 'error' : 'ok'}`;
    case 'mcp.drift': return `DRIFT ${e.server} [${e.severity}] ${(Array.isArray(e.changes) ? e.changes : []).filter((c) => c && typeof c === 'object').map((c) => `${c.type}:${c.tool}`).join(', ')}`;
    case 'mcp.pin': return `pinned ${e.server} (${e.count} tools)`;
    case 'mcp.snapshot': return `snapshot ${e.server}${e.drifted ? ' (drift!)' : ''}`;
    default: return e.text || e.kind;
  }
}

function cost(e, pricing) {
  if (typeof e.costUsd === 'number') return e.costUsd;
  const p = pricing[e.model];
  if (!p || (e.tokensIn == null && e.tokensOut == null)) return null;
  return round2(((e.tokensIn || 0) / 1e6) * (p.in || 0) + ((e.tokensOut || 0) / 1e6) * (p.out || 0));
}

function traceId(e) {
  const seed = e.thread || e.agent || 'fleet';
  // stable, deterministic 32-hex trace id from the seed (no crypto needed here)
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0').repeat(4).slice(0, 32);
}

function round2(n) { return Math.round(n * 1e6) / 1e6; }
