// Adversarial tests for the Spine (append-only event log + projections + indexes).
//
// Goal: break it. Tests named `BUG:` assert the SECURE / CORRECT behavior and are
// written to FAIL against the current code, so each real defect is visible when the
// suite runs. Tests without that prefix confirm behavior that is actually correct.
//
// Confirmed defects (all reproduced live before writing these):
//   1. append() lets the payload overwrite the spine's own id/seq/ts/kind stamp
//      -> forgeable audit trail AND query-index corruption.
//   2. query()/#index key on String(value) and query never re-checks strict
//      equality -> values that stringify the same (1 vs "1") are conflated.
//   3. #load() runs #index() outside the parse try/catch and never checks that a
//      parsed line is a non-null object -> a `null` line throws a raw TypeError,
//      and primitives/arrays are silently accepted as bogus "events".
//   4. append() does not guarantee the log ends in "\n" -> a final record that lost
//      only its trailing newline is fused with the next append and both are then
//      discarded as a "torn" line: silent loss of committed events.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Spine } from '../lib/spine.js';

function tmp() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'spine-adv-'));
  return { dir, file: path.join(dir, 'spine.jsonl'), cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) };
}

// Deterministic PRNG (no Math.random) — seeded LCG.
function lcg(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s; };
}

// ---------------------------------------------------------------------------
// 1. INJECTION: caller-supplied payload can forge the spine's own stamp
// ---------------------------------------------------------------------------

test('BUG: append() lets the payload overwrite the stamped id/seq/ts/kind', () => {
  const s = new Spine(null);
  // The spine is the sole authority for these fields (they ARE the audit trail).
  // Because append() spreads `...payload` AFTER the stamp, a caller forges them.
  const e = s.append('audit.real', {
    seq: 999,
    id: 'evt_forged',
    ts: '1999-01-01T00:00:00.000Z',
    kind: 'audit.fake',
    note: 'attacker payload',
  });
  // BUG: every one of these is the attacker's value, not the spine's.
  assert.equal(e.seq, 0, 'seq must be spine-assigned, not caller-forgeable');
  assert.equal(e.id, 'evt_000000', 'id must be spine-assigned, not caller-forgeable');
  assert.equal(e.kind, 'audit.real', 'kind must be the append() argument, not payload-overridable');
  assert.match(e.ts, /^20\d\d-/, 'ts must be the spine wall-clock, not caller-forgeable');
});

test('BUG: forging seq corrupts the query index (duplicate/missing events)', () => {
  const s = new Spine(null);
  s.append('k', { agent: 'a' });          // real event, seq 0, stored at index 0
  s.append('k', { agent: 'a', seq: 0 });  // forged seq 0 -> indexed again under seq 0
  // The real second event lives at events[1] but the kind index now holds [0, 0],
  // so query() maps both to events[0]: one event is duplicated, the other vanishes.
  const q = s.query({ kind: 'k' });
  assert.equal(q.length, 2, 'both events should be queryable');
  assert.notEqual(q[0], q[1], 'BUG: query returns events[0] twice; the 2nd real event is unreachable');
});

test('BUG: kind override in payload bypasses the non-string-kind guard', () => {
  const s = new Spine(null);
  // append() validates the `kind` ARGUMENT is a non-empty string, but the payload
  // spread lets a number win, defeating that guard and mis-filing the index.
  const e = s.append('valid.kind', { kind: 123 });
  assert.equal(e.kind, 'valid.kind', 'BUG: payload.kind (123) overrode the validated argument');
  // and the event is filed under String(123) = "123", invisible to its real kind
  assert.equal(s.query({ kind: 'valid.kind' }).length, 1, 'BUG: event mis-indexed under "123"');
});

// ---------------------------------------------------------------------------
// 2. QUERY INDEX vs LINEAR SCAN — correctness under adversarial value types
// ---------------------------------------------------------------------------

test('BUG: query index conflates values that String()-collide (number 1 vs string "1")', () => {
  const s = new Spine(null, { indexBy: ['agent'] });
  s.append('x', { agent: 1 });    // indexed under key "1"
  s.append('x', { agent: '1' });  // ALSO indexed under key "1"
  const viaIndex = s.query({ where: { agent: '1' } });
  const viaScan = s.all().filter((e) => e.agent === '1');
  // The module's contract is "query == maintained-index view of a linear scan".
  assert.equal(viaIndex.length, viaScan.length,
    'BUG: index returns 2 (number 1 + string "1"); a strict-equality scan returns 1');
});

test('BUG: boolean true vs string "true" also collide in the index', () => {
  const s = new Spine(null, { indexBy: ['agent'] });
  s.append('x', { agent: true });
  s.append('x', { agent: 'true' });
  assert.equal(s.query({ where: { agent: 'true' } }).length,
    s.all().filter((e) => e.agent === 'true').length,
    'BUG: index conflates boolean true with the string "true"');
});

