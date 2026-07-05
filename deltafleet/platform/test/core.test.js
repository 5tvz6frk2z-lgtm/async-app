import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateBlueprint, loadBlueprintDir, gateFor } from '../lib/blueprint.js';
import { Ledger } from '../lib/ledger.js';
import { GateEngine, RELAX_POLICY } from '../lib/gates.js';
import { AgentRun, ToolRegistry, MockAdapter } from '../lib/runtime.js';
import { proofFor, opsSummary } from '../lib/metrics.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const BP_DIR = path.join(here, '..', 'blueprints');

const until = async (fn, ms = 2000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (fn()) return; await new Promise((r) => setTimeout(r, 5)); }
  throw new Error('condition not met in time');
};

function demoTools() {
  const reg = new ToolRegistry();
  const record = [];
  for (const name of ['crm.read', 'crm.update', 'web.lookup', 'email.draft', 'email.send', 'calendar.read', 'calendar.book']) {
    reg.register(name, { description: `${name} (simulated)`, handler: async (input) => { record.push({ name, input }); return { ok: true, simulated: true, echo: input }; } });
  }
  return { reg, record };
}

/* ---------- blueprints ---------- */

test('all six launch blueprints load and validate', () => {
  const bps = loadBlueprintDir(BP_DIR);
  assert.equal(bps.size, 6);
  for (const id of ['speed-to-lead', 'inbox-crm-hygiene', 'reporting-autopilot', 'content-aeo-engine', 'document-intake', 'review-response']) {
    assert.ok(bps.has(id), `missing ${id}`);
  }
});

test('blueprint validator rejects broken specs', () => {
  assert.ok(validateBlueprint({}).length > 0);
  const bps = loadBlueprintDir(BP_DIR);
  const bad = structuredClone(bps.get('speed-to-lead'));
  bad.gates['nonexistent.tool'] = 'auto';
  assert.ok(validateBlueprint(bad).some((e) => e.includes('nonexistent.tool')));
  const noDefault = structuredClone(bps.get('speed-to-lead'));
  delete noDefault.gates['*'];
  assert.ok(validateBlueprint(noDefault).some((e) => e.includes('"*"')));
});

test('gateFor honors overrides over blueprint over default', () => {
  const bps = loadBlueprintDir(BP_DIR);
  const bp = bps.get('speed-to-lead');
  assert.equal(gateFor(bp, 'email.send'), 'approve');
  assert.equal(gateFor(bp, 'email.send', { 'email.send': 'log' }), 'log');
  assert.equal(gateFor(bp, 'unknown.tool'), 'log'); // '*' default
});

/* ---------- ledger ---------- */

test('ledger replay derives run/action/approval state', () => {
  const led = new Ledger(null);
  led.append({ type: 'run.start', run: 'r1', blueprint: 'speed-to-lead', agent: 'first-responder', callsign: 'HERMOD', trigger: { lead: 'x' } });
  led.append({ type: 'action.request', run: 'r1', action: 'a1', tool: 'email.send', input: { to: 'x' }, gate: 'approve' });
  let s = led.state();
  assert.equal(s.runs.get('r1').status, 'awaiting-approval');
  assert.equal(s.pendingApprovals.length, 1);
  led.append({ type: 'gate.verdict', action: 'a1', verdict: 'approved', by: 'kv' });
  led.append({ type: 'action.result', action: 'a1', ok: true, output: { sent: true } });
  led.append({ type: 'run.end', run: 'r1', status: 'done', tokensIn: 100, tokensOut: 50 });
  s = led.state();
  assert.equal(s.pendingApprovals.length, 0);
  assert.equal(s.runs.get('r1').status, 'done');
  assert.equal(s.actions.get('a1').verdict, 'approved');
});

/* ---------- gate engine ---------- */

