// Regression tests for the 14 defects the combined module-audit (round 8) confirmed across
// the whole Fleet Deck surface — the 6 detector/firewall core areas plus the 8 modules the
// core loop never touched. Each test reproduces a confirmed defect and asserts the fix.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Spine } from '../lib/spine.js';
import { fingerprintTool, decide, validateManifest, Tollgate } from '../lib/tollgate.js';
import { AGENT_READY_RULES } from '../lib/monitor.js';
import { meterEvents, costOf } from '../lib/meter.js';
import { Recorder } from '../lib/recorder.js';
import { deliver } from '../lib/notify.js';
import { Register } from '../lib/register.js';
import { previewManifest, verdict } from '../lib/preflight.js';

// Minimal RFC-4180 field splitter so CSV assertions respect quoted commas.
const csvRow = (line) => {
  const out = []; let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === ',') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur); return out;
};

test('audit8 #1: retrieval-access credits a retrieval bot named only in prev.blockedList', () => {
  const ret = AGENT_READY_RULES[1];
  // prev names OAI-SearchBot (a retrieval bot) only in blockedList; cur reports the same
  // single retrieval bot count-only — no change, must stay silent.
  assert.equal(ret({ blockedList: ['OAI-SearchBot'] }, { blockedCrawlers: 1, blockedRetrieval: 1 }), null);
  // an improvement (2 retrieval bots -> 1) also stays silent.
  assert.equal(ret({ blockedList: ['OAI-SearchBot', 'PerplexityBot'] }, { blockedRetrieval: 1 }), null);
  // but a prev that blocked only a TRAINING bot (GPTBot) then blocks a retrieval bot fires.
  assert.equal((ret({ blockedList: ['GPTBot'] }, { blockedRetrieval: 1 }) || {}).severity, 'critical');
});

test('audit8 #2: tool-name guard is an ASCII allowlist — non-ASCII invisibles (U+FFFC) denied', () => {
  const m = { default: 'deny', agents: { a: { s: { deny: ['secret_read'], allow: ['*'] } } } };
  for (const cp of [0xfffc /*object replacement*/, 0x1d159 /*musical null notehead*/, 0x2800, 0x115f, 0x200b, 0xfe0f]) {
    const name = 'secret_read' + String.fromCodePoint(cp);
    assert.equal([...name].length, 'secret_read'.length + 1, 'U+' + cp.toString(16) + ' present in source');
    assert.equal(decide(m, 'a', 's', name).decision, 'deny', 'U+' + cp.toString(16) + ' decorated name denied');
  }
  assert.equal(decide(m, 'a', 's', 'secret_read').decision, 'deny');
  assert.equal(decide(m, 'a', 's', 'read_file').decision, 'allow');
  // visible ASCII punctuation still allowed and matched literally
  assert.equal(decide({ default: 'deny', agents: { a: { s: { allow: ['a(b)c'] } } } }, 'a', 's', 'a(b)c').decision, 'allow');
});

test('audit8 #3: a non-string description is detected as drift, not a crash that defeats the detector', () => {
  const spine = new Spine(null, { indexBy: ['server'] });
  const tg = new Tollgate({ spine, manifest: { default: 'deny', agents: {} } });
  tg.pin('srv', [{ name: 'read', description: 'Reads a file', inputSchema: { type: 'object' } }]);
  let rep;
  assert.doesNotThrow(() => { rep = tg.inspect('srv', [{ name: 'read', description: { text: 'x', system: 'EVIL' }, inputSchema: { type: 'object' } }]); });
  assert.equal(rep.drifted, true, 'the object-description poisoning still registers as drift');
});

test('audit8 #4: a scalar type and its single-element union hash equal (spec-equivalent)', () => {
  assert.equal(fingerprintTool({ name: 't', inputSchema: { type: 'string' } }).schemaHash,
    fingerprintTool({ name: 't', inputSchema: { type: ['string'] } }).schemaHash);
  // a genuine type change still drifts
  assert.notEqual(fingerprintTool({ name: 't', inputSchema: { type: 'string' } }).schemaHash,
    fingerprintTool({ name: 't', inputSchema: { type: 'number' } }).schemaHash);
});

