import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadBlueprintDir } from '../lib/blueprint.js';
import { loadPackDir } from '../lib/packs.js';
import { Ledger } from '../lib/ledger.js';
import { GateEngine } from '../lib/gates.js';
import { MemoryEngine } from '../lib/memory.js';
import { reportData, renderReportHTML } from '../lib/report.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const BP_DIR = path.join(here, '..', 'blueprints');
const PACK_DIR = path.join(here, '..', 'packs');

function seeded() {
  const bps = loadBlueprintDir(BP_DIR);
  const led = new Ledger(null);
  const gates = new GateEngine(led, bps);
  const mem = new MemoryEngine(led).enableCorrectionCapture();

  // OLD period activity (May) — timestamps forced by direct event injection
  led.append({ type: 'run.start', run: 'old1', blueprint: 'speed-to-lead', agent: 'first-responder', callsign: 'HERMOD', trigger: {} });
  led.append({ type: 'run.end', run: 'old1', status: 'done', tokensIn: 10, tokensOut: 5 });
  led.events[led.events.length - 2].t = '2026-05-10T09:00:00Z';
  led.events[led.events.length - 1].t = '2026-05-10T09:05:00Z';

  // CURRENT period (July): a done run with an edited verdict + baselines + memory
  led.append({ type: 'run.start', run: 'r1', blueprint: 'speed-to-lead', agent: 'first-responder', callsign: 'HERMOD', trigger: {} });
  const { action } = gates.request('r1', 'speed-to-lead', 'email.send', { body: 'draft!!' });
  gates.verdict(action, { verdict: 'edited', by: 'kv', editedInput: { body: 'draft, plain.' } });
  led.append({ type: 'action.result', action, ok: true, output: {} });
  led.append({ type: 'run.end', run: 'r1', status: 'done', tokensIn: 800, tokensOut: 200 });
  led.append({ type: 'baseline', blueprint: 'speed-to-lead', key: 'first_response_min', value: 240 });
  led.append({ type: 'sample', blueprint: 'speed-to-lead', key: 'first_response_min', value: 4 });
  mem.add({ kind: 'rule', text: 'Dana signs off on money.', scope: 'client' });
  return { bps, led, gates, mem };
}

const ARGS = (o) => ({
  blueprints: o.bps, ledgerState: o.led.state(), trust: o.gates.trustStats(),
  memories: o.mem.active(), profile: { brand: 'Ironvale' },
  pack: loadPackDir(PACK_DIR).get('generic'),
  since: '2026-07-01T00:00:00Z',
});

test('reportData scopes activity to the period but proof to all-time', () => {
  const o = seeded();
  const d = reportData(ARGS(o));
  assert.equal(d.ops.runs, 1, 'May run excluded from July period');
  assert.equal(d.ops.verdicts, 1);
  assert.equal(d.ops.byVerdict.edited, 1);
  assert.equal(d.ops.cleanRate, 0);
  assert.equal(d.ops.tokensIn, 800);
  const stl = d.corridors.find((c) => c.id === 'speed-to-lead');
  const rt = stl.proof.find((p) => p.key === 'first_response_min');
  assert.equal(rt.baseline, 240);
  assert.equal(rt.current, 4);
  assert.ok(rt.improved);
  // memory: seeded rule + correction-captured preference, both this period
  assert.equal(d.learned.length, 2);
  assert.ok(d.learned.some((m) => m.source.type === 'correction'));
});

test('reportData with an old window sees only the old run and nothing learned', () => {
  const o = seeded();
  const d = reportData({ ...ARGS(o), since: '2026-05-01T00:00:00Z', until: '2026-06-01T00:00:00Z' });
  assert.equal(d.ops.runs, 1);
  assert.equal(d.ops.verdicts, 0);
  assert.equal(d.learned.length, 0);
});

test('renderReportHTML contains brand, corridor proof, trust, learned items, provenance footer', () => {
  const o = seeded();
  const html = renderReportHTML(reportData(ARGS(o)));
  for (const needle of ['Ironvale', 'Speed-to-Lead', 'Proof vs baseline', 'Trust curve',
    'email.send', 'What the fleet learned', 'Dana signs off on money.',
    'append-only run ledger', 'RULE']) {
    assert.ok(html.includes(needle), `report missing: ${needle}`);
  }
  assert.ok(!html.includes('undefined'), 'no undefined leaks into the report');
});

test('reportData requires since', () => {
  const o = seeded();
  assert.throws(() => reportData({ ...ARGS(o), since: undefined }), /since/);
});
