// Agentloop server — one process per client deployment.
// Serves the console UI and the JSON API over node:http. Zero dependencies.
//
//   node server.js [--port 4600] [--data ./data/ledger.jsonl] [--demo]
//
// --demo seeds baselines and enables POST /api/simulate so the console can be
// exercised without API keys or client connectors.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadBlueprintDir } from './lib/blueprint.js';
import { Ledger } from './lib/ledger.js';
import { GateEngine } from './lib/gates.js';
import { proofFor, opsSummary } from './lib/metrics.js';
import { demoToolRegistry, seedBaselines, launchScenario, SCENARIOS } from './lib/demo.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (name, dflt) => {
  const i = process.argv.indexOf('--' + name);
  return i > -1 ? process.argv[i + 1] : dflt;
};
const PORT = Number(arg('port', 4600));
const DATA = arg('data', path.join(here, 'data', 'ledger.jsonl'));
const DEMO = process.argv.includes('--demo');

const blueprints = loadBlueprintDir(path.join(here, 'blueprints'));
const ledger = new Ledger(DATA);
const gates = new GateEngine(ledger, blueprints);
const tools = demoToolRegistry(); // real deployments swap in MCP-backed registries
const activeRuns = new Map();     // run id -> AgentRun (for kill)

if (DEMO && ledger.events.length === 0) seedBaselines(ledger);

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
});
