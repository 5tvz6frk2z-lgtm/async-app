// Tollgate MCP proxy — the enforcement point. It speaks MCP to an upstream client
// (as a server) and to a downstream MCP server (as a client), with Tollgate in the
// middle. This is what makes Fleet Deck *enforce* rather than merely observe:
//
//   tools/list   forwarded downstream, then the returned tool set is run through
//                gate.inspect() — on first sight it is pinned; on any later change
//                to a tool's description / title / schema (the tool-poisoning
//                signature) the listing is BLOCKED (fail closed) until re-approval.
//
//   tools/call   run through gate.guard() BEFORE anything reaches downstream:
//                  deny   -> returned as an error result; never forwarded.
//                  review -> returned as a "needs human approval" result; never
//                            forwarded (an Approvals inbox item now exists).
//                  allow  -> forwarded; the result (and any usage) is recorded.
//
// Every decision, drift alert and call lands on the shared spine, so the whole deck
// lights up with real traffic. The core is transport-agnostic: it takes a
// `downstream` with `request(msg) -> Promise<response>`, so it runs in-process in
// tests and over spawned stdio in production (bin/tollgate-proxy.js).

const ok = (id, result) => ({ jsonrpc: '2.0', id, result });
const rpcError = (id, code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });
const toolError = (id, text) => ok(id, { content: [{ type: 'text', text }], isError: true });

export class TollgateProxy {
  /**
   * @param {object} opts
   * @param {Tollgate} opts.gate
   * @param {{ request(msg): Promise<object> }} opts.downstream  the guarded MCP server
   * @param {string} [opts.server]  name this server is pinned under (default 'downstream')
   * @param {string} [opts.agent]   identity attributed to calls (default 'client')
   * @param {'block'|'warn'} [opts.onCriticalDrift]  fail closed (default) or pass through
   * @param {Approvals} [opts.approvals]  if given, a call previously approved for the
   *   same (agent, server, tool) is let through instead of re-held
   */
  constructor({ gate, downstream, server = 'downstream', agent = 'client', onCriticalDrift = 'block', approvals = null }) {
    if (!gate || !downstream) throw new Error('TollgateProxy needs { gate, downstream }');
    this.gate = gate;
    this.downstream = downstream;
    this.server = server;
    this.agent = agent;
    this.onCriticalDrift = onCriticalDrift;
    this.approvals = approvals;
  }

  /** Handle one JSON-RPC message from the upstream client. */
  async handle(msg) {
    if (!msg || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') return rpcError(msg?.id ?? null, -32600, 'invalid JSON-RPC request');
    switch (msg.method) {
      case 'tools/list': return this.#list(msg);
      case 'tools/call': return this.#call(msg);
      case 'initialize': {
        const res = await this.downstream.request(msg);
        // Advertise that a firewall is in the path (visible in the client's server list).
        if (res.result?.serverInfo) res.result.serverInfo = { ...res.result.serverInfo, name: `tollgate:${res.result.serverInfo.name}` };
        return res;
      }
      case 'notifications/initialized': return null; // notification: forward-and-forget is fine; stay silent upstream
      default: return this.downstream.request(msg); // ping and anything else: pass through
    }
  }

  async #list(msg) {
    const res = await this.downstream.request(msg);
    const tools = res.result?.tools || [];
    const drift = this.gate.inspect(this.server, tools); // pins on first sight; diffs after
    if (drift.severity === 'critical' && this.onCriticalDrift === 'block') {
      const what = drift.changes.filter((c) => c.severity === 'critical').map((c) => `${c.type}:${c.tool}`).join(', ');
      return rpcError(msg.id, -32001, `tools/list blocked by Tollgate: ${this.server} changed since approval (${what}). Re-approve to continue.`);
    }
    return res;
  }

  async #call(msg) {
    const name = msg.params?.name;
    const args = msg.params?.arguments || {};
    const d = this.gate.guard(this.agent, this.server, name, args); // logs tool.call + decision
    if (d.decision === 'deny') return toolError(msg.id, `Blocked by Tollgate policy: ${d.reason}`);
    if (d.decision === 'review') {
      if (this.approvals && this.approvals.isApproved && this.#priorApproval(name)) {
        // a human already approved an equivalent call — let it through
      } else {
        return toolError(msg.id, `Held for human approval — ${this.agent} → ${name}@${this.server}. Approve in the Fleet Deck inbox, then retry.`);
      }
    }
    const res = await this.downstream.request(msg);
    const isErr = res.result?.isError === true || !!res.error;
    this.gate.record(this.agent, this.server, name, { ok: !isErr, error: isErr ? (res.error?.message || 'tool error') : undefined });
    return res;
  }

  // Was an equivalent (agent, server, tool) call approved and not yet consumed?
  #priorApproval(tool) {
    const hist = this.approvals.history ? this.approvals.history() : [];
    return hist.some((h) => h.verdict === 'approved' && h.agent === this.agent && h.server === this.server && h.tool === tool);
  }
}

/** Adapt an in-process MCP server (with a sync/async handle()) into a downstream. */
export function inProcessDownstream(server) {
  return { request: async (msg) => server.handle(msg) };
}
