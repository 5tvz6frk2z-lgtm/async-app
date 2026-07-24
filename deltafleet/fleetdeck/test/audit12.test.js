// Regression tests for the round-12 combined re-audit (4 HIGH, 4 MED, 1 LOW). Several were
// refinements/regressions of recent fixes (retrieval namedPrev slack, meter money() blank,
// register openReviews mirroring the approvals fix) — the asymptotic tail. After this batch the
// loop's productive phase is declared complete: the security-design core is dry.
import test from 'node:test';
import assert from 'node:assert/strict';
import { analyze } from '../lib/agentready.js';
import { agentReadyMetrics, AGENT_READY_RULES } from '../lib/monitor.js';
import { meterEvents, costOf } from '../lib/meter.js';
import { Spine } from '../lib/spine.js';
import { Recorder } from '../lib/recorder.js';
import { deliver } from '../lib/notify.js';
import { Register } from '../lib/register.js';

const robots = (names) => names.map((n) => `User-agent: ${n}\nDisallow: /`).join('\n\n');
const M = (names) => agentReadyMetrics(analyze({ url: 'http://e.com', html: '<html><head><title>x</title></head><body>' + 'word '.repeat(100) + '</body></html>', robotsTxt: robots(names) }));

test('audit12 #1: a retrieval bot named in prev.blockedList is not double-counted (new block still fires)', () => {
  const prevFull = M(['PerplexityBot']);
  const { blockedRetrievalList, ...legacy } = prevFull; // legacy prev missing the field
  const cur = M(['PerplexityBot', 'OAI-SearchBot']);
  const alerts = AGENT_READY_RULES.map((r) => { try { return r(legacy, cur); } catch { return null; } }).filter(Boolean).map((a) => a.signal);
  assert.ok(alerts.includes('retrieval-access'), 'a genuinely new retrieval block still fires');
  // round-11's unnamed-count case (no retrieval bot in list) still correctly stays silent
  assert.equal(AGENT_READY_RULES[1]({ blockedList: ['GPTBot'], blockedRetrieval: 1, blockedCrawlers: 2 },
    { blockedList: ['GPTBot', 'OAI-SearchBot'], blockedRetrievalList: ['OAI-SearchBot'], blockedRetrieval: 1, blockedCrawlers: 2 }), null);
});

test('audit12 #3: an in-memory event is JSON-normalized to match what a reload would see', () => {
  const s = new Spine(null, {});
  const e = s.append('x', { v: Infinity, u: undefined, n: NaN });
  assert.equal(e.v, null, 'Infinity -> null (as JSON persists it)');
  assert.equal('u' in e, false, 'undefined dropped');
  assert.equal(e.n, null, 'NaN -> null');
  assert.equal(s.query({ kind: 'x' })[0].v, null, 'query reflects the normalized value');
});

test('audit12 #4: a blank/empty costUsd falls back to token pricing, not $0', () => {
  const r = meterEvents([{ kind: 'tool.result', agent: 'a', ts: '2026-07-24T00:00:00Z', costUsd: '', tokensIn: 1000000, model: 'm' }], { pricing: { m: { in: 3, out: 0 } } });
  assert.equal(r.total.costUsd, 3, 'blank cost -> token-derived $3, not $0');
  assert.equal(costOf({ costUsd: '10' }), 10, 'a numeric string is still honored');
  assert.equal(costOf({ costUsd: 'abc' }), 0, 'garbage cost -> 0 fallback (no pricing)');
});

test('audit12 #6: since/until windowing does not mis-correlate a result to the wrong call', () => {
  const spine = new Spine(null, {});
  spine.append('tool.call', { agent: 'a', server: 's', tool: 't', decision: 'allow' });          // seq0
  spine.append('tool.result', { agent: 'a', server: 's', tool: 't', ok: true, costUsd: 0.05 });   // seq1
  const rec = new Recorder({ spine });
  assert.equal(rec.timeline().find((e) => e.kind === 'tool.call').result.costUsd, 0.05, 'correlation is on the full log');
  assert.ok(rec.timeline({ since: 1 }).every((e) => e.seq >= 1), 'since still windows the returned entries');
});

test('audit12 #7: a value containing the delimiter does not cross-correlate calls', () => {
  const spine = new Spine(null, {});
  spine.append('tool.call', { agent: 'a|x', server: 's', tool: 't', decision: 'allow' });
  spine.append('tool.call', { agent: 'a', server: 'x|s', tool: 't', decision: 'allow' });
  spine.append('tool.result', { agent: 'a', server: 'x|s', tool: 't', ok: true, costUsd: 0.09 });
  const calls = new Recorder({ spine }).timeline().filter((e) => e.kind === 'tool.call');
  assert.equal(calls.find((c) => c.agent === 'a|x').result, undefined, 'distinct tuple with a pipe is not confused');
  assert.equal(calls.find((c) => c.agent === 'a' && c.server === 'x|s').result.costUsd, 0.09);
});

test('audit12 #8: deliver() never throws on a hostile alerts object with a throwing .length', async () => {
  const hostile = {};
  Object.defineProperty(hostile, 'length', { get() { throw new Error('boom'); } });
  await assert.doesNotReject(() => deliver(hostile, { slack: 'https://x/y' }, {}));
});

test('audit12 #9: register openReviews accounts for approval.consumed (a consumed retry isn\'t open)', () => {
  const spine = new Spine(null, { indexBy: ['agent'] });
  spine.append('tool.call', { agent: 'al', server: 'db', tool: 'migrate', input: {}, decision: 'review' });
  spine.append('approval.verdict', { ref: 'evt_000000', verdict: 'approved', by: 'h' });
  spine.append('tool.call', { agent: 'al', server: 'db', tool: 'migrate', input: {}, decision: 'review' }); // retry
  spine.append('approval.consumed', { ref: 'evt_000000', agent: 'al', server: 'db', tool: 'migrate' });
  const ho = new Register({ spine }).register().controls.find((c) => /oversight/i.test(c.name));
  assert.equal(ho.status, 'satisfied', 'the consumed retry does not linger as an open oversight item');
});
