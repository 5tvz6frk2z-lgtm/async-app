import test from 'node:test';
import assert from 'node:assert/strict';
import { Spine } from '../lib/spine.js';
import { Tollgate } from '../lib/tollgate.js';
import { Register } from '../lib/register.js';
import {
  Monitor, standardMonitor,
  agentReadyMetrics, AGENT_READY_RULES,
  registerMetrics, AI_REGISTER_RULES, registerProbe,
} from '../lib/monitor.js';
import { analyze } from '../lib/agentready.js';

function mon() { return standardMonitor(new Spine(null, { indexBy: ['agent', 'server'] })); }

test('record on an unknown monitor throws', () => {
  const m = new Monitor({ spine: new Spine(null) });
  assert.throws(() => m.record('nope', 't', { metrics: {} }), /unknown monitor/);
});

test('first check never alerts; a steady second check stays silent', () => {
  const m = mon();
  const r1 = m.record('agent-ready', 'https://x.com', { summary: 'a', metrics: { score: 80, grade: 'B', blockedCrawlers: 0, jsonLdValid: 2, likelyShell: 0, llmsTxt: 1 } });
  assert.equal(r1.firstCheck, true);
  assert.equal(r1.alerts.length, 0);
  const r2 = m.record('agent-ready', 'https://x.com', { metrics: { score: 80, grade: 'B', blockedCrawlers: 0, jsonLdValid: 2, likelyShell: 0, llmsTxt: 1 } });
  assert.equal(r2.alerts.length, 0, 'no change -> no alert (no fatigue)');
});

test('agent-ready: a big score drop is a critical alert; a small drop is a warning', () => {
  const m = mon();
  const base = { score: 90, grade: 'A', blockedCrawlers: 0, jsonLdValid: 3, likelyShell: 0, llmsTxt: 1 };
  m.record('agent-ready', 'u', { metrics: base });
  const r = m.record('agent-ready', 'u', { metrics: { ...base, score: 70 } });
  const a = r.alerts.find((x) => x.signal === 'score');
  assert.equal(a.severity, 'critical');
  assert.match(a.message, /fell 20 points/);

  const m2 = mon();
  m2.record('agent-ready', 'u', { metrics: base });
  const r2 = m2.record('agent-ready', 'u', { metrics: { ...base, score: 83 } });
  assert.equal(r2.alerts.find((x) => x.signal === 'score').severity, 'warning');
});

test('agent-ready: a newly-blocked RETRIEVAL bot is critical; a training bot is only a warning', () => {
  const m = mon();
  const base = { score: 80, grade: 'B', blockedCrawlers: 0, blockedRetrieval: 0, jsonLdValid: 2, likelyShell: 0, llmsTxt: 0 };
  m.record('agent-ready', 'u', { metrics: base });
  // block 2 crawlers, one of which is an answer-engine retrieval bot
  const r = m.record('agent-ready', 'u', { metrics: { ...base, blockedCrawlers: 2, blockedRetrieval: 1 } });
  const ret = r.alerts.find((x) => x.signal === 'retrieval-access');
  assert.equal(ret.severity, 'critical');
  assert.match(ret.message, /RETRIEVAL bot/);
  const other = r.alerts.find((x) => x.signal === 'crawler-access');
  assert.equal(other.severity, 'warning', 'the 1 non-retrieval block is a warning');

  // blocking ONLY training/user bots (no retrieval) never escalates to critical
  const m2 = mon();
  m2.record('agent-ready', 'u', { metrics: base });
  const r2 = m2.record('agent-ready', 'u', { metrics: { ...base, blockedCrawlers: 3, blockedRetrieval: 0 } });
  assert.equal(r2.alerts.find((x) => x.signal === 'crawler-access').severity, 'warning');
  assert.equal(r2.alerts.find((x) => x.signal === 'retrieval-access'), undefined);
});

test('agent-ready: structured data disappearing and JS-shell regressions fire', () => {
  const m = mon();
  const base = { score: 85, grade: 'B', blockedCrawlers: 0, jsonLdValid: 3, likelyShell: 0, llmsTxt: 1 };
  m.record('agent-ready', 'u', { metrics: base });
  const r = m.record('agent-ready', 'u', { metrics: { ...base, jsonLdValid: 0, likelyShell: 1, llmsTxt: 0, score: 60 } });
  const signals = r.alerts.map((a) => a.signal).sort();
  assert.ok(signals.includes('structured-data'));
  assert.ok(signals.includes('content-density'));
  assert.ok(signals.includes('llms-txt'));
  assert.ok(signals.includes('score'));
});

