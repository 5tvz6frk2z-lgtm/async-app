// Agentloop server — one process per client deployment.
// Serves the console UI and the JSON API over node:http. Zero dependencies.
//
//   node server.js [--port 4600] [--data ./data/ledger.jsonl]
//                  [--demo]                    simulated connectors + /api/simulate
//                  [--connectors cfg.json]     MCP-backed tools (see lib/connectors.js)
//                  [--triggers]                enable cron scheduler for schedule blueprints
//                  [--hook-secret S]           enable POST /hooks/{blueprint} (or env FLEET_HOOK_SECRET)
//
// Adapter selection: --demo uses scripted MockAdapters; otherwise
// ANTHROPIC_API_KEY must be set and the real AnthropicAdapter drives agents.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadBlueprintDir } from './lib/blueprint.js';
import { Ledger } from './lib/ledger.js';
import { GateEngine } from './lib/gates.js';
import { proofFor, opsSummary } from './lib/metrics.js';
import { AgentRun, AnthropicAdapter, MockAdapter } from './lib/runtime.js';
import { PipelineRun } from './lib/pipeline.js';
import { Verifier } from './lib/verify.js';
import { Coordinator } from './lib/orchestrate.js';
import { demoScriptRegistry, assertScriptsCovered } from './lib/scripts.js';
import { demoToolRegistry, seedBaselines, demoScript, SCENARIOS } from './lib/demo.js';
import { buildMcpRegistry, assertBlueprintsCovered } from './lib/connectors.js';
import { TriggerEngine, makeHookHandler } from './lib/triggers.js';
import { MemoryEngine } from './lib/memory.js';
import { Curator } from './lib/curator.js';
import { starterSkillRegistry } from './lib/skills.js';
import { loadSourceDir, syncSources, retireStale } from './lib/sources.js';
import { loadPackDir, packContext } from './lib/packs.js';
import { reportData, renderReportHTML } from './lib/report.js';
import { benchmarkExport } from './lib/benchmark.js';
import crypto from 'node:crypto';

const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (name, dflt) => {
  const i = process.argv.indexOf('--' + name);
  return i > -1 ? process.argv[i + 1] : dflt;
};
const PORT = Number(arg('port', 4600));
const DATA = arg('data', path.join(here, 'data', 'ledger.jsonl'));
const DEMO = process.argv.includes('--demo');
const CONNECTORS = arg('connectors', null);
const SOURCES = arg('sources', null); // dir of version-controlled source files → semantic memory
const TRIGGERS = process.argv.includes('--triggers');
const HOOK_SECRET = arg('hook-secret', process.env.FLEET_HOOK_SECRET || null);
const PROFILE_PATH = arg('profile', null);

// Per-client profile: brand/voice/industry config for every infer step,
// plus BYOK (bring-your-own-key) inference billing.
const profile = PROFILE_PATH ? JSON.parse(fs.readFileSync(PROFILE_PATH, 'utf8')) : {};

const blueprints = loadBlueprintDir(path.join(here, 'blueprints'));
const ledger = new Ledger(DATA);
const FRESH_LEDGER = ledger.events.length === 0; // captured before any seeding writes
const gates = new GateEngine(ledger, blueprints);
const activeRuns = new Map(); // run id -> AgentRun (for kill)

/* ---------------- tools & adapter ---------------- */

let tools;
if (CONNECTORS) {
  const built = await buildMcpRegistry(CONNECTORS);
  tools = built.registry;
  assertBlueprintsCovered(blueprints, tools);
  console.log(`connectors: ${built.mapped.length} tools mapped across ${Object.keys(built.clients).length} MCP server(s)`);
} else {
  tools = demoToolRegistry();
  if (!DEMO) console.log('WARNING: no --connectors given; using simulated tool stubs');
}

const scripts = demoScriptRegistry(); // production swaps pull.*/deliver.* handlers for MCP/IMAP-backed ones
assertScriptsCovered(blueprints, scripts);

/* ---------------- specialization cascade: pack + memory ---------------- */

const packs = loadPackDir(path.join(here, 'packs'));
const pack = packs.get(profile.pack || 'generic');
if (!pack) throw new Error(`profile.pack "${profile.pack}" not found in packs/`);

