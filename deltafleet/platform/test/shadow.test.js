import test from 'node:test';
import assert from 'node:assert/strict';
import { validateBlueprint } from '../lib/blueprint.js';
import { ScriptRegistry } from '../lib/scripts.js';
import {
  corridorTools, structuredScorer, runScenario, runScenarios,
  readinessReport, shadowEval, renderReadiness, READY_MIN,
} from '../lib/shadow.js';

// A synthetic corridor with a DELIBERATE bug: it flags a variance for review at
// > 100, but the true business rule (ground truth) is > 50. Shadow eval should
// catch exactly the scenarios in the (50, 100] gap — a corridor bug found before
// it ever touched a real invoice.
const BP = {
  blueprint: 'invoice-check',
  title: 'Invoice Reconciliation (shadow-test)',
  trigger: { type: 'webhook' },
  agents: [{ name: 'checker', callsign: 'THOTH', role: 'Reconcile invoice vs PO', tools: [], model: 'claude-haiku-4-5' }],
  pipeline: [
    { script: 'compute.reconcile', input: { invoice: '$trigger.invoice', po: '$trigger.po' }, save: 'recon' },
    { script: 'post.flag', input: { flag: '$results.recon.flag' }, save: 'posted' },
  ],
  gates: { '*': 'auto', 'post.flag': 'approve' },
  connectors: [],
  metrics: { baseline: [{ key: 'variance', unit: 'usd', direction: 'down' }] },
  rollback: 'Disable the corridor; flags stop.',
};

function scripts() {
  const reg = new ScriptRegistry();
  reg.register('compute.reconcile', {
    handler: async ({ invoice, po }) => {
      const variance = invoice - po;
      return { variance, flag: variance > 100 ? 'review' : 'ok' }; // BUG: threshold should be 50
    },
  });
  reg.register('post.flag', { handler: async ({ flag }) => ({ posted: true, flag }) });
  return reg;
}

// truth rule: review when variance > 50
const truthFlag = (v) => (v > 50 ? 'review' : 'ok');
const scen = (id, invoice, po, note) => {
  const v = invoice - po;
  return { id, note, trigger: { invoice, po }, groundTruth: { 'results.recon.variance': v, 'results.recon.flag': truthFlag(v) } };
};
// 8 the bug does NOT bite (variance ≤50 or >100), 2 it DOES (variance in the gap)
const PASSING = [
  scen('s1', 100, 90), scen('s2', 100, 100), scen('s3', 250, 100), scen('s4', 300, 120),
  scen('s5', 130, 100), scen('s6', 145, 100), scen('s7', 500, 100), scen('s8', 100, 50),
];
const FAILING = [scen('s9', 175, 100, 'variance 75 in the missed gap'), scen('s10', 190, 100, 'variance 90 in the missed gap')];

// A model adapter that throws — proves a pure-script corridor never calls a model.
const noModel = { complete: async () => { throw new Error('shadow eval must not call the model on a pure-script corridor'); } };

test('synthetic shadow corridor is a valid blueprint', () => {
  assert.deepEqual(validateBlueprint(BP), []);
});

test('corridorTools lists every tool/script a corridor can request', () => {
  assert.deepEqual(corridorTools(BP).sort(), ['compute.reconcile', 'post.flag']);
});

test('structuredScorer: exact, deep-object, and numeric-tolerance checks', () => {
  const outcome = { status: 'done', results: { recon: { variance: 75, flag: 'ok', obj: { a: 1 } } } };
  assert.equal(structuredScorer(outcome, { 'results.recon.variance': 75 }).pass, true);
  assert.equal(structuredScorer(outcome, { 'results.recon.flag': 'review' }).pass, false);
  assert.equal(structuredScorer(outcome, { 'results.recon.obj': { a: 1 } }).pass, true);
  const approx = structuredScorer(outcome, { 'results.recon.variance': { approx: 78, tol: 3 } });
  assert.equal(approx.pass, true);
  assert.equal(structuredScorer(outcome, { 'results.recon.variance': { approx: 90, tol: 3 } }).pass, false);
  // partial credit: 1 of 2 checks passes
  const half = structuredScorer(outcome, { 'results.recon.variance': 75, 'results.recon.flag': 'review' });
  assert.equal(half.pass, false);
  assert.equal(half.score, 0.5);
});

