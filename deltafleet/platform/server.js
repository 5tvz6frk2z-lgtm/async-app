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
import { demoToolRegistry, seedBaselines, launchScenario, SCENARIOS } from './lib/demo.js';
import { buildMcpRegistry, assertBlueprintsCovered } from './lib/connectors.js';
import { TriggerEngine, makeHookHandler } from './lib/triggers.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (name, dflt) => {
  const i = process.argv.indexOf('--' + name);
  return i > -1 ? process.argv[i + 1] : dflt;
};
const PORT = Number(arg('port', 4600));
const DATA = arg('data', path.join(here, 'data', 'ledger.jsonl'));
const DEMO = process.argv.includes('--demo');
const CONNECTORS = arg('connectors', null);
const TRIGGERS = process.argv.includes('--triggers');
const HOOK_SECRET = arg('hook-secret', process.env.FLEET_HOOK_SECRET || null);

const blueprints = loadBlueprintDir(path.join(here, 'blueprints'));
const ledger = new Ledger(DATA);
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

function adapterFor(blueprintId, agentName) {
  if (!DEMO) {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('live mode needs ANTHROPIC_API_KEY (or run with --demo)');
    return new AnthropicAdapter({});
  }
  const sc = SCENARIOS[blueprintId];
  if (sc && sc.agent === agentName) return new MockAdapter(structuredClone(sc.script));
  return new MockAdapter([{ text: `(${agentName}) trigger received and acknowledged — no scripted scenario for this agent in demo mode.` }]);
}

/** Single entry point every intake path uses: simulate, webhook, schedule. */
function launchRun(blueprintId, triggerInput, { agentName } = {}) {
  const bp = blueprints.get(blueprintId);
  if (!bp) throw new Error(`unknown blueprint ${blueprintId}`);
  const agent = agentName || bp.entry || bp.agents[0].name;
  const run = new AgentRun({
    blueprint: bp, agentName: agent, ledger, gates,
    adapter: adapterFor(blueprintId, agent), tools,
  });
  activeRuns.set(run.id, run);
  run.run(triggerInput).finally(() => activeRuns.delete(run.id));
  return run.id;
}

if (DEMO && ledger.events.length === 0) seedBaselines(ledger);

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
    gateChanges: s.gateChanges.slice(-20).reverse(),
    blueprints: bps,
    demo: DEMO,
    intake: { triggers: TRIGGERS, webhooks: !!HOOK_SECRET, connectors: !!CONNECTORS },
  };
}
const pick = (r) => r && { id: r.id, blueprint: r.blueprint, agent: r.agent, callsign: r.callsign, status: r.status };

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
    if (req.method === 'GET' && url.pathname === '/api/state') return json(res, 200, apiState());

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
    if (req.method === 'POST' && url.pathname === '/api/gate') {
      const b = await readBody(req);
      const e = gates.changeGate(b.blueprint, b.tool, b.to, { by: b.by || 'operator', reason: b.reason || '' });
      return json(res, 200, { ok: true, event: e });
    }
    if (req.method === 'POST' && url.pathname === '/api/simulate') {
      if (!DEMO) return json(res, 403, { ok: false, error: 'simulation only available with --demo' });
      const b = await readBody(req);
      const names = b.scenario ? [b.scenario] : Object.keys(SCENARIOS);
      const launched = [];
      for (const scenario of names) {
        const { run, finished } = launchScenario({ ledger, gates, blueprints, tools, scenario });
        activeRuns.set(run.id, run);
        finished.finally(() => activeRuns.delete(run.id));
        launched.push(run.id);
      }
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