const memory = new MemoryEngine(ledger).enableCorrectionCapture();
const curator = new Curator(ledger); // accepted instruction overlays (Bet 4)
const skills = starterSkillRegistry(); // reusable capability modules (Bet 5)
for (const [i, seed] of (profile.seedMemories || []).entries()) {
  const key = seed.key || `onboarding:${i}`;
  if (!memory.active().some((m) => m.key === key)) {
    memory.add({ ...seed, key, source: { type: 'onboarding' } });
  }
}

// Version-controlled sources → semantic memory. Idempotent sync (dedupe by key,
// update on version bump, retire removed), then retire anything past its
// freshness window so a prompt never quotes an out-of-date source.
let sources = new Map();
if (SOURCES) {
  sources = loadSourceDir(SOURCES);
  const results = syncSources(sources, memory);
  const sum = (k) => results.reduce((n, r) => n + r[k], 0);
  const stale = retireStale(memory, sources);
  console.log(`sources: ${sources.size} file(s) synced — +${sum('added')} added, ${sum('updated')} updated, ${sum('restamped')} re-stamped, ${sum('retired') + stale} retired (${stale} stale)`);
}

/** Layered prompt context for a run: industry pack, learned memory (retrieved
 *  RELEVANT to this run's trigger via the index-first technique), then any
 *  curated instruction overlays a human has accepted (the cascade's top layer). */
function contextFor(blueprintId, triggerInput) {
  const lines = packContext(pack, blueprintId);
  const query = triggerInput ? JSON.stringify(triggerInput) : undefined;
  const mem = memory.contextBlock({ blueprint: blueprintId, query });
  if (mem) lines.push(mem);
  lines.push(...curator.contextLines({ blueprint: blueprintId }));
  return lines;
}

function adapterFor(blueprintId, agentName) {
  if (!DEMO) {
    // BYOK: when the client profile opts in, inference bills to their key.
    const key = profile.byok?.enabled
      ? process.env[profile.byok.env || 'CLIENT_ANTHROPIC_KEY']
      : process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error(profile.byok?.enabled
      ? `BYOK enabled but ${profile.byok.env || 'CLIENT_ANTHROPIC_KEY'} is not set`
      : 'live mode needs ANTHROPIC_API_KEY (or run with --demo)');
    return new AnthropicAdapter({ apiKey: key });
  }
  const script = demoScript(blueprintId, agentName);
  if (script) return new MockAdapter(script);
  return new MockAdapter([{ text: `(${agentName}) trigger received and acknowledged — no scripted scenario for this agent in demo mode.` }]);
}

/** Adversarial verification for `verify`-gated actions. In live mode each
 *  verifier gets its own fresh Anthropic adapter (independent context — it must
 *  not share the acting agent's conversation). In demo mode there is no verifier;
 *  no demo blueprint uses a `verify` gate, and if one did it would fail-safe hold. */
function verifierFor() {
  if (DEMO) return null;
  const key = profile.byok?.enabled ? process.env[profile.byok.env || 'CLIENT_ANTHROPIC_KEY'] : process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const lenses = profile.verifyLenses || null; // e.g. ["correctness","brand","policy"]
  return new Verifier({ adapter: new AnthropicAdapter({ apiKey: key }), k: profile.verifyK || 3, lenses });
}

/** Single entry point every intake path uses: simulate, webhook, schedule.
 *  Pipeline blueprints run the hybrid executor; the rest run the agent loop. */
function launchRun(blueprintId, triggerInput, { agentName } = {}) {
  const bp = blueprints.get(blueprintId);
  if (!bp) throw new Error(`unknown blueprint ${blueprintId}`);
  let run;
  const context = contextFor(blueprintId, triggerInput);
  // Progressive-disclosure skills catalog for this run (guidance loads only for
  // skills the trigger matches). Pipeline steps can additionally pin a `skill`.
  context.push(...skills.contextLines(triggerInput));
  const verifier = verifierFor();
  if (bp.orchestration) {
    // Multi-agent crew: run the blueprint's agents as a graph. The Coordinator
    // exposes .run() (thread id + results) but not .kill(); crew sub-runs are
    // individually killable from the console.
    const coord = new Coordinator({ blueprint: bp, ledger, gates, adapterFor: (name) => adapterFor(blueprintId, name), tools, verifier, context });
    coord.run(triggerInput);
    return coord.bp.blueprint; // orchestration threads are surfaced via /api/state.threads
  }
  if (bp.pipeline) {
    const inferAgent = bp.pipeline.find((s) => s.infer)?.infer || bp.agents[0].name;
    run = new PipelineRun({ blueprint: bp, ledger, gates, scripts, adapter: adapterFor(blueprintId, inferAgent), verifier, skills, profile, context });
  } else {
    const agent = agentName || bp.entry || bp.agents[0].name;
    run = new AgentRun({ blueprint: bp, agentName: agent, ledger, gates, adapter: adapterFor(blueprintId, agent), tools, verifier, context });
  }
  activeRuns.set(run.id, run);
  run.run(triggerInput).finally(() => activeRuns.delete(run.id));
  return run.id;
}

