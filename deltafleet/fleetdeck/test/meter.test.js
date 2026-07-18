import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Spine } from '../lib/spine.js';
import { Meter, costOf, validateBudgets, meterEvents } from '../lib/meter.js';

function tmp() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'meter-'));
  return { dir, file: path.join(dir, 'spine.jsonl'), cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) };
}

test('costOf: verbatim costUsd wins; else derived from tokens x pricing', () => {
  assert.equal(costOf({ costUsd: 0.5 }), 0.5);
  assert.equal(costOf({ costUsd: 0 }), 0, 'explicit zero is respected, not treated as missing');
  const pricing = { 'claude-fable-5': { in: 3, out: 15 } };
  assert.equal(costOf({ model: 'claude-fable-5', tokensIn: 1e6, tokensOut: 1e6 }, pricing), 18);
  assert.equal(costOf({ model: 'unknown-model', tokensIn: 1e6 }, pricing), 0, 'no price -> 0');
});

test('validateBudgets catches bad shapes', () => {
  assert.deepEqual(validateBudgets([{ id: 'ok', scope: 'total', window: 'total', limitUsd: 10 }]), []);
  assert.ok(validateBudgets([{ scope: 'nope', window: 'total', limitUsd: 1 }]).some((e) => /scope must be/.test(e)));
  assert.ok(validateBudgets([{ scope: 'total', window: 'week', limitUsd: 1 }]).some((e) => /window must be/.test(e)));
  assert.ok(validateBudgets([{ scope: 'total', window: 'total', limitUsd: 0 }]).some((e) => /positive number/.test(e)));
  assert.ok(validateBudgets([{ scope: 'agent', window: 'total', limitUsd: 1 }]).some((e) => /key is required/.test(e)));
  assert.ok(validateBudgets([{ scope: 'agent', window: 'day', key: 'x', limitUsd: 1 }]).some((e) => /window "day" is only supported/.test(e)));
});

test('Meter rejects invalid budgets at construction', () => {
  const spine = new Spine(null);
  assert.throws(() => new Meter({ spine, budgets: [{ scope: 'bad' }] }), /invalid budgets/);
});

function seeded() {
  const spine = new Spine(null, { indexBy: ['agent', 'model'] });
  const m = new Meter({ spine, pricing: { 'claude-fable-5': { in: 3, out: 15 }, 'claude-haiku-4-5': { in: 1, out: 5 } } });
  spine.append('tool.result', { agent: 'researcher', model: 'claude-fable-5', tokensIn: 1e6, tokensOut: 1e6 }); // $18
  spine.append('tool.result', { agent: 'researcher', model: 'claude-haiku-4-5', tokensIn: 1e6, tokensOut: 0 }); // $1
  spine.append('tool.result', { agent: 'writer', model: 'claude-fable-5', tokensIn: 0, tokensOut: 1e6, costUsd: 5 }); // verbatim $5
  spine.append('note', { agent: 'researcher', text: 'no usage here' }); // ignored
  return { spine, m };
}

test('rollups by total / agent / model, ignoring non-usage events', () => {
  const { m } = seeded();
  const r = m.report();
  assert.equal(r.total.costUsd, 24);       // 18 + 1 + 5
  assert.equal(r.total.calls, 3);          // the note is not counted
  assert.equal(r.total.tokensIn, 2e6);
  assert.equal(r.byAgent.researcher.costUsd, 19);
  assert.equal(r.byAgent.writer.costUsd, 5);
  assert.equal(r.byModel['claude-fable-5'].costUsd, 23); // 18 + 5
  assert.equal(r.byModel['claude-haiku-4-5'].costUsd, 1);
});

test('report is a pure read-model — it never writes to the spine', () => {
  const { spine, m } = seeded();
  const before = spine.length;
  m.report();
  m.report();
  assert.equal(spine.length, before, 'reporting appended nothing');
});

test('projection is incremental — new events show up without rebuild', () => {
  const { spine, m } = seeded();
  assert.equal(m.report().total.costUsd, 24);
  spine.append('tool.result', { agent: 'writer', model: 'claude-fable-5', costUsd: 6 });
  assert.equal(m.report().total.costUsd, 30);
});

test('total-window budget: ok -> warning -> exceeded', () => {
  const spine = new Spine(null);
  const m = new Meter({ spine, budgets: [{ id: 'cap', scope: 'total', window: 'total', limitUsd: 100, warnAt: 0.8 }] });
  spine.append('tool.result', { agent: 'a', costUsd: 50 });
  assert.equal(m.report().budgets[0].state, 'ok');
  spine.append('tool.result', { agent: 'a', costUsd: 35 }); // 85 -> >=80% warn
  assert.equal(m.report().budgets[0].state, 'warning');
  spine.append('tool.result', { agent: 'a', costUsd: 20 }); // 105 -> exceeded
  const b = m.report().budgets[0];
  assert.equal(b.state, 'exceeded');
  assert.equal(b.spendUsd, 105);
  assert.ok(m.report().alarms.some((x) => x.id === 'cap'));
});

test('agent-scoped budget tracks only that agent', () => {
  const spine = new Spine(null);
  const m = new Meter({ spine, budgets: [{ id: 'r', scope: 'agent', key: 'researcher', window: 'total', limitUsd: 10 }] });
  spine.append('tool.result', { agent: 'researcher', costUsd: 12 });
  spine.append('tool.result', { agent: 'writer', costUsd: 100 });
  const b = m.report().budgets[0];
  assert.equal(b.spendUsd, 12);
  assert.equal(b.state, 'exceeded');
});

test('day-window budget measures a single day and can target a specific day', () => {
  const { file, cleanup } = tmp();
  try {
    // craft two days by writing the JSONL directly (ts controls the day bucket)
    const lines = [
      { id: 'evt_000000', seq: 0, ts: '2026-07-17T10:00:00.000Z', kind: 'tool.result', agent: 'a', costUsd: 30 },
      { id: 'evt_000001', seq: 1, ts: '2026-07-18T10:00:00.000Z', kind: 'tool.result', agent: 'a', costUsd: 90 },
    ].map((e) => JSON.stringify(e)).join('\n') + '\n';
    fs.writeFileSync(file, lines);
    const spine = new Spine(file);
    const m = new Meter({ spine, budgets: [{ id: 'daily', scope: 'total', window: 'day', limitUsd: 50 }] });
    // latest day (07-18) spent 90 -> exceeded
    assert.equal(m.report().budgets[0].state, 'exceeded');
    assert.equal(m.report().budgets[0].spendUsd, 90);
    // explicitly target the earlier day (07-17) spent 30 -> ok
    assert.equal(m.report({ day: '2026-07-17' }).budgets[0].state, 'ok');
  } finally { cleanup(); }
});

test('meterEvents: one-shot rollup from a plain event list', () => {
  const r = meterEvents(
    [
      { kind: 'tool.result', agent: 'a', model: 'm', tokensIn: 1e6, tokensOut: 1e6 },
      { kind: 'tool.result', agent: 'b', costUsd: 2 },
    ],
    { pricing: { m: { in: 2, out: 4 } }, budgets: [{ id: 't', scope: 'total', window: 'total', limitUsd: 5 }] },
  );
  assert.equal(r.total.costUsd, 8); // (2+4) + 2
  assert.equal(r.budgets[0].state, 'exceeded');
});
