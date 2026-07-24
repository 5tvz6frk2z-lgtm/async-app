// Adversarial tests for Monitor (recurring-check + regression-detector engine).
//
// Convention (mirrors spine.adversarial.test.js): a test named `BUG:` asserts the
// CORRECT behavior and is written to FAIL against the current code, so each real
// defect is visible when the suite runs. Tests without that prefix confirm behavior
// that is genuinely correct, or document an inherent limitation.
//
// The detectors matter most: for a monitoring product a FALSE NEGATIVE (a real
// regression that fails to alert) is worse than useless, so those are the headline.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Spine } from '../lib/spine.js';
import { standardMonitor } from '../lib/monitor.js';

function mon() { return standardMonitor(new Spine(null, { indexBy: ['agent', 'server'] })); }
const AR = { score: 80, grade: 'B', blockedCrawlers: 0, blockedRetrieval: 0, jsonLdValid: 0, likelyShell: 0, llmsTxt: 0 };

// Deterministic PRNG (no Math.random) — seeded LCG, house style. Sample from the
// HIGH bits: an LCG's low bits have a short period (`raw % n` on a stride would only
// hit a subset of buckets), so scale the full 32-bit magnitude instead.
function lcg(seed) {
  let s = seed >>> 0;
  const next = () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0);
  next.int = (n) => Math.floor((next() / 4294967296) * n); // uniform 0..n-1 from high bits
  return next;
}

// ===========================================================================
// FALSE NEGATIVES — the ones that matter most.
// ===========================================================================

test('FIXED: ai-register — more controls slipping into "attention" is silent (no rule watches attention count)', () => {
  // AI_REGISTER_RULES only watch `overallRank` (worst tier) and `gap` count. Nothing
  // watches the `attention` count. So when the overall tier is ALREADY 'attention'
  // (e.g. one open human review) and a SECOND control degrades to 'attention' — say a
  // CRITICAL MCP tool-poisoning drift lands, pushing supplyChainIntegrity to attention
  // — overallRank stays 1 and gap stays 0, and the monitor stays completely silent.
  // A real posture regression (2 controls now need human attention, up from 1, incl. a
  // critical supply-chain alert) is missed. The gap-count rule exists precisely to
  // catch "more controls failing even when the tier didn't move"; the symmetric
  // attention-count rule is missing.
  const m = mon();
  m.record('ai-register', 'fleet', { metrics: { overall: 'attention', overallRank: 1, satisfied: 4, attention: 1, gap: 0 } });
  const r = m.record('ai-register', 'fleet', { metrics: { overall: 'attention', overallRank: 1, satisfied: 3, attention: 2, gap: 0 } });
  assert.ok(r.alerts.length > 0, 'attention count rising 1->2 is a real slip that must alert');
});

test('NOTE (inherent count-metric limitation): a retrieval bot swapped for another keeps the count flat and is silent', () => {
  // blockedRetrieval is a COUNT, not a set. If OAI-SearchBot is unblocked in the same
  // check that Claude-SearchBot is blocked, the count stays 1 and the citation-killer
  // rule never fires — a genuine false negative for the #1-impact signal. Not fixable
  // without per-agent tracking; documented as the current (silent) behaviour.
  const m = mon();
  m.record('agent-ready', 'u', { metrics: { ...AR, blockedCrawlers: 1, blockedRetrieval: 1 } });
  const r = m.record('agent-ready', 'u', { metrics: { ...AR, blockedCrawlers: 1, blockedRetrieval: 1 } });
  assert.equal(r.alerts.length, 0, 'count-based metric cannot see a same-count bot substitution');
});

// ===========================================================================
// FALSE POSITIVES — malformed / schema-drift metrics fabricate alerts, which the
// module's own tests claim never happens ("malformed metrics never fabricate an
// alert"). undefined is being read as a value instead of "unknown".
// ===========================================================================

test('FIXED: score going number->undefined fabricates a bogus CRITICAL "fell 80 points (80->undefined)"', () => {
  // The score rule computes `(p.score ?? 0) - (c.score ?? 0)`, so a check that merely
  // OMITS score (a partial/degraded probe result) is read as a fall to 0 => a 80-point
  // "critical regression" with a nonsense "(80->undefined)" message. A missing metric
  // is unknown, not zero; this violates the stated malformed-metrics invariant.
  const m = mon();
  m.record('agent-ready', 'u', { metrics: { ...AR, score: 80 } });
  const r = m.record('agent-ready', 'u', { metrics: { grade: 'B', blockedCrawlers: 0, blockedRetrieval: 0, jsonLdValid: 0, likelyShell: 0, llmsTxt: 0 } });
  assert.equal(r.alerts.find((a) => a.signal === 'score'), undefined, 'score going missing must not fabricate a critical drop');
});

test('FIXED: crawler-access mixes ??-defaulted and raw reads — blockedRetrieval 1->undefined fires a warning that says "(2->2)"', () => {
  // newOther = (c.blockedCrawlers - (c.blockedRetrieval ?? 0)) - (p.blockedCrawlers - (p.blockedRetrieval ?? 0)).
  // blockedRetrieval is `?? 0`-guarded but blockedCrawlers is not. If blockedRetrieval
  // drops out of the schema (1 -> undefined) while blockedCrawlers is UNCHANGED (2->2):
  // newOther = (2 - 0) - (2 - 1) = 1 > 0 -> a bogus 'crawler-access' warning whose own
  // message reads "(2->2)" — self-evidently not an increase.
  const m = mon();
  m.record('agent-ready', 'u', { metrics: { ...AR, blockedCrawlers: 2, blockedRetrieval: 1 } });
  const r = m.record('agent-ready', 'u', { metrics: { score: 80, grade: 'B', blockedCrawlers: 2, jsonLdValid: 0, likelyShell: 0, llmsTxt: 0 } });
  assert.equal(r.alerts.find((a) => a.signal === 'crawler-access'), undefined, 'blockedCrawlers unchanged (2->2) must not fire a crawler warning');
});

