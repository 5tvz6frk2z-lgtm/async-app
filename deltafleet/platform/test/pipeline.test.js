import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadBlueprintDir, validateBlueprint } from '../lib/blueprint.js';
import { Ledger } from '../lib/ledger.js';
import { GateEngine } from '../lib/gates.js';
import { MockAdapter } from '../lib/runtime.js';
import { PipelineRun, resolveRefs } from '../lib/pipeline.js';
import { demoScriptRegistry, assertScriptsCovered, ScriptRegistry } from '../lib/scripts.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const BP_DIR = path.join(here, '..', 'blueprints');
const PROFILE = { brand: 'Ironvale Manufacturing', voice: 'Plainspoken, numbers first', industry: 'Industrial equipment', briefTo: 'dana@ironvale.example' };

const until = async (fn, ms = 2000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (fn()) return; await new Promise((r) => setTimeout(r, 5)); }
  throw new Error('condition not met in time');
};

function setup(bpMutate) {
  const bps = loadBlueprintDir(BP_DIR);
  let bp = bps.get('daily-brief');
  if (bpMutate) { bp = structuredClone(bp); bpMutate(bp); bps.set('daily-brief', bp); }
  const ledger = new Ledger(null);
  const gates = new GateEngine(ledger, bps);
  const scripts = demoScriptRegistry();
  return { bps, bp, ledger, gates, scripts };
}

test('resolveRefs walks trigger/profile/results paths, deep and in arrays', () => {
  const ctx = { trigger: { x: 1 }, profile: { brand: 'B' }, results: { email: { needsReply: [{ from: 'a' }] } } };
  assert.equal(resolveRefs('$trigger.x', ctx), 1);
  assert.equal(resolveRefs('$profile.brand', ctx), 'B');
  assert.deepEqual(resolveRefs({ a: '$results.email.needsReply', b: ['$profile.brand', 'lit'] }, ctx),
    { a: [{ from: 'a' }], b: ['B', 'lit'] });
  assert.equal(resolveRefs('$results.missing.deep', ctx), undefined);
  assert.equal(resolveRefs('plain', ctx), 'plain');
});

test('daily-brief blueprint validates; pipeline validator rejects malformed steps', () => {
  const bps = loadBlueprintDir(BP_DIR);
  const bp = bps.get('daily-brief');
  assert.equal(bp.tier, 'starter');
  assert.deepEqual(validateBlueprint(bp), []);

  const both = structuredClone(bp);
  both.pipeline[0] = { script: 'x.y', infer: 'narrator' };
  assert.ok(validateBlueprint(both).some((e) => e.includes('exactly one')));

  const badAgent = structuredClone(bp);
  badAgent.pipeline[3].infer = 'ghost';
  assert.ok(validateBlueprint(badAgent).some((e) => e.includes('unknown agent "ghost"')));

  // empty tools only allowed BECAUSE it's a pipeline blueprint
  const noPipe = structuredClone(bp);
  delete noPipe.pipeline;
  delete noPipe.gates['pull.email_stats']; delete noPipe.gates['pull.calendar_today'];
  delete noPipe.gates['compute.brief']; delete noPipe.gates['deliver.brief'];
  assert.ok(validateBlueprint(noPipe).some((e) => e.includes('must be non-empty')));
});

test('pipeline end-to-end: scripts compute, infer narrates, profile routes delivery', async () => {
  const { bp, ledger, gates, scripts } = setup();
  let captured;
  const adapter = { complete: async (args) => { captured = args; return { text: 'Morning brief: reply debt is 3; oldest is 31h.', usage: { in: 500, out: 90 } }; } };
  const run = new PipelineRun({ blueprint: bp, ledger, gates, scripts, adapter, profile: PROFILE });
  const res = await run.run({ schedule: 'test' });

  assert.equal(res.status, 'done');
  assert.equal(res.results.stats.replyDebt, 3);
  assert.ok(res.results.narrative.includes('reply debt'));
  // infer step got the brand-configured system prompt and the computed stats
  assert.ok(captured.system.includes('Ironvale Manufacturing'));
  assert.ok(captured.system.includes('never invent or adjust figures'));
  assert.ok(captured.messages[0].content.includes('"replyDebt": 3'));
  assert.equal(captured.model, 'claude-haiku-4-5');
  // deterministic steps ledgered as actions; delivery got profile.briefTo
  const s = ledger.state();
  const actions = [...s.actions.values()];
  assert.equal(actions.length, 4); // 2 pulls + compute + deliver
  const deliver = actions.find((a) => a.tool === 'deliver.brief');
  assert.equal(deliver.input.to, 'dana@ironvale.example');
  assert.ok(deliver.output.delivered);
  assert.equal(s.runs.get(res.run).tokensIn, 500);
});

