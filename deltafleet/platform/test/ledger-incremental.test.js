import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Ledger } from '../lib/ledger.js';

// A representative event sequence exercising every derivation rule.
function script(ledger) {
  ledger.append({ type: 'orchestration.start', thread: 'thr_1', otype: 'sequential', blueprint: 'bp1' });
  ledger.append({ type: 'run.start', run: 'r1', blueprint: 'bp1', agent: 'a', callsign: 'A', trigger: { x: 1 }, thread: 'thr_1' });
  ledger.append({ type: 'note', run: 'r1', text: 'thinking' });
  ledger.append({ type: 'action.request', run: 'r1', action: 'act1', tool: 'email.send', input: { to: 'x' }, gate: 'approve', confidence: 0.8, calibrated: 0.6 });
  ledger.append({ type: 'action.request', run: 'r1', action: 'act2', tool: 'crm.read', input: {}, gate: 'log', escalated: true });
  ledger.append({ type: 'gate.verdict', action: 'act1', verdict: 'edited', by: 'kv', editedInput: { to: 'y' }, reason: 'fix addr' });
  ledger.append({ type: 'action.result', action: 'act1', ok: true, output: { sent: true } });
  ledger.append({ type: 'verification.result', action: 'act2', outcome: 'clean', refuted: 0, clean: 3 });
  ledger.append({ type: 'baseline', blueprint: 'bp1', key: 'lat', value: 100 });
  ledger.append({ type: 'sample', blueprint: 'bp1', key: 'lat', value: 40 });
  ledger.append({ type: 'gate.change', blueprint: 'bp1', tool: 'crm.read', from: 'approve', to: 'log', by: 'kv', reason: 'earned' });
  ledger.append({ type: 'run.end', run: 'r1', status: 'done', tokensIn: 500, tokensOut: 90 });
  // a second run that parks and is then killed (its approval must void)
  ledger.append({ type: 'run.start', run: 'r2', blueprint: 'bp1', agent: 'a', callsign: 'A', trigger: {} });
  ledger.append({ type: 'action.request', run: 'r2', action: 'act3', tool: 'email.send', input: {}, gate: 'approve' });
  ledger.append({ type: 'kill', run: 'r2', by: 'kv' });
  ledger.append({ type: 'run.end', run: 'r2', status: 'killed', tokensIn: 10, tokensOut: 0 });
  ledger.append({ type: 'orchestration.end', thread: 'thr_1', otype: 'sequential' });
}

// Serialize a state() result into a stable, comparable plain structure.
function serialize(s) {
  const mapObj = (m, fn) => Object.fromEntries([...m.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => [k, fn(v)]));
  return {
    runs: mapObj(s.runs, (r) => ({ ...r })),
    actions: mapObj(s.actions, (a) => ({ ...a })),
    metrics: mapObj(s.metrics, (km) => mapObj(km, (v) => ({ ...v }))),
    overrides: mapObj(s.overrides, (o) => ({ ...o })),
    gateChanges: s.gateChanges.map((g) => ({ ...g })),
    threads: mapObj(s.threads, (t) => ({ ...t })),
    pendingApprovals: [...s.pendingApprovals].map((a) => a.id).sort(),
  };
}

test('incremental append produces the same state as a full replay', () => {
  // A: state() called after every append (drives the incremental path)
  const A = new Ledger(null);
  const events = [];
  const origAppend = A.append.bind(A);
  A.append = (e) => { const r = origAppend(e); events.push(r); A.state(); return r; };
  script(A);

  // B: the SAME captured events (identical timestamps), replayed in one shot so
  // state() takes the full-replay build path. Compare against A's incremental.
  const B = new Ledger(null);
  B.events = events.map((e) => ({ ...e }));

  assert.deepEqual(serialize(A.state()), serialize(B.state()));
});

test('state() reflects events appended AFTER the projection was first built', () => {
  const l = new Ledger(null);
  l.append({ type: 'run.start', run: 'r1', blueprint: 'bp', agent: 'a', callsign: 'A', trigger: {} });
  const s1 = l.state();
  assert.equal(s1.runs.size, 1);
  assert.equal(s1.pendingApprovals.length, 0);

  // append after the first state() call → must be visible incrementally
  l.append({ type: 'action.request', run: 'r1', action: 'act1', tool: 'email.send', input: {}, gate: 'approve' });
  const s2 = l.state();
  assert.equal(s2.pendingApprovals.length, 1);
  assert.equal(s2.pendingApprovals[0].id, 'act1');

  l.append({ type: 'gate.verdict', action: 'act1', verdict: 'approved', by: 'kv' });
  assert.equal(l.state().pendingApprovals.length, 0, 'verdict clears the pending incrementally');
});