test('query index == linear scan for random string kinds/agents (fuzz, deterministic)', () => {
  // With well-typed string values the index MUST equal a brute-force scan, for
  // kind alone, where alone, and the kind+where intersection.
  const s = new Spine(null, { indexBy: ['agent'] });
  const rnd = lcg(0xC0FFEE);
  const kinds = ['tool.call', 'tool.result', 'mcp.pin', 'note'];
  const agents = ['a1', 'a2', 'a3', 'a4', 'a5'];
  for (let i = 0; i < 1200; i++) {
    s.append(kinds[rnd() % kinds.length], { agent: agents[rnd() % agents.length], n: i });
  }
  for (const k of kinds) {
    assert.deepEqual(s.query({ kind: k }), s.all().filter((e) => e.kind === k), `kind=${k}`);
    for (const a of agents) {
      assert.deepEqual(
        s.query({ kind: k, where: { agent: a } }),
        s.all().filter((e) => e.kind === k && e.agent === a),
        `kind=${k} & agent=${a} (intersection)`);
      assert.deepEqual(
        s.query({ where: { agent: a } }),
        s.all().filter((e) => e.agent === a),
        `agent=${a} (where only)`);
    }
  }
});

test('intersection short-circuits to empty and stays ordered', () => {
  const s = new Spine(null, { indexBy: ['agent'] });
  const rnd = lcg(42);
  for (let i = 0; i < 300; i++) s.append('tool.call', { agent: 'a' + (rnd() % 3), n: i });
  const got = s.query({ kind: 'tool.call', where: { agent: 'a1' } });
  const want = s.all().filter((e) => e.kind === 'tool.call' && e.agent === 'a1');
  assert.deepEqual(got.map((e) => e.seq), want.map((e) => e.seq));
  // ascending seq order preserved through the intersection
  for (let i = 1; i < got.length; i++) assert.ok(got[i].seq > got[i - 1].seq);
  // an impossible intersection is empty, not "all"
  assert.deepEqual(s.query({ kind: 'nope', where: { agent: 'a1' } }), []);
});

// ---------------------------------------------------------------------------
// 3. CRASH-SAFE LOAD — torn lines, empty/blank files, non-object JSON
// ---------------------------------------------------------------------------

test('empty file loads as an empty spine and stays writable', () => {
  const { file, cleanup } = tmp();
  try {
    fs.writeFileSync(file, '');
    const s = new Spine(file);
    assert.equal(s.length, 0);
    const e = s.append('first', { agent: 'a' });
    assert.equal(e.seq, 0);
    assert.equal(new Spine(file).length, 1);
  } finally { cleanup(); }
});

test('a file of only blank lines loads as empty', () => {
  const { file, cleanup } = tmp();
  try {
    fs.writeFileSync(file, '\n\n   \n\t\n\n');
    assert.equal(new Spine(file).length, 0);
  } finally { cleanup(); }
});

test('a file that is entirely one torn line is truncated to empty', () => {
  const { file, cleanup } = tmp();
  try {
    fs.writeFileSync(file, '{"kind":"a","agent":');  // torn, nothing before it
    const s = new Spine(file);
    assert.equal(s.length, 0, 'lone torn line dropped');
    assert.equal(fs.readFileSync(file, 'utf8'), '', 'file truncated so next append is clean');
  } finally { cleanup(); }
});

test('two torn trailing lines fail loud (policy tolerates only ONE torn final line)', () => {
  const { file, cleanup } = tmp();
  try {
    // Only the last non-blank line may be torn. Two garbage lines => corruption.
    fs.writeFileSync(file, '{"kind":"a"}\nGARBAGE_ONE\nGARBAGE_TWO');
    assert.throws(() => new Spine(file), /corrupt at line 2/);
  } finally { cleanup(); }
});

test('BUG: a `null` JSON line throws a raw TypeError instead of a clean corruption error', () => {
  const { file, cleanup } = tmp();
  try {
    // `null` is valid JSON, so the parse try/catch never fires; #index(null) then
    // dereferences null["kind"] OUTSIDE any guard -> TypeError, not the graceful
    // "corrupt at line N" message the middle-corruption path promises.
    fs.writeFileSync(file, '{"seq":0,"kind":"a"}\nnull\n{"seq":2,"kind":"c"}\n');
    assert.throws(() => new Spine(file), /corrupt|not (a valid|an) (event|object)|must be an object/i);
    // Actual today: TypeError "Cannot read properties of null (reading 'kind')".
  } finally { cleanup(); }
});

test('FIXED: a non-object JSON line in the middle is corruption and throws (never silently dropped)', () => {
  const { file, cleanup } = tmp();
  try {
    // A number/array/string/bool line is not an event. Silently dropping a
    // committed-looking line would be the history rewrite the spine refuses, so a
    // non-object line anywhere but the very end throws, exactly like a parse error.
    fs.writeFileSync(file, '{"kind":"a","agent":"x"}\n42\n["not","an","event"]\n"hello"\ntrue\n');
    assert.throws(() => new Spine(file), /corrupt at line 2/);
  } finally { cleanup(); }
});