test('shadow eval catches exactly the 2 buggy scenarios → 80% accuracy, names them', async () => {
  const { graded, report } = await shadowEval(BP, [...PASSING, ...FAILING], { scripts: scripts(), adapter: noModel });
  assert.equal(graded.length, 10);
  assert.equal(report.passed, 8);
  assert.equal(report.failed, 2);
  assert.equal(report.accuracy, 0.8);
  const failedIds = report.failures.map((f) => f.id).sort();
  assert.deepEqual(failedIds, ['s10', 's9']);
  // the report names WHAT was wrong on each failure
  const s9 = report.failures.find((f) => f.id === 's9');
  const flagMiss = s9.misses.find((m) => m.path === 'results.recon.flag');
  assert.equal(flagMiss.expected, 'review');
  assert.equal(flagMiss.actual, 'ok');
});

test('approve gates are downgraded in the sandbox so a headless run never parks', async () => {
  // post.flag is approve-gated; with no human present the run must still complete.
  const g = await runScenario(BP, PASSING[0], { scripts: scripts(), adapter: noModel });
  assert.equal(g.outcome.status, 'done');
  // the production gate is remembered on the action, so the safety-net signal works
  const flagAction = g.outcome.actions.find((a) => a.tool === 'post.flag');
  assert.equal(flagAction.prodGate, 'approve');
});

test('gate safety-net: guarded failures → not-ready; unguarded failures → unsafe', async () => {
  // With post.flag approve-gated, every failing run had a human review point.
  const guarded = readinessReport(BP, await runScenarios(BP, [...PASSING, ...FAILING], { scripts: scripts(), adapter: noModel }));
  assert.equal(guarded.gateSafetyNet.unguarded, 0);
  assert.equal(guarded.gateSafetyNet.guarded, 2);
  assert.equal(guarded.verdict, 'not-ready'); // accuracy below the bar, but nothing ships silently

  // Same corridor with NO approval gate → the same wrong outputs would ship silently.
  const open = structuredClone(BP);
  open.gates = { '*': 'auto' };
  const unsafe = readinessReport(open, await runScenarios(open, [...PASSING, ...FAILING], { scripts: scripts(), adapter: noModel }));
  assert.equal(unsafe.gateSafetyNet.unguarded, 2);
  assert.equal(unsafe.unguardedFailures.length, 2);
  assert.equal(unsafe.verdict, 'unsafe');
});

test('all-green scenario set → ready; one guarded miss above the bar → gated-ready', async () => {
  const ready = readinessReport(BP, await runScenarios(BP, PASSING, { scripts: scripts(), adapter: noModel }));
  assert.equal(ready.accuracy, 1);
  assert.equal(ready.verdict, 'ready');

  // 9 pass + 1 guarded fail = 0.9 accuracy, exactly the bar, nothing unguarded.
  const set = [...PASSING, scen('s5b', 300, 100), FAILING[0]]; // 9 pass (var 200 → review both), 1 fail
  const rep = readinessReport(BP, await runScenarios(BP, set, { scripts: scripts(), adapter: noModel }));
  assert.equal(rep.scenarios, 10);
  assert.equal(rep.failed, 1);
  assert.equal(rep.accuracy, READY_MIN);
  assert.equal(rep.verdict, 'gated-ready');
});

test('sandbox isolation: the real blueprint gates are never mutated', async () => {
  const before = JSON.stringify(BP.gates);
  await runScenarios(BP, [...PASSING, ...FAILING], { scripts: scripts(), adapter: noModel });
  assert.equal(JSON.stringify(BP.gates), before, 'shadow eval must not mutate the blueprint');
  assert.equal(BP.gates['post.flag'], 'approve');
});

test('renderReadiness surfaces the verdict and flags UNGUARDED failures', async () => {
  const open = structuredClone(BP);
  open.gates = { '*': 'auto' };
  const { report } = await shadowEval(open, [...PASSING, ...FAILING], { scripts: scripts(), adapter: noModel });
  const text = renderReadiness(report);
  assert.match(text, /verdict:\s+UNSAFE/);
  assert.match(text, /UNGUARDED/);
  assert.match(text, /accuracy:\s+80%/);
});
