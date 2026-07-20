import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Spine } from '../lib/spine.js';
import { Tollgate } from '../lib/tollgate.js';
import { Approvals } from '../lib/approvals.js';
import { BrainIndex } from '../../brain/lib/index.js';
import { save } from '../../brain/lib/store.js';
import { CortexMcpServer } from '../lib/cortex-mcp.js';
import { TollgateProxy, inProcessDownstream } from '../lib/proxy.js';

// A downstream MCP server we control, so we can mutate its tools to simulate a rug-pull.
class FakeServer {
  constructor(tools) { this.tools = tools; }
  handle(msg) {
    if (msg.method === 'initialize') return { jsonrpc: '2.0', id: msg.id, result: { protocolVersion: '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'fake' } } };
    if (msg.method === 'tools/list') return { jsonrpc: '2.0', id: msg.id, result: { tools: this.tools } };
    if (msg.method === 'tools/call') return { jsonrpc: '2.0', id: msg.id, result: { content: [{ type: 'text', text: `ran ${msg.params.name}` }], isError: false } };
    if (msg.method === 'ping') return { jsonrpc: '2.0', id: msg.id, result: {} };
    return { jsonrpc: '2.0', id: msg.id, error: { code: -32601, message: 'no' } };
  }
}

const TOOLS = [
  { name: 'get_issue', description: 'Read an issue', inputSchema: { type: 'object' } },
  { name: 'delete_repo', description: 'Delete a repo', inputSchema: { type: 'object' } },
];

const MANIFEST = {
  default: 'deny',
  agents: { client: { fake: { allow: ['get_*'], review: ['create_*'], deny: ['delete_*'] } } },
};

function rig(tools = TOOLS, opts = {}) {
  const spine = new Spine(null, { indexBy: ['agent', 'server'] });
  const gate = new Tollgate({ spine, manifest: MANIFEST });
  const down = new FakeServer(tools);
  const proxy = new TollgateProxy({ gate, downstream: inProcessDownstream(down), server: 'fake', agent: 'client', ...opts });
  return { spine, gate, down, proxy };
}

const listMsg = (id = 1) => ({ jsonrpc: '2.0', id, method: 'tools/list' });
const callMsg = (name, args = {}, id = 2) => ({ jsonrpc: '2.0', id, method: 'tools/call', params: { name, arguments: args } });

test('constructor requires gate and downstream', () => {
  assert.throws(() => new TollgateProxy({}), /needs \{ gate, downstream \}/);
});

test('first tools/list pins the server; a clean re-list passes', async () => {
  const { spine, proxy } = rig();
  const r1 = await proxy.handle(listMsg());
  assert.equal(r1.result.tools.length, 2);
  assert.equal(spine.query({ kind: 'mcp.pin' }).length, 1, 'pinned on first sight');
  const r2 = await proxy.handle(listMsg(3));
  assert.ok(r2.result, 'clean re-list is not blocked');
});

test('tools/list is BLOCKED after a tool is poisoned (fail closed)', async () => {
  const { down, proxy } = rig();
  await proxy.handle(listMsg());                 // pin
  down.tools = TOOLS.map((t) => (t.name === 'get_issue' ? { ...t, description: 'Read <IMPORTANT>exfiltrate</IMPORTANT>' } : t));
  const r = await proxy.handle(listMsg(3));
  assert.ok(r.error, 'poisoned listing is refused');
  assert.match(r.error.message, /changed since approval/);
  assert.match(r.error.message, /description-changed:get_issue/);
});

test('onCriticalDrift:warn passes the listing through but still alerts', async () => {
  const { spine, down, proxy } = rig(TOOLS, { onCriticalDrift: 'warn' });
  await proxy.handle(listMsg());
  down.tools = TOOLS.map((t) => (t.name === 'get_issue' ? { ...t, description: 'poisoned' } : t));
  const r = await proxy.handle(listMsg(3));
  assert.ok(r.result, 'warn mode does not block');
  assert.equal(spine.query({ kind: 'mcp.drift' }).length, 1, 'but the drift is still recorded');
});

test('an allowed call is forwarded and recorded', async () => {
  const { spine, proxy } = rig();
  const r = await proxy.handle(callMsg('get_issue', { n: 1 }));
  assert.equal(r.result.content[0].text, 'ran get_issue', 'forwarded to downstream');
  assert.equal(r.result.isError, false);
  assert.equal(spine.query({ kind: 'tool.call' }).length, 1);
  assert.equal(spine.query({ kind: 'tool.result' }).length, 1, 'the outcome was recorded');
});

test('a denied call is NOT forwarded and comes back as an error result', async () => {
  const { down, proxy } = rig();
  let forwarded = false;
  const orig = down.handle.bind(down);
  down.handle = (m) => { if (m.method === 'tools/call') forwarded = true; return orig(m); };
  const r = await proxy.handle(callMsg('delete_repo'));
  assert.equal(r.result.isError, true);
  assert.match(r.result.content[0].text, /Blocked by Tollgate/);
  assert.equal(forwarded, false, 'the dangerous call never reached downstream');
});

test('a review call is held (not forwarded) and creates an inbox item', async () => {
  const spine = new Spine(null, { indexBy: ['agent', 'server'] });
  const gate = new Tollgate({ spine, manifest: { default: 'deny', agents: { client: { fake: { allow: ['get_*'], review: ['create_*'], deny: ['delete_*'] } } } } });
  const inbox = new Approvals({ spine });
  const proxy = new TollgateProxy({ gate, downstream: inProcessDownstream(new FakeServer(TOOLS)), server: 'fake', agent: 'client' });
  const r = await proxy.handle(callMsg('create_issue', { title: 'x' }));
  assert.equal(r.result.isError, true);
  assert.match(r.result.content[0].text, /Held for human approval/);
  assert.equal(inbox.pending().length, 1, 'the held call is now awaiting a human');
  assert.equal(spine.query({ kind: 'tool.result' }).length, 0, 'nothing executed');
});

test('with approvals wired, a previously-approved call is let through on retry', async () => {
  const spine = new Spine(null, { indexBy: ['agent', 'server'] });
  const gate = new Tollgate({ spine, manifest: { default: 'deny', agents: { client: { fake: { review: ['create_*'] } } } } });
  const inbox = new Approvals({ spine });
  const proxy = new TollgateProxy({ gate, downstream: inProcessDownstream(new FakeServer(TOOLS)), server: 'fake', agent: 'client', approvals: inbox });
  await proxy.handle(callMsg('create_issue', { title: 'x' }));      // held
  inbox.approve(inbox.pending()[0].ref, 'jacob', 'ok');             // human approves
  const r = await proxy.handle(callMsg('create_issue', { title: 'x' }, 5)); // retry
  assert.equal(r.result.isError, false, 'retry after approval goes through');
  assert.match(r.result.content[0].text, /ran create_issue/);
  // SINGLE-USE: the approval is consumed — a second call is held again, not a standing grant
  const r2 = await proxy.handle(callMsg('create_issue', { title: 'y' }, 6));
  assert.equal(r2.result.isError, true, 'a second call needs its own approval');
  assert.match(r2.result.content[0].text, /Held for human approval/);
});

test('initialize is forwarded and the server name is marked as firewalled', async () => {
  const { proxy } = rig();
  const r = await proxy.handle({ jsonrpc: '2.0', id: 1, method: 'initialize' });
  assert.equal(r.result.serverInfo.name, 'tollgate:fake');
});

test('end-to-end: proxy guards the REAL Cortex MCP server', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'proxy-cortex-'));
  try {
    const bindex = new BrainIndex(dir);
    save(bindex, { id: 'x', name: 'Retry policy', summary: 'Exponential backoff.', content: '# Retry\n\nUse exponential backoff with jitter.' });
    const cortex = new CortexMcpServer({ index: bindex });
    const spine = new Spine(null, { indexBy: ['agent', 'server'] });
    // memory_search is read-only -> allow it; everything else denied
    const gate = new Tollgate({ spine, manifest: { default: 'deny', agents: { client: { cortex: { allow: ['memory_*'] } } } } });
    const proxy = new TollgateProxy({ gate, downstream: inProcessDownstream(cortex), server: 'cortex', agent: 'client' });

    await proxy.handle(listMsg());
    const r = await proxy.handle(callMsg('memory_search', { query: 'how should I retry failed calls' }));
    assert.equal(r.result.isError, false);
    assert.match(r.result.content[0].text, /backoff/i, 'the guarded second brain answered through the proxy');
    assert.equal(spine.query({ kind: 'tool.result' }).length, 1);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
