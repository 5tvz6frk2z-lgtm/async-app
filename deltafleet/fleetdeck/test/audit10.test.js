// Regression tests for the 14 defects the round-10 combined re-audit confirmed. Most were deeper
// input-validation / crash-robustness gaps in the large surfaces of meter/notify/recorder, plus
// refinements where an earlier fix was correct but incomplete. The security-critical cores
// (tollgate decide/drift, register-engine, contextsmith) stayed clean.
import test from 'node:test';
import assert from 'node:assert/strict';
import { analyze } from '../lib/agentready.js';
import { agentReadyMetrics, AGENT_READY_RULES } from '../lib/monitor.js';
import { meterEvents, costOf } from '../lib/meter.js';
import { Spine } from '../lib/spine.js';
import { Recorder } from '../lib/recorder.js';
import { deliver } from '../lib/notify.js';
import { previewManifest, verdict } from '../lib/preflight.js';
import { Tollgate } from '../lib/tollgate.js';
import { Approvals } from '../lib/approvals.js';

test('audit10 #1: multiple <meta name="robots"> tags are aggregated (trailing noindex detected)', () => {
  const body = `<main><h1>Hi</h1>${'word '.repeat(300)}</main>`;
  const H = (head) => `<html><head><title>T</title>${head}</head><body>${body}</body></html>`;
  const prev = agentReadyMetrics(analyze({ html: H('<meta name="robots" content="index,follow">') }));
  const cur = agentReadyMetrics(analyze({ html: H('<meta name="robots" content="index,follow"><meta name="robots" content="noindex">') }));
  assert.equal(prev.noindex, 0);
  assert.equal(cur.noindex, 1);
  assert.ok(AGENT_READY_RULES.map((r) => r(prev, cur)).filter(Boolean).some((a) => a.signal === 'noindex'));
});

test('audit10 #2: a legacy blockedCrawlers-only prev does not fabricate a retrieval-block alert', () => {
  const rep = analyze({ html: '<title>x</title>', robotsTxt: 'User-agent: OAI-SearchBot\nDisallow: /' });
  const prevLegacy = { score: rep.score, grade: rep.grade, gradeNum: 0, blockedCrawlers: 1, jsonLdValid: 0, likelyShell: 0, llmsTxt: 0 };
  assert.equal(AGENT_READY_RULES[1](prevLegacy, agentReadyMetrics(rep)), null);
  // a truly blank prev (nothing recorded) still fires on a genuine new block
  assert.equal((AGENT_READY_RULES[1]({}, { blockedRetrievalList: ['GPTBot'], blockedList: ['GPTBot'] }) || {}).severity, 'critical');
});

test('audit10 #3: after an empty first tools/list, poisoning a later-added tool drifts critical', () => {
  const tg = new Tollgate({ spine: new Spine(null, { indexBy: ['server'] }), manifest: { default: 'deny', agents: {} } });
  assert.equal(tg.inspect('srv', []).firstSeen, true);                                             // empty -> not pinned
  tg.inspect('srv', [{ name: 't1', description: 'reads a file', inputSchema: {} }]);                // first non-empty -> pins
  assert.equal(tg.inspect('srv', [{ name: 't1', description: 'EXFILTRATE', inputSchema: {} }]).severity, 'critical');
});

test('audit10 #4: a non-indexed where-field throws even when an earlier constraint is empty', () => {
  const s = new Spine(null, { indexBy: ['agent'] });
  s.append('tool.call', { agent: 'a' });
  assert.throws(() => s.query({ where: { agent: 'zzz', notindexed: 'x' } }), /not an indexed field/);
});

test('audit10 #5: a negative cost/token event cannot drive the total down or silence an alarm', () => {
  const r = meterEvents([
    { kind: 'tool.result', agent: 'a', ts: '2026-07-24T00:00:00Z', costUsd: 100 },
    { kind: 'tool.result', agent: 'a', ts: '2026-07-24T00:00:00Z', costUsd: -1000, tokensIn: -50 },
  ], { budgets: [{ id: 'b', scope: 'total', window: 'total', limitUsd: 10 }] });
  assert.ok(r.total.costUsd >= 100, 'negative cost clamped, not subtracted');
  assert.equal(r.alarms.length, 1);
  assert.ok(r.total.tokensIn >= 0);
});

