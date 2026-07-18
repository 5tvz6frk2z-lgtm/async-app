import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { BrainIndex } from '../../brain/lib/index.js';
import { save } from '../../brain/lib/store.js';
import { CortexMcpServer, runStdio } from '../lib/cortex-mcp.js';
import { PassThrough } from 'node:stream';

function brain() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cortex-mcp-'));
  const index = new BrainIndex(dir);
  save(index, { id: 'tool-poisoning', name: 'Tool poisoning defense', tags: ['mcp', 'security'], summary: 'Pin a server tool set and diff on refresh.', content: '# Tool poisoning\n\nA malicious MCP server can change a tool description after approval. Pin a fingerprint of name, description and inputSchema, and raise a critical alert when any of them change on an already-approved tool.' });
  save(index, { id: 'deny-by-default', name: 'Deny by default', tags: ['firewall', 'policy'], summary: 'Unlisted tools are denied.', content: '# Deny by default\n\nAn agent may only call tools an operator explicitly scoped to it. Everything else is denied.' });
  return { dir, index, cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) };
}

function server() { const b = brain(); return { ...b, srv: new CortexMcpServer({ index: b.index }) }; }

test('constructor requires an index', () => {
  assert.throws(() => new CortexMcpServer({}), /needs a brain index/);
});

test('initialize returns protocol version, capabilities and serverInfo', () => {
  const { srv, cleanup } = server();
  try {
    const res = srv.handle({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } });
    assert.equal(res.id, 1);
    assert.match(res.result.protocolVersion, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(res.result.capabilities.tools);
    assert.equal(res.result.serverInfo.name, 'cortex');
  } finally { cleanup(); }
});

test('notifications/initialized is silent (returns null)', () => {
  const { srv, cleanup } = server();
  try {
    assert.equal(srv.handle({ jsonrpc: '2.0', method: 'notifications/initialized' }), null);
  } finally { cleanup(); }
});

test('tools/list advertises memory_search with a valid inputSchema', () => {
  const { srv, cleanup } = server();
  try {
    const res = srv.handle({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
    const names = res.result.tools.map((t) => t.name);
    assert.deepEqual(names.sort(), ['memory_search', 'memory_stats']);
    const search = res.result.tools.find((t) => t.name === 'memory_search');
    assert.equal(search.inputSchema.required[0], 'query');
    assert.equal(search.annotations.readOnlyHint, true);
  } finally { cleanup(); }
});

test('tools/call memory_search returns a compact evidence block for a hit', () => {
  const { srv, cleanup } = server();
  try {
    const res = srv.handle({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'memory_search', arguments: { query: 'how do I detect a poisoned MCP tool description' } } });
    assert.equal(res.result.isError, false);
    const text = res.result.content[0].text;
    assert.match(text, /Tool poisoning/i);
    assert.match(text, /tokens/);
  } finally { cleanup(); }
});

test('memory_search with no hit is a clean (non-error) miss', () => {
  const { srv, cleanup } = server();
  try {
    const res = srv.handle({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'memory_search', arguments: { query: 'zzz nonexistent quantum banana' } } });
    // either a real hit or a "No memory found" — never an error, never a throw
    assert.equal(res.result.isError, false);
    assert.ok(res.result.content[0].text.length > 0);
  } finally { cleanup(); }
});

test('memory_search without a query argument is a tool error, not a crash', () => {
  const { srv, cleanup } = server();
  try {
    const res = srv.handle({ jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'memory_search', arguments: {} } });
    assert.equal(res.result.isError, true);
    assert.match(res.result.content[0].text, /requires a string "query"/);
  } finally { cleanup(); }
});

test('memory_stats reports the index size', () => {
  const { srv, cleanup } = server();
  try {
    const res = srv.handle({ jsonrpc: '2.0', id: 6, method: 'tools/call', params: { name: 'memory_stats' } });
    assert.match(res.result.content[0].text, /2 memories/);
  } finally { cleanup(); }
});

test('an unknown tool is reported as a tool error', () => {
  const { srv, cleanup } = server();
  try {
    const res = srv.handle({ jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name: 'rm_rf', arguments: {} } });
    assert.equal(res.result.isError, true);
    assert.match(res.result.content[0].text, /unknown tool/);
  } finally { cleanup(); }
});

test('an unknown method returns JSON-RPC error -32601', () => {
  const { srv, cleanup } = server();
  try {
    const res = srv.handle({ jsonrpc: '2.0', id: 8, method: 'no/such/method' });
    assert.equal(res.error.code, -32601);
  } finally { cleanup(); }
});

test('a malformed request returns -32600', () => {
  const { srv, cleanup } = server();
  try {
    assert.equal(srv.handle({ id: 9, method: 'x' }).error.code, -32600); // no jsonrpc field
  } finally { cleanup(); }
});

test('runStdio frames newline-delimited JSON-RPC over streams', async () => {
  const { srv, cleanup } = server();
  const input = new PassThrough(), output = new PassThrough();
  try {
    const lines = [];
    output.on('data', (c) => lines.push(...c.toString().split('\n').filter(Boolean)));
    runStdio(srv, { input, output });
    input.write(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize' }) + '\n');
    input.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n'); // silent
    input.write(JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }) + '\n');
    await new Promise((r) => setTimeout(r, 30));
    const responses = lines.map((l) => JSON.parse(l));
    assert.deepEqual(responses.map((r) => r.id), [1, 2], 'the notification produced no line');
    assert.ok(responses[1].result.tools.length >= 1);
  } finally { cleanup(); }
});
