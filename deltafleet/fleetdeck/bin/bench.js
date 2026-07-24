#!/usr/bin/env node
// Spine scale benchmark — validates the "deterministic and fast at scale" claim.
// Appends N events with a live incremental projection, then measures indexed query,
// memoized report, and a full projection replay. Run: node bin/bench.js [N]
import { Spine } from '../lib/spine.js';
import { Meter } from '../lib/meter.js';

const N = Number(process.argv[2]) || 100000;
const agents = ['a1', 'a2', 'a3', 'a4', 'a5'], tools = ['get', 'list', 'create', 'delete'];
const s = new Spine(null, { indexBy: ['agent', 'server'] });
const m = new Meter({ spine: s, pricing: { m: { in: 1, out: 2 } } });

let t = process.hrtime.bigint();
for (let i = 0; i < N; i++) {
  s.append('tool.result', { agent: agents[i % 5], server: 'srv', tool: tools[i % 4], model: 'm', tokensIn: 100, tokensOut: 20 });
}
const appendMs = Number(process.hrtime.bigint() - t) / 1e6;

t = process.hrtime.bigint();
const q = s.query({ kind: 'tool.result', where: { agent: 'a3' } });
const queryMs = Number(process.hrtime.bigint() - t) / 1e6;

t = process.hrtime.bigint();
const r = m.report();
const reportMs = Number(process.hrtime.bigint() - t) / 1e6;

t = process.hrtime.bigint();
s.project('replayCount', { init: () => 0, apply: (n) => n + 1 });
const replayMs = Number(process.hrtime.bigint() - t) / 1e6;

console.log(`events:                 ${N}`);
console.log(`append total:           ${appendMs.toFixed(1)} ms  (${(appendMs / N * 1000).toFixed(2)} µs/event, Meter projection maintained live)`);
console.log(`query (1-of-5 agent):   ${queryMs.toFixed(2)} ms  (${q.length} hits, indexed intersection + strict re-filter)`);
console.log(`Meter.report():         ${reportMs.toFixed(3)} ms  (memoized read-model)`);
console.log(`full projection replay: ${replayMs.toFixed(1)} ms  over ${N} events`);
console.log(`tracked: $${r.total.costUsd} across ${r.total.calls} calls, ${Object.keys(r.byAgent).length} agents`);
