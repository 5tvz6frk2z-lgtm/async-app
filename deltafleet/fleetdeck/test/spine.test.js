import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Spine } from '../lib/spine.js';

function tmp() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'spine-'));
  return { dir, file: path.join(dir, 'spine.jsonl'), cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) };
}

test('append stamps id/seq/ts and preserves payload', () => {
  const s = new Spine(null);
  const e = s.append('tool.call', { agent: 'a1', tool: 'email.send' });
  assert.equal(e.seq, 0);
  assert.equal(e.id, 'evt_000000');
  assert.equal(e.kind, 'tool.call');
  assert.equal(e.agent, 'a1');
  assert.equal(e.tool, 'email.send');
  assert.match(e.ts, /^\d{4}-\d{2}-\d{2}T/);
  const e2 = s.append('tool.result', { agent: 'a1' });
  assert.equal(e2.seq, 1);
  assert.equal(s.version, 2);
  assert.equal(s.length, 2);
});

test('append rejects a non-string kind', () => {
  const s = new Spine(null);
  assert.throws(() => s.append('', {}), /non-empty string/);
  assert.throws(() => s.append(null, {}), /non-empty string/);
});

test('persists to disk and reloads identically', () => {
  const { file, cleanup } = tmp();
  try {
    const s = new Spine(file);
    s.append('tool.call', { agent: 'a1', tool: 't', input: { to: 'x' } });
    s.append('tool.result', { agent: 'a1', ok: true });
    const reloaded = new Spine(file);
    assert.equal(reloaded.length, 2);
    assert.deepEqual(reloaded.all().map((e) => e.kind), ['tool.call', 'tool.result']);
    assert.deepEqual(reloaded.all()[0].input, { to: 'x' });
    // seq continues from the loaded count, so ids never collide after restart
    const e = reloaded.append('note', {});
    assert.equal(e.seq, 2);
    assert.equal(e.id, 'evt_000002');
  } finally { cleanup(); }
});

test('crash-safe: tolerates one torn final line, truncates it', () => {
  const { file, cleanup } = tmp();
  try {
    const s = new Spine(file);
    s.append('a', { agent: 'x' });
    s.append('b', { agent: 'y' });
    fs.appendFileSync(file, '{"kind":"c","agent":"z"'); // torn: no closing brace, no newline
    const reloaded = new Spine(file);
    assert.equal(reloaded.length, 2, 'torn final record dropped');
    // file was truncated so the next append writes cleanly after the last intact record
    reloaded.append('d', { agent: 'w' });
    const again = new Spine(file);
    assert.deepEqual(again.all().map((e) => e.kind), ['a', 'b', 'd']);
  } finally { cleanup(); }
});

test('corruption in the MIDDLE of the log throws (never silently rewrites history)', () => {
  const { file, cleanup } = tmp();
  try {
    fs.writeFileSync(file, '{"seq":0,"kind":"a"}\nGARBAGE\n{"seq":2,"kind":"c"}\n');
    assert.throws(() => new Spine(file), /corrupt at line 2/);
  } finally { cleanup(); }
});

test('projection: built by replay, then advanced incrementally', () => {
  const s = new Spine(null);
  s.append('tool.call', { agent: 'a1' });
  s.append('tool.call', { agent: 'a2' });
  // register AFTER two events exist -> replay must count them
  const counts = s.project('callsPerAgent', {
    init: () => ({}),
    apply: (st, e) => { if (e.kind === 'tool.call') st[e.agent] = (st[e.agent] || 0) + 1; },
  });
  assert.deepEqual(counts, { a1: 1, a2: 1 });
  s.append('tool.call', { agent: 'a1' });      // advance incrementally
  s.append('note', { agent: 'a1' });           // ignored by reducer
  assert.deepEqual(s.view('callsPerAgent'), { a1: 2, a2: 1 });
});

test('projection supporting immutable return (apply returns new state)', () => {
  const s = new Spine(null);
  const total = s.project('count', { init: () => 0, apply: (n) => n + 1 });
  assert.equal(total, 0);
  s.append('x', {});
  s.append('y', {});
  assert.equal(s.view('count'), 2);
});

test('re-registering a projection rebuilds it (idempotent on restart)', () => {
  const s = new Spine(null);
  s.append('x', {});
  s.project('c', { init: () => 0, apply: (n) => n + 1 });
  assert.equal(s.view('c'), 1);
  s.project('c', { init: () => 100, apply: (n) => n + 1 }); // replace + rebuild
  assert.equal(s.view('c'), 101);
});