test('audit8 #5: query({where:{field:null}}) returns the null-valued rows (not [])', () => {
  const s = new Spine(null, { indexBy: ['agent'] });
  s.append('tool.call', { agent: 'alpha', n: 1 });
  s.append('tool.call', { agent: null, n: 2 });
  s.append('tool.call', { agent: null, n: 3 });
  s.append('tool.call', { agent: 'beta', n: 4 });
  assert.deepEqual(s.query({ where: { agent: null } }).map((e) => e.n), [2, 3]);
  assert.deepEqual(s.query({ where: { agent: 'alpha' } }).map((e) => e.n), [1]); // non-null path intact
});

test('audit8 #6: a single costUsd:NaN event does not disable budget alarms', () => {
  const r = meterEvents(
    [{ kind: 'tool.result', agent: 'a', ts: '2026-07-24T00:00:00Z', costUsd: 100 },
     { kind: 'tool.result', agent: 'a', ts: '2026-07-24T00:00:00Z', costUsd: NaN }],
    { budgets: [{ id: 'b1', scope: 'total', window: 'total', limitUsd: 10 }, { id: 'b2', scope: 'agent', key: 'a', window: 'total', limitUsd: 5 }] });
  assert.ok(Number.isFinite(r.total.costUsd), 'NaN neutralized, total stays finite');
  assert.equal(r.alarms.length, 2, 'both overspend alarms still fire');
  assert.equal(costOf({ costUsd: NaN }), 0);
});

test('audit8 #7: the grand total reconciles to the sum of the by-agent parts', () => {
  const r = meterEvents(
    [{ kind: 'u', agent: 'A', ts: '2026-07-24T00:00:00Z', costUsd: 0.0000004 },
     { kind: 'u', agent: 'B', ts: '2026-07-24T00:00:00Z', costUsd: 0.0000004 }], {});
  const sum = Object.values(r.byAgent).reduce((a, b) => a + b.costUsd, 0);
  assert.equal(r.total.costUsd, sum);
});

test('audit8 #8: a denied call never receives a later allowed call\'s result (audit + OTel integrity)', () => {
  const spine = new Spine(null, {});
  spine.append('tool.call', { agent: 'ag', server: 'srv', tool: 'rm', input: {}, decision: 'deny', reason: 'x' });
  spine.append('tool.call', { agent: 'ag', server: 'srv', tool: 'rm', input: {}, decision: 'allow', reason: 'ok' });
  spine.append('tool.result', { agent: 'ag', server: 'srv', tool: 'rm', ok: true, tokensIn: 100, tokensOut: 50, costUsd: 0.02, model: 'm' });
  const rec = new Recorder({ spine });
  const calls = rec.timeline().filter((e) => e.kind === 'tool.call');
  assert.equal(calls.find((c) => c.decision === 'deny').result, undefined, 'denied call has no result');
  assert.equal(calls.find((c) => c.decision === 'allow').result.costUsd, 0.02, 'allowed call got the result');
  const denySpan = rec.toOtelSpans().find((s) => s.attributes['fleetdeck.decision'] === 'deny');
  assert.equal(denySpan.attributes['gen_ai.usage.input_tokens'], undefined, 'denied span carries no token usage');
});

test('audit8 #8b: an APPROVED review still correlates to its result (approval.consumed promotes it)', () => {
  const spine = new Spine(null, {});
  spine.append('tool.call', { agent: 'ag', server: 'srv', tool: 'x', input: {}, decision: 'review' });
  spine.append('approval.consumed', { ref: 'r1', agent: 'ag', server: 'srv', tool: 'x' });
  spine.append('tool.result', { agent: 'ag', server: 'srv', tool: 'x', ok: true, costUsd: 0.01 });
  const rec = new Recorder({ spine });
  const call = rec.timeline().find((e) => e.kind === 'tool.call' && e.decision === 'review');
  assert.ok(call.result && call.result.costUsd === 0.01, 'consumed review correlates to its result');
});

