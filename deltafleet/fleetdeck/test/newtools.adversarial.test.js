// Adversarial tests for register.js, preflight.js, contextsmith.js and cortex-mcp.js.
// PASS = boundary/behaviour confirmed correct. A test written to FAIL (// BUG:)
// documents a real defect. Findings summarised in the agent report.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Spine } from '../lib/spine.js';
import { Tollgate } from '../lib/tollgate.js';
import { Approvals } from '../lib/approvals.js';
import { Register, LAW_PACKS } from '../lib/register.js';
import { previewManifest, previewPin, verdict } from '../lib/preflight.js';
import { Contextsmith, lineDiff } from '../lib/contextsmith.js';
import { CortexMcpServer } from '../lib/cortex-mcp.js';
import { BrainIndex } from '../../brain/lib/index.js';
import { save } from '../../brain/lib/store.js';

const MANIFEST = { default: 'deny', agents: { writer: { 'cms-mcp': { allow: ['read_*'], review: ['publish_*'], deny: ['delete_*'] } } } };
function scene() {
  const spine = new Spine(null, { indexBy: ['agent', 'server'] });
  const gate = new Tollgate({ spine, manifest: MANIFEST });
  const inbox = new Approvals({ spine });
  return { spine, gate, inbox };
}

// ===========================================================================
// register.js
// ===========================================================================
test('register: no control throws on a totally empty spine', () => {
  const spine = new Spine(null, { indexBy: ['agent', 'server'] });
  const reg = new Register({ spine });
  assert.doesNotThrow(() => reg.register());
  assert.doesNotThrow(() => reg.evidence());
  const r = reg.register();
  assert.equal(r.overall, 'gap', 'empty deck -> worst control is a gap');
  assert.equal(r.summary.satisfied + r.summary.attention + r.summary.gap, r.controls.length);
});

test('register: toCsv on empty evidence is a bare header', () => {
  const spine = new Spine(null, { indexBy: ['agent', 'server'] });
  assert.equal(new Register({ spine }).toCsv(), 'control,name\n');
});

test('register: the two packs never disagree on a shared control', () => {
  const { spine, gate, inbox } = scene();
  gate.guard('writer', 'cms-mcp', 'publish_post', {});         // pending review
  inbox.approve(inbox.pending()[0].ref, 'jacob');
  gate.guard('writer', 'cms-mcp', 'delete_all', {});           // denied
  gate.pin('gh', [{ name: 'a', description: 'A', inputSchema: {} }]);
  gate.inspect('gh', [{ name: 'a', description: 'POISON', inputSchema: {} }]); // critical drift

  const gov = new Register({ spine, pack: 'governance' }).register();
  const eu = new Register({ spine, pack: 'eu-ai-act' }).register();
  const gById = Object.fromEntries(gov.controls.map((c) => [c.id, c.status]));
  const eById = Object.fromEntries(eu.controls.map((c) => [c.id, c.status]));
  // shared evidence -> identical status per mapped control, and identical overall
  assert.equal(gById['HO-1'], eById['Art.14']);
  assert.equal(gById['RK-1'], eById['Art.12']);
  assert.equal(gById['SC-1'], eById['Art.15']);
  assert.equal(gById['RC-1'], eById['Art.15b']);
  assert.equal(gById['TR-1'], eById['Art.50']);
  assert.equal(gov.overall, eu.overall);
});

test('register: overall reflects the WORST control', () => {
  const { spine, gate } = scene();
  gate.guard('writer', 'cms-mcp', 'publish_post', {}); // attention (open review)
  // SC-1/TR-1/RC-1 remain gaps -> worst is gap
  const reg = new Register({ spine }).register();
  const ranks = { satisfied: 0, attention: 1, gap: 2 };
  const worst = reg.controls.reduce((m, c) => Math.max(m, ranks[c.status]), 0);
  assert.equal(ranks[reg.overall], worst);
  assert.equal(reg.overall, 'gap');
});

test('register: toCsv quotes commas, quotes and newlines', () => {
  const { spine, gate, inbox } = scene();
  gate.guard('writer', 'cms-mcp', 'publish_post', {});
  inbox.reject(inbox.pending()[0].ref, 'jacob', 'say "no", then\nescalate');
  const csv = new Register({ spine }).toCsv();
  assert.match(csv, /""no""/, 'embedded quotes are doubled');
  assert.match(csv, /"say ""no"", then\nescalate"/, 'comma+quote+newline field is fully quoted');
});

test('register: toCsv does NOT quote a lone carriage return', () => {
  const { spine, gate, inbox } = scene();
  gate.guard('writer', 'cms-mcp', 'publish_post', {});
  inbox.reject(inbox.pending()[0].ref, 'jacob', 'line1\rline2'); // CR only, no LF
  const csv = new Register({ spine }).toCsv();
  // BUG: register.js toCsv() esc() tests /[",\n]/ — it omits \r, so a field with a
  // bare carriage return is emitted UNQUOTED. RFC4180 requires quoting any field
  // containing CR or LF; unquoted the CR corrupts row framing for strict parsers.
  // Fix: widen the regex to /[",\r\n]/.
  assert.match(csv, /"line1\rline2"/, 'CR-bearing field should be quoted (this FAILS -> documents the bug)');
});