if (DEMO && FRESH_LEDGER) seedBaselines(ledger);

const hookHandler = makeHookHandler({ blueprints, launch: (id, payload, meta) => launchRun(id, { ...payload, _via: meta.via }), secret: HOOK_SECRET });
const triggerEngine = new TriggerEngine({ blueprints, launch: (id, input) => launchRun(id, input), log: console.log });
if (TRIGGERS) {
  triggerEngine.start();
  console.log(`triggers: cron scheduler armed for ${triggerEngine.schedules.length} schedule blueprint(s)`);
}

/* ---------------- state serialization ---------------- */

function apiState() {
  const s = ledger.state();
  const runs = [...s.runs.values()].sort((a, b) => (a.start < b.start ? 1 : -1)).slice(0, 60).map((r) => ({
    ...r,
    actions: r.actions.map((id) => s.actions.get(id)),
  }));
  const pending = s.pendingApprovals.map((a) => ({ ...a, runInfo: pick(s.runs.get(a.run)) }));
  const bps = [...blueprints.values()].map((bp) => ({
    id: bp.blueprint, title: bp.title, summary: bp.summary, trigger: bp.trigger,
    agents: bp.agents, connectors: bp.connectors, rollback: bp.rollback,
    gates: Object.fromEntries(
      [...new Set([...Object.keys(bp.gates), ...Object.keys(s.overrides.get(bp.blueprint) || {})])]
        .map((tool) => [tool, { declared: bp.gates[tool] ?? bp.gates['*'], effective: gates.levelFor(bp.blueprint, tool) }]),
    ),
    proof: proofFor(bp, s),
    hasScenario: bp.blueprint in SCENARIOS,
  }));
  return {
    summary: opsSummary(s),
    pendingApprovals: pending,
    runs,
    trust: gates.trustStats(),
    verification: gates.verificationStats(),
    confidence: gates.confidenceStats(),
    threads: [...s.threads.values()].sort((a, b) => (a.start < b.start ? 1 : -1)).slice(0, 20),
    gateChanges: s.gateChanges.slice(-20).reverse(),
    blueprints: bps,
    demo: DEMO,
    intake: { triggers: TRIGGERS, webhooks: !!HOOK_SECRET, connectors: !!CONNECTORS },
    pack: { id: pack.pack, title: pack.title },
    memories: memory.active().sort((a, b) => (a.updated < b.updated ? 1 : -1)).slice(0, 100),
    memoryStats: memory.stats(),
    sources: [...sources.values()].map((s) => ({ id: s.id, version: s.version, updated: s.updated, ttlDays: s.ttlDays, facts: s.facts.length })),
    instructions: curator.proposals().slice(0, 40),
  };
}
const pick = (r) => r && { id: r.id, blueprint: r.blueprint, agent: r.agent, callsign: r.callsign, status: r.status };

// The console polls /api/state ~every 1.5s and every poll recomputes the full
// derived payload (trust/verification/confidence/ops stats, all history). That
// payload only changes when the ledger changes, so memoize it by ledger version:
// N pollers and back-to-back idle ticks collapse to one recompute per append.
let _stateCache = { version: -1, body: null };
function apiStateBody() {
  if (_stateCache.version === ledger.version) return _stateCache.body;
  const body = JSON.stringify(apiState());
  _stateCache = { version: ledger.version, body };
  return body;
}

/* ---------------- http ---------------- */

