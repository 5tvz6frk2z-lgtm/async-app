#!/usr/bin/env node
// Tollgate MCP proxy — put the firewall in a real MCP call path.
//
//   node bin/tollgate-proxy.js [--spine <file>] [--config <manifest.json>]
//        [--server <name>] [--agent <name>] [--warn] -- <downstream-command> [args...]
//
// Example — guard the Cortex memory server:
//   node bin/tollgate-proxy.js --server cortex --agent claude -- node bin/cortex-mcp.js
//
// Add THIS as the MCP server in your client. It spawns the downstream server, runs
// every tools/list through drift detection and every tools/call through the policy
// gate, and logs all of it to the spine so the Fleet Deck views show real traffic.
// stdout is the JSON-RPC channel to the client; all logs go to stderr.
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { Spine } from '../lib/spine.js';
import { Tollgate } from '../lib/tollgate.js';
import { TollgateProxy } from '../lib/proxy.js';

// ---- args -------------------------------------------------------------------
const argv = process.argv.slice(2);
const dashdash = argv.indexOf('--');
if (dashdash < 0 || dashdash === argv.length - 1) {
  console.error('usage: tollgate-proxy [--spine f] [--config m.json] [--server n] [--agent n] [--warn] -- <command> [args...]');
  process.exit(2);
}
const flags = argv.slice(0, dashdash);
const [command, ...cmdArgs] = argv.slice(dashdash + 1);
const flag = (name, def) => { const i = flags.indexOf(name); return i >= 0 && flags[i + 1] ? flags[i + 1] : def; };

const spineFile = flag('--spine', 'fleetdeck.jsonl');
const server = flag('--server', 'downstream');
const agent = flag('--agent', 'client');
const onCriticalDrift = flags.includes('--warn') ? 'warn' : 'block';
const configPath = flag('--config', null);
const manifest = configPath
  ? JSON.parse(fs.readFileSync(configPath, 'utf8'))
  : { default: 'review', agents: {} }; // safe default: nothing runs un-reviewed, nothing hard-blocked
if (!configPath) console.error('tollgate-proxy: no --config; defaulting to review-everything. Provide a manifest for real scoping.');

// ---- downstream: spawn the guarded MCP server, speak stdio JSON-RPC to it ----
const child = spawn(command, cmdArgs, { stdio: ['pipe', 'pipe', 'inherit'] });
child.on('exit', (code) => { console.error(`tollgate-proxy: downstream exited (${code})`); process.exit(code ?? 0); });

// Correlate downstream responses by an INTERNAL id, never the client-supplied one:
// two clients (or a buggy one) reusing a JSON-RPC id must not cross-deliver or hang.
// The client's original id is restored on the response before it goes back upstream.
const pending = new Map(); // internalId -> (responseMsg) => void
let seq = 0;
let dbuf = '';
child.stdout.setEncoding('utf8');
child.stdout.on('data', (chunk) => {
  dbuf += chunk;
  let nl;
  while ((nl = dbuf.indexOf('\n')) >= 0) {
    const line = dbuf.slice(0, nl).trim(); dbuf = dbuf.slice(nl + 1);
    if (!line) continue;
    let msg; try { msg = JSON.parse(line); } catch { continue; }
    if (msg.id !== undefined && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
    else process.stdout.write(line + '\n'); // downstream notification (e.g. tools/list_changed) -> forward to client
  }
});
const downstream = {
  request: (msg) => new Promise((resolve) => {
    if (msg.id === undefined) { child.stdin.write(JSON.stringify(msg) + '\n'); return resolve(null); }
    const clientId = msg.id;
    const internalId = `p${seq++}`;
    pending.set(internalId, (res) => { res.id = clientId; resolve(res); }); // restore the caller's id
    child.stdin.write(JSON.stringify({ ...msg, id: internalId }) + '\n');
  }),
};

// ---- proxy over the parent's own stdio (the upstream client) -----------------
const spine = new Spine(spineFile, { indexBy: ['agent', 'server'] });
const gate = new Tollgate({ spine, manifest });
const proxy = new TollgateProxy({ gate, downstream, server, agent, onCriticalDrift });

let ubuf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', async (chunk) => {
  ubuf += chunk;
  let nl;
  while ((nl = ubuf.indexOf('\n')) >= 0) {
    const line = ubuf.slice(0, nl).trim(); ubuf = ubuf.slice(nl + 1);
    if (!line) continue;
    let msg; try { msg = JSON.parse(line); } catch { process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'parse error' } }) + '\n'); continue; }
    const res = await proxy.handle(msg);
    if (res) process.stdout.write(JSON.stringify(res) + '\n');
  }
});
// When the upstream client closes stdin (EOF), shut down — but DRAIN any in-flight
// downstream requests first, so a call already forwarded still gets its response
// written before the child is killed (a well-behaved server doesn't drop replies).
process.stdin.on('end', () => {
  const finish = () => {
    if (pending.size > 0) { setTimeout(finish, 20); return; }
    try { child.stdin.end(); child.kill(); } catch { /* already gone */ }
    process.exit(0);
  };
  finish();
});
console.error(`tollgate-proxy: guarding "${command} ${cmdArgs.join(' ')}" as server="${server}" agent="${agent}" (drift=${onCriticalDrift}) -> spine ${spineFile}`);