test('agent-ready: an IMPROVEMENT never alerts', () => {
  const m = mon();
  m.record('agent-ready', 'u', { metrics: { score: 60, grade: 'D', blockedCrawlers: 2, jsonLdValid: 0, likelyShell: 1, llmsTxt: 0 } });
  const r = m.record('agent-ready', 'u', { metrics: { score: 95, grade: 'A', blockedCrawlers: 0, jsonLdValid: 3, likelyShell: 0, llmsTxt: 1 } });
  assert.equal(r.alerts.length, 0, 'getting better is not an alert');
});

test('agentReadyMetrics is a pure function of an analyze() report', () => {
  const html = '<html><head><title>T</title><script type="application/ld+json">{"@type":"Organization"}</script></head><body><main><h1>H</h1><p>' + 'text '.repeat(300) + '</p></main></body></html>';
  const robots = 'User-agent: GPTBot\nDisallow: /';
  const met = agentReadyMetrics(analyze({ html, robotsTxt: robots, headers: { 'content-type': 'text/html' } }));
  assert.equal(typeof met.score, 'number');
  assert.equal(met.blockedCrawlers, 1, 'GPTBot blocked counted');
  assert.equal(met.jsonLdValid, 1);
});

test('ai-register: posture worsening (attention->gap style) alerts, improvement does not', () => {
  const m = mon();
  m.record('ai-register', 'fleet', { metrics: { overall: 'attention', overallRank: 1, satisfied: 3, attention: 2, gap: 0 } });
  const worse = m.record('ai-register', 'fleet', { metrics: { overall: 'gap', overallRank: 2, satisfied: 2, attention: 1, gap: 2 } });
  assert.ok(worse.alerts.some((a) => a.signal === 'overall' && a.severity === 'critical'));
  assert.ok(worse.alerts.some((a) => a.signal === 'gap-count'));

  const better = m.record('ai-register', 'fleet', { metrics: { overall: 'satisfied', overallRank: 0, satisfied: 5, attention: 0, gap: 0 } });
  assert.equal(better.alerts.length, 0);
});

test('registerProbe reads a live Register into metrics', () => {
  const spine = new Spine(null, { indexBy: ['agent', 'server'] });
  const gate = new Tollgate({ spine, manifest: { default: 'deny', agents: { a: { s: { review: ['x_*'] } } } } });
  gate.guard('a', 's', 'x_do', {}); // a pending review -> humanOversight attention
  const probe = registerProbe(new Register({ spine }));
  assert.ok(['attention', 'gap'].includes(probe.metrics.overall));
  assert.equal(typeof probe.metrics.gap, 'number');
});

test('history and trend return an ordered series; alerts are newest-first', () => {
  const m = mon();
  for (const s of [90, 85, 70]) m.record('agent-ready', 'u', { metrics: { score: s, grade: 'B', blockedCrawlers: 0, jsonLdValid: 1, likelyShell: 0, llmsTxt: 0 } });
  assert.deepEqual(m.trend('agent-ready', 'u', 'score').map((p) => p.value), [90, 85, 70]);
  assert.equal(m.history('agent-ready', 'u').length, 3);
  const alerts = m.alerts('agent-ready', 'u');
  assert.ok(alerts.length >= 2, 'two drops -> at least two alerts');
  assert.equal(m.worstSeverity('agent-ready', 'u'), 'critical'); // 85->70 is a 15pt drop
});

test('a detector that throws does not break the check', () => {
  const m = new Monitor({ spine: new Spine(null) });
  m.define('flaky', { rules: [() => { throw new Error('boom'); }, () => ({ signal: 's', severity: 'info', message: 'ok' })] });
  m.record('flaky', 't', { metrics: { a: 1 } });
  const r = m.record('flaky', 't', { metrics: { a: 2 } });
  assert.equal(r.alerts.length, 1, 'the throwing rule is swallowed; the good rule still fires');
});