// ===========================================================================
// CONFIRMED CORRECT — the tricky cases the author probably worried about.
// ===========================================================================

test('correct: blockedRetrieval rises while (blockedCrawlers - blockedRetrieval) falls — retrieval fires, "other" does NOT misfire negative', () => {
  // The crawler "other" delta goes negative here; it must be clamped to "no alert",
  // not fire a bogus warning, while the retrieval rule correctly escalates to critical.
  const m = mon();
  m.record('agent-ready', 'u', { metrics: { ...AR, blockedCrawlers: 3, blockedRetrieval: 1 } }); // other = 2
  const r = m.record('agent-ready', 'u', { metrics: { ...AR, blockedCrawlers: 3, blockedRetrieval: 2 } }); // other = 1
  assert.equal(r.alerts.find((a) => a.signal === 'retrieval-access')?.severity, 'critical');
  assert.equal(r.alerts.find((a) => a.signal === 'crawler-access'), undefined, 'negative "other" delta must not fire');
});

test('correct: schema evolution — blockedRetrieval undefined (old check) -> 1 DOES fire the citation-killer critical', () => {
  const m = mon();
  m.record('agent-ready', 'u', { metrics: { score: 80, grade: 'B', blockedCrawlers: 0, jsonLdValid: 0 } }); // pre-blockedRetrieval schema
  const r = m.record('agent-ready', 'u', { metrics: { ...AR, blockedCrawlers: 1, blockedRetrieval: 1 } });
  assert.equal(r.alerts.find((a) => a.signal === 'retrieval-access')?.severity, 'critical', 'undefined->1 must fire, not be treated as 0->0');
});

test('correct: ai-register improvement never alerts (overallRank 2->1, gap 2->0)', () => {
  const m = mon();
  m.record('ai-register', 'fleet', { metrics: { overall: 'gap', overallRank: 2, satisfied: 1, attention: 1, gap: 3 } });
  const r = m.record('ai-register', 'fleet', { metrics: { overall: 'attention', overallRank: 1, satisfied: 3, attention: 2, gap: 0 } });
  assert.equal(r.alerts.length, 0, 'getting better must be silent');
});

// ===========================================================================
// record()/latest() correctness under interleaved targets (fuzz).
// ===========================================================================

test('correct: latest()/history() stay isolated per target under fuzzed interleaving', () => {
  const m = mon();
  const rnd = lcg(0xC0FFEE);
  const targets = ['a.com', 'b.com', 'c.com', 'd.com'];
  const expected = new Map(targets.map((t) => [t, []]));
  for (let i = 0; i < 400; i++) {
    const t = targets[rnd.int(targets.length)];
    const score = rnd.int(101);
    m.record('agent-ready', t, { metrics: { ...AR, score } });
    expected.get(t).push(score);
  }
  for (const t of targets) assert.ok(expected.get(t).length > 0, `sanity: ${t} received checks`);
  for (const t of targets) {
    const hist = m.history('agent-ready', t);
    assert.deepEqual(hist.map((e) => e.metrics.score), expected.get(t), `history for ${t} in order, no cross-target leak`);
    assert.equal(m.latest('agent-ready', t).metrics.score, expected.get(t).at(-1), `latest for ${t} is its own most-recent check`);
    assert.deepEqual(m.trend('agent-ready', t, 'score').map((p) => p.value), expected.get(t), `trend for ${t} matches history`);
  }
});

// ===========================================================================
// Robustness of record() around malformed detector output.
// ===========================================================================

test('correct: a detector returning an alert with no severity is stored (defaulted to warning), not crashed', () => {
  const spine = new Spine(null, { indexBy: ['agent', 'server'] });
  const m = standardMonitor(spine);
  m.define('quirky', { rules: [() => ({ signal: 'x', message: 'no severity here' })] });
  m.record('quirky', 't', { metrics: { a: 1 } });
  const r = m.record('quirky', 't', { metrics: { a: 2 } });
  assert.equal(r.alerts.length, 1);
  // The STORED event defaults the missing severity to 'warning'...
  assert.equal(m.alerts('quirky', 't')[0].severity, 'warning');
  // ...and worstSeverity reflects that, never throwing on a missing/unknown severity.
  assert.equal(m.worstSeverity('quirky', 't'), 'warning');
});

test('correct: worstSeverity picks the highest across many mixed alerts and ignores unknown severities', () => {
  const spine = new Spine(null, { indexBy: ['agent', 'server'] });
  const m = standardMonitor(spine);
  m.define('multi', { rules: [
    () => ({ signal: 'a', severity: 'info', message: 'i' }),
    () => ({ signal: 'b', severity: 'warning', message: 'w' }),
    () => ({ signal: 'c', severity: 'critical', message: 'c' }),
    () => ({ signal: 'd', severity: 'bogus-tier', message: 'unknown severity string' }),
  ] });
  m.record('multi', 't', { metrics: {} });
  m.record('multi', 't', { metrics: {} });
  assert.equal(m.worstSeverity('multi', 't'), 'critical', 'unknown severity must not shadow critical');
});