test('audit10 #6: a numeric-string cost is counted, not silently dropped to $0', () => {
  const r = meterEvents([{ kind: 'tool.result', agent: 'a', ts: '2026-07-24T00:00:00Z', costUsd: '100' }],
    { budgets: [{ id: 'b', scope: 'total', window: 'total', limitUsd: 10 }] });
  assert.equal(r.total.costUsd, 100);
  assert.equal(r.alarms.length, 1);
  assert.equal(costOf({ costUsd: '10' }), 10);
});

test('audit10 #7: numeric-string tokens are summed numerically, not string-concatenated', () => {
  const r = meterEvents([{ kind: 'tool.result', agent: 'a', ts: '2026-07-24T00:00:00Z', tokensIn: '500', tokensOut: '300' }], {});
  assert.equal(r.total.tokensIn, 500);
  assert.equal(r.total.tokensOut, 300);
});

test('audit10 #8: render() tolerates an event that lacks a ts', () => {
  const spine = new Spine(null, {});
  spine.append('tool.call', { agent: 'a', server: 's', tool: 't', decision: 'allow' });
  spine.events.push({ id: 'z', seq: 99, kind: 'tool.call', agent: 'a', server: 's', tool: 't2', decision: 'allow' }); // no ts
  assert.doesNotThrow(() => new Recorder({ spine }).render());
});

test('audit10 #9: timeline/render/otel tolerate a non-array mcp.drift `changes`', () => {
  const spine = new Spine(null, {});
  spine.append('mcp.drift', { server: 's', severity: 'critical', changes: { not: 'an array' } });
  const rec = new Recorder({ spine });
  assert.doesNotThrow(() => { rec.timeline(); rec.render(); rec.toOtelSpans(); });
});

test('audit10 #10/#11: deliver() never throws on a null options arg or a hostile config accessor', async () => {
  await assert.doesNotReject(() => deliver([{ message: 'm' }], { slack: 'https://x/y' }, null));
  const hostile = {};
  Object.defineProperty(hostile, 'slack', { get() { throw new Error('boom'); } });
  await assert.doesNotReject(() => deliver([{ message: 'm' }], hostile, {}));
});

test('audit10 #12: notify scrubs the secret path even in a scheme-less error form', async () => {
  const throwing = async () => { throw new Error('connect to hooks.slack.com/services/T/B/SUPERSECRET failed'); };
  const r = await deliver([{ message: 'm' }], { slack: 'https://hooks.slack.com/services/T/B/SUPERSECRET' }, { fetchImpl: throwing });
  assert.ok(!JSON.stringify(r).includes('SUPERSECRET'));
});

test('audit10 #13: a prototype-key historical decision still flags a widening as UNSAFE', () => {
  const cand = { default: 'deny', agents: { a: { s: { allow: ['x'] } } } };
  for (const tok of ['toString', 'constructor', '__proto__', 'hasOwnProperty']) {
    const sp = new Spine(null, { indexBy: ['agent'] });
    sp.append('tool.call', { agent: 'a', server: 's', tool: 'x', input: {}, decision: tok });
    assert.equal(verdict(previewManifest(sp, cand)).safe, false, `was=${tok} widening must be UNSAFE`);
  }
});

test('audit10 #14: a consumed review-retry is not surfaced as a fresh pending item (no re-approval)', () => {
  const spine = new Spine(null, {});
  const inbox = new Approvals({ spine });
  spine.append('tool.call', { agent: 'al', server: 'db', tool: 'migrate', input: {}, decision: 'review' }); // evtA
  inbox.approve(inbox.pending()[0].ref, 'human', 'ok');
  spine.append('tool.call', { agent: 'al', server: 'db', tool: 'migrate', input: {}, decision: 'review' }); // evtB retry
  spine.append('approval.consumed', { ref: 'evt_000000', agent: 'al', server: 'db', tool: 'migrate' });
  assert.equal(inbox.pending().length, 0, 'the executed retry is not re-approvable');
});
