#!/usr/bin/env node
// Cortex CLI — the second brain from the terminal.
//
//   brain ask "<question>"                 deterministic retrieval → evidence block
//   brain save --name "..." [--summary ..] [--tags a,b] [--pointers x,y]
//              [--content "..." | --file path | (stdin)]   write file + index line
//   brain rm <id>                          delete a memory + its index line
//   brain index [--json]                   list the catalogue
//   brain reindex                          rebuild the index from the files
//   brain scan <dir> [--commit]            propose/seed memories from a workspace
//   brain bench [scenarios.json] [--json]  fair test: brain path vs naive context
//   brain serve [--port 4700]              the interactive UI
//
// Retrieval and save make ZERO model calls — that is the whole point.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BrainIndex } from '../lib/index.js';
import { retrieve } from '../lib/retrieve.js';
import { save, remove, reindex } from '../lib/store.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.BRAIN_DIR || path.join(here, '..');
const argv = process.argv.slice(2);
const cmd = argv[0];
const rest = argv.slice(1);
const flag = (name) => { const i = rest.indexOf(`--${name}`); return i >= 0 && rest[i + 1] && !rest[i + 1].startsWith('--') ? rest[i + 1] : (rest.includes(`--${name}`) ? true : null); };
const positionals = rest.filter((a, i) => !a.startsWith('--') && !(i > 0 && rest[i - 1].startsWith('--') && typeof flag(rest[i - 1].slice(2)) === 'string'));

const dir = flag('dir') && typeof flag('dir') === 'string' ? flag('dir') : ROOT;

function readStdin() {
  try { return fs.readFileSync(0, 'utf8'); } catch { return ''; }
}

async function main() {
  if (!cmd || cmd === 'help' || cmd === '--help') { console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 16).map((l) => l.replace(/^\/\/ ?/, '')).join('\n')); return; }

  const index = new BrainIndex(dir);

  if (cmd === 'ask') {
    const q = positionals.join(' ');
    if (!q) { console.error('usage: brain ask "<question>"'); process.exit(2); }
    const r = retrieve(index, q, { followPointer: flag('no-pointer') ? false : true });
    if (flag('json')) { console.log(JSON.stringify(r, null, 2)); return; }
    if (!r.chosen) { console.log(`no memory matched "${q}". Try broader terms or check \`brain index\`.`); return; }
    const cand = r.candidates.slice(0, 5).map((c) => `  ${c.score.toFixed(2)}  ${c.id}`).join('\n');
    console.error(`— keywords: ${r.keywords.join(' ')}\n— candidates (index only, ${r.candidates.length}):\n${cand}\n— opened ${r.filesOpened} file(s), ${r.tokens} evidence tokens, ${r.ms}ms\n`);
    console.log(r.evidence);
    return;
  }

  if (cmd === 'save') {
    const name = flag('name') || positionals.join(' ');
    if (!name || name === true) { console.error('usage: brain save --name "..." [--summary ..] [--tags a,b] [--content .. | --file path | stdin]'); process.exit(2); }
    let content = '';
    if (typeof flag('content') === 'string') content = flag('content');
    else if (typeof flag('file') === 'string') content = fs.readFileSync(flag('file'), 'utf8');
    else if (!process.stdin.isTTY) content = readStdin();
    const entry = save(index, {
      id: typeof flag('id') === 'string' ? flag('id') : undefined,
      name, summary: typeof flag('summary') === 'string' ? flag('summary') : '',
      tags: typeof flag('tags') === 'string' ? flag('tags').split(',').map((s) => s.trim()).filter(Boolean) : [],
      pointers: typeof flag('pointers') === 'string' ? flag('pointers').split(',').map((s) => s.trim()).filter(Boolean) : [],
      content,
    });
    console.log(`saved ${entry.id} → ${entry.file} (+1 index line)`);
    return;
  }

  if (cmd === 'rm') {
    const id = positionals[0];
    if (!id) { console.error('usage: brain rm <id>'); process.exit(2); }
    console.log(remove(index, id) ? `removed ${id}` : `no such memory ${id}`);
    return;
  }

  if (cmd === 'reindex') { const n = reindex(index); console.log(`reindexed ${n} memories from files`); return; }

  if (cmd === 'seed') {
    // Rebuild the whole brain: scan the workspace, then overlay the curated
    // concept memories (curated.json) — the precise reference notes for the
    // things we actually look up, which auto-scan can't extract from doc bodies.
    const target = positionals[0];
    if (target) {
      const { scanWorkspace } = await import('../lib/scan.js');
      for (const p of scanWorkspace(target, { root: flag('root') || target })) save(index, { ...p, now: p.updated });
    }
    const curatedPath = path.join(dir, 'curated.json');
    let curated = 0;
    if (fs.existsSync(curatedPath)) {
      for (const m of JSON.parse(fs.readFileSync(curatedPath, 'utf8'))) { save(index, { ...m, now: '2026-07-08T00:00:00.000Z' }); curated++; }
    }
    console.log(`seeded ${index.all().length} memories (${curated} curated)`);
    return;
  }

  if (cmd === 'index') {
    if (flag('json')) { console.log(JSON.stringify(index.all().map((e) => ({ id: e.id, name: e.name, tags: e.tags, summary: e.summary })), null, 2)); return; }
    console.log(`${index.all().length} memories:`);
    for (const e of index.all()) console.log(`  ${e.id.padEnd(28)} ${e.summary.slice(0, 80)}`);
    return;
  }

  if (cmd === 'scan') {
    const { scanWorkspace } = await import('../lib/scan.js');
    const target = positionals[0];
    if (!target) { console.error('usage: brain scan <dir> [--commit]'); process.exit(2); }
    const proposed = scanWorkspace(target, { root: flag('root') || target });
    if (!flag('commit')) { console.log(`${proposed.length} memories proposed (dry run; pass --commit to write):`); for (const p of proposed) console.log(`  ${p.id.padEnd(30)} ${p.summary.slice(0, 70)}`); return; }
    for (const p of proposed) save(index, { ...p, now: p.updated });
    console.log(`committed ${proposed.length} memories + index lines`);
    return;
  }

  if (cmd === 'bench') {
    const { runBench, renderBench } = await import('../lib/bench.js');
    const scenPath = positionals[0] || path.join(dir, 'bench.json');
    const scenarios = fs.existsSync(scenPath) ? JSON.parse(fs.readFileSync(scenPath, 'utf8')) : (await import('../lib/bench.js')).defaultScenarios(index);
    const report = runBench(index, scenarios, { dir });
    if (flag('json')) console.log(JSON.stringify(report, null, 2));
    else console.log(renderBench(report));
    process.exit(report.medianTokenReduction >= 5 && report.correct === report.total ? 0 : 1);
  }

  if (cmd === 'serve') { process.env.BRAIN_DIR = dir; if (flag('port')) process.env.PORT = String(flag('port')); await import('../server.js'); return; }

  console.error(`unknown command "${cmd}" — try: ask, save, rm, index, reindex, scan, bench, serve`);
  process.exit(2);
}

main();