// ===========================================================================
// preflight.js
// ===========================================================================
const LIVE = { default: 'deny', agents: { researcher: { 'gh-mcp': { allow: ['get_*', 'list_*'], review: ['create_*'], deny: ['delete_*'] } } } };
const GH = [{ name: 'get_issue', description: 'Read', inputSchema: {} }, { name: 'delete_repo', description: 'Delete', inputSchema: {} }];
function history() {
  const spine = new Spine(null, { indexBy: ['agent', 'server'] });
  const gate = new Tollgate({ spine, manifest: LIVE });
  gate.pin('gh-mcp', GH);
  gate.guard('researcher', 'gh-mcp', 'get_issue', {});    // allow
  gate.guard('researcher', 'gh-mcp', 'create_issue', {}); // review
  gate.guard('researcher', 'gh-mcp', 'delete_repo', {});  // deny
  return spine;
}

test('preflight: previewManifest on an empty spine is a clean no-op', () => {
  const spine = new Spine(null, { indexBy: ['agent', 'server'] });
  const r = previewManifest(spine, LIVE);
  assert.equal(r.ok, true);
  assert.equal(r.total, 0);
  assert.deepEqual(r.changes, []);
  assert.equal(verdict(r).safe, true);
  assert.match(verdict(r).reason, /no change/);
});

test('preflight: summary fields sum EXACTLY to total for any candidate', () => {
  const spine = history();
  for (const cand of [LIVE, { default: 'review', agents: {} }, { default: 'allow', agents: {} }, { default: 'deny', agents: {} }]) {
    const r = previewManifest(spine, cand);
    const s = r.summary;
    const sum = s.unchanged + s.newlyDenied + s.newlyAllowed + s.newlyReview + s.otherChange;
    assert.equal(sum, r.total, `summary must partition all ${r.total} calls`);
    assert.equal(s.unchanged, r.total - r.changes.length, 'unchanged == total minus the changed ones');
  }
});

test('preflight: FIXED — a deny->review transition is a LOOSENING and flagged unsafe', () => {
  // candidate holds delete_repo for review instead of hard-denying it: less oversight
  const cand = { default: 'deny', agents: { researcher: { 'gh-mcp': { allow: ['get_*', 'list_*'], review: ['create_*', 'delete_*'] } } } };
  const r = previewManifest(history(), cand);
  const ch = r.changes.find((c) => c.tool === 'delete_repo');
  assert.equal(ch.was, 'deny');
  assert.equal(ch.now, 'review');
  assert.equal(ch.direction, 'looser');
  assert.equal(r.summary.newlyReview, 1);
  assert.equal(r.summary.loosened, 1);
  // deny->review reduces oversight, so verdict now correctly flags it for review.
  assert.equal(verdict(r).safe, false);
});

test('preflight: verdict flags a newly-ALLOWED previously-blocked call as unsafe', () => {
  const looser = { default: 'deny', agents: { researcher: { 'gh-mcp': { allow: ['get_*', 'list_*', 'delete_*'], review: ['create_*'] } } } };
  const v = verdict(previewManifest(history(), looser));
  assert.equal(v.safe, false);
  assert.match(v.reason, /allowed/i);
});

test('preflight: previewPin diffs against the LATEST of several pins', () => {
  const spine = new Spine(null, { indexBy: ['agent', 'server'] });
  const gate = new Tollgate({ spine, manifest: LIVE });
  const A = [{ name: 'a', description: 'A', inputSchema: {} }];
  const B = [{ name: 'b', description: 'B', inputSchema: {} }];
  gate.pin('srv', A);
  gate.pin('srv', B); // latest pin is B
  const vsB = previewPin(spine, 'srv', B);
  assert.equal(vsB.drifted, false, 'fresh==latest pin -> no drift (confirms latest, not first, is used)');
  const vsA = previewPin(spine, 'srv', A);
  assert.equal(vsA.drifted, true, 'A now differs from the latest pin B');
});

// ===========================================================================
// contextsmith.js
// ===========================================================================
test('contextsmith: put/activate ordering — first put auto-activates v1 atomically', () => {
  const spine = new Spine(null);
  const cs = new Contextsmith({ spine });
  cs.put('CLAUDE.md', 'v1');
  assert.equal(cs.active('CLAUDE.md').version, 1);
  // the version event precedes the activate event on the timeline
  const kinds = spine.all().map((e) => e.kind);
  assert.deepEqual(kinds, ['context.version', 'context.activate']);
});

test('contextsmith: identical content dedups (no new version, no new event)', () => {
  const cs = new Contextsmith({ spine: new Spine(null) });
  cs.put('p', 'same');
  const before = cs.history('p').length;
  const r = cs.put('p', 'same');
  assert.equal(r.deduped, true);
  assert.equal(cs.history('p').length, before);
});

