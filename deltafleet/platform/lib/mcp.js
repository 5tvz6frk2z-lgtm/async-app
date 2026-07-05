// Minimal MCP client — JSON-RPC 2.0 over the Streamable HTTP transport,
// zero dependencies. Covers exactly what the platform needs from a connector:
// initialize, tools/list, tools/call. Responses may arrive as plain JSON or
// as an SSE stream (servers choose per-request); both are handled. The
// mcp-session-id header is captured at initialize and echoed on every
// subsequent request, per spec.
let RPC_ID = 0;

export class McpClient {
  constructor({ url, headers = {}, name = 'deltafleet-agentloop', version = '0.1.0', timeoutMs = 30_000 }) {
    this.url = url;
    this.headers = headers;
    this.clientInfo = { name, version };
    this.timeoutMs = timeoutMs;
    this.sessionId = null;
    this.serverInfo = null;
    this.tools = [];
  }

  async #post(body, { expectResponse = true } = {}) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), this.timeoutMs);
    try {
      const res = await fetch(this.url, {
        method: 'POST',
        signal: ctl.signal,
        headers: {
          'content-type': 'application/json',
          accept: 'application/json, text/event-stream',
          ...(this.sessionId ? { 'mcp-session-id': this.sessionId } : {}),
          ...this.headers,
        },
        body: JSON.stringify(body),
      });
      const sid = res.headers.get('mcp-session-id');
      if (sid) this.sessionId = sid;
      if (!expectResponse) {
        if (res.status >= 300) throw new Error(`MCP notification rejected: HTTP ${res.status}`);
        return null;
      }
      if (!res.ok) throw new Error(`MCP HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
      const ctype = (res.headers.get('content-type') || '').split(';')[0].trim();
      if (ctype === 'text/event-stream') return this.#parseSse(await res.text(), body.id);
      const parsed = await res.json();
      return Array.isArray(parsed) ? parsed.find((m) => m.id === body.id) : parsed;
    } finally {
      clearTimeout(timer);
    }
  }

  #parseSse(text, wantId) {
    // Aggregate parse: each event's data lines form one JSON payload.
    for (const chunk of text.split(/\n\n/)) {
      const data = chunk.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim()).join('\n');
      if (!data) continue;
      let msg;
      try { msg = JSON.parse(data); } catch { continue; }
      for (const m of Array.isArray(msg) ? msg : [msg]) {
        if (m.id === wantId && ('result' in m || 'error' in m)) return m;
      }
    }
    throw new Error(`MCP SSE stream ended without a response for request ${wantId}`);
  }

  async #rpc(method, params) {
    const id = ++RPC_ID;
    const msg = await this.#post({ jsonrpc: '2.0', id, method, params });
    if (!msg) throw new Error(`MCP ${method}: empty response`);
    if (msg.error) throw new Error(`MCP ${method} failed: ${msg.error.message || JSON.stringify(msg.error)}`);
    return msg.result;
  }

  async #notify(method, params) {
    await this.#post({ jsonrpc: '2.0', method, params }, { expectResponse: false });
  }

  async connect() {
    const result = await this.#rpc('initialize', {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: this.clientInfo,
    });
    this.serverInfo = result.serverInfo || null;
    await this.#notify('notifications/initialized', {});
    const listed = await this.#rpc('tools/list', {});
    this.tools = listed.tools || [];
    return this;
  }

  toolDef(name) { return this.tools.find((t) => t.name === name); }

  /** Call a tool. Returns {isError, content, text} — text is the joined text blocks. */
  async callTool(name, args = {}) {
    const result = await this.#rpc('tools/call', { name, arguments: args });
    const content = result.content || [];
    const text = content.filter((c) => c.type === 'text').map((c) => c.text).join('\n');
    return { isError: !!result.isError, content, text };
  }
}