const json = (res, code, body) => {
  res.writeHead(code, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
};
const readBody = (req) => new Promise((resolve, reject) => {
  let data = '';
  req.on('data', (c) => { data += c; if (data.length > 1e6) req.destroy(); });
  req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch (e) { reject(new Error('bad JSON body')); } });
});

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(fs.readFileSync(path.join(here, 'console', 'index.html')));
      return;
    }
    if (req.method === 'GET' && url.pathname === '/api/state') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(apiStateBody());
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/benchmark-export') {
      // Anonymized cross-install export. installId is an opaque salted hash of
      // the client brand — never the brand itself. A central aggregator pulls
      // this from each deployment; see bin/aggregate.js.
      const installId = 'ins_' + crypto.createHash('sha256')
        .update((process.env.FLEET_BENCHMARK_SALT || 'df-benchmark') + '|' + (profile.brand || 'anon'))
        .digest('hex').slice(0, 16);
      const e = benchmarkExport(blueprints, ledger.state(), { installId });
      e.at = new Date().toISOString();
      return json(res, 200, e);
    }
    if (req.method === 'GET' && url.pathname === '/report') {
      const now = new Date();
      const dflt = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const d = reportData({
        blueprints, ledgerState: ledger.state(), trust: gates.trustStats(),
        memories: memory.active(), profile, pack,
        since: url.searchParams.get('since') || dflt,
        until: url.searchParams.get('until') || null,
      });
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(renderReportHTML(d));
      return;
    }

    if (req.method === 'POST' && url.pathname.startsWith('/hooks/')) {
      const blueprintId = url.pathname.slice('/hooks/'.length);
      const body = await readBody(req);
      const out = hookHandler(blueprintId, Object.fromEntries(Object.entries(req.headers)), body);
      return json(res, out.status, out.body);
    }
    if (req.method === 'POST' && url.pathname === '/api/verdict') {
      const b = await readBody(req);
      const e = gates.verdict(b.action, { verdict: b.verdict, by: b.by || 'operator', editedInput: b.editedInput, reason: b.reason });
      return json(res, 200, { ok: true, event: e });
    }
    if (req.method === 'POST' && url.pathname === '/api/kill') {
      const b = await readBody(req);
      const run = activeRuns.get(b.run);
      if (!run) return json(res, 404, { ok: false, error: 'run not active (already finished?)' });
      run.kill(b.by || 'operator');
      return json(res, 200, { ok: true });
    }
    if (req.method === 'POST' && url.pathname === '/api/memory') {
      const b = await readBody(req);
      const m = memory.add({ kind: b.kind, text: b.text, scope: b.scope || 'client', source: { type: 'operator', by: b.by || 'operator' } });
      return json(res, 200, { ok: true, memory: m });
    }
    if (req.method === 'POST' && url.pathname === '/api/memory/retire') {
      const b = await readBody(req);
      memory.retire(b.id, { by: b.by || 'operator', reason: b.reason || '' });
      return json(res, 200, { ok: true });
    }
    if (req.method === 'POST' && url.pathname === '/api/memory/consolidate') {
      return json(res, 200, { ok: true, ...memory.consolidate() });
    }
    if (req.method === 'POST' && url.pathname === '/api/instruction') {
      // Human decision on a curated instruction proposal (Bet 4): accept / reject / revert.
      const b = await readBody(req);
      const fn = { accept: 'accept', reject: 'reject', revert: 'revert' }[b.action];
      if (!fn) return json(res, 400, { ok: false, error: 'action must be accept|reject|revert' });
      const p = curator[fn](b.id, { by: b.by || 'operator', reason: b.reason || '' });
      return json(res, 200, { ok: true, proposal: p });
    }
    if (req.method === 'POST' && url.pathname === '/api/gate') {
      const b = await readBody(req);
      const e = gates.changeGate(b.blueprint, b.tool, b.to, { by: b.by || 'operator', reason: b.reason || '' });
      return json(res, 200, { ok: true, event: e });
    }
    if (req.method === 'POST' && url.pathname === '/api/simulate') {
      if (!DEMO) return json(res, 403, { ok: false, error: 'simulation only available with --demo' });
      const b = await readBody(req);
      const names = b.scenario ? [b.scenario] : Object.keys(SCENARIOS);
      // Every corridor launches through the one entry point: pipelines run the
      // hybrid executor, crews run the Coordinator (full multi-agent handoff),
      // plain agents run the loop. All scripted per-agent by adapterFor.
      const launched = names.map((scenario) => launchRun(scenario, SCENARIOS[scenario]?.trigger || { demo: true }));
      return json(res, 200, { ok: true, launched });
    }
    json(res, 404, { ok: false, error: 'not found' });
  } catch (err) {
    json(res, 400, { ok: false, error: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`AGENTLOOP console  → http://localhost:${PORT}  (${DEMO ? 'DEMO MODE' : 'live'}; ledger: ${DATA})`);
  if (HOOK_SECRET) console.log(`webhooks: POST /hooks/{blueprint} with x-fleet-secret`);
});
