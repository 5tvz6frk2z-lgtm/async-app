#!/usr/bin/env node
// Fleet Deck CLI — one entry point over the whole suite. Every subcommand reads
// or writes the same spine file, so `seed`, `timeline`, `alerts`, `meter`,
// `inbox` and `serve` all see one consistent picture.
//
//   fleetdeck seed [file]          play the demo scenario onto a spine
//   fleetdeck timeline [file]      the Flight Recorder timeline
//   fleetdeck alerts [file]        Tollgate drift / tool-poisoning alerts
//   fleetdeck meter [file]         Meter cost rollups + budget alarms
//   fleetdeck inbox [file]         pending approvals
//   fleetdeck check <url>          Agent-Ready score for a live URL
//   fleetdeck serve [file] [port]  start the operator UI + JSON API
import fs from 'node:fs';
import path from 'node:path';
import { Deck } from '../lib/deck.js';
import { seed, SEED_CONFIG } from '../lib/seed.js';
import { analyze, fetchSite } from '../lib/agentready.js';
import { previewManifest, verdict } from '../lib/preflight.js';
import { startServer } from '../server.js';

const DEFAULT_FILE = 'fleetdeck.jsonl';
const [cmd, ...rest] = process.argv.slice(2);

// Config next to the spine file (fleetdeck.config.json) overrides defaults.
function loadConfig(file) {
  const cfgPath = path.join(path.dirname(path.resolve(file)), 'fleetdeck.config.json');
  if (fs.existsSync(cfgPath)) { try { return JSON.parse(fs.readFileSync(cfgPath, 'utf8')); } catch { /* fall through */ } }
  return SEED_CONFIG; // sensible demo defaults so the CLI is useful out of the box
}

function openDeck(file) { return new Deck(file, loadConfig(file)); }

const bar = (pct, width = 20) => { const n = Math.round(Math.min(1, pct) * width); return '█'.repeat(n) + '░'.repeat(width - n); };
const money = (n) => '$' + (n || 0).toFixed(4).replace(/0+$/, '').replace(/\.$/, '');

