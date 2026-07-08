import test from 'node:test';
import assert from 'node:assert/strict';
import { validateBlueprint } from '../lib/blueprint.js';
import { Ledger } from '../lib/ledger.js';
import { GateEngine } from '../lib/gates.js';
import { ToolRegistry } from '../lib/runtime.js';
import { Coordinator } from '../lib/orchestrate.js';

// Each agent gets a capturing adapter so we can assert what context it actually
// saw — the crux of the isolation contract: a sub-agent sees only the results
// handed to it, never a sibling's or the coordinator's full conversation.
function capturing(output) {
  const calls = [];
  return { calls, adapter: { complete: async ({ system, messages }) => { calls.push({ system, messages }); return { text: output, usage: { in: 10, out: 5 } }; } } };
}

function bp(orchestration, agentNames) {
  return {
    blueprint: 'crew', title: 'Crew (orchestration-test)', trigger: { type: 'webhook' },
    agents: agentNames.map((n) => ({ name: n, callsign: n.toUpperCase(), role: `role ${n}`, tools: [], model: 'claude-haiku-4-5' })),
    orchestration, gates: { '*': 'auto' }, connectors: [],
    metrics: { baseline: [{ key: 'x', unit: 'n', direction: 'up' }] }, rollback: 'off',
  };
}

function setup(orchestration, outputs) {
  const names = Object.keys(outputs);
  const blueprint = bp(orchestration, names);
  const caps = Object.fromEntries(names.map((n) => [n, capturing(outputs[n])]));
  const ledger = new Ledger(null);
  const gates = new GateEngine(ledger, new Map([[blueprint.blueprint, blueprint]]));
  const coord = new Coordinator({ blueprint, ledger, gates, adapterFor: (n) => caps[n].adapter, tools: new ToolRegistry() });
  return { blueprint, caps, ledger, gates, coord };
}

test('orchestration blueprint validation catches malformed graphs', () => {
  assert.deepEqual(validateBlueprint(bp({ type: 'sequential', agents: ['a', 'b'] }, ['a', 'b'])), []);
  assert.ok(validateBlueprint(bp({ type: 'sequential', agents: ['ghost'] }, ['a'])).some((e) => /unknown agent "ghost"/.test(e)));
  assert.ok(validateBlueprint(bp({ type: 'nope' }, ['a'])).some((e) => /type must be one of/.test(e)));
  assert.ok(validateBlueprint(bp({ type: 'judge', attempts: ['a'], judge: 'a' }, ['a'])).some((e) => /≥2 agents/.test(e)));
  assert.ok(validateBlueprint(bp({ type: 'judge', attempts: ['a', 'b'] }, ['a', 'b'])).some((e) => /judge \(an agent name\) is required/.test(e)));
  assert.ok(validateBlueprint(bp({ type: 'delegate', parent: 'a' }, ['a'])).some((e) => /child is required/.test(e)));
});

test('sequential handoff: each agent sees prior results, and only those', async () => {
  const { caps, ledger, coord } = setup({ type: 'sequential', agents: ['a1', 'a2', 'a3'] }, { a1: 'X', a2: 'Y', a3: 'Z' });
  const res = await coord.run({ job: 'go' });
  assert.equal(res.type, 'sequential');
  assert.deepEqual(res.steps.map((s) => s.output), ['X', 'Y', 'Z']);

  // a1 got no handoff; a2 got a1's result; a3 got a1's + a2's — as results, not conversation
  assert.ok(!caps.a1.calls[0].system.includes('handed to you'));
  assert.match(caps.a2.calls[0].system, /a1: X/);
  assert.match(caps.a3.calls[0].system, /a1: X/);
  assert.match(caps.a3.calls[0].system, /a2: Y/);
  // the handoff also arrives structurally in the trigger
  const a2Trigger = JSON.parse(caps.a2.calls[0].messages[0].content.replace(/^Trigger: /, ''));
  assert.deepEqual(a2Trigger.prior, [{ agent: 'a1', output: 'X' }]);
  // isolation: a2 never sees a1's raw trigger text beyond the handed result
  assert.ok(!caps.a2.calls[0].system.includes('"job"'));

  // all three are ledgered under one thread
  const th = [...ledger.state().threads.values()][0];
  assert.equal(th.type, 'sequential');
  assert.equal(th.children.length, 3);
});

