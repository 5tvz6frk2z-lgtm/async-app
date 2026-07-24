import test from 'node:test';
import assert from 'node:assert/strict';
import { validateBlueprint, GATE_LEVELS } from '../lib/blueprint.js';
import { Ledger } from '../lib/ledger.js';
import { GateEngine } from '../lib/gates.js';
import { AgentRun, ToolRegistry, MockAdapter } from '../lib/runtime.js';
import { PipelineRun } from '../lib/pipeline.js';
import { ScriptRegistry } from '../lib/scripts.js';
import { Verifier, verifierSystem, parseVote, tally } from '../lib/verify.js';

const until = async (fn, ms = 2000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (fn()) return; await new Promise((r) => setTimeout(r, 5)); }
  throw new Error('condition not met in time');
};

// A verifier adapter that judges by content: overpromising/spammy copy is refuted.
const spammy = (s) => /URGENT|guarantee|100%/i.test(s);
const contentVerifierAdapter = {
  complete: async ({ messages }) => ({
    text: JSON.stringify(spammy(messages[0].content)
      ? { verdict: 'refuted', confidence: 0.9, reason: 'overpromising / spammy tone' }
      : { verdict: 'clean', confidence: 0.8, reason: 'on-brand and factual' }),
    usage: { in: 40, out: 12 },
  }),
};
const verdictAdapter = (verdict) => ({ complete: async () => ({ text: JSON.stringify({ verdict, confidence: 0.9, reason: verdict }), usage: { in: 10, out: 5 } }) });

test('verify is a real gate tier between log and approve', () => {
  assert.deepEqual(GATE_LEVELS, ['auto', 'log', 'verify', 'approve']);
});

test('parseVote is fail-safe: anything unreadable is a refusal, confidence clamped', () => {
  assert.equal(parseVote('{"verdict":"clean","confidence":0.7,"reason":"ok"}').verdict, 'clean');
  assert.equal(parseVote('prose {"verdict":"refuted","confidence":2,"reason":"no"} tail').confidence, 1);
  assert.equal(parseVote('no json here').verdict, 'refuted');
  assert.equal(parseVote('{bad json').verdict, 'refuted');
  assert.equal(parseVote('').verdict, 'refuted');
  assert.equal(parseVote('{"verdict":"maybe"}').verdict, 'refuted'); // only "clean" counts as clean
});

test('tally requires a strict majority clean; ties hold (pessimistic)', () => {
  assert.equal(tally([{ verdict: 'clean' }, { verdict: 'clean' }, { verdict: 'refuted' }]).outcome, 'clean');
  assert.equal(tally([{ verdict: 'clean' }, { verdict: 'refuted' }]).outcome, 'refuted'); // tie
  assert.equal(tally([{ verdict: 'refuted' }, { verdict: 'refuted' }, { verdict: 'clean' }]).outcome, 'refuted');
});

test('Verifier spawns k skeptics and votes; perspective lenses give one vote each', async () => {
  const v = new Verifier({ adapter: contentVerifierAdapter, k: 3 });
  assert.equal(v.n(), 3);
  const clean = await v.verify({ tool: 'email.send', input: { body: 'Following up on Tuesday.' } });
  assert.equal(clean.outcome, 'clean');
  assert.equal(clean.votes.length, 3);
  const held = await v.verify({ tool: 'email.send', input: { body: 'URGENT!!! guaranteed 100% ROI' } });
  assert.equal(held.outcome, 'refuted');

  const lensed = new Verifier({ adapter: contentVerifierAdapter, lenses: ['correctness', 'brand', 'policy'] });
  assert.equal(lensed.n(), 3);
  const res = await lensed.verify({ tool: 'email.send', input: { body: 'clean copy' } });
  assert.deepEqual(res.votes.map((x) => x.lens), ['correctness', 'brand', 'policy']);
  // the lens reaches the verifier's system prompt
  assert.match(verifierSystem('brand', ['Client brand: Ironvale']), /lens: brand/);
  assert.match(verifierSystem('brand', ['Client brand: Ironvale']), /Ironvale/);
});

function outreachBlueprint() {
  return {
    blueprint: 'outreach', title: 'Outreach (verify-test)', trigger: { type: 'webhook' },
    agents: [{ name: 'writer', callsign: 'CALLIOPE', role: 'Draft and send follow-ups', tools: ['email.send'], model: 'claude-haiku-4-5' }],
    gates: { '*': 'auto', 'email.send': 'verify' },
    connectors: [], metrics: { baseline: [{ key: 'replies', unit: 'count', direction: 'up' }] }, rollback: 'Disable outreach.',
  };
}

function sendTools(sends) {
  return new ToolRegistry().register('email.send', { description: 'send', handler: async (input) => { sends.push(input); return { sent: true, to: input.to }; } });
}

test('a verify-gated bad action is HELD (never executed), then the agent self-repairs', async () => {
  const bp = outreachBlueprint();
  assert.deepEqual(validateBlueprint(bp), []);
  const ledger = new Ledger(null);
  const gates = new GateEngine(ledger, new Map([[bp.blueprint, bp]]));
  const sends = [];
  const agent = new MockAdapter([
    { toolCalls: [{ tool: 'email.send', input: { to: 'lead@x.example', body: 'URGENT!!! guaranteed 100% ROI, act now' } }] },
    { toolCalls: [{ tool: 'email.send', input: { to: 'lead@x.example', body: 'Following up on our conversation Tuesday — happy to answer questions.' } }] },
    { text: 'Sent the follow-up.' },
  ]);
  const run = new AgentRun({ blueprint: bp, agentName: 'writer', ledger, gates, adapter: agent, tools: sendTools(sends), verifier: new Verifier({ adapter: contentVerifierAdapter, k: 3 }) });
  const res = await run.run({ lead: 'inbound form' });

  assert.equal(res.status, 'done');
  assert.equal(sends.length, 1, 'only the revised, clean draft is actually sent');
  assert.match(sends[0].body, /Following up/);

  const actions = [...ledger.state().actions.values()];
  assert.equal(actions.length, 2, 'two send attempts were made');
  assert.equal(actions[0].verification.outcome, 'refuted');
  assert.equal(actions[0].ok, false); // held → not executed
  assert.equal(actions[1].verification.outcome, 'clean');
  assert.equal(actions[1].ok, true);

  const vstats = gates.verificationStats();
  assert.equal(vstats.caught, 1, 'one bad action caught before it executed');
  assert.equal(vstats.verified, 2);
});