async function main() {
  switch (cmd) {
    case 'seed': {
      const file = rest[0] || DEFAULT_FILE;
      if (fs.existsSync(file)) fs.rmSync(file);
      const deck = openDeck(file);
      const s = seed(deck);
      console.log(`seeded ${file}: ${s.events} events across ${s.servers.length} servers`);
      console.log(`  drift detected: ${s.driftSeverity.toUpperCase()} (${s.driftChanges} change(s))`);
      console.log(`  approvals pending: ${s.pendingApprovals}`);
      console.log(`\nrun:  node bin/fleetdeck.js serve ${file}`);
      break;
    }
    case 'timeline': {
      const deck = openDeck(rest[0] || DEFAULT_FILE);
      console.log(deck.recorder.render({ limit: 100 }) || '(no events — run `seed` first)');
      break;
    }
    case 'alerts': {
      const deck = openDeck(rest[0] || DEFAULT_FILE);
      const alerts = deck.gate.alerts();
      if (!alerts.length) { console.log('no drift alerts — every pinned server matches its baseline'); break; }
      for (const a of alerts) {
        console.log(`\n[${a.severity.toUpperCase()}] ${a.server}  (${a.ts})`);
        for (const c of a.changes) console.log(`  ${c.type.padEnd(20)} ${c.tool}`);
      }
      console.log(`\n${alerts.length} alert(s). CRITICAL = a description/schema changed on an already-approved tool (tool poisoning).`);
      break;
    }
    case 'meter': {
      const deck = openDeck(rest[0] || DEFAULT_FILE);
      const r = deck.meter.report();
      console.log(`total: ${money(r.total.costUsd)} over ${r.total.calls} calls (${r.total.tokensIn}+${r.total.tokensOut} tok)`);
      console.log('\nby agent:');
      for (const [k, v] of Object.entries(r.byAgent)) console.log(`  ${k.padEnd(14)} ${money(v.costUsd)}`);
      console.log('\nby model:');
      for (const [k, v] of Object.entries(r.byModel)) console.log(`  ${k.padEnd(20)} ${money(v.costUsd)}`);
      if (r.budgets.length) {
        console.log('\nbudgets:');
        for (const b of r.budgets) console.log(`  ${b.id.padEnd(18)} ${bar(b.pct)} ${money(b.spendUsd)}/${money(b.limitUsd)}  ${b.state.toUpperCase()}`);
      }
      break;
    }
    case 'inbox': {
      const deck = openDeck(rest[0] || DEFAULT_FILE);
      const p = deck.inbox.pending();
      if (!p.length) { console.log('inbox clear — no approvals pending'); break; }
      console.log(`${p.length} pending approval(s):\n`);
      for (const item of p) console.log(`  ${item.ref}  ${item.agent} → ${item.tool}@${item.server}  ${JSON.stringify(item.input)}`);
      console.log('\napprove with:  fleetdeck approve <file> <ref> <who>');
      break;
    }
    case 'approve':
    case 'reject': {
      const [file, ref, who, ...noteParts] = rest;
      if (!ref || !who) { console.error(`usage: fleetdeck ${cmd} <file> <ref> <who> [note]`); process.exit(2); }
      const deck = openDeck(file);
      deck.inbox[cmd === 'approve' ? 'approve' : 'reject'](ref, who, noteParts.join(' ') || undefined);
      console.log(`${cmd}d ${ref} by ${who}`);
      break;
    }
    case 'register': {
      const deck = openDeck(rest[0] || DEFAULT_FILE);
      if (rest[1]) deck.register.setPack(rest[1]);
      if (rest.includes('--csv')) { console.log(deck.register.toCsv()); break; }
      const r = deck.register.register();
      const mark = { satisfied: '✓', attention: '!', gap: '✗' };
      console.log(`${r.framework}\n  overall: ${r.overall.toUpperCase()}  (${r.summary.satisfied} satisfied, ${r.summary.attention} attention, ${r.summary.gap} gap)\n`);
      for (const c of r.controls) console.log(`  ${mark[c.status]} ${c.id.padEnd(8)} ${c.name}\n      ${c.detail}`);
      console.log(`\nnote: ${r.note}`);
      console.log('export evidence:  fleetdeck register <file> [pack] --csv');
      break;
    }
    case 'preflight': {
      const [file, candidatePath] = rest;
      if (!candidatePath) { console.error('usage: fleetdeck preflight <file> <candidate-manifest.json>'); process.exit(2); }
      const candidate = JSON.parse(fs.readFileSync(candidatePath, 'utf8'));
      const deck = openDeck(file);
      const r = previewManifest(deck.spine, candidate);
      if (!r.ok) { console.error('invalid candidate manifest:\n  ' + r.errors.join('\n  ')); process.exit(1); }
      const v = verdict(r);
      console.log(`replayed ${r.total} historical call(s) under the candidate manifest\n`);
      console.log(`  unchanged:     ${r.summary.unchanged}`);
      console.log(`  newly denied:  ${r.summary.newlyDenied}`);
      console.log(`  newly review:  ${r.summary.newlyReview}`);
      console.log(`  newly allowed: ${r.summary.newlyAllowed}`);
      if (r.changes.length) {
        console.log('\nchanges:');
        for (const c of r.changes) console.log(`  ${c.agent} ${c.tool}@${c.server}:  ${c.was} → ${c.now}`);
      }
      console.log(`\n${v.safe ? '✓ SAFE' : '✗ REVIEW'}: ${v.reason}`);
      break;
    }
    case 'check': {
      const url = rest[0];
      if (!url) { console.error('usage: fleetdeck check <url>'); process.exit(2); }
      console.error(`fetching ${url} …`);
      const input = await fetchSite(url);
      const rep = analyze(input);
      console.log(`\n${url}\n  Agent-Ready score: ${rep.score}/100  (grade ${rep.grade})\n`);
      for (const b of rep.breakdown) console.log(`  ${b.signal.padEnd(20)} ${String(b.earned).padStart(5)} / ${b.weight}`);
      console.log('\ntop fixes:');
      for (const r of rep.recommendations.slice(0, 4)) console.log(`  [${r.priority}] +${r.gain}  ${r.fix}`);
      break;
    }
    case 'serve': {
      const file = rest[0] || DEFAULT_FILE;
      const port = Number(rest[1]) || 7420;
      if (!fs.existsSync(file)) { const d = openDeck(file); seed(d); console.error(`(no spine at ${file} — seeded a demo)`); }
      startServer({ file, port, config: loadConfig(file) });
      break;
    }
    default:
      console.log(`Fleet Deck — local-first operator suite for AI agents

usage:
  fleetdeck seed [file]           play the demo scenario onto a spine
  fleetdeck serve [file] [port]   start the operator UI + JSON API (default :7420)
  fleetdeck timeline [file]       Flight Recorder — every agent action, in order
  fleetdeck alerts [file]         Tollgate — MCP drift / tool-poisoning alerts
  fleetdeck meter [file]          Meter — cost rollups + budget alarms
  fleetdeck inbox [file]          Approvals — what's awaiting a human
  fleetdeck approve <file> <ref> <who> [note]
  fleetdeck register [file] [pack] [--csv]   AI Register — compliance evidence
  fleetdeck preflight <file> <manifest.json> replay a policy change vs real history
  fleetdeck check <url>           Agent-Ready score for a live URL

default spine file: ${DEFAULT_FILE}`);
  }
}

main().catch((err) => { console.error(err.message); process.exit(1); });
