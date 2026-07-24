// Cortex-as-MCP — the Cortex second brain (deltafleet/brain) wrapped as a real
// Model Context Protocol server, so any MCP client (Claude Code, an agent) can
// query the second brain as a tool and get back a compact, deterministic evidence
// block instead of a wall of files. This is the capstone that ties Fleet Deck's
// two halves together: it is itself an MCP server, so Tollgate can pin and guard
// it exactly like any other — the memory server protected by the same firewall.
//
// The server core is transport-agnostic: handle(message) takes a parsed JSON-RPC
// message and returns the response object (or null for a notification), so it is
// fully testable without stdio. bin/cortex-mcp.js wires it to newline-delimited
// JSON-RPC over stdin/stdout (the MCP stdio transport).
import { retrieve } from '../../brain/lib/retrieve.js';

const PROTOCOL_VERSION = '2025-06-18'; // MCP revision this server implements
const SERVER_INFO = { name: 'cortex', version: '0.1.0' };

const ok = (id, result) => ({ jsonrpc: '2.0', id, result });
const err = (id, code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });

export class CortexMcpServer {
  /** @param {object} opts { index } — a brain BrainIndex to retrieve against. */
  constructor({ index }) {
    if (!index) throw new Error('CortexMcpServer needs a brain index');
    this.index = index;
  }

  get tools() {
    return [
      {
        name: 'memory_search',
        title: 'Search the second brain',
        description: 'Retrieve the single most relevant memory for a question and return a compact evidence block (index-first: scores a one-line catalogue, opens only the best file, pulls one section, follows at most one pointer). Use this before answering from general knowledge when the team may have a specific, recorded answer.',
        inputSchema: {
          type: 'object',
          properties: { query: { type: 'string', description: 'The question or topic to look up.' } },
          required: ['query'],
        },
        annotations: { readOnlyHint: true, openWorldHint: false },
      },
      {
        name: 'memory_stats',
        title: 'Second-brain size',
        description: 'How many memories are indexed and available to search.',
        inputSchema: { type: 'object', properties: {} },
        annotations: { readOnlyHint: true, openWorldHint: false },
      },
    ];
  }

  /** Handle one JSON-RPC message. Returns a response object, or null for a
   *  notification (no id / notifications/* method — MCP clients expect silence). */
  handle(msg) {
    if (!msg || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') {
      return err(msg?.id ?? null, -32600, 'invalid JSON-RPC request');
    }
    const isNotification = msg.id === undefined || msg.method.startsWith('notifications/');
    switch (msg.method) {
      case 'initialize':
        return ok(msg.id, { protocolVersion: PROTOCOL_VERSION, capabilities: { tools: { listChanged: false } }, serverInfo: SERVER_INFO });
      case 'notifications/initialized':
        return null;
      case 'ping':
        return ok(msg.id, {});
      case 'tools/list':
        return ok(msg.id, { tools: this.tools });
      case 'tools/call':
        return this.#callTool(msg);
      default:
        return isNotification ? null : err(msg.id, -32601, `method not found: ${msg.method}`);
    }
  }

  #callTool(msg) {
    const name = msg.params?.name;
    const args = msg.params?.arguments || {};
    const textResult = (text, isError = false) => ok(msg.id, { content: [{ type: 'text', text }], isError });
    try {
      if (name === 'memory_search') {
        if (!args.query || typeof args.query !== 'string') return textResult('memory_search requires a string "query"', true);
        const r = retrieve(this.index, args.query);
        if (!r.chosen) return textResult(`No memory found for: ${args.query}`);
        const header = `# ${r.chosen.name}  (${r.chosen.id}, ~${r.tokens} tokens, ${r.filesOpened} file(s) opened)\n\n`;
        return textResult(header + r.evidence);
      }
      if (name === 'memory_stats') {
        return textResult(`${this.index.all().length} memories indexed.`);
      }
      return textResult(`unknown tool: ${name}`, true);
    } catch (e) {
      return textResult(`tool error: ${e.message}`, true);
    }
  }
}

/**
 * Run a server over newline-delimited JSON-RPC on the given streams (the MCP stdio
 * transport). Returns a stop() function. Kept here so the transport is one place
 * and the core stays pure.
 */
export function runStdio(server, { input = process.stdin, output = process.stdout } = {}) {
  let buffer = '';
  const onData = (chunk) => {
    buffer += chunk;
    let nl;
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      let msg;
      try { msg = JSON.parse(line); } catch { output.write(JSON.stringify(err(null, -32700, 'parse error')) + '\n'); continue; }
      const res = server.handle(msg);
      if (res) output.write(JSON.stringify(res) + '\n');
    }
  };
  input.setEncoding('utf8');
  input.on('data', onData);
  return () => input.off('data', onData);
}
