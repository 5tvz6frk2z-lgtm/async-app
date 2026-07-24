import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadBlueprintDir } from '../lib/blueprint.js';
import { Ledger } from '../lib/ledger.js';
import { benchmarkExport, aggregate, claimFor } from '../lib/benchmark.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const BP_DIR = path.join(here, '..', 'blueprints');

function clientLedger(firstResponse) {
  const led = new Ledger(null);
  led.append({ type: 'baseline', blueprint: 'speed-to-lead', key: 'first_response_min', value: 240 });
  led.append({ type: 'sample', blueprint: 'speed-to-lead', key: 'first_response_min', value: firstResponse });
  led.append({ type: 'baseline', blueprint: 'speed-to-lead', key: 'contact_rate_pct', value: 40 });
  led.append({ type: 'sample', blueprint: 'speed-to-lead', key: 'contact_rate_pct', value: 55 });
  return led;
}

test('benchmarkExport is anonymized — opaque id, deltas only, no absolutes', () => {
  const bps = loadBlueprintDir(BP_DIR);
  const led = clientLedger(4);
  const e = benchmarkExport(bps, led.state(), { installId: 'hash_abc' });
  assert.equal(e.installId, 'hash_abc');
  assert.ok(e.rows.length >= 2);
  const rt = e.rows.find((r) => r.metric === 'first_response_min');
  assert.equal(rt.improved, true);
  assert.ok(rt.deltaPct < -95); // 240 -> 4
  // no absolute baseline/current, no brand, no names leak
  const json = JSON.stringify(e);
  assert.ok(!json.includes('240') && !json.includes('brand') && !json.includes('name'));
  assert.throws(() => benchmarkExport(bps, led.state(), {}), /opaque installId/);
});

test('benchmarkExport skips metrics without baseline+sample', () => {
  const bps = loadBlueprintDir(BP_DIR);
  const led = new Ledger(null);
  led.append({ type: 'baseline', blueprint: 'speed-to-lead', key: 'first_response_min', value: 240 });
  // no sample -> deltaPct null -> excluded
  const e = benchmarkExport(bps, led.state(), { installId: 'x' });
  assert.equal(e.rows.length, 0);
});

test('aggregate computes installs, improved rate, median/p25/p75 gains; dedupes by installId', () => {
  const bps = loadBlueprintDir(BP_DIR);
  // five installs with varying first-response improvement (240 baseline)
  const exports = [4, 6, 12, 8, 240].map((fr, i) =>
    benchmarkExport(bps, clientLedger(fr).state(), { installId: `h${i}` }));
  // one is a re-export of h0 with a worse number — must NOT double count
  exports.push(benchmarkExport(bps, clientLedger(10).state(), { installId: 'h0' }));

  const agg = aggregate(exports);
  const rt = agg.find((c) => c.blueprint === 'speed-to-lead' && c.metric === 'first_response_min');
  assert.equal(rt.installs, 5, 're-export of h0 dedupes to 5 unique installs');
  // fr=240 equals baseline -> deltaPct 0 -> improved false; other 4 improved
  assert.equal(rt.improvedRate, 0.8);
  assert.ok(rt.medianGainPct > 0 && rt.p25GainPct <= rt.medianGainPct && rt.medianGainPct <= rt.p75GainPct);
  // contact_rate improved on all 5 (40 -> 55)
  const cr = agg.find((c) => c.metric === 'contact_rate_pct');
  assert.equal(cr.improvedRate, 1);
});

test('claimFor gates on minimum installs (honesty rule)', () => {
  const bps = loadBlueprintDir(BP_DIR);
  const few = aggregate([1, 2, 3].map((fr, i) => benchmarkExport(bps, clientLedger(fr).state(), { installId: `f${i}` })));
  const cellFew = few.find((c) => c.metric === 'first_response_min');
  assert.equal(claimFor(cellFew, { minInstalls: 5 }), null, 'too few installs -> no claim');

  const many = aggregate(Array.from({ length: 6 }, (_, i) => benchmarkExport(bps, clientLedger(5 + i).state(), { installId: `m${i}` })));
  const cellMany = many.find((c) => c.metric === 'first_response_min');
  const claim = claimFor(cellMany, { minInstalls: 5 });
  assert.ok(claim && claim.includes('reduction') && claim.includes('first response min') && claim.includes('6 speed to lead installs'));
});

test('aggregate tolerates empty and malformed exports', () => {
  assert.deepEqual(aggregate([]), []);
  assert.deepEqual(aggregate([null, { installId: 'x' }, { rows: [] }]), []);
});
