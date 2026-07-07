import test from 'node:test';
import assert from 'node:assert/strict';
import { calibrate, shouldEscalate, calibrationOf, CONFIDENCE_POLICY } from '../lib/confidence.js';
import { Ledger } from '../lib/ledger.js';
import { GateEngine } from '../lib/gates.js';
import { AgentRun, ToolRegistry, MockAdapter } from '../lib/runtime.js';

const until = async (fn, ms = 2000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (fn()) return; await new Promise((r) => setTimeout(r, 5)); }
  throw new Error('condition not met in time');
};

test('calibrate: raw stands until enough samples, then is discounted by reliability', () => {
  assert.equal(calibrate(0.9, null), 0.9);
  assert.equal(calibrate(0.9, { samples: 3, agreementRate: 0.5 }), 0.9); // too few samples
  assert.equal(calibrate(0.9, { samples: 20, agreementRate: 0.5 }), 0.45); // overconfident agent discounted
});

test('shouldEscalate only ever raises oversight', () => {
  assert.equal(shouldEscalate('approve', 0.1), false, 'approve is already strongest — never relax');
  assert.equal(shouldEscalate('log', 0.4), true);
  assert.equal(shouldEscalate('log', 0.8), false);
  assert.equal(shouldEscalate('auto', undefined), false);
});

test('calibrationOf measures agreement, Brier, and overconfidence gap', () => {
  const acts = [
    { confidence: 0.9, verdict: 'approved' }, { confidence: 0.9, verdict: 'edited' },
    { confidence: 0.8, verdict: 'approved' }, { confidence: 0.9, verdict: 'rejected' },
  ];
  const c = calibrationOf(acts);
  assert.equal(c.samples, 4);
  assert.equal(c.agreementRate, 0.5); // 2 of 4 approved
  assert.ok(c.gap > 0, 'mean confidence exceeds agreement → overconfident');
  assert.equal(calibrationOf([]).samples, 0);
});

function bp() {
  return {
    blueprint: 'outreach', title: 'Outreach (confidence-test)', trigger: { type: 'webhook' },
    agents: [{ name: 'writer', callsign: 'CALLIOPE', role: 'send follow-ups', tools: ['email.send'], model: 'claude-haiku-4-5' }],
    gates: { '*': 'auto', 'email.send': 'log' }, connectors: [],
    metrics: { baseline: [{ key: 'x', unit: 'n', direction: 'up' }] }, rollback: 'off',
  };
}

test('a low-confidence action on a light gate ESCALATES to human approval', () => {
  const b = bp();
  const ledger = new Ledger(null);
  const gates = new GateEngine(ledger, new Map([[b.blueprint, b]]));
  const low = gates.request('run_x', 'outreach', 'email.send', { to: 'a' }, { confidence: 0.2 });
  assert.equal(low.gate, 'approve');
  assert.equal(low.escalated, true);
  const high = gates.request('run_y', 'outreach', 'email.send', { to: 'b' }, { confidence: 0.95 });
  assert.equal(high.gate, 'log', 'confident action stays on its declared light gate');
  assert.equal(high.escalated, false);
});

test('confidence NEVER relaxes: an approve gate stays approve even at max confidence', () => {
  const b = bp();
  b.gates['email.send'] = 'approve';
  const ledger = new Ledger(null);
  const gates = new GateEngine(ledger, new Map([[b.blueprint, b]]));
  const r = gates.request('run_z', 'outreach', 'email.send', { to: 'c' }, { confidence: 1 });
  assert.equal(r.gate, 'approve');
  assert.ok(r.promise, 'still parks for a human');
});

test('runtime: a low-confidence gated action parks the run for approval', async () => {
  const b = bp();
  const ledger = new Ledger(null);
  const gates = new GateEngine(ledger, new Map([[b.blueprint, b]]));
  const sends = [];
  const tools = new ToolRegistry().register('email.send', { handler: async (i) => { sends.push(i); return { sent: true }; } });
  // agent reports low confidence on the send
  const agent = new MockAdapter([{ toolCalls: [{ tool: 'email.send', input: { to: 'x', _confidence: 0.2, body: 'unsure draft' } }] }, { text: 'done' }]);
  const run = new AgentRun({ blueprint: b, agentName: 'writer', ledger, gates, adapter: agent, tools });
  const p = run.run({});
  await until(() => ledger.state().pendingApprovals.length === 1);
  const pending = ledger.state().pendingApprovals[0];
  assert.equal(pending.tool, 'email.send');
  assert.equal(pending.escalated, true, 'the light gate was escalated by low confidence');
  assert.equal(sends.length, 0, 'nothing sent while parked');
  gates.verdict(pending.id, { verdict: 'approved', by: 'kv' });
  assert.equal((await p).status, 'done');
  assert.equal(sends.length, 1);
});

test('confidenceStats accumulates calibration once actions are decided', async () => {
  const b = bp();
  b.gates['email.send'] = 'approve'; // approve so every action gets a verdict
  const ledger = new Ledger(null);
  const gates = new GateEngine(ledger, new Map([[b.blueprint, b]]));
  const tools = new ToolRegistry().register('email.send', { handler: async () => ({ sent: true }) });
  for (let i = 0; i < 4; i++) {
    const agent = new MockAdapter([{ toolCalls: [{ tool: 'email.send', input: { to: `l${i}`, _confidence: 0.9 } }] }, { text: 'done' }]);
    const run = new AgentRun({ blueprint: b, agentName: 'writer', ledger, gates, adapter: agent, tools });
    const p = run.run({ n: i });
    await until(() => ledger.state().pendingApprovals.length === 1);
    // approve half, reject half → agent was overconfident
    gates.verdict(ledger.state().pendingApprovals[0].id, { verdict: i % 2 === 0 ? 'approved' : 'rejected', by: 'kv' });
    await p;
  }
  const stats = gates.confidenceStats().find((s) => s.tool === 'email.send');
  assert.equal(stats.samples, 4);
  assert.equal(stats.agreementRate, 0.5);
  assert.ok(stats.gap > 0, 'the agent is measurably overconfident');
});
