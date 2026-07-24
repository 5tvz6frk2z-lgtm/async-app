import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpClient } from '../lib/mcp.js';
import { buildMcpRegistry, assertBlueprintsCovered } from '../lib/connectors.js';
import { parseCron, TriggerEngine, makeHookHandler } from '../lib/triggers.js';
import { loadBlueprintDir } from '../lib/blueprint.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const BP_DIR = path.join(here, '..', 'blueprints');

/* ---------- mock MCP server (both wire modes) ---------- */

function startMockMcp({ sse = false } = {}) {
  const seen = { sessionEchoes: [], initialized: false };
  const srv = http.createServer(async (req, res) => {
    let body = '';
    for await (const c of req) body += c;
    const msg = JSON.parse(body);
    if (!('id' in msg)) { // notification
      if (msg.method === 'notifications/initialized') seen.initialized = true;
      res.writeHead(202); res.end(); return;
    }
    seen.sessionEchoes.push(req.headers['mcp-session-id'] || null);
    const reply = (result, error) => {
      const payload = { jsonrpc: '2.0', id: msg.id, ...(error ? { error } : { result }) };
      if (sse) {
        res.writeHead(200, { 'content-type': 'text/event-stream', 'mcp-session-id': 'sess-mock' });
        res.end(`event: message\ndata: ${JSON.stringify(payload)}\n\n`);
      } else {
        res.writeHead(200, { 'content-type': 'application/json', 'mcp-session-id': 'sess-mock' });
        res.end(JSON.stringify(payload));
      }
    };
    if (msg.method === 'initialize') return reply({ protocolVersion: '2025-03-26', capabilities: {}, serverInfo: { name: 'mock-crm', version: '1.0' } });
    if (msg.method === 'tools/list') return reply({ tools: [
      { name: 'get_contact', description: 'Get a CRM contact', inputSchema: { type: 'object', properties: { id: { type: 'string' } } } },
      { name: 'update_contact', description: 'Update a CRM contact', inputSchema: { type: 'object' } },
      { name: 'always_errors', description: 'Always fails', inputSchema: { type: 'object' } },
    ] });
    if (msg.method === 'tools/call') {
      if (msg.params.name === 'always_errors') return reply({ content: [{ type: 'text', text: 'upstream exploded' }], isError: true });
      return reply({ content: [{ type: 'text', text: JSON.stringify({ contact: { id: msg.params.arguments?.id, name: 'Dana Reyes' } }) }], isError: false });
    }
    return reply(null, { code: -32601, message: `no such method ${msg.method}` });
  });
  return new Promise((resolve) => srv.listen(0, () => resolve({ srv, seen, url: `http://localhost:${srv.address().port}/mcp` })));
}

for (const sse of [false, true]) {
  test(`McpClient handshake + tools over ${sse ? 'SSE' : 'JSON'} responses`, async () => {
    const { srv, seen, url } = await startMockMcp({ sse });
    try {
      const client = await new McpClient({ url }).connect();
      assert.equal(client.serverInfo.name, 'mock-crm');
      assert.equal(seen.initialized, true, 'initialized notification must be sent');
      assert.equal(client.tools.length, 3);
      const r = await client.callTool('get_contact', { id: 'L-1' });
      assert.equal(r.isError, false);
      assert.equal(JSON.parse(r.text).contact.name, 'Dana Reyes');
      // session id from initialize must be echoed on subsequent requests
      assert.ok(seen.sessionEchoes.slice(1).every((s) => s === 'sess-mock'), `session echoes: ${seen.sessionEchoes}`);
    } finally { srv.close(); }
  });
}

test('connector bridge maps fleet tool names to MCP tools and surfaces errors', async () => {
  const { srv, url } = await startMockMcp();
  const cfgFile = path.join(os.tmpdir(), `connectors-${Date.now()}.json`);
  fs.writeFileSync(cfgFile, JSON.stringify({
    servers: { crm: { url } },
    map: {
      'crm.read': { server: 'crm', tool: 'get_contact' },
      'crm.update': { server: 'crm', tool: 'update_contact' },
      'crm.boom': { server: 'crm', tool: 'always_errors' },
    },
  }));
  try {
    const { registry, mapped } = await buildMcpRegistry(cfgFile);
    assert.equal(mapped.length, 3);
    const defs = registry.defsFor(['crm.read']);
    assert.equal(defs[0].description, 'Get a CRM contact'); // schema/description from tools/list
    const out = await registry.execute('crm.read', { id: 'L-9' }, {});
    assert.equal(out.contact.id, 'L-9');
    await assert.rejects(() => registry.execute('crm.boom', {}, {}), /upstream exploded/);
  } finally { srv.close(); fs.unlinkSync(cfgFile); }
});

