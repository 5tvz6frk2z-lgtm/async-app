// Regression tests for the round-11 combined re-audit (0 critical, 4 HIGH, 6 MED, 1 LOW). The
// findings are now bounded/exotic — legacy-metric-shape migration, merged-log id collisions,
// hostile getters — plus genuine HIGH with clean fixes. #1 (crawler legacy-shape FN) is an
// accepted information-theoretic limitation, documented in monitor.js, not "fixed" (any fix
// reintroduces the round-9 false-positive).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fingerprintTool, Tollgate } from '../lib/tollgate.js';
import { AGENT_READY_RULES } from '../lib/monitor.js';
import { Spine } from '../lib/spine.js';
import { meterEvents } from '../lib/meter.js';
import { Recorder } from '../lib/recorder.js';
import { deliver } from '../lib/notify.js';
import { Approvals } from '../lib/approvals.js';

test('audit11 #2: retrieval identity branch credits prev\'s UNNAMED retrieval count', () => {
  const ret = AGENT_READY_RULES[1];
  // prev.blockedRetrieval=1 says a retrieval bot was already blocked though the list names none;
  // cur names one retrieval bot (same count) — a possible rename, not a new block: stay silent.
  assert.equal(ret({ blockedList: ['GPTBot'], blockedRetrieval: 1, blockedCrawlers: 2 },
    { blockedList: ['GPTBot', 'OAI-SearchBot'], blockedRetrievalList: ['OAI-SearchBot'], blockedRetrieval: 1, blockedCrawlers: 2 }), null);
  // but a genuine same-count SWAP where prev NAMED its retrieval bot still fires
  assert.equal((ret({ blockedList: ['GPTBot', 'ClaudeBot'], blockedRetrievalList: ['ClaudeBot'], blockedRetrieval: 1 },
    { blockedList: ['GPTBot', 'OAI-SearchBot'], blockedRetrievalList: ['OAI-SearchBot'], blockedRetrieval: 1 }) || {}).severity, 'critical');
});

test('audit11 #3: fingerprintTool is injective across type — a string can\'t collide with an object desc', () => {
  assert.notEqual(fingerprintTool({ name: 't', description: '{"a":1}' }).descHash, fingerprintTool({ name: 't', description: { a: 1 } }).descHash);
  assert.notEqual(fingerprintTool({ name: 't', title: 'true' }).titleHash, fingerprintTool({ name: 't', title: true }).titleHash);
  // a real string description change still drifts
  assert.notEqual(fingerprintTool({ name: 't', description: 'safe' }).descHash, fingerprintTool({ name: 't', description: 'evil' }).descHash);
});

test('audit11 #4: a HITL approval binds to a SNAPSHOT — mutating the caller\'s args after review can\'t swap the payload', () => {
  const spine = new Spine(null, {});
  const tg = new Tollgate({ spine, manifest: { default: 'deny', agents: { c: { s: { review: ['pay'] } } } } });
  const args = { amount: 1, to: 'alice' };
  tg.guard('c', 's', 'pay', args);
  args.amount = 1000000; args.to = 'attacker'; // attacker mutates the same object post-review
  const rec = spine.query({ kind: 'tool.call' })[0];
  assert.equal(rec.input.amount, 1);
  assert.equal(rec.input.to, 'alice');
});

test('audit11 #5: a complete-but-corrupt final record throws; a torn write (no trailing newline) is tolerated', () => {
  const good = JSON.stringify({ id: 'g', seq: 0, ts: 't', kind: 'x' });
  const p = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sp5-')), 'sp.jsonl');
  fs.writeFileSync(p, good + '\nnull\n'); // complete corrupt: has its trailing newline
  assert.throws(() => new Spine(p, {}), /corrupt/);
  const p2 = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sp5b-')), 'sp.jsonl');
  fs.writeFileSync(p2, good + '\n{"partial'); // torn: no trailing newline
  let s;
  assert.doesNotThrow(() => { s = new Spine(p2, {}); });
  assert.equal(s.all().length, 1);
});