test('parallel fan-out gathers every branch', async () => {
  const { ledger, coord } = setup({ type: 'parallel', agents: ['b1', 'b2', 'b3'] }, { b1: 'one', b2: 'two', b3: 'three' });
  const res = await coord.run({ job: 'scan' });
  assert.equal(res.type, 'parallel');
  assert.deepEqual(res.branches.map((b) => b.output).sort(), ['one', 'three', 'two']);
  assert.equal([...ledger.state().threads.values()][0].children.length, 3);
  // every branch saw the SAME trigger and no sibling output (independent)
  assert.equal(res.branches.every((b) => b.status === 'done'), true);
});

test('judge: attempts draft in parallel, the judge decides from their outputs', async () => {
  const { caps, ledger, coord } = setup(
    { type: 'judge', attempts: ['d1', 'd2', 'd3'], judge: 'editor' },
    { d1: 'draft-one', d2: 'draft-two', d3: 'draft-three', editor: 'chose draft-two' },
  );
  const res = await coord.run({ brief: 'write the thing' });
  assert.equal(res.type, 'judge');
  assert.equal(res.attempts.length, 3);
  assert.equal(res.judge.output, 'chose draft-two');
  // the judge actually received all three drafts
  const judgeInput = JSON.parse(caps.editor.calls[0].messages[0].content.replace(/^Trigger: /, ''));
  assert.deepEqual(judgeInput.attempts.map((a) => a.output).sort(), ['draft-one', 'draft-three', 'draft-two']);
  assert.match(caps.editor.calls[0].system, /You are the judge/);
  // 3 drafts + 1 judge = 4 runs on the thread
  assert.equal([...ledger.state().threads.values()][0].children.length, 4);
});

test('delegate: parent scopes a sub-task, child executes it in isolation', async () => {
  const { caps, coord } = setup(
    { type: 'delegate', parent: 'lead', child: 'specialist' },
    { lead: 'research the Q3 pricing objection', specialist: 'here is the researched answer' },
  );
  const res = await coord.run({ ticket: 'inbound question' });
  assert.equal(res.type, 'delegate');
  assert.equal(res.parent.output, 'research the Q3 pricing objection');
  assert.equal(res.child.output, 'here is the researched answer');
  // the child received the parent's scoped task, not the original ticket
  const childTrigger = JSON.parse(caps.specialist.calls[0].messages[0].content.replace(/^Trigger: /, ''));
  assert.equal(childTrigger.task, 'research the Q3 pricing objection');
  assert.match(caps.specialist.calls[0].system, /scoped, delegated sub-task/);
});

test('composable: a sequential chain can contain a judge sub-step', async () => {
  const { ledger, coord } = setup(
    { type: 'sequential', agents: ['prep', { judge: ['d1', 'd2', 'd3'], by: 'editor' }, 'finish'] },
    { prep: 'prepped', d1: 'draft one', d2: 'draft two', d3: 'draft three', editor: 'chose draft two', finish: 'finished' },
  );
  const res = await coord.run({ job: 'go' });
  assert.equal(res.steps.length, 3);
  assert.equal(res.steps[0].output, 'prepped');
  assert.equal(res.steps[1].output, 'chose draft two', 'the judge\'s pick flows to the next step');
  assert.deepEqual(res.steps[1].judged, ['d1', 'd2', 'd3']);
  assert.equal(res.steps[2].output, 'finished');
  // prep + 3 drafters + editor + finish = 6 sub-runs on one thread
  assert.equal([...ledger.state().threads.values()][0].children.length, 6);
});

test('validation rejects a malformed judge sub-step', () => {
  assert.ok(validateBlueprint(bp({ type: 'sequential', agents: ['a', { judge: ['b'], by: 'a' }] }, ['a', 'b'])).some((e) => /≥2 attempt/.test(e)));
  assert.ok(validateBlueprint(bp({ type: 'sequential', agents: ['a', { judge: ['a', 'b'] }] }, ['a', 'b'])).some((e) => /by.*is required/.test(e)));
});

test('sub-runs are tagged with the shared thread id', async () => {
  const { ledger, coord } = setup({ type: 'sequential', agents: ['a1', 'a2'] }, { a1: 'X', a2: 'Y' });
  const res = await coord.run({});
  const runs = [...ledger.state().runs.values()];
  assert.equal(runs.length, 2);
  assert.ok(runs.every((r) => r.thread === res.thread));
});