// ── regressions from the correctness-audit workflow ──
test('audit: a same-count SWAP of blocked retrieval bots fires (set diff, not count)', () => {
  const m = mon();
  const base = { score: 40, blockedCrawlers: 1, blockedRetrieval: 1, blockedList: ['OAI-SearchBot'], blockedRetrievalList: ['OAI-SearchBot'], likelyShell: 0, jsonLdValid: 0, llmsTxt: 0 };
  m.record('agent-ready', 'u', { metrics: base });
  // OAI unblocked, PerplexityBot newly blocked — count stays 1, score flat
  const r = m.record('agent-ready', 'u', { metrics: { ...base, blockedList: ['PerplexityBot'], blockedRetrievalList: ['PerplexityBot'] } });
  const a = r.alerts.find((x) => x.signal === 'retrieval-access');
  assert.equal(a.severity, 'critical');
  assert.match(a.message, /PerplexityBot/);
});

test('audit: a same-count SWAP of training crawlers fires the crawler-access warning', () => {
  const m = mon();
  const base = { score: 41, blockedCrawlers: 2, blockedRetrieval: 0, blockedList: ['GPTBot', 'ClaudeBot'], blockedRetrievalList: [] };
  m.record('agent-ready', 'u', { metrics: base });
  // GPTBot unblocked, Amazonbot newly blocked — count flat 2→2
  const r = m.record('agent-ready', 'u', { metrics: { ...base, blockedList: ['ClaudeBot', 'Amazonbot'] } });
  const a = r.alerts.find((x) => x.signal === 'crawler-access');
  assert.equal(a.severity, 'warning');
  assert.match(a.message, /Amazonbot/);
});

test('audit3: a page going noindex fires critical even when the net score RISES', () => {
  const m = mon();
  // score improves 63->79 (markup added) but the page became non-indexable
  m.record('agent-ready', 'u', { metrics: { score: 63, noindex: 0, blockedList: [], blockedRetrievalList: [] } });
  const r = m.record('agent-ready', 'u', { metrics: { score: 79, noindex: 1, blockedList: [], blockedRetrievalList: [] } });
  const a = r.alerts.find((x) => x.signal === 'noindex');
  assert.equal(a.severity, 'critical');
  assert.match(a.message, /noindex/);
  // a steady noindex page does not re-alert
  const r2 = m.record('agent-ready', 'u', { metrics: { score: 79, noindex: 1, blockedList: [], blockedRetrievalList: [] } });
  assert.equal(r2.alerts.find((x) => x.signal === 'noindex'), undefined);
});

test('audit3: retrieval rule does not fire on an UNCHANGED check (baseline unions both lists)', () => {
  const m = mon();
  // inconsistent hand-fed metrics: a retrieval bot present in blockedRetrievalList but
  // not blockedList; prev === cur, so nothing changed
  const met = { score: 50, blockedList: [], blockedRetrievalList: ['OAI-SearchBot'] };
  m.record('agent-ready', 'u', { metrics: met });
  const r = m.record('agent-ready', 'u', { metrics: { ...met } });
  assert.equal(r.alerts.length, 0, 'an identical check must be silent');
});

test('audit2: a bot already blocked, merely re-tagged as retrieval, does NOT alert', () => {
  const m = mon();
  // OAI-SearchBot blocked in BOTH checks; only its role tag flips to retrieval (a
  // registry reclassification between cron checks) — robots.txt/access did not change
  const base = { score: 40, blockedCrawlers: 1, blockedRetrieval: 0, blockedList: ['OAI-SearchBot'], blockedRetrievalList: [] };
  m.record('agent-ready', 'u', { metrics: base });
  const r = m.record('agent-ready', 'u', { metrics: { ...base, blockedRetrieval: 1, blockedRetrievalList: ['OAI-SearchBot'] } });
  assert.equal(r.alerts.find((x) => x.signal === 'retrieval-access'), undefined, 'a role re-tag on an already-blocked bot is not an access regression');
});

test('audit2: a garbage prev count does not fire, but an ABSENT prev count (schema evolution) does', () => {
  const m1 = mon();
  m1.record('agent-ready', 'u', { metrics: { blockedRetrieval: 'two' } });    // present but unparseable
  assert.equal(m1.record('agent-ready', 'u', { metrics: { blockedRetrieval: 1 } }).alerts.length, 0, "'two'->1 is uncomparable, no alert");
  const m2 = mon();
  m2.record('agent-ready', 'u', { metrics: { score: 50 } });                   // absent blockedRetrieval (old schema)
  const r = m2.record('agent-ready', 'u', { metrics: { score: 50, blockedRetrieval: 1 } });
  assert.ok(r.alerts.some((x) => x.signal === 'retrieval-access'), 'absent->1 is a real new block from a 0 baseline');
});

