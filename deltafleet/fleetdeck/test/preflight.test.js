import test from 'node:test';
import assert from 'node:assert/strict';
import { Spine } from '../lib/spine.js';
import { Tollgate } from '../lib/tollgate.js';
import { previewManifest, previewPin, verdict } from '../lib/preflight.js';

const LIVE = {
  default: 'deny',
  agents: { researcher: { 'gh-mcp': { allow: ['get_*', 'list_*'], review: ['create_*'], deny: ['delete_*'] } } },
};

const GH = [
  { name: 'get_issue', description: 'Read', inputSchema: {} },
  { name: 'delete_repo', description: 'Delete', inputSchema: {} },
];

function history() {
  const spine = new Spine(null, { indexBy: ['agent', 'server'] });
  const gate = new Tollgate({ spine, manifest: LIVE });
  gate.pin('gh-mcp', GH);
  gate.guard('researcher', 'gh-mcp', 'get_issue', {});     // allow
  gate.guard('researcher', 'gh-mcp', 'list_issues', {});   // allow
  gate.guard('researcher', 'gh-mcp', 'create_issue', {});  // review
  gate.guard('researcher', 'gh-mcp', 'delete_repo', {});   // deny
  return spine;
}

test('previewManifest rejects an invalid candidate', () => {
  const r = previewManifest(history(), { default: 'bogus' });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => /default must be one of/.test(e)));
});

test('identical manifest -> no decisions change', () => {
  const r = previewManifest(history(), LIVE);
  assert.equal(r.ok, true);
  assert.equal(r.total, 4);
  assert.equal(r.summary.unchanged, 4);
  assert.equal(r.changes.length, 0);
  assert.equal(verdict(r).safe, true);
  assert.match(verdict(r).reason, /no change/);
});

test('tightening: revoking an allow shows the newly-denied calls', () => {
  // drop get_* from allow -> get_issue that used to be allowed is now default-deny
  const tighter = { default: 'deny', agents: { researcher: { 'gh-mcp': { allow: ['list_*'], review: ['create_*'], deny: ['delete_*'] } } } };
  const r = previewManifest(history(), tighter);
  assert.equal(r.summary.newlyDenied, 1);
  const ch = r.changes.find((c) => c.tool === 'get_issue');
  assert.equal(ch.was, 'allow');
  assert.equal(ch.now, 'deny');
  const v = verdict(r);
  assert.equal(v.safe, true, 'tightening is safe to ship');
  assert.match(v.reason, /1 newly denied/);
});

test('loosening: turning a deny into allow is flagged UNSAFE', () => {
  const looser = { default: 'deny', agents: { researcher: { 'gh-mcp': { allow: ['get_*', 'list_*', 'delete_*'], review: ['create_*'] } } } };
  const r = previewManifest(history(), looser);
  assert.equal(r.summary.newlyAllowed, 1);
  const ch = r.changes.find((c) => c.tool === 'delete_repo');
  assert.equal(ch.was, 'deny');
  assert.equal(ch.now, 'allow');
  const v = verdict(r);
  assert.equal(v.safe, false, 'newly-allowing a previously-blocked call needs review');
  assert.match(v.reason, /ALLOWED/);
});

test('review transition is counted and classified', () => {
  // require review for get_* instead of allowing it
  const m = { default: 'deny', agents: { researcher: { 'gh-mcp': { review: ['get_*', 'create_*'], allow: ['list_*'], deny: ['delete_*'] } } } };
  const r = previewManifest(history(), m);
  assert.equal(r.summary.newlyReview, 1);
  assert.ok(r.changes.some((c) => c.tool === 'get_issue' && c.now === 'review'));
});

test('previewPin dry-runs an update against the pin without recording', () => {
  const spine = history();
  const before = spine.length;
  const poisoned = GH.map((t) => (t.name === 'get_issue' ? { ...t, description: 'poisoned' } : t));
  const r = previewPin(spine, 'gh-mcp', poisoned);
  assert.equal(r.pinned, true);
  assert.equal(r.severity, 'critical');
  assert.ok(r.changes.some((c) => c.type === 'description-changed'));
  assert.equal(spine.length, before, 'previewPin recorded nothing');
});

test('previewPin reports when a server is not pinned', () => {
  const r = previewPin(history(), 'unknown-mcp', GH);
  assert.equal(r.pinned, false);
  assert.match(r.note, /not pinned/);
});

test('a clean server update previews as no drift', () => {
  const spine = history();
  const r = previewPin(spine, 'gh-mcp', GH.map((t) => ({ ...t })));
  assert.equal(r.drifted, false);
  assert.equal(r.severity, 'none');
});