test('approve-gated script step parks the pipeline and resumes with edited input', async () => {
  const { bp, ledger, gates, scripts } = setup((b) => { b.gates['deliver.brief'] = 'approve'; });
  const run = new PipelineRun({ blueprint: bp, ledger, gates, scripts, adapter: new MockAdapter([{ text: 'brief text' }]), profile: PROFILE });
  const p = run.run({});
  await until(() => ledger.state().pendingApprovals.length === 1);
  const pending = ledger.state().pendingApprovals[0];
  assert.equal(pending.tool, 'deliver.brief');
  gates.verdict(pending.id, { verdict: 'edited', by: 'kv', editedInput: { ...pending.input, to: 'redirected@client.example' } });
  const res = await p;
  assert.equal(res.status, 'done');
  const deliver = [...ledger.state().actions.values()].find((a) => a.tool === 'deliver.brief');
  assert.equal(deliver.output.to, 'redirected@client.example');
});

test('rejected required step fails the run; optional step rejection continues', async () => {
  const req = setup((b) => { b.gates['deliver.brief'] = 'approve'; });
  const r1 = new PipelineRun({ blueprint: req.bp, ledger: req.ledger, gates: req.gates, scripts: req.scripts, adapter: new MockAdapter([{ text: 'x' }]), profile: PROFILE });
  const p1 = r1.run({});
  await until(() => req.ledger.state().pendingApprovals.length === 1);
  req.gates.verdict(req.ledger.state().pendingApprovals[0].id, { verdict: 'rejected', by: 'kv' });
  assert.equal((await p1).status, 'error');

  const opt = setup((b) => { b.gates['deliver.brief'] = 'approve'; b.pipeline[4].optional = true; });
  const r2 = new PipelineRun({ blueprint: opt.bp, ledger: opt.ledger, gates: opt.gates, scripts: opt.scripts, adapter: new MockAdapter([{ text: 'x' }]), profile: PROFILE });
  const p2 = r2.run({});
  await until(() => opt.ledger.state().pendingApprovals.length === 1);
  opt.gates.verdict(opt.ledger.state().pendingApprovals[0].id, { verdict: 'rejected', by: 'kv' });
  assert.equal((await p2).status, 'done', 'optional rejection must not fail the run');
});

test('kill lands while pipeline is parked on approval', async () => {
  const { bp, ledger, gates, scripts } = setup((b) => { b.gates['deliver.brief'] = 'approve'; });
  const run = new PipelineRun({ blueprint: bp, ledger, gates, scripts, adapter: new MockAdapter([{ text: 'x' }]), profile: PROFILE });
  const p = run.run({});
  await until(() => ledger.state().pendingApprovals.length === 1);
  run.kill('kv');
  assert.equal((await p).status, 'killed');
  assert.equal(ledger.state().pendingApprovals.length, 0, 'killed run voids its approval');
});

test('script failure fails the run with the error ledgered', async () => {
  const { bp, ledger, gates } = setup();
  const scripts = demoScriptRegistry();
  scripts.register('pull.email_stats', { description: 'boom', handler: async () => { throw new Error('IMAP timeout'); } });
  const run = new PipelineRun({ blueprint: bp, ledger, gates, scripts, adapter: new MockAdapter([]), profile: PROFILE });
  const res = await run.run({});
  assert.equal(res.status, 'error');
  const failed = [...ledger.state().actions.values()].find((a) => a.tool === 'pull.email_stats');
  assert.equal(failed.ok, false);
  assert.ok(failed.error.includes('IMAP timeout'));
});

test('assertScriptsCovered names missing scripts', () => {
  const bps = loadBlueprintDir(BP_DIR);
  const empty = new ScriptRegistry();
  assert.throws(() => assertScriptsCovered(bps, empty), /daily-brief needs script pull.email_stats/);
  assert.doesNotThrow(() => assertScriptsCovered(bps, demoScriptRegistry()));
});
