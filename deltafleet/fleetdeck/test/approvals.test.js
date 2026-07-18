import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Spine } from '../lib/spine.js';
import { Tollgate } from '../lib/tollgate.js';
import { Approvals } from '../lib/approvals.js';

function tmp() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'approvals-'));
  return { dir, file: path.join(dir, 'spine.jsonl'), cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) };
}

const MANIFEST = {
  default: 'deny',
  agents: { writer: { 'cms-mcp': { allow: ['read_*'], review: ['publish_*'], deny: ['delete_*'] } } },
};

function scene() {
  const spine = new Spine(null, { indexBy: ['agent', 'server'] });
  const gate = new Tollgate({ spine, manifest: MANIFEST });
  const inbox = new Approvals({ spine });
  return { spine, gate, inbox };
}

test('a review decision becomes an open inbox item', () => {
  const { gate, inbox } = scene();
  gate.guard('writer', 'cms-mcp', 'read_draft', {});      // allow — no inbox item
  gate.guard('writer', 'cms-mcp', 'publish_post', { id: 7 }); // review — inbox item
  const open = inbox.pending();
  assert.equal(open.length, 1);
  assert.equal(open[0].tool, 'publish_post');
  assert.deepEqual(open[0].input, { id: 7 });
  assert.equal(open[0].agent, 'writer');
});

test('approve records a verdict and clears the item from pending', () => {
  const { gate, inbox } = scene();
  const call = gate.guard('writer', 'cms-mcp', 'publish_post', { id: 7 });
  const ref = inbox.pending()[0].ref;
  const ev = inbox.approve(ref, 'jacob', 'looks good');
  assert.equal(ev.kind, 'approval.verdict');
  assert.equal(inbox.pending().length, 0);
  const hist = inbox.history();
  assert.equal(hist.length, 1);
  assert.equal(hist[0].verdict, 'approved');
  assert.equal(hist[0].by, 'jacob');
  assert.equal(hist[0].note, 'looks good');
  assert.equal(inbox.isApproved(ref), true);
  // the ref is exactly the tool.call event id — request and verdict linked on the timeline
  assert.equal(ref, call ? inbox.history()[0].ref : null);
});

test('reject records a rejected verdict', () => {
  const { gate, inbox } = scene();
  gate.guard('writer', 'cms-mcp', 'publish_post', {});
  const ref = inbox.pending()[0].ref;
  inbox.reject(ref, 'jacob', 'wrong audience');
  assert.equal(inbox.isApproved(ref), false);
  assert.equal(inbox.history()[0].verdict, 'rejected');
  assert.equal(inbox.history()[0].note, 'wrong audience');
});

test('double-resolving the same ref throws with the prior verdict', () => {
  const { gate, inbox } = scene();
  gate.guard('writer', 'cms-mcp', 'publish_post', {});
  const ref = inbox.pending()[0].ref;
  inbox.approve(ref, 'jacob');
  assert.throws(() => inbox.approve(ref, 'someone'), /already approved by jacob/);
  assert.throws(() => inbox.reject(ref, 'someone'), /already approved by jacob/);
});

test('resolving an unknown ref throws (never invents an approval)', () => {
  const { inbox } = scene();
  assert.throws(() => inbox.approve('evt_zzzzzz', 'jacob'), /no open approval/);
});

test('pending is FIFO (oldest first); history is newest first', () => {
  const { gate, inbox } = scene();
  gate.guard('writer', 'cms-mcp', 'publish_post', { id: 1 });
  gate.guard('writer', 'cms-mcp', 'publish_post', { id: 2 });
  gate.guard('writer', 'cms-mcp', 'publish_post', { id: 3 });
  const open = inbox.pending();
  assert.deepEqual(open.map((x) => x.input.id), [1, 2, 3]);
  inbox.approve(open[0].ref, 'a');
  inbox.reject(open[1].ref, 'a');
  assert.deepEqual(inbox.history().map((x) => x.input.id), [2, 1], 'newest verdict first');
  assert.deepEqual(inbox.pending().map((x) => x.input.id), [3], 'the untouched one stays open');
});

test('inbox survives a reload — request + verdict replay from disk', () => {
  const { file, cleanup } = tmp();
  try {
    const spine = new Spine(file, { indexBy: ['agent', 'server'] });
    const gate = new Tollgate({ spine, manifest: MANIFEST });
    const inbox = new Approvals({ spine });
    gate.guard('writer', 'cms-mcp', 'publish_post', { id: 9 });
    const ref = inbox.pending()[0].ref;
    inbox.approve(ref, 'jacob');

    // fresh process view of the same file
    const spine2 = new Spine(file, { indexBy: ['agent', 'server'] });
    const inbox2 = new Approvals({ spine: spine2 });
    assert.equal(inbox2.pending().length, 0);
    assert.equal(inbox2.history().length, 1);
    assert.equal(inbox2.isApproved(ref), true);
  } finally { cleanup(); }
});