test('project validates the reducer shape', () => {
  const s = new Spine(null);
  assert.throws(() => s.project('bad', {}), /needs \{ init\(\), apply/);
  assert.throws(() => s.project('bad', { init: () => 0 }), /needs \{ init\(\), apply/);
});

test('view() on an unknown projection throws', () => {
  const s = new Spine(null);
  assert.throws(() => s.view('nope'), /no projection named "nope"/);
});

test('listeners fire after the projection is advanced', () => {
  const s = new Spine(null);
  s.project('c', { init: () => 0, apply: (n) => n + 1 });
  let seenAtListen = null;
  s.onEvent(() => { seenAtListen = s.view('c'); });
  s.append('x', {});
  assert.equal(seenAtListen, 1, 'listener saw a projection that already included the new event');
});

test('query by kind uses the index', () => {
  const s = new Spine(null);
  s.append('tool.call', { agent: 'a1' });
  s.append('tool.result', { agent: 'a1' });
  s.append('tool.call', { agent: 'a2' });
  const calls = s.query({ kind: 'tool.call' });
  assert.equal(calls.length, 2);
  assert.deepEqual(calls.map((e) => e.agent), ['a1', 'a2']);
});

test('query by where.agent + kind intersects indexes', () => {
  const s = new Spine(null);
  s.append('tool.call', { agent: 'a1' });
  s.append('tool.call', { agent: 'a2' });
  s.append('tool.call', { agent: 'a1' });
  const a1calls = s.query({ kind: 'tool.call', where: { agent: 'a1' } });
  assert.equal(a1calls.length, 2);
  assert.ok(a1calls.every((e) => e.agent === 'a1'));
});

test('query where on a non-indexed field throws (fail loud, not silently wrong)', () => {
  const s = new Spine(null, { indexBy: ['agent'] });
  s.append('tool.call', { agent: 'a1', tool: 't' });
  assert.throws(() => s.query({ where: { tool: 't' } }), /not an indexed field/);
});

test('custom indexBy lets you query another dimension', () => {
  const s = new Spine(null, { indexBy: ['agent', 'server'] });
  s.append('tool.call', { agent: 'a1', server: 'gh' });
  s.append('tool.call', { agent: 'a2', server: 'gh' });
  s.append('tool.call', { agent: 'a1', server: 'slack' });
  assert.equal(s.query({ where: { server: 'gh' } }).length, 2);
  assert.equal(s.query({ where: { server: 'slack' } }).length, 1);
});

test('query since/until by seq and by ts, plus reverse and limit', () => {
  const s = new Spine(null);
  for (let i = 0; i < 5; i++) s.append('x', { agent: 'a', n: i });
  assert.deepEqual(s.query({ since: 2 }).map((e) => e.n), [2, 3, 4]);
  assert.deepEqual(s.query({ until: 1 }).map((e) => e.n), [0, 1]);
  assert.deepEqual(s.query({ since: 1, until: 3 }).map((e) => e.n), [1, 2, 3]);
  assert.deepEqual(s.query({ reverse: true, limit: 2 }).map((e) => e.n), [4, 3]);
  // ts bound (string): everything is >= the first event's ts
  const firstTs = s.all()[0].ts;
  assert.equal(s.query({ since: firstTs }).length, 5);
});

test('query returns empty (not all) when an intersection is empty', () => {
  const s = new Spine(null);
  s.append('tool.call', { agent: 'a1' });
  assert.deepEqual(s.query({ kind: 'tool.call', where: { agent: 'ghost' } }), []);
});

test('reloaded spine rebuilds query indexes and projections', () => {
  const { file, cleanup } = tmp();
  try {
    const s = new Spine(file);
    s.append('tool.call', { agent: 'a1' });
    s.append('tool.call', { agent: 'a2' });
    const reloaded = new Spine(file);
    assert.equal(reloaded.query({ kind: 'tool.call' }).length, 2);
    assert.equal(reloaded.query({ where: { agent: 'a1' } }).length, 1);
    const c = reloaded.project('c', { init: () => 0, apply: (n) => n + 1 });
    assert.equal(c, 2, 'projection replayed the loaded events');
  } finally { cleanup(); }
});