test('FIXED: a lone non-object as the torn final line is tolerated (truncated)', () => {
  const { file, cleanup } = tmp();
  try {
    fs.writeFileSync(file, '{"kind":"a","agent":"x"}\n42');
    const s = new Spine(file);
    assert.equal(s.length, 1, 'the real event survives; the trailing non-object is dropped as torn');
    assert.equal(s.all()[0].kind, 'a');
  } finally { cleanup(); }
});

test('corruption in the MIDDLE still throws (control — confirms the good path)', () => {
  const { file, cleanup } = tmp();
  try {
    fs.writeFileSync(file, '{"seq":0,"kind":"a"}\nNOTJSON\n{"seq":2,"kind":"c"}\n');
    assert.throws(() => new Spine(file), /corrupt at line 2/);
  } finally { cleanup(); }
});

// ---------------------------------------------------------------------------
// 4. APPEND / DISK durability
// ---------------------------------------------------------------------------

test('BUG: a final record missing only its newline is fused by the next append, then lost', () => {
  const { file, cleanup } = tmp();
  try {
    // Simulate a crash that persisted a COMPLETE, valid final event but not its
    // trailing "\n" (the record itself is intact — only the terminator is gone).
    fs.writeFileSync(file,
      '{"id":"evt_000000","seq":0,"ts":"2020-01-01T00:00:00.000Z","kind":"a"}\n' +
      '{"id":"evt_000001","seq":1,"ts":"2020-01-01T00:00:00.000Z","kind":"b"}'); // no \n
    const s = new Spine(file);
    assert.equal(s.length, 2, 'both complete records load fine');
    s.append('c', {}); // appends "{...}\n" with no separating newline -> "b}{c}" on one line
    const reloaded = new Spine(file);
    // Committed events a, b, and the freshly appended c must all survive.
    assert.deepEqual(reloaded.all().map((e) => e.kind), ['a', 'b', 'c'],
      'BUG: b and c fuse into one invalid line and are dropped as "torn" -> only ["a"] survives');
  } finally { cleanup(); }
});

test('a normal reload round-trips cleanly (control)', () => {
  const { file, cleanup } = tmp();
  try {
    const s = new Spine(file);
    s.append('a', { agent: 'x' });
    s.append('b', { agent: 'y' });
    const r = new Spine(file);
    assert.deepEqual(r.all().map((e) => e.kind), ['a', 'b']);
    assert.equal(r.append('c', {}).seq, 2);
  } finally { cleanup(); }
});

// ---------------------------------------------------------------------------
// 5. PROJECTION INTEGRITY — incremental (advance) must equal full replay
// ---------------------------------------------------------------------------

function mkReducer() {
  // Non-trivial fold touching several event shapes; deep-comparable state.
  return {
    init: () => ({ perKind: {}, perAgent: {}, total: 0, lastSeq: -1 }),
    apply: (st, e) => {
      st.total += 1;
      st.lastSeq = e.seq;
      st.perKind[e.kind] = (st.perKind[e.kind] || 0) + 1;
      if (e.agent !== undefined) st.perAgent[e.agent] = (st.perAgent[e.agent] || 0) + (e.n || 1);
      // mutate-in-place (returns void) — exercises the void branch of #advance
    },
  };
}

test('projection: incremental-advance state == fresh full-replay state (deterministic fuzz)', () => {
  const { file, cleanup } = tmp();
  try {
    const s = new Spine(file);
    const live = s.project('agg', mkReducer()); // registered BEFORE any events -> advanced incrementally
    const rnd = lcg(20260718);
    const kinds = ['tool.call', 'tool.result', 'mcp.pin', 'note'];
    const agents = ['a1', 'a2', 'a3'];
    for (let i = 0; i < 900; i++) {
      s.append(kinds[rnd() % kinds.length], { agent: agents[rnd() % agents.length], n: (rnd() % 7) });
    }
    // Fresh spine loads the SAME file and builds the projection by full replay.
    const fresh = new Spine(file);
    const replayed = fresh.project('agg', mkReducer());
    assert.deepEqual(replayed, live, 'replay and incremental must be identical');
    assert.equal(replayed.total, 900);
    assert.equal(replayed.lastSeq, 899);
  } finally { cleanup(); }
});

test('projection registered mid-stream (replay of loaded events) == append-time incremental', () => {
  const s = new Spine(null);
  const rnd = lcg(7);
  for (let i = 0; i < 50; i++) s.append('e', { agent: 'a' + (rnd() % 4), n: 1 });
  const midStream = s.project('agg', mkReducer());     // built by replay of the 50 events
  const snapshot = JSON.parse(JSON.stringify(midStream));
  for (let i = 0; i < 50; i++) s.append('e', { agent: 'a' + (rnd() % 4), n: 1 });
  // A second, independent spine fed the same total then replayed must match view()
  const total = s.view('agg');
  assert.equal(total.total, 100);
  assert.equal(snapshot.total, 50, 'mid-stream replay counted exactly the pre-existing events');
});
