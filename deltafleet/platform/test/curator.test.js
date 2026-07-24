import test from 'node:test';
import assert from 'node:assert/strict';
import { Ledger } from '../lib/ledger.js';
import { ScriptRegistry } from '../lib/scripts.js';
import { curate, abTest, evaluate, runCuration, Curator, CURATE_MIN_LIFT } from '../lib/curator.js';

// A corridor whose graded output is a MODEL-generated reply. The infer "model"
// only cites the refund policy when a standing instruction tells it to — so an
// instruction overlay produces a real, measurable behavioral change.
const BP = {
  blueprint: 'refunds', title: 'Refund replies (curator-test)', trigger: { type: 'webhook' },
  agents: [{ name: 'responder', callsign: 'BRAGI', role: 'Reply to refund questions', tools: [], model: 'claude-haiku-4-5' }],
  pipeline: [{ infer: 'responder', task: 'Reply to the customer', input: { q: '$trigger.q' }, save: 'reply' }],
  gates: { '*': 'log' }, connectors: [], metrics: { baseline: [{ key: 'x', unit: 'n', direction: 'up' }] }, rollback: 'off',
};
const SCENARIOS = [
  { id: 'r1', trigger: { q: 'Where is my refund?' }, groundTruth: { 'results.reply': { contains: 'refund policy' } } },
  { id: 'r2', trigger: { q: 'Can I get my money back?' }, groundTruth: { 'results.reply': { contains: 'refund policy' } } },
];
// The infer model cites the policy iff a standing instruction in its system prompt says to.
const inferAdapter = {
  complete: async ({ system }) => ({
    text: /refund policy/i.test(system) ? 'Happy to help — per our refund policy, here is how this resolves.' : 'Happy to help, here is how this resolves.',
    usage: { in: 20, out: 10 },
  }),
};
const curatorAdapter = { complete: async () => ({ text: 'Always cite the specific refund policy when answering refund questions.', usage: { in: 30, out: 15 } }) };
const harness = () => ({ adapter: inferAdapter, scripts: new ScriptRegistry() });

test('curate distills corrections into an instruction overlay', async () => {
  const overlay = await curate({ adapter: curatorAdapter, agent: BP.agents[0], corrections: ['Operator repeatedly edits replies to cite the refund policy.'] });
  assert.match(overlay, /refund policy/);
});

test('abTest measures the overlay on the eval harness; a helpful overlay lifts accuracy', async () => {
  const overlay = 'Always cite the specific refund policy when answering refund questions.';
  const ab = await abTest({ bp: BP, scenarios: SCENARIOS, overlay, ...harness() });
  assert.equal(ab.before.accuracy, 0, 'without the instruction the model never cites the policy');
  assert.equal(ab.after.accuracy, 1, 'with the instruction it always does');
  assert.equal(ab.delta, 1);
  assert.equal(evaluate(ab).accept, true);
});

test('a useless overlay shows no lift and is rejected', async () => {
  const ab = await abTest({ bp: BP, scenarios: SCENARIOS, overlay: 'Be concise and friendly.', ...harness() });
  assert.equal(ab.before.accuracy, 0);
  assert.equal(ab.after.accuracy, 0);
  assert.equal(evaluate(ab).accept, false);
});

test('evaluate refuses any change that introduces a silent failure, however large the lift', () => {
  const before = { accuracy: 0.5, gateSafetyNet: { unguarded: 0 }, verdict: 'not-ready' };
  const after = { accuracy: 0.95, gateSafetyNet: { unguarded: 1 }, verdict: 'unsafe' };
  const v = evaluate({ before, after });
  assert.equal(v.accept, false);
  assert.match(v.reason, /no gate would catch|unsafe/);
  // and a lift just under the bar is rejected
  assert.equal(evaluate({ before: { accuracy: 0.80, gateSafetyNet: { unguarded: 0 } }, after: { accuracy: 0.80 + CURATE_MIN_LIFT / 2, gateSafetyNet: { unguarded: 0 }, verdict: 'not-ready' } }).accept, false);
});

test('runCuration ties distill → A/B → evaluate into one call', async () => {
  const out = await runCuration({ curatorAdapter, bp: BP, agent: BP.agents[0], corrections: ['cite the refund policy'], scenarios: SCENARIOS, ...harness() });
  assert.match(out.overlay, /refund policy/);
  assert.equal(out.delta, 1);
  assert.equal(out.verdict.accept, true);
});

test('Curator store: propose → accept makes the overlay active; revert removes it; versioned & reversible', async () => {
  const ledger = new Ledger(null);
  const cur = new Curator(ledger);
  const overlay = 'Always cite the specific refund policy when answering refund questions.';
  const ab = await abTest({ bp: BP, scenarios: SCENARIOS, overlay, ...harness() });
  const p = cur.propose({ blueprint: 'refunds', agent: 'responder', overlay, corrections: ['cite the refund policy'], before: ab.before, after: ab.after, verdict: evaluate(ab) });

  assert.equal(p.status, 'proposed');
  assert.equal(p.recommend, true);
  assert.equal(cur.activeOverlays({ blueprint: 'refunds' }).length, 0, 'a proposal is not active until a human accepts');

  cur.accept(p.id, { by: 'kv' });
  const active = cur.activeOverlays({ blueprint: 'refunds' });
  assert.equal(active.length, 1);
  assert.equal(active[0].overlay, overlay);
  assert.equal(active[0].version, 1);
  assert.match(cur.contextLines({ blueprint: 'refunds' }).join('\n'), /Curated instructions/);

  cur.revert(p.id, { by: 'kv' });
  assert.equal(cur.activeOverlays({ blueprint: 'refunds' }).length, 0, 'reverted overlay stops being injected');
  assert.throws(() => cur.accept(p.id), /already reverted/);

  // a fresh Curator rebuilt from the same ledger derives the same state (replay)
  const rebuilt = new Curator(ledger);
  assert.equal(rebuilt.proposals()[0].status, 'reverted');
});

test('Curator: reject leaves the overlay inactive and blocks later accept', async () => {
  const ledger = new Ledger(null);
  const cur = new Curator(ledger);
  const p = cur.propose({ blueprint: 'refunds', agent: 'responder', overlay: 'x', before: { accuracy: 0 }, after: { accuracy: 0 }, verdict: { accept: false, reason: 'no lift' } });
  cur.reject(p.id, { by: 'kv', reason: 'no measured benefit' });
  assert.equal(cur.activeOverlays({ blueprint: 'refunds' }).length, 0);
  assert.throws(() => cur.accept(p.id), /already rejected/);
});