test('audit11 #11: duplicate ids in a merged log are disambiguated (no conflated approval)', () => {
  const p = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sp11-')), 'sp.jsonl');
  fs.writeFileSync(p, [
    JSON.stringify({ id: 'evt_000000', seq: 0, ts: 't', kind: 'tool.call', decision: 'review', agent: 'al', server: 'bank', tool: 'transfer', input: { amount: 5, to: 'self' } }),
    JSON.stringify({ id: 'evt_000001', seq: 1, ts: 't', kind: 'approval.verdict', ref: 'evt_000000', verdict: 'approved', by: 'cfo' }),
    JSON.stringify({ id: 'evt_000000', seq: 0, ts: 't', kind: 'tool.call', decision: 'review', agent: 'al', server: 'bank', tool: 'transfer', input: { amount: 1000000, to: 'attacker' } }),
  ].join('\n') + '\n');
  const inbox = new Approvals({ spine: new Spine(p, {}) });
  const pend = inbox.pending();
  assert.equal(pend.filter((x) => x.input && x.input.amount === 1000000).length, 1, 'the unreviewed $1M transfer is still pending');
  assert.equal(inbox.isApproved('evt_000000'), true, 'only the reviewed $5 transfer is approved');
});

test('audit11 #6: a budget spend exactly equal to the limit fires exceeded (float boundary)', () => {
  const r = meterEvents([
    { kind: 'tool.result', agent: 'a', ts: '2026-07-24T00:00:00Z', costUsd: 0.1 },
    { kind: 'tool.result', agent: 'a', ts: '2026-07-24T00:00:00Z', costUsd: 0.2 },
  ], { budgets: [{ id: 'b', scope: 'total', window: 'total', limitUsd: 0.3 }] });
  assert.equal(r.budgets[0].state, 'exceeded');
});

test('audit11 #7: a held review exports an ERROR span (never a phantom OK with usage)', () => {
  const spine = new Spine(null, {});
  spine.append('tool.call', { agent: 'c', server: 'd', tool: 'danger', input: {}, decision: 'review' });
  spine.append('approval.verdict', { ref: 'evt_000000', verdict: 'approved', by: 'h' });
  spine.append('tool.call', { agent: 'c', server: 'd', tool: 'danger', input: {}, decision: 'review' });
  spine.append('approval.consumed', { ref: 'evt_000000', agent: 'c', server: 'd', tool: 'danger' });
  spine.append('tool.result', { agent: 'c', server: 'd', tool: 'danger', ok: true, costUsd: 0.01 });
  const spans = new Recorder({ spine }).toOtelSpans();
  const held = spans.find((s) => s.spanId === 'evt_000000');
  const retry = spans.find((s) => s.spanId === 'evt_000002');
  assert.equal(held.status.code, 'ERROR');
  assert.equal(held.attributes['fleetdeck.cost_usd'], undefined);
  assert.equal(retry.status.code, 'OK');
  assert.equal(retry.attributes['fleetdeck.cost_usd'], 0.01);
});

test('audit11 #8: a null/garbage element in mcp.drift changes does not crash the recorder', () => {
  const spine = new Spine(null, {});
  spine.append('mcp.drift', { server: 's', severity: 'critical', changes: [{ type: 'x', tool: 't' }, null, undefined, 5] });
  const rec = new Recorder({ spine });
  assert.doesNotThrow(() => { rec.render(); rec.timeline(); rec.toOtelSpans(); });
});

test('audit11 #9/#10: notify scrubs a query-string secret and never throws on a hostile opts getter', async () => {
  const throwing = async () => { throw new Error('server said token=QSECRET99 invalid'); };
  const r = await deliver([{ message: 'x' }], { webhook: 'https://x.com/services/T/B/?token=QSECRET99' }, { fetchImpl: throwing });
  assert.ok(!JSON.stringify(r).includes('QSECRET99'));
  const hostile = {};
  Object.defineProperty(hostile, 'fetchImpl', { get() { throw new Error('boom'); } });
  await assert.doesNotReject(() => deliver([{ message: 'x' }], { slack: 'https://x/y' }, hostile));
});
