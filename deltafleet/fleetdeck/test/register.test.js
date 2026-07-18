import test from 'node:test';
import assert from 'node:assert/strict';
import { Spine } from '../lib/spine.js';
import { Tollgate } from '../lib/tollgate.js';
import { Approvals } from '../lib/approvals.js';
import { Register, LAW_PACKS } from '../lib/register.js';

const MANIFEST = {
  default: 'deny',
  agents: { writer: { 'cms-mcp': { allow: ['read_*'], review: ['publish_*'], deny: ['delete_*'] } } },
};

const GH = [{ name: 'get_issue', description: 'Read', inputSchema: {} }, { name: 'delete_repo', description: 'Delete', inputSchema: {} }];

function scene() {
  const spine = new Spine(null, { indexBy: ['agent', 'server'] });
  const gate = new Tollgate({ spine, manifest: MANIFEST });
  const inbox = new Approvals({ spine });
  return { spine, gate, inbox };
}

test('unknown pack throws with the available list', () => {
  const { spine } = scene();
  assert.throws(() => new Register({ spine, pack: 'nope' }), /unknown law-pack "nope"/);
});

test('empty spine: oversight/records satisfied, controls needing evidence are gaps', () => {
  const { spine } = scene();
  const reg = new Register({ spine }).register();
  assert.equal(reg.pack, 'governance');
  const byId = Object.fromEntries(reg.controls.map((c) => [c.id, c]));
  assert.equal(byId['RK-1'].status, 'satisfied'); // append-only by construction
  assert.equal(byId['SC-1'].status, 'gap');       // nothing pinned
  assert.equal(byId['TR-1'].status, 'gap');       // no disclosures
  assert.equal(byId['RC-1'].status, 'gap');       // no tool calls => firewall not in path
});

test('human oversight: pending review -> attention; resolved -> satisfied', () => {
  const { spine, gate, inbox } = scene();
  gate.guard('writer', 'cms-mcp', 'publish_post', { id: 1 });
  let reg = new Register({ spine }).register();
  let ho = reg.controls.find((c) => c.id === 'HO-1');
  assert.equal(ho.status, 'attention');
  assert.match(ho.detail, /awaiting human review/);

  inbox.approve(inbox.pending()[0].ref, 'jacob', 'ok');
  reg = new Register({ spine }).register();
  ho = reg.controls.find((c) => c.id === 'HO-1');
  assert.equal(ho.status, 'satisfied');
  assert.equal(ho.count, 1);
  assert.equal(ho.items[0].by, 'jacob');
});

test('dangerous-action control counts blocked calls as evidence', () => {
  const { spine, gate } = scene();
  gate.guard('writer', 'cms-mcp', 'read_draft', {});   // allowed
  gate.guard('writer', 'cms-mcp', 'delete_all', {});   // denied (default deny — unlisted)
  const reg = new Register({ spine }).register();
  const rc = reg.controls.find((c) => c.id === 'RC-1');
  assert.equal(rc.status, 'satisfied');
  assert.equal(rc.count, 1);
  assert.equal(rc.items[0].tool, 'delete_all');
});

test('supply-chain: pinned + critical drift -> attention', () => {
  const { spine, gate } = scene();
  gate.pin('gh-mcp', GH);
  gate.inspect('gh-mcp', GH.map((t) => (t.name === 'get_issue' ? { ...t, description: 'poisoned' } : t)));
  const reg = new Register({ spine }).register();
  const sc = reg.controls.find((c) => c.id === 'SC-1');
  assert.equal(sc.status, 'attention');
  assert.match(sc.detail, /CRITICAL/);
});

test('overall status is the worst control; summary counts by status', () => {
  const { spine, gate } = scene();
  gate.guard('writer', 'cms-mcp', 'publish_post', {}); // pending review -> attention
  const reg = new Register({ spine }).register();
  assert.ok(['attention', 'gap'].includes(reg.overall));
  assert.equal(reg.summary.satisfied + reg.summary.attention + reg.summary.gap, reg.controls.length);
});

test('swappable law-pack: eu-ai-act maps the same evidence to articles', () => {
  const { spine, gate, inbox } = scene();
  gate.guard('writer', 'cms-mcp', 'publish_post', {});
  inbox.approve(inbox.pending()[0].ref, 'jacob');
  const reg = new Register({ spine, pack: 'eu-ai-act' }).register();
  assert.equal(reg.pack, 'eu-ai-act');
  const art14 = reg.controls.find((c) => c.id === 'Art.14');
  assert.equal(art14.status, 'satisfied'); // human oversight evidence, mapped to Article 14
  assert.equal(art14.count, 1);
  // both packs are available
  assert.deepEqual(Object.keys(LAW_PACKS).sort(), ['eu-ai-act', 'governance']);
});

test('evidence() flattens immutable records; toCsv() escapes correctly', () => {
  const { spine, gate, inbox } = scene();
  gate.guard('writer', 'cms-mcp', 'publish_post', { id: 'p,1' });
  inbox.reject(inbox.pending()[0].ref, 'jacob', 'wrong, audience');
  const reg = new Register({ spine });
  const ev = reg.evidence();
  assert.ok(ev.some((r) => r.control === 'HO-1' && r.verdict === 'rejected'));
  const csv = reg.toCsv();
  assert.match(csv.split('\n')[0], /control,name/);
  assert.match(csv, /"wrong, audience"/); // comma-bearing field quoted
});
