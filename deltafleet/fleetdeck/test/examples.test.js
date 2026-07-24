// Guards the SHIPPED example configs (examples/manifest.json, examples/fleetdeck.config.json)
// against silent regression. The self-defeating catch-all `"*":{"*":{"review":["*"]}}` floor
// once held even the explicitly-allowed memory_search (review is a hard floor unioned across
// scopes, ADR #6), so the advertised "read the Cortex brain" demo never reached Cortex. No
// code test catches a bad EXAMPLE FILE — this pins the example's intended three-way behavior
// and drives the real Cortex through the proxy under the shipped manifest so the happy path
// (memory_search forwarded, a write held) can't break again.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateManifest, decide, Tollgate } from '../lib/tollgate.js';
import { Spine } from '../lib/spine.js';
import { CortexMcpServer } from '../lib/cortex-mcp.js';
import { TollgateProxy, inProcessDownstream } from '../lib/proxy.js';
import { BrainIndex } from '../../brain/lib/index.js';
import { save } from '../../brain/lib/store.js';

const EX = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'examples');
const readJson = (f) => JSON.parse(fs.readFileSync(path.join(EX, f), 'utf8'));

const listMsg = (id = 1) => ({ jsonrpc: '2.0', id, method: 'tools/list' });
const callMsg = (name, args = {}, id = 2) => ({ jsonrpc: '2.0', id, method: 'tools/call', params: { name, arguments: args } });

// The intended policy the demo advertises, checked against whichever manifest ships it.
function assertIntendedPolicy(manifest, label) {
  assert.deepEqual(validateManifest(manifest), [], `${label}: manifest must be valid`);
  const d = (tool) => decide(manifest, 'claude', 'cortex', tool).decision;
  assert.equal(d('memory_search'), 'allow', `${label}: read tool must be ALLOWED (not held by a stray review floor)`);
  assert.equal(d('memory_stats'), 'allow', `${label}: read tool must be ALLOWED`);
  assert.equal(d('memory_delete'), 'review', `${label}: a write must be HELD for review`);
  assert.equal(d('memory_add'), 'review', `${label}: a write must be HELD for review`);
  assert.equal(d('memory_exfiltrate'), 'deny', `${label}: an unlisted tool must be DENIED by default`);
  assert.equal(decide(manifest, 'evil', 'cortex', 'memory_search').decision, 'deny', `${label}: an unknown agent is DENIED`);
  assert.equal(decide(manifest, 'claude', 'other', 'memory_search').decision, 'deny', `${label}: an unknown server is DENIED`);
}

test('examples: manifest.json ships the intended allow/review/deny policy', () => {
  assertIntendedPolicy(readJson('manifest.json'), 'examples/manifest.json');
});

test('examples: fleetdeck.config.json embedded manifest matches the proxy manifest', () => {
  assertIntendedPolicy(readJson('fleetdeck.config.json').manifest, 'examples/fleetdeck.config.json');
});

test('examples: mcp-config.json wires the client through the proxy at the real server', () => {
  const cfg = readJson('mcp-config.json');
  const s = Object.values(cfg.mcpServers)[0];
  assert.match(s.args.join(' '), /tollgate-proxy\.js/, 'client is pointed at the proxy, not the server directly');
  const dd = s.args.indexOf('--');
  assert.ok(dd > 0 && /cortex-mcp\.js/.test(s.args.slice(dd + 1).join(' ')), 'the real MCP server is the downstream command after --');
});

test('examples: the shipped manifest forwards memory_search to real Cortex and holds a write', async () => {
  const manifest = readJson('manifest.json');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ex-cortex-'));
  try {
    const bindex = new BrainIndex(dir);
    save(bindex, { id: 'r', name: 'Retry policy', summary: 'Backoff.', content: '# Retry\n\nUse exponential backoff with jitter.' });
    const cortex = new CortexMcpServer({ index: bindex });
    const spine = new Spine(null, { indexBy: ['agent', 'server'] });
    const gate = new Tollgate({ spine, manifest });
    const proxy = new TollgateProxy({ gate, downstream: inProcessDownstream(cortex), server: 'cortex', agent: 'claude' });

    await proxy.handle(listMsg());
    const ok = await proxy.handle(callMsg('memory_search', { query: 'how should I retry failed calls' }));
    assert.equal(ok.result.isError, false, 'memory_search flows through under the shipped manifest');
    assert.match(ok.result.content[0].text, /backoff/i, 'real Cortex content came back through the guard');

    const held = await proxy.handle(callMsg('memory_delete', { id: 'r' }, 3));
    assert.equal(held.result.isError, true, 'a write is held, not forwarded');
    assert.match(held.result.content[0].text, /human approval/i);
    // the held write must NOT have reached the downstream server (no result event for it)
    assert.equal(spine.query({ kind: 'tool.result' }).filter((e) => e.tool === 'memory_delete').length, 0, 'held write never executed downstream');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