test('contextsmith: activate rejects version 0, negatives and unknown versions', () => {
  const cs = new Contextsmith({ spine: new Spine(null) });
  cs.put('p', 'x');
  assert.throws(() => cs.activate('p', 0), /no version 0/);
  assert.throws(() => cs.activate('p', -1), /no version -1/);
  assert.throws(() => cs.activate('p', 99), /no version 99/);
  assert.throws(() => cs.activate('nope', 1), /no context artifact/);
});

test('contextsmith: diff of identical content is empty', () => {
  const cs = new Contextsmith({ spine: new Spine(null) });
  cs.put('p', 'x');           // v1
  cs.put('p', 'y');           // v2
  cs.put('p', 'x');           // v3 == v1 content (not deduped: latest was 'y')
  const d = cs.diff('p', 1, 3);
  assert.equal(d.added, 0);
  assert.equal(d.removed, 0);
  assert.ok(d.hunks.every((h) => h.op === ' '));
});

test('contextsmith: embedded newlines version and diff line-by-line', () => {
  const cs = new Contextsmith({ spine: new Spine(null) });
  cs.put('p', 'a\nb\nc');
  cs.put('p', 'a\nB\nc');
  const d = cs.diff('p', 1, 2);
  assert.equal(d.added, 1);
  assert.equal(d.removed, 1);
  assert.ok(d.hunks.some((h) => h.op === '-' && h.line === 'b'));
  assert.ok(d.hunks.some((h) => h.op === '+' && h.line === 'B'));
});

test('contextsmith: lineDiff is correct on a small case (LCS is O(n*m) — pathological on huge inputs)', () => {
  // NOTE: lineDiff builds an (m+1)x(n+1) DP table; a 10k x 10k diff is ~100M cells
  // and would blow memory/time. Not exercised here — flagged as a scaling caveat.
  const d = lineDiff('one\ntwo\nthree', 'one\ntwo\nthree\nfour');
  assert.equal(d.added, 1);
  assert.equal(d.removed, 0);
  assert.equal(d.hunks.at(-1).line, 'four');
});

// ===========================================================================
// cortex-mcp.js
// ===========================================================================
function brain() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cortex-adv-'));
  const index = new BrainIndex(dir);
  save(index, { id: 'm1', name: 'Retry policy', summary: 'Backoff.', content: '# Retry\n\nUse exponential backoff.' });
  return { index, cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) };
}
function srv() { const b = brain(); return { srv: new CortexMcpServer({ index: b.index }), cleanup: b.cleanup }; }

test('cortex: id=0 is NOT misclassified as a notification — it gets a response', () => {
  const { srv: s, cleanup } = srv();
  try {
    const res = s.handle({ jsonrpc: '2.0', id: 0, method: 'tools/list' });
    assert.ok(res, 'id=0 must produce a response');
    assert.equal(res.id, 0);
    assert.ok(res.result.tools.length >= 1);
  } finally { cleanup(); }
});

test('cortex: id=0 is preserved (not coerced to null) on an invalid request', () => {
  const { srv: s, cleanup } = srv();
  try {
    const res = s.handle({ jsonrpc: '2.0', id: 0 }); // missing method
    assert.equal(res.error.code, -32600);
    assert.equal(res.id, 0, 'nullish-coalescing keeps id 0, not null');
  } finally { cleanup(); }
});

test('cortex: id=null request is answered (treated as a request, not a notification)', () => {
  const { srv: s, cleanup } = srv();
  try {
    const res = s.handle({ jsonrpc: '2.0', id: null, method: 'tools/list' });
    assert.ok(res.result.tools);
    assert.equal(res.id, null);
  } finally { cleanup(); }
});

test('cortex: tools/call with params entirely missing is a tool error, not a crash', () => {
  const { srv: s, cleanup } = srv();
  try {
    const res = s.handle({ jsonrpc: '2.0', id: 1, method: 'tools/call' });
    assert.equal(res.result.isError, true);
    assert.match(res.result.content[0].text, /unknown tool/);
  } finally { cleanup(); }
});

test('cortex: memory_search with a non-string query returns isError, never throws', () => {
  const { srv: s, cleanup } = srv();
  try {
    for (const query of [5, ['a'], { q: 1 }, null, true]) {
      const res = s.handle({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'memory_search', arguments: { query } } });
      assert.equal(res.result.isError, true, `query=${JSON.stringify(query)} -> tool error`);
      assert.match(res.result.content[0].text, /requires a string "query"/);
    }
  } finally { cleanup(); }
});

test('cortex: an index that throws is caught and returned as a tool error', () => {
  const boom = { all: () => { throw new Error('index exploded'); } };
  const s = new CortexMcpServer({ index: boom });
  const res = s.handle({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'memory_stats' } });
  assert.equal(res.result.isError, true);
  assert.match(res.result.content[0].text, /tool error: index exploded/);
});

test('cortex: malformed JSON-RPC (missing jsonrpc / missing method) -> -32600', () => {
  const { srv: s, cleanup } = srv();
  try {
    assert.equal(s.handle({ id: 1, method: 'tools/list' }).error.code, -32600);
    assert.equal(s.handle({ jsonrpc: '2.0', id: 1 }).error.code, -32600);
    assert.equal(s.handle(null).error.code, -32600);
  } finally { cleanup(); }
});