test('audit8 #9/#10: notify never leaks the webhook secret and never throws on null config', async () => {
  const SECRET = 'https://hooks.slack.com/services/T1/B2/zzzTOPSECRETzzz';
  const throwing = async (url) => { throw new Error(`request to ${url} failed, reason: ENOTFOUND`); };
  const r = await deliver([{ severity: 'crit', message: 'boom' }], { slack: SECRET }, { fetchImpl: throwing });
  assert.ok(!JSON.stringify(r).includes('zzzTOPSECRETzzz'), 'secret scrubbed from the error field');
  await assert.doesNotReject(() => deliver([{ severity: 'crit', message: 'x' }], null, { fetchImpl: async () => ({ ok: true, status: 200 }) }));
});

test('audit8 #11: CSV export neutralizes formula-injection cells', () => {
  const spine = new Spine(null, { indexBy: ['agent', 'server', 'tool'] });
  spine.append('mcp.pin', { server: 'files', setHash: 'h1', count: 1 });
  spine.append('tool.call', { agent: 'a1', server: 'files', tool: '=2+5+cmd', input: {}, decision: 'deny', reason: '@SUM(1)' });
  const rev = spine.append('tool.call', { agent: 'a1', server: 'files', tool: 'del', input: {}, decision: 'review', reason: 'held' });
  spine.append('approval.verdict', { ref: rev.id, verdict: 'approved', by: '-2+3', note: '=1+1' });
  const csv = new Register({ spine }).toCsv();
  for (const line of csv.split('\n').slice(1)) for (const cell of csvRow(line)) {
    assert.ok(!/^[=+\-@\t\r]/.test(cell), `cell must not start with a formula trigger: ${JSON.stringify(cell)}`);
  }
});

test('audit8 #12: CSV header is escaped so a comma-bearing column key keeps rows aligned', () => {
  const s = new Spine(null, { indexBy: ['agent'] });
  s.append('disclosure', { 'channel,region': 'eu', text: 'AI' });
  const lines = new Register({ spine: s }).toCsv().split('\n');
  assert.equal(csvRow(lines[0]).length, csvRow(lines[1]).length, 'header and data have equal column counts');
  assert.ok(lines[0].includes('"channel,region"'), 'the comma-bearing column key is quoted');
});

test('audit8 #13: preflight flags a widening as UNSAFE even when the historical decision is legacy/missing', () => {
  const cand = { default: 'deny', agents: { a: { s: { allow: ['transfer_funds'] } } } };
  for (const legacy of [{ decision: 'blocked' }, {}]) {
    const sp = new Spine(null, { indexBy: ['agent'] });
    sp.append('tool.call', { agent: 'a', server: 's', tool: 'transfer_funds', input: {}, ...legacy });
    assert.equal(verdict(previewManifest(sp, cand)).safe, false, `legacy was=${JSON.stringify(legacy.decision)} must be UNSAFE`);
  }
  // canonical deny->allow still flagged
  const sp = new Spine(null, { indexBy: ['agent'] });
  sp.append('tool.call', { agent: 'a', server: 's', tool: 'transfer_funds', input: {}, decision: 'deny' });
  assert.equal(verdict(previewManifest(sp, cand)).safe, false);
});

test('audit8 #14: a manifest with a non-string pattern is rejected, not crashed on', () => {
  const cand = { agents: { a: { s: { deny: [123] } } } };
  assert.ok(validateManifest(cand).length > 0, 'validateManifest rejects a non-string pattern');
  const sp = new Spine(null, { indexBy: ['agent'] });
  sp.append('tool.call', { agent: 'a', server: 's', tool: 'read', input: {}, decision: 'allow' });
  assert.doesNotThrow(() => previewManifest(sp, cand), 'previewManifest returns an error result, never throws');
});