test('bridge fails loudly on unknown server tool; coverage guard names gaps', async () => {
  const { srv, url } = await startMockMcp();
  const cfgFile = path.join(os.tmpdir(), `connectors-bad-${Date.now()}.json`);
  fs.writeFileSync(cfgFile, JSON.stringify({ servers: { crm: { url } }, map: { 'crm.read': { server: 'crm', tool: 'nope' } } }));
  try {
    await assert.rejects(() => buildMcpRegistry(cfgFile), /does not expose tool "nope"/);
    const good = path.join(os.tmpdir(), `connectors-good-${Date.now()}.json`);
    fs.writeFileSync(good, JSON.stringify({ servers: { crm: { url } }, map: { 'crm.read': { server: 'crm', tool: 'get_contact' } } }));
    const { registry } = await buildMcpRegistry(good);
    const bps = loadBlueprintDir(BP_DIR);
    assert.throws(() => assertBlueprintsCovered(bps, registry), /speed-to-lead\/qualifier needs crm.update/);
    fs.unlinkSync(good);
  } finally { srv.close(); fs.unlinkSync(cfgFile); }
});

/* ---------- cron ---------- */

test('cron matcher: exact, steps, ranges, lists', () => {
  const mon7 = new Date(2026, 6, 6, 7, 0);   // Monday Jul 6 2026 07:00
  const mon701 = new Date(2026, 6, 6, 7, 1);
  const sun7 = new Date(2026, 6, 5, 7, 0);   // Sunday
  const c = parseCron('cron: 0 7 * * 1');
  assert.equal(c.match(mon7), true);
  assert.equal(c.match(mon701), false);
  assert.equal(c.match(sun7), false);
  assert.equal(parseCron('*/15 * * * *').match(new Date(2026, 0, 1, 3, 45)), true);
  assert.equal(parseCron('*/15 * * * *').match(new Date(2026, 0, 1, 3, 46)), false);
  assert.equal(parseCron('0 9-17 * * 1-5').match(new Date(2026, 6, 8, 13, 0)), true);  // Wed 13:00
  assert.equal(parseCron('0 9-17 * * 1-5').match(new Date(2026, 6, 11, 13, 0)), false); // Sat
  assert.equal(parseCron('0 0 * * 0').match(sun7), false); // wrong hour
  assert.equal(parseCron('0 7 * * 7').match(sun7), true);  // 7 == Sunday
  assert.throws(() => parseCron('bad expr'), /5 fields/);
});

test('cron dom/dow OR rule when both restricted', () => {
  const c = parseCron('0 0 13 * 5'); // 13th OR Friday
  assert.equal(c.match(new Date(2026, 1, 13, 0, 0)), true);  // Fri Feb 13 — both
  assert.equal(c.match(new Date(2026, 2, 13, 0, 0)), true);  // Fri Mar 13
  assert.equal(c.match(new Date(2026, 6, 13, 0, 0)), true);  // Mon Jul 13 — dom only
  assert.equal(c.match(new Date(2026, 6, 10, 0, 0)), true);  // Fri Jul 10 — dow only
  assert.equal(c.match(new Date(2026, 6, 14, 0, 0)), false); // Tue Jul 14 — neither
});

test('trigger engine fires schedule blueprints once per matching minute', () => {
  const bps = loadBlueprintDir(BP_DIR); // daily-brief (0 7 * * 1-5) + reporting-autopilot (0 7 * * 1)
  const launched = [];
  const eng = new TriggerEngine({ blueprints: bps, launch: (id, input) => launched.push({ id, input }) });
  assert.equal(eng.schedules.length, 2);
  const mon7 = new Date(2026, 6, 6, 7, 0, 10);
  assert.deepEqual(eng.checkNow(mon7).sort(), ['daily-brief', 'reporting-autopilot']);
  assert.deepEqual(eng.checkNow(new Date(2026, 6, 6, 7, 0, 40)), [], 'same minute must not refire');
  assert.deepEqual(eng.checkNow(new Date(2026, 6, 7, 7, 0, 0)), ['daily-brief'], 'Tuesday: only the weekday brief');
  assert.deepEqual(eng.checkNow(new Date(2026, 6, 13, 7, 0, 0)).sort(), ['daily-brief', 'reporting-autopilot'], 'next Monday fires both again');
  assert.equal(launched.length, 5);
  assert.ok(launched.every((l) => l.input.schedule.startsWith('cron') === false && l.input.schedule.length > 0));
});

/* ---------- webhooks ---------- */

test('hook handler: auth, routing, schedule rejection', () => {
  const bps = loadBlueprintDir(BP_DIR);
  const launched = [];
  const h = makeHookHandler({ blueprints: bps, launch: (id, payload) => { launched.push({ id, payload }); return 'run_test01'; }, secret: 's3cr3t' });

  assert.equal(h('speed-to-lead', {}, {}).status, 401);
  assert.equal(h('speed-to-lead', { 'x-fleet-secret': 'wrong' }, {}).status, 401);
  assert.equal(h('nope', { 'x-fleet-secret': 's3cr3t' }, {}).status, 404);
  assert.equal(h('reporting-autopilot', { 'x-fleet-secret': 's3cr3t' }, {}).status, 409, 'schedule blueprints refuse webhooks');

  const ok = h('speed-to-lead', { 'x-fleet-secret': 's3cr3t' }, { lead: 'Dana' });
  assert.equal(ok.status, 202);
  assert.equal(ok.body.run, 'run_test01');
  assert.equal(launched[0].payload.lead, 'Dana');

  const disabled = makeHookHandler({ blueprints: bps, launch: () => {}, secret: null });
  assert.equal(disabled('speed-to-lead', { 'x-fleet-secret': 'anything' }, {}).status, 503);
});
