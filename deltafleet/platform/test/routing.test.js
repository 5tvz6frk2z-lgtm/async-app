import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyDifficulty, routeModel, MODEL_TIERS } from '../lib/routing.js';
import { validateBlueprint } from '../lib/blueprint.js';
import { Ledger } from '../lib/ledger.js';
import { GateEngine } from '../lib/gates.js';
import { PipelineRun } from '../lib/pipeline.js';
import { ScriptRegistry } from '../lib/scripts.js';

test('routine, small tasks route to the fast tier', () => {
  const c = classifyDifficulty({ id: 'L-1' }, { task: 'extract the PO number and classify the invoice' });
  assert.equal(c.tier, 'fast');
  assert.equal(c.model, MODEL_TIERS.fast);
  assert.equal(c.signals.routine, true);
});

test('open-ended judgment escalates above the fast tier', () => {
  const c = classifyDifficulty({ context: 'a tricky renewal' }, { task: 'draft and negotiate a persuasive renewal proposal, analyze the tradeoffs' });
  assert.notEqual(c.tier, 'fast');
  assert.equal(c.signals.judgment, true);
});

test('SAFETY FLOOR: high-stakes work never routes to the cheapest tier', () => {
  // deliberately tiny, routine-looking input — but it is high-stakes
  const c = classifyDifficulty({ id: 1 }, { task: 'tag this legal refund dispute' });
  assert.notEqual(c.tier, 'fast', 'a stakes signal must lift it off the cheap tier');
  assert.equal(c.signals.stakes, true);
  // high-stakes AND judgment → deepest tier
  const d = classifyDifficulty({}, { task: 'draft a response to this legal press dispute' });
  assert.equal(d.tier, 'deep');
});

test('ambiguity pushes difficulty up', () => {
  const plain = classifyDifficulty({}, { task: 'summarize the weekly numbers' });
  const ambiguous = classifyDifficulty({}, { task: 'summarize the weekly numbers with conflicting, ambiguous exception cases' });
  assert.ok(ambiguous.score > plain.score);
});

test('routeModel honors the enabled flag', () => {
  assert.deepEqual(routeModel({ pinned: 'claude-haiku-4-5', enabled: false }), { model: 'claude-haiku-4-5', routed: false });
  const r = routeModel({ taskContext: {}, task: 'draft a legal contract response', pinned: 'claude-haiku-4-5', enabled: true });
  assert.equal(r.routed, true);
  assert.equal(r.model, MODEL_TIERS.deep);
});

test('blueprint validation of the route flag', () => {
  const bp = {
    blueprint: 'r', title: 'Routing test', trigger: { type: 'webhook' },
    agents: [{ name: 'a', callsign: 'A', role: 'x', tools: [], model: 'claude-haiku-4-5' }],
    pipeline: [{ infer: 'a', task: 't', route: true }],
    gates: { '*': 'log' }, connectors: [], metrics: { baseline: [{ key: 'x', unit: 'n', direction: 'up' }] }, rollback: 'off',
  };
  assert.deepEqual(validateBlueprint(bp), []);
  const bad = structuredClone(bp); bad.pipeline[0].route = 'yes';
  assert.ok(validateBlueprint(bad).some((e) => /route must be a boolean/.test(e)));
  const onScript = structuredClone(bp); onScript.pipeline = [{ script: 'x.y', route: true }];
  onScript.gates = { '*': 'log', 'x.y': 'log' };
  assert.ok(validateBlueprint(onScript).some((e) => /route applies only to infer/.test(e)));
});

test('pipeline: a routed infer step picks a model by difficulty and ledgers it', async () => {
  const bp = {
    blueprint: 'triage', title: 'Triage', trigger: { type: 'webhook' },
    agents: [{ name: 'writer', callsign: 'CALLIOPE', role: 'handle the ticket', tools: [], model: 'claude-haiku-4-5' }],
    pipeline: [{ infer: 'writer', task: 'draft a persuasive legal dispute response, analyze the risks', input: { q: '$trigger.q' }, route: true, save: 'out' }],
    gates: { '*': 'log' }, connectors: [], metrics: { baseline: [{ key: 'x', unit: 'n', direction: 'up' }] }, rollback: 'off',
  };
  const ledger = new Ledger(null);
  const gates = new GateEngine(ledger, new Map([[bp.blueprint, bp]]));
  let usedModel;
  const adapter = { complete: async ({ model }) => { usedModel = model; return { text: 'drafted', usage: { in: 10, out: 5 } }; } };
  const res = await new PipelineRun({ blueprint: bp, ledger, gates, scripts: new ScriptRegistry(), adapter }).run({ q: 'help' });
  assert.equal(res.status, 'done');
  assert.equal(usedModel, MODEL_TIERS.deep, 'high-stakes judgment routed to the deep tier, overriding the pinned fast model');
  assert.ok(ledger.state().runs.get(res.run).notes.some((n) => /routed to/.test(n.text)));
});
