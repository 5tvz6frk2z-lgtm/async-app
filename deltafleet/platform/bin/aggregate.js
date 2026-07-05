#!/usr/bin/env node
// Benchmark aggregator — reads anonymized per-install exports and prints the
// cross-install benchmark plus any claims that clear the honesty gate.
//
//   node bin/aggregate.js exports/*.json          # from files
//   node bin/aggregate.js --urls urls.txt          # pull /api/benchmark-export live
//
// Each export is the JSON returned by a deployment's GET /api/benchmark-export.
import fs from 'node:fs';
import { aggregate, claimFor } from '../lib/benchmark.js';

const args = process.argv.slice(2);
const MIN = 5;

async function load() {
  if (args[0] === '--urls') {
    const urls = fs.readFileSync(args[1], 'utf8').split('\n').map((s) => s.trim()).filter(Boolean);
    return Promise.all(urls.map(async (u) => {
      try { const r = await fetch(u); return await r.json(); }
      catch (e) { console.error(`skip ${u}: ${e.message}`); return null; }
    }));
  }
  return args.map((f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { console.error(`skip ${f}: ${e.message}`); return null; } });
}

const exports = (await load()).filter(Boolean);
if (!exports.length) { console.error('no exports loaded'); process.exit(1); }

const agg = aggregate(exports);
console.log(`\nBENCHMARK — ${exports.length} export(s), ${new Set(exports.map((e) => e.installId)).size} unique install(s)\n`);
console.log('blueprint                 metric                    installs  improved  median gain');
console.log('-'.repeat(88));
for (const c of agg) {
  console.log(
    c.blueprint.padEnd(25),
    c.metric.padEnd(25),
    String(c.installs).padStart(8),
    ((c.improvedRate == null ? '—' : Math.round(c.improvedRate * 100) + '%')).padStart(9),
    (c.medianGainPct == null ? '—' : Math.round(c.medianGainPct) + '%').padStart(12),
  );
}
console.log('\nPublishable claims (>=' + MIN + ' installs):');
const claims = agg.map((c) => claimFor(c, { minInstalls: MIN })).filter(Boolean);
if (claims.length) claims.forEach((c) => console.log('  • ' + c));
else console.log('  (none yet — need more installs before any benchmark clears the honesty gate)');
console.log();