test('audit: a string-count IMPROVEMENT does not fabricate a critical (numeric coercion)', () => {
  const m = mon();
  m.record('agent-ready', 'u', { metrics: { blockedRetrieval: '10' } });
  const r = m.record('agent-ready', 'u', { metrics: { blockedRetrieval: '2' } }); // 10 -> 2 is an improvement
  assert.equal(r.alerts.find((x) => x.signal === 'retrieval-access'), undefined, "lexicographic '2' > '10' must not fire");
});

test('audit: set entries differing only in TYPE are treated equal (no bogus alert)', () => {
  const m = mon();
  m.record('agent-ready', 'u', { metrics: { blockedRetrievalList: [1, 2] } });
  const r = m.record('agent-ready', 'u', { metrics: { blockedRetrievalList: ['1', '2'] } }); // same two bots
  assert.equal(r.alerts.length, 0, 'same set, different element type -> no change');
});

test('audit: a control leaving satisfied fires even when attention count is flat', () => {
  const m = mon();
  // overall already attention; a control degrades satisfied→attention while another attention control retires
  m.record('ai-register', 'fleet', { metrics: { overall: 'attention', overallRank: 1, satisfied: 5, attention: 1, gap: 0 } });
  const r = m.record('ai-register', 'fleet', { metrics: { overall: 'attention', overallRank: 1, satisfied: 4, attention: 1, gap: 0 } });
  const a = r.alerts.find((x) => x.signal === 'attention-count');
  assert.ok(a, 'satisfied 5→4 with flat gap/rank must alert — the silent-regression bug');
  assert.equal(a.severity, 'warning');
});

test('audit: a satisfied→gap regression does NOT double-fire attention-count (gap rule owns it)', () => {
  const m = mon();
  m.record('ai-register', 'fleet', { metrics: { overall: 'attention', overallRank: 1, satisfied: 4, attention: 0, gap: 0 } });
  const r = m.record('ai-register', 'fleet', { metrics: { overall: 'gap', overallRank: 2, satisfied: 3, attention: 0, gap: 1 } });
  assert.ok(r.alerts.some((x) => x.signal === 'gap-count'), 'gap rule fires');
  assert.equal(r.alerts.find((x) => x.signal === 'attention-count'), undefined, 'attention rule stays quiet when gap grew');
});

test('schema evolution: a metric absent from the OLD check does not false-alert', () => {
  const m = mon();
  // an older check taken before `llmsTxt`/`likelyShell` were tracked
  m.record('agent-ready', 'u', { metrics: { score: 80, grade: 'B', blockedCrawlers: 0, jsonLdValid: 2 } });
  const r = m.record('agent-ready', 'u', { metrics: { score: 80, grade: 'B', blockedCrawlers: 0, jsonLdValid: 2, likelyShell: 0, llmsTxt: 1 } });
  assert.equal(r.alerts.length, 0, 'newly-present metrics must not read as a regression');
});

test('malformed metrics never throw and never fabricate an alert', () => {
  const m = mon();
  m.record('agent-ready', 'u', { metrics: { score: 'oops', blockedCrawlers: null, jsonLdValid: undefined } });
  assert.doesNotThrow(() => m.record('agent-ready', 'u', { metrics: {} }));
  const r = m.record('agent-ready', 'u', { metrics: { score: NaN, blockedCrawlers: undefined } });
  assert.ok(Array.isArray(r.alerts), 'still returns cleanly');
});

test('record with no metrics key is tolerated (treated as empty)', () => {
  const m = mon();
  assert.doesNotThrow(() => m.record('ai-register', 'fleet', { summary: 'x' }));
  const r = m.record('ai-register', 'fleet', {});
  assert.equal(r.alerts.length, 0);
});

test('targets are isolated — one URL\'s history does not leak into another', () => {
  const m = mon();
  m.record('agent-ready', 'a.com', { metrics: { score: 90, grade: 'A', blockedCrawlers: 0, jsonLdValid: 1, likelyShell: 0, llmsTxt: 0 } });
  const r = m.record('agent-ready', 'b.com', { metrics: { score: 40, grade: 'F', blockedCrawlers: 0, jsonLdValid: 0, likelyShell: 1, llmsTxt: 0 } });
  assert.equal(r.firstCheck, true, 'b.com is its own first check, not compared to a.com');
  assert.equal(r.alerts.length, 0);
});
