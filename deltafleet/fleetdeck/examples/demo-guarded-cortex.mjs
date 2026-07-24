#!/usr/bin/env node
// Fleet Deck — end-to-end guarded-Cortex demo (zero dependencies).
//
//   node examples/demo-guarded-cortex.mjs
//
// Unlike `fleetdeck seed` (which plays a SYNTHETIC scenario onto a spine), this
// drives the REAL pieces and shows the whole suite cohere on genuine traffic:
//
//   1. Spawns the real Tollgate proxy (bin/tollgate-proxy.js) in front of the
//      real Cortex MCP server (bin/cortex-mcp.js) over actual stdio.
//   2. Speaks MCP to the proxy: initialize, tools/list (drift-pinned), then three
//      tools/call — memory_search + memory_stats (ALLOWED, forwarded to Cortex,
//      real answers) and memory_delete (a write → HELD for human review, never
//      forwarded), exactly as examples/manifest.json scopes the `claude` agent.
//   3. Renders the operator views over the SAME spine the proxy just wrote, using
//      the real CLI verbs — timeline, inbox, register — so you see the one shared
//      log through three lenses. Then approves the held item and shows it clear.
//
// Everything runs locally; nothing leaves the box. The demo spine is written to
// examples/demo.jsonl (gitignored) so you can afterwards run:
//   node bin/fleetdeck.js serve examples/demo.jsonl
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FD = path.resolve(HERE, '..');                 // fleetdeck/
const SPINE = path.join(HERE, 'demo.jsonl');
const MANIFEST = path.join(HERE, 'manifest.json');

const b = (s) => `\x1b[1m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const rule = (t) => console.log(`\n${b('── ' + t + ' ' + '─'.repeat(Math.max(0, 58 - t.length)))}`);
const trunc = (s, n = 78) => (s.length > n ? s.slice(0, n) + '…' : s).replace(/\s+/g, ' ').trim();

// Run a Fleet Deck CLI verb against the demo spine and echo its output verbatim.
function cli(args) {
  return new Promise((resolve, reject) => {
    const p = spawn('node', [path.join(FD, 'bin/fleetdeck.js'), ...args], { cwd: FD });
    let out = '', err = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (err += d));
    p.on('close', (code) => (code === 0 ? resolve(out.trimEnd()) : reject(new Error(err || `exit ${code}`))));
  });
}

async function main() {
  try { fs.rmSync(SPINE); } catch {}

  rule('1 · guard a real MCP server');
  console.log(dim(`  proxy:  bin/tollgate-proxy.js --config examples/manifest.json --server cortex --agent claude`));
  console.log(dim(`  server: bin/cortex-mcp.js  (the Cortex second brain, as a real MCP server)`));

  const proc = spawn('node', [
    path.join(FD, 'bin/tollgate-proxy.js'),
    '--spine', SPINE,
    '--config', MANIFEST,
    '--server', 'cortex',
    '--agent', 'claude',
    '--', 'node', path.join(FD, 'bin/cortex-mcp.js'),
  ], { stdio: ['pipe', 'pipe', 'ignore'] });

  // Minimal newline-delimited JSON-RPC client over the proxy's stdio.
  let buf = '';
  const waiters = new Map();
  proc.stdout.on('data', (d) => {
    buf += d.toString();
    let nl;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      let msg; try { msg = JSON.parse(line); } catch { continue; }
      const w = waiters.get(msg.id);
      if (w) { waiters.delete(msg.id); w(msg); }
    }
  });
  const rpc = (id, method, params) => new Promise((resolve) => {
    waiters.set(id, resolve);
    proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
  const textOf = (m) => (m.result?.content || []).map((c) => c.text).join(' ');

  const init = await rpc(1, 'initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'demo', version: '1' } });
  console.log(`  ✓ initialize → server ${b(init.result?.serverInfo?.name)}`);
  const list = await rpc(2, 'tools/list', {});
  console.log(`  ✓ tools/list → ${b(list.result?.tools?.length)} tools pinned: ${list.result?.tools?.map((t) => t.name).join(', ')}`);

  rule('2 · policy in the call path');
  const calls = [
    ['memory_search', { query: 'how should an agent retry a failed tool call?' }, 'ALLOW — read tool, forwarded to Cortex'],
    ['memory_stats', {}, 'ALLOW — read tool, forwarded to Cortex'],
    ['memory_delete', { id: 'adr-0001' }, 'REVIEW — a write, held for a human'],
  ];
  let id = 10;
  for (const [name, args, expect] of calls) {
    const res = await rpc(id++, 'tools/call', { name, arguments: args });
    const held = !!res.result?.isError;
    const tag = held ? '\x1b[33mHELD\x1b[0m' : '\x1b[32mFORWARDED\x1b[0m';
    console.log(`  ${tag}  ${b(name)}  ${dim('— ' + expect)}`);
    console.log(`         ↳ ${trunc(textOf(res))}`);
  }
  proc.stdin.end();
  proc.kill();
  await new Promise((r) => setTimeout(r, 150));

  rule('3 · the same spine, three operator lenses');
  console.log(b('\n  $ fleetdeck timeline examples/demo.jsonl') + dim('   (Flight Recorder)'));
  console.log((await cli(['timeline', SPINE])).replace(/^/gm, '    '));

  console.log(b('\n  $ fleetdeck inbox examples/demo.jsonl') + dim('      (Approvals — the held write)'));
  console.log((await cli(['inbox', SPINE])).replace(/^/gm, '    '));

  console.log(b('\n  $ fleetdeck register examples/demo.jsonl') + dim('   (AI Register — compliance evidence)'));
  console.log((await cli(['register', SPINE])).replace(/^/gm, '    '));

  rule('4 · a human resolves the held action');
  // Find the held review's ref straight off the spine (its event id).
  const events = fs.readFileSync(SPINE, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  const held = events.find((e) => e.kind === 'tool.call' && e.decision === 'review');
  console.log(b(`\n  $ fleetdeck approve examples/demo.jsonl ${held.id} alice "one-off cleanup, approved"`));
  console.log('    ' + (await cli(['approve', SPINE, held.id, 'alice', 'one-off cleanup, approved'])));
  console.log(b('\n  $ fleetdeck inbox examples/demo.jsonl'));
  console.log('    ' + (await cli(['inbox', SPINE])));

  rule('done');
  console.log(`  Real proxy, real MCP server, real policy — all on one append-only spine.`);
  console.log(dim(`  Explore it live:  node bin/fleetdeck.js serve ${path.relative(FD, SPINE)}\n`));
}

main().catch((e) => { console.error(e); process.exit(1); });