test('pendingApprovals voids when a parked run ends', () => {
  const l = new Ledger(null);
  l.append({ type: 'run.start', run: 'r1', blueprint: 'bp', agent: 'a', callsign: 'A', trigger: {} });
  l.append({ type: 'action.request', run: 'r1', action: 'act1', tool: 'email.send', input: {}, gate: 'approve' });
  assert.equal(l.state().pendingApprovals.length, 1);
  l.append({ type: 'run.end', run: 'r1', status: 'killed', tokensIn: 0, tokensOut: 0 });
  assert.equal(l.state().pendingApprovals.length, 0, 'an ended run leaves nothing pending');
});

test('pendingApprovals independently matches the canonical filter over all actions', () => {
  // Guards against the incremental `pending` map diverging from the original
  // semantics (approve-gated, unverdicted, run still alive) — computed here from
  // scratch over the full actions map, not via #applyOne.
  const l = new Ledger(null);
  script(l); // includes a kill-while-parked run (r2) whose approval must be void
  // add a live parked approval that should remain pending
  l.append({ type: 'run.start', run: 'r3', blueprint: 'bp1', agent: 'a', callsign: 'A', trigger: {} });
  l.append({ type: 'action.request', run: 'r3', action: 'act9', tool: 'email.send', input: {}, gate: 'approve' });
  const s = l.state();
  const alive = (id) => { const r = s.runs.get(id); return r && !r.end; };
  const reference = [...s.actions.values()].filter((a) => a.gate === 'approve' && !a.verdict && alive(a.run)).map((a) => a.id).sort();
  assert.deepEqual([...s.pendingApprovals].map((a) => a.id).sort(), reference);
  assert.deepEqual(reference, ['act9'], 'only the live parked approval is pending');
});

test('metric samples are bounded in the projection but the count stays true', () => {
  const l = new Ledger(null);
  l.append({ type: 'baseline', blueprint: 'bp', key: 'lat', value: 100 });
  const N = Ledger.SAMPLE_WINDOW + 50;
  for (let i = 0; i < N; i++) l.append({ type: 'sample', blueprint: 'bp', key: 'lat', value: i });
  const rec = l.state().metrics.get('bp').get('lat');
  assert.equal(rec.samples.length, Ledger.SAMPLE_WINDOW, 'retained window is capped');
  assert.equal(rec.count, N, 'true total count is preserved');
  assert.equal(rec.samples[rec.samples.length - 1].value, N - 1, 'the latest sample is retained');
});

test('crash-safe load: a torn final record is dropped; mid-file corruption throws', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ledger-'));
  const good = { t: '2026-07-07T00:00:00.000Z', type: 'run.start', run: 'r1', blueprint: 'bp', agent: 'a', callsign: 'A', trigger: {} };

  // torn final line (crash mid-append) → tolerated, valid events still load
  const f1 = path.join(dir, 'torn.jsonl');
  fs.writeFileSync(f1, JSON.stringify(good) + '\n' + '{"type":"run.st');
  const l1 = new Ledger(f1);
  assert.equal(l1.events.length, 1);
  assert.equal(l1.state().runs.size, 1);
  // and the next append writes cleanly after the torn record
  l1.append({ type: 'note', run: 'r1', text: 'recovered' });
  assert.equal(new Ledger(f1).events.length, 2);

  // corruption in the MIDDLE is real damage → must not be silently skipped
  const f2 = path.join(dir, 'mid.jsonl');
  fs.writeFileSync(f2, JSON.stringify(good) + '\n' + 'GARBAGE\n' + JSON.stringify(good) + '\n');
  assert.throws(() => new Ledger(f2), /corrupt at line 2/);

  fs.rmSync(dir, { recursive: true, force: true });
});

test('repeated state() returns the same live projection maps (no re-derivation)', () => {
  const l = new Ledger(null);
  script(l);
  const s1 = l.state();
  const s2 = l.state();
  assert.equal(s1.runs, s2.runs, 'same Map identity — projection is reused, not rebuilt');
  assert.equal(s1.actions, s2.actions);
});