test('gate engine verdict flow and relaxation proposal', async () => {
  const bps = loadBlueprintDir(BP_DIR);
  const led = new Ledger(null);
  const ge = new GateEngine(led, bps);

  // Simulate MIN_VERDICTS clean approvals of email.send under speed-to-lead.
  for (let i = 0; i < RELAX_POLICY.MIN_VERDICTS; i++) {
    const run = `r${i}`;
    led.append({ type: 'run.start', run, blueprint: 'speed-to-lead', agent: 'first-responder', callsign: 'HERMOD', trigger: {} });
    const { action, gate, promise } = ge.request(run, 'speed-to-lead', 'email.send', { i });
    assert.equal(gate, 'approve');
    ge.verdict(action, { verdict: 'approved', by: 'kv' });
    await promise;
  }
  const stats = ge.trustStats();
  const row = stats.find((s) => s.tool === 'email.send');
  assert.equal(row.verdicts, RELAX_POLICY.MIN_VERDICTS);
  assert.equal(row.interventions, 0);
  assert.equal(row.propose, true, 'clean history should propose relaxation');

  // Apply the relaxation; classification changes without touching the file.
  ge.changeGate('speed-to-lead', 'email.send', 'log', { by: 'kv', reason: '0% intervention over 20 verdicts' });
  assert.equal(ge.levelFor('speed-to-lead', 'email.send'), 'log');
  const { gate: after } = ge.request('rX', 'speed-to-lead', 'email.send', {});
  assert.equal(after, 'log');
});

test('gate engine rejects double verdicts and bad input', () => {
  const bps = loadBlueprintDir(BP_DIR);
  const led = new Ledger(null);
  const ge = new GateEngine(led, bps);
  led.append({ type: 'run.start', run: 'r1', blueprint: 'speed-to-lead', agent: 'first-responder', callsign: 'HERMOD', trigger: {} });
  const { action } = ge.request('r1', 'speed-to-lead', 'email.send', {});
  assert.throws(() => ge.verdict(action, { verdict: 'edited' }), /editedInput/);
  ge.verdict(action, { verdict: 'rejected', by: 'kv', reason: 'off-brand' });
  assert.throws(() => ge.verdict(action, { verdict: 'approved' }), /already decided/);
});

/* ---------- runtime ---------- */

function makeRun(bps, led, script, agentName = 'first-responder', opts = {}) {
  const ge = new GateEngine(led, bps);
  const { reg, record } = demoTools();
  const run = new AgentRun({
    blueprint: bps.get('speed-to-lead'), agentName, ledger: led, gates: ge,
    adapter: new MockAdapter(script), tools: reg, ...opts,
  });
  return { run, ge, record };
}

test('runtime executes auto/log tools and finishes clean', async () => {
  const bps = loadBlueprintDir(BP_DIR);
  const led = new Ledger(null);
  const { run, record } = makeRun(bps, led, [
    { text: 'Reading the lead.', toolCalls: [{ tool: 'crm.read', input: { lead: 'L1' } }] },
    { text: 'Drafting.', toolCalls: [{ tool: 'email.draft', input: { subject: 'Hi' } }] },
    { text: 'Draft complete; no send needed.' },
  ]);
  const res = await run.run({ lead: 'L1' });
  assert.equal(res.status, 'done');
  assert.deepEqual(record.map((r) => r.name), ['crm.read', 'email.draft']);
  const s = led.state();
  assert.equal(s.runs.get(res.run).actions.length, 2);
  assert.ok([...s.actions.values()].every((a) => a.ok));
});

test('runtime parks on approval and resumes with edited input', async () => {
  const bps = loadBlueprintDir(BP_DIR);
  const led = new Ledger(null);
  const { run, ge, record } = makeRun(bps, led, [
    { text: 'Sending first touch.', toolCalls: [{ tool: 'email.send', input: { to: 'a@b.c', body: 'orig' } }] },
    { text: 'Sent.' },
  ]);
  const p = run.run({ lead: 'L2' });
  await until(() => led.state().pendingApprovals.length === 1);
  assert.equal(led.state().runs.get(run.id).status, 'awaiting-approval');
  const pending = led.state().pendingApprovals[0];
  ge.verdict(pending.id, { verdict: 'edited', by: 'kv', editedInput: { to: 'a@b.c', body: 'edited' } });
  const res = await p;
  assert.equal(res.status, 'done');
  assert.equal(record[0].input.body, 'edited', 'tool must execute the EDITED input');
});