test('fail-safe: a verify gate with no verifier holds the action rather than executing it', async () => {
  const bp = outreachBlueprint();
  const ledger = new Ledger(null);
  const gates = new GateEngine(ledger, new Map([[bp.blueprint, bp]]));
  const sends = [];
  const agent = new MockAdapter([{ toolCalls: [{ tool: 'email.send', input: { to: 'x', body: 'clean copy' } }] }, { text: 'done' }]);
  const run = new AgentRun({ blueprint: bp, agentName: 'writer', ledger, gates, adapter: agent, tools: sendTools(sends) /* no verifier */ });
  const res = await run.run({});
  assert.equal(res.status, 'done');
  assert.equal(sends.length, 0, 'unverifiable action must not execute');
  assert.equal([...ledger.state().actions.values()][0].verification.outcome, 'refuted');
});

test('verification trust curve: enough clean checks propose relaxing verify → log', async () => {
  const bp = outreachBlueprint();
  const ledger = new Ledger(null);
  const gates = new GateEngine(ledger, new Map([[bp.blueprint, bp]]));
  const sends = [];
  for (let i = 0; i < 20; i++) {
    const agent = new MockAdapter([{ toolCalls: [{ tool: 'email.send', input: { to: `l${i}@x.example`, body: 'A clean, on-brand follow-up note.' } }] }, { text: 'done' }]);
    const run = new AgentRun({ blueprint: bp, agentName: 'writer', ledger, gates, adapter: agent, tools: sendTools(sends), verifier: new Verifier({ adapter: verdictAdapter('clean'), k: 3 }) });
    await run.run({ n: i });
  }
  assert.equal(sends.length, 20);
  const vstats = gates.verificationStats();
  const tool = vstats.byTool.find((t) => t.tool === 'email.send');
  assert.equal(tool.verifications, 20);
  assert.equal(tool.clean, 20);
  assert.equal(tool.cleanRate, 1);
  assert.equal(tool.current, 'verify');
  assert.equal(tool.propose, true, 'a clean-enough record earns a relaxation proposal');
});

test('pipeline verify: required step held fails the run; optional step held continues', async () => {
  const scripts = new ScriptRegistry()
    .register('compute.x', { handler: async ({ v }) => ({ v }) })
    .register('deliver.x', { handler: async () => ({ sent: true }) });
  const mkBp = (optional) => ({
    blueprint: 'brief-verify', title: 'Brief (verify-test)', trigger: { type: 'schedule', cron: '0 7 * * *' },
    agents: [{ name: 'saga', callsign: 'SAGA', role: 'assemble', tools: [], model: 'claude-haiku-4-5' }],
    pipeline: [{ script: 'compute.x', input: { v: '$trigger.v' }, save: 'r' }, { script: 'deliver.x', input: { v: '$results.r.v' }, ...(optional ? { optional: true } : {}) }],
    gates: { '*': 'auto', 'deliver.x': 'verify' },
    connectors: [], metrics: { baseline: [{ key: 'v', unit: 'n', direction: 'up' }] }, rollback: 'off',
  });
  const noModel = { complete: async () => { throw new Error('pipeline verify test should not call an infer model'); } };
  // verifier refuses when the delivered value is out of range (>100)
  const rangeVerifier = new Verifier({ adapter: { complete: async ({ messages }) => ({ text: JSON.stringify(/"v": ?(1[0-9]{2,}|[2-9][0-9]{2,})/.test(messages[0].content) ? { verdict: 'refuted', confidence: 0.9, reason: 'value out of range' } : { verdict: 'clean', confidence: 0.9, reason: 'in range' }), usage: { in: 10, out: 5 } }) }, k: 3 });

  // required, refuted → run error
  let bp = mkBp(false);
  let ledger = new Ledger(null);
  let gates = new GateEngine(ledger, new Map([[bp.blueprint, bp]]));
  let res = await new PipelineRun({ blueprint: bp, ledger, gates, scripts, adapter: noModel, verifier: rangeVerifier }).run({ v: 200 });
  assert.equal(res.status, 'error');
  assert.ok([...ledger.state().actions.values()].find((a) => a.tool === 'deliver.x').verification.outcome === 'refuted');

  // clean value → delivers
  bp = mkBp(false); ledger = new Ledger(null); gates = new GateEngine(ledger, new Map([[bp.blueprint, bp]]));
  res = await new PipelineRun({ blueprint: bp, ledger, gates, scripts, adapter: noModel, verifier: rangeVerifier }).run({ v: 50 });
  assert.equal(res.status, 'done');

  // optional, refuted → continues to done
  bp = mkBp(true); ledger = new Ledger(null); gates = new GateEngine(ledger, new Map([[bp.blueprint, bp]]));
  res = await new PipelineRun({ blueprint: bp, ledger, gates, scripts, adapter: noModel, verifier: rangeVerifier }).run({ v: 200 });
  assert.equal(res.status, 'done', 'optional held step must not fail the run');
});
