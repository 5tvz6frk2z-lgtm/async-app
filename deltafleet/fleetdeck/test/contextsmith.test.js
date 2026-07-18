import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Spine } from '../lib/spine.js';
import { Contextsmith, lineDiff } from '../lib/contextsmith.js';

function tmp() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctx-'));
  return { file: path.join(dir, 'spine.jsonl'), cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) };
}

test('first put creates v1 and auto-activates it', () => {
  const cs = new Contextsmith({ spine: new Spine(null) });
  const r = cs.put('CLAUDE.md', 'Be concise.');
  assert.equal(r.version, 1);
  assert.equal(r.deduped, false);
  assert.equal(cs.active('CLAUDE.md').version, 1);
  assert.equal(cs.active('CLAUDE.md').content, 'Be concise.');
});

test('a new distinct put bumps the version but does NOT auto-activate', () => {
  const cs = new Contextsmith({ spine: new Spine(null) });
  cs.put('CLAUDE.md', 'v1 text');
  const r = cs.put('CLAUDE.md', 'v2 text');
  assert.equal(r.version, 2);
  assert.equal(cs.active('CLAUDE.md').version, 1, 'activation is deliberate, not automatic on new versions');
  cs.activate('CLAUDE.md', 2);
  assert.equal(cs.active('CLAUDE.md').version, 2);
});

test('identical content is content-addressed and deduped', () => {
  const cs = new Contextsmith({ spine: new Spine(null) });
  cs.put('p', 'same');
  const r = cs.put('p', 'same');
  assert.equal(r.deduped, true);
  assert.equal(r.version, 1);
  assert.equal(cs.history('p').length, 1, 'no duplicate version created');
});

test('rollback is just activating an older version', () => {
  const cs = new Contextsmith({ spine: new Spine(null) });
  cs.put('sys', 'A'); cs.put('sys', 'B'); cs.activate('sys', 2);
  assert.equal(cs.active('sys').content, 'B');
  cs.activate('sys', 1); // rollback
  assert.equal(cs.active('sys').content, 'A');
});

test('activate validates the artifact and version exist', () => {
  const cs = new Contextsmith({ spine: new Spine(null) });
  assert.throws(() => cs.activate('nope', 1), /no context artifact/);
  cs.put('x', 'a');
  assert.throws(() => cs.activate('x', 9), /no version 9/);
});

test('history flags the active version; list summarizes artifacts', () => {
  const cs = new Contextsmith({ spine: new Spine(null) });
  cs.put('a', '1'); cs.put('a', '2'); cs.activate('a', 2);
  cs.put('b', 'x');
  const h = cs.history('a');
  assert.equal(h.length, 2);
  assert.equal(h.find((v) => v.version === 2).active, true);
  assert.equal(h.find((v) => v.version === 1).active, false);
  assert.deepEqual(cs.list().sort((x, y) => x.name.localeCompare(y.name)), [
    { name: 'a', active: 2, versions: 2 },
    { name: 'b', active: 1, versions: 1 },
  ]);
});

test('diff reports added/removed lines between versions', () => {
  const cs = new Contextsmith({ spine: new Spine(null) });
  cs.put('p', 'line one\nline two\nline three');
  cs.put('p', 'line one\nline TWO changed\nline three\nline four');
  const d = cs.diff('p', 1, 2);
  assert.equal(d.removed, 1); // "line two"
  assert.equal(d.added, 2);   // "line TWO changed" + "line four"
  assert.ok(d.hunks.some((h) => h.op === '-' && h.line === 'line two'));
  assert.ok(d.hunks.some((h) => h.op === '+' && h.line === 'line four'));
});

test('lineDiff on identical text has no changes', () => {
  const d = lineDiff('a\nb\nc', 'a\nb\nc');
  assert.equal(d.added, 0);
  assert.equal(d.removed, 0);
  assert.ok(d.hunks.every((h) => h.op === ' '));
});

test('versions and activations survive a reload (replayed from the spine)', () => {
  const { file, cleanup } = tmp();
  try {
    const cs = new Contextsmith({ spine: new Spine(file) });
    cs.put('CLAUDE.md', 'first'); cs.put('CLAUDE.md', 'second'); cs.activate('CLAUDE.md', 2);
    const cs2 = new Contextsmith({ spine: new Spine(file) });
    assert.equal(cs2.active('CLAUDE.md').version, 2);
    assert.equal(cs2.active('CLAUDE.md').content, 'second');
    assert.equal(cs2.history('CLAUDE.md').length, 2);
  } finally { cleanup(); }
});

test('activation is recorded on the timeline for correlation', () => {
  const spine = new Spine(null);
  const cs = new Contextsmith({ spine });
  cs.put('CLAUDE.md', 'v1'); // version + activate events
  cs.put('CLAUDE.md', 'v2'); cs.activate('CLAUDE.md', 2);
  const activations = spine.query({ kind: 'context.activate' });
  assert.equal(activations.length, 2); // auto v1 + manual v2
  assert.equal(activations[activations.length - 1].version, 2);
});