test('runtime treats rejection as final and continues', async () => {
  const bps = loadBlueprintDir(BP_DIR);
  const led = new Ledger(null);
  const { run, ge, record } = makeRun(bps, led, [
    { text: 'Sending.', toolCalls: [{ tool: 'email.send', input: { body: 'x' } }] },
    { text: 'Understood — logging a note instead.', toolCalls: [{ tool: 'crm.update', input: { note: 'rejected' } }] },
    { text: 'Done.' },
  ]);
  const p = run.run({ lead: 'L3' });
  await until(() => led.state().pendingApprovals.length === 1);
  ge.verdict(led.state().pendingApprovals[0].id, { verdict: 'rejected', by: 'kv', reason: 'wrong tone' });
  const res = await p;
  assert.equal(res.status, 'done');
  assert.deepEqual(record.map((r) => r.name), ['crm.update'], 'rejected tool must NOT execute');
  const rejected = [...led.state().actions.values()].find((a) => a.tool === 'email.send');
  assert.equal(rejected.ok, false);
});

test('kill switch lands while parked on approval', async () => {
  const bps = loadBlueprintDir(BP_DIR);
  const led = new Ledger(null);
  const { run } = makeRun(bps, led, [
    { text: 'Sending.', toolCalls: [{ tool: 'email.send', input: {} }] },
  ]);
  const p = run.run({ lead: 'L4' });
  await until(() => led.state().pendingApprovals.length === 1);
  run.kill('kv');
  const res = await p;
  assert.equal(res.status, 'killed');
});

test('step budget ends the run as error, ledgered', async () => {
  const bps = loadBlueprintDir(BP_DIR);
  const led = new Ledger(null);
  const script = Array.from({ length: 10 }, () => ({ toolCalls: [{ tool: 'crm.read', input: {} }] }));
  const { run } = makeRun(bps, led, script, 'first-responder', { maxSteps: 3 });
  const res = await run.run({});
  assert.equal(res.status, 'error');
  const notes = led.state().runs.get(res.run).notes;
  assert.ok(notes.some((n) => n.text.includes('step budget')));
});

/* ---------- metrics ---------- */

test('proofFor computes deltas with direction awareness', () => {
  const bps = loadBlueprintDir(BP_DIR);
  const led = new Ledger(null);
  led.append({ type: 'baseline', blueprint: 'speed-to-lead', key: 'first_response_min', value: 240 });
  led.append({ type: 'sample', blueprint: 'speed-to-lead', key: 'first_response_min', value: 4 });
  led.append({ type: 'baseline', blueprint: 'speed-to-lead', key: 'contact_rate_pct', value: 40 });
  led.append({ type: 'sample', blueprint: 'speed-to-lead', key: 'contact_rate_pct', value: 55 });
  const rows = proofFor(bps.get('speed-to-lead'), led.state());
  const rt = rows.find((r) => r.key === 'first_response_min');
  assert.equal(rt.improved, true); // down is good
  assert.ok(rt.deltaPct < -95);
  const cr = rows.find((r) => r.key === 'contact_rate_pct');
  assert.equal(cr.improved, true); // up is good
  const nb = rows.find((r) => r.key === 'booked_rate_pct');
  assert.equal(nb.improved, null); // no data yet
});

test('opsSummary rolls up runs and approvals', () => {
  const led = new Ledger(null);
  led.append({ type: 'run.start', run: 'r1', blueprint: 'b', agent: 'a', callsign: 'C', trigger: {} });
  led.append({ type: 'action.request', run: 'r1', action: 'a1', tool: 't', input: {}, gate: 'approve' });
  led.append({ type: 'gate.verdict', action: 'a1', verdict: 'edited', by: 'kv', editedInput: {} });
  led.append({ type: 'run.end', run: 'r1', status: 'done', tokensIn: 10, tokensOut: 5 });
  const s = opsSummary(led.state());
  assert.equal(s.runsTotal, 1);
  assert.equal(s.done, 1);
  assert.equal(s.approvalCleanRate, 0); // one verdict, and it was an edit
  assert.equal(s.tokensIn, 10);
});
