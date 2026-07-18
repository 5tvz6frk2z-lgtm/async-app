import test from 'node:test';
import assert from 'node:assert/strict';
import { Spine } from '../lib/spine.js';
import { Tollgate } from '../lib/tollgate.js';
import { Recorder, OTEL_SEMCONV } from '../lib/recorder.js';

const MANIFEST = {
  default: 'deny',
  agents: { researcher: { 'gh-mcp': { allow: ['get_*'], deny: ['delete_*'] } } },
};

function scene() {
  const spine = new Spine(null, { indexBy: ['agent', 'server'] });
  const gate = new Tollgate({ spine, manifest: MANIFEST });
  const rec = new Recorder({ spine, pricing: { 'claude-fable-5': { in: 3, out: 15 } } });
  return { spine, gate, rec };
}

test('timeline correlates a tool.call with its following tool.result', () => {
  const { gate, rec } = scene();
  gate.guard('researcher', 'gh-mcp', 'get_issue', { n: 1 });
  gate.record('researcher', 'gh-mcp', 'get_issue', { ok: true, tokensIn: 100, tokensOut: 20, costUsd: 0.01 });
  const calls = rec.timeline({ kind: 'tool.call' });
  assert.equal(calls.length, 1);
  assert.ok(calls[0].result, 'the call was paired with its result');
  assert.equal(calls[0].result.ok, true);
  assert.equal(calls[0].result.costUsd, 0.01);
  assert.equal(calls[0].durationMs !== null, true);
});

test('correlation is FIFO per agent+server+tool (no cross-pairing)', () => {
  const { gate, rec } = scene();
  gate.guard('researcher', 'gh-mcp', 'get_issue', { n: 1 });
  gate.guard('researcher', 'gh-mcp', 'get_issue', { n: 2 });
  gate.record('researcher', 'gh-mcp', 'get_issue', { ok: true, output: 'first' });
  gate.record('researcher', 'gh-mcp', 'get_issue', { ok: false, error: 'second failed' });
  const calls = rec.timeline({ kind: 'tool.call' });
  assert.equal(calls[0].result.ok, true, 'first call -> first result');
  assert.equal(calls[1].result.ok, false, 'second call -> second result');
});

test('a denied call has no result and is not falsely paired', () => {
  const { gate, rec } = scene();
  const d = gate.guard('researcher', 'gh-mcp', 'delete_repo', {}); // denied, never executed
  assert.equal(d.allowed, false);
  const calls = rec.timeline({ kind: 'tool.call' });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].result, undefined);
  assert.equal(calls[0].decision, 'deny');
});

test('timeline filters by agent/server/tool without losing correlation', () => {
  const { spine, gate, rec } = scene();
  gate.guard('researcher', 'gh-mcp', 'get_issue', {});
  spine.append('tool.result', { agent: 'researcher', server: 'gh-mcp', tool: 'get_issue', ok: true });
  // filtering to tool.call still shows the paired result (correlation happens pre-filter)
  const filtered = rec.timeline({ agent: 'researcher', kind: 'tool.call' });
  assert.equal(filtered.length, 1);
  assert.ok(filtered[0].result);
});

test('render produces a readable one-line-per-event timeline', () => {
  const { gate, rec } = scene();
  gate.pin('gh-mcp', [{ name: 'get_issue', description: 'd', inputSchema: {} }]);
  gate.guard('researcher', 'gh-mcp', 'get_issue', {});
  gate.record('researcher', 'gh-mcp', 'get_issue', { ok: true, costUsd: 0.02 });
  const text = rec.render();
  assert.match(text, /pinned gh-mcp/);
  assert.match(text, /get_issue@gh-mcp/);
  assert.match(text, /✓/);
  assert.match(text, /\$0\.02/);
});

test('OTel export uses the semconv attribute names and marks status', () => {
  const { gate, rec } = scene();
  gate.guard('researcher', 'gh-mcp', 'get_issue', {});
  gate.record('researcher', 'gh-mcp', 'get_issue', { ok: true, tokensIn: 100, tokensOut: 20, costUsd: 0.01 });
  const spans = rec.toOtelSpans();
  assert.equal(spans.length, 1);
  const s = spans[0];
  assert.equal(s.name, 'execute_tool get_issue');
  assert.equal(s.attributes[OTEL_SEMCONV.attr.operation], 'execute_tool');
  assert.equal(s.attributes[OTEL_SEMCONV.attr.toolName], 'get_issue');
  assert.equal(s.attributes[OTEL_SEMCONV.attr.inputTokens], 100);
  assert.equal(s.attributes[OTEL_SEMCONV.attr.outputTokens], 20);
  assert.equal(s.attributes['fleetdeck.agent'], 'researcher');
  assert.equal(s.status.code, 'OK');
  assert.ok(Number.isFinite(s.startTimeUnixNano));
  assert.ok(s.endTimeUnixNano >= s.startTimeUnixNano);
});

test('OTel span for a denied call carries ERROR status', () => {
  const { gate, rec } = scene();
  gate.guard('researcher', 'gh-mcp', 'delete_repo', {});
  const s = rec.toOtelSpans()[0];
  assert.equal(s.status.code, 'ERROR');
  assert.match(s.status.message, /blocked by Tollgate/);
});

test('OTel span for a failed tool result carries ERROR status', () => {
  const { gate, rec } = scene();
  gate.guard('researcher', 'gh-mcp', 'get_issue', {});
  gate.record('researcher', 'gh-mcp', 'get_issue', { ok: false, error: 'upstream 500' });
  const s = rec.toOtelSpans()[0];
  assert.equal(s.status.code, 'ERROR');
  assert.match(s.status.message, /upstream 500/);
});

test('spans of one agent share a deterministic traceId; different agents differ', () => {
  const { spine, rec } = scene();
  const m2 = { default: 'allow', agents: {} };
  const gate2 = new Tollgate({ spine, manifest: m2 });
  gate2.guard('a', 'srv', 't1', {});
  gate2.guard('a', 'srv', 't2', {});
  gate2.guard('b', 'srv', 't3', {});
  const spans = rec.toOtelSpans();
  const a = spans.filter((s) => s.attributes['fleetdeck.agent'] === 'a');
  const b = spans.filter((s) => s.attributes['fleetdeck.agent'] === 'b');
  assert.equal(a[0].traceId, a[1].traceId, 'same agent -> same trace');
  assert.notEqual(a[0].traceId, b[0].traceId, 'different agent -> different trace');
  assert.match(a[0].traceId, /^[0-9a-f]{32}$/, 'traceId is 32 hex chars');
});

test('recorder derives cost from tokens when costUsd is absent', () => {
  const { spine, rec } = scene();
  spine.append('tool.result', { agent: 'r', server: 's', tool: 't', ok: true, model: 'claude-fable-5', tokensIn: 1e6, tokensOut: 1e6 });
  const entry = rec.timeline({ kind: 'tool.result' })[0];
  assert.equal(entry.costUsd, 18); // 3 + 15
});
