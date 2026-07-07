// Shadow Eval Harness — grade a corridor before it touches production.
//
// The promise the whole company is built on is "proof over faith." This is the
// platform-level version: run a corridor against a set of SCENARIOS with
// known-good outcomes, with NOTHING written to real systems, and grade each
// output against ground truth. The result is a readiness report — accuracy, the
// specific cases that fail, and the honest safety signal: of the failures, how
// many would a production approval gate have parked for a human, and how many
// would have shipped silently (wrong AND unguarded — the dangerous set).
//
// It is also the measurement substrate for the Verification Layer and the
// Curator: you cannot prove either helps without a way to score a corridor.
//
// Isolation doctrine:
//  - Every scenario runs against a FRESH in-memory Ledger (file=null), so no
//    real ledger, metrics, or memory is touched.
//  - Approve gates are downgraded to `log` IN THE SANDBOX ONLY (via gate.change
//    events on the throwaway ledger) so a headless run never parks waiting for a
//    human that isn't there. The ORIGINAL production gate is remembered
//    separately to compute the safety-net signal — we never mutate the real
//    blueprint or the real ledger.
//  - Tool/script handlers passed in should themselves be side-effect-free
//    (simulated pulls, no real sends). Shadow mode assumes read/compute; a
//    handler that truly sends is the caller's bug, not ours to police.
import { Ledger } from './ledger.js';
import { GateEngine } from './gates.js';
import { gateFor } from './blueprint.js';
import { PipelineRun } from './pipeline.js';
import { AgentRun } from './runtime.js';

/** Every concrete tool/script a blueprint can actually request. */
export function corridorTools(bp) {
  return [...new Set([
    ...(bp.agents || []).flatMap((a) => a.tools || []),
    ...(bp.pipeline || []).map((s) => s.script).filter(Boolean),
  ])];
}

/** Read a dotted path out of an object (e.g. "results.stats.replyDebt"). */
function getPath(obj, path) {
  let cur = obj;
  for (const p of String(path).split('.')) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

/** Default scorer. Interprets scenario.groundTruth as a map of
 *  { "results.stats.replyDebt": 3, "results.stats.overdue": {approx: 2, tol: 0} }
 *  and checks each against the run outcome. A bare value is an exact/deep match;
 *  { approx, tol } is a numeric tolerance match. Score = fraction of checks that
 *  pass; a scenario passes only if ALL its checks pass. */
export function structuredScorer(outcome, groundTruth) {
  const entries = Object.entries(groundTruth || {});
  if (!entries.length) return { pass: outcome.status === 'done', score: outcome.status === 'done' ? 1 : 0, checks: [] };
  const checks = entries.map(([path, expected]) => {
    const actual = getPath(outcome, path);
    let ok;
    if (expected && typeof expected === 'object' && 'approx' in expected) {
      ok = typeof actual === 'number' && Math.abs(actual - expected.approx) <= (expected.tol || 0);
    } else if (expected && typeof expected === 'object' && 'contains' in expected) {
      ok = typeof actual === 'string' && actual.includes(expected.contains); // grade model-generated text
    } else if (expected && typeof expected === 'object') {
      ok = JSON.stringify(actual) === JSON.stringify(expected);
    } else {
      ok = actual === expected;
    }
    return { path, expected, actual, ok };
  });
  const passed = checks.filter((c) => c.ok).length;
  return { pass: passed === checks.length, score: passed / checks.length, checks };
}

/** Run one scenario in a sandbox. Returns a normalized outcome + grade. */
export async function runScenario(bp, scenario, {
  blueprints, adapter, scripts, tools, profile = {}, context = [], scorer = structuredScorer, maxTokens,
} = {}) {
  const sandbox = new Ledger(null);
  // Remember production gates BEFORE downgrading, for the safety-net signal.
  const prodGate = {};
  for (const tool of corridorTools(bp)) prodGate[tool] = gateFor(bp, tool, {});

  const bps = blueprints || new Map([[bp.blueprint, bp]]);
  const gates = new GateEngine(sandbox, bps);
  // Downgrade approve → log in the sandbox so nothing parks on a human.
  for (const [tool, level] of Object.entries(prodGate)) {
    if (level === 'approve') {
      sandbox.append({ type: 'gate.change', blueprint: bp.blueprint, tool, from: 'approve', to: 'log', by: 'shadow', reason: 'shadow eval — no human in loop' });
    }
  }

  let res;
  if (Array.isArray(bp.pipeline) && bp.pipeline.length) {
    const run = new PipelineRun({ blueprint: bp, ledger: sandbox, gates, scripts, adapter, profile, context, ...(maxTokens ? { maxTokens } : {}) });
    res = await run.run(scenario.trigger);
  } else {
    const entry = bp.entry || bp.agents[0]?.name;
    const run = new AgentRun({ blueprint: bp, agentName: entry, ledger: sandbox, gates, adapter, tools, context, ...(maxTokens ? { maxTokens } : {}) });
    res = await run.run(scenario.trigger);
  }

  const st = sandbox.state();
  const actions = [...st.actions.values()].map((a) => ({ tool: a.tool, input: a.input, ok: a.ok, output: a.output, error: a.error, prodGate: prodGate[a.tool] || bp.gates['*'] }));
  const outcome = {
    status: res.status,
    results: res.results || {},
    actions,
    notes: (st.runs.get(res.run)?.notes || []).map((n) => n.text),
    tokensIn: res.tokensIn, tokensOut: res.tokensOut,
  };
  const grade = scorer(outcome, scenario.groundTruth, scenario);
  // A production gate would have caught a bad output iff any action in the run
  // was approve-gated in production (a human would have reviewed it).
  const guarded = actions.some((a) => a.prodGate === 'approve');
  return { scenario: { id: scenario.id, note: scenario.note }, outcome, grade, guarded };
}

/** Run a whole scenario set (sequentially — a shadow eval is offline, order-free,
 *  and sequential keeps sandbox ledgers cleanly isolated). */
export async function runScenarios(bp, scenarios, opts = {}) {
  const graded = [];
  for (const s of scenarios) graded.push(await runScenario(bp, s, opts));
  return graded;
}

/** Aggregate graded results into a readiness report.
 *  READY_MIN is the accuracy bar; a corridor with unguarded failures is never
 *  "ready" no matter its accuracy — a silent wrong output is the thing we refuse
 *  to ship. */
export const READY_MIN = 0.9;

export function readinessReport(bp, graded, { readyMin = READY_MIN } = {}) {
  const total = graded.length;
  const passed = graded.filter((g) => g.grade.pass).length;
  const failed = total - passed;
  const accuracy = total ? passed / total : 0;
  const avgScore = total ? graded.reduce((s, g) => s + g.grade.score, 0) / total : 0;

  const failures = graded.filter((g) => !g.grade.pass).map((g) => ({
    id: g.scenario.id, note: g.scenario.note, guarded: g.guarded,
    status: g.outcome.status, score: g.grade.score,
    misses: (g.grade.checks || []).filter((c) => !c.ok).map((c) => ({ path: c.path, expected: c.expected, actual: c.actual })),
  }));
  const guardedFailures = failures.filter((f) => f.guarded);
  const unguardedFailures = failures.filter((f) => !f.guarded); // wrong AND would have shipped silently

  const tokensIn = graded.reduce((s, g) => s + (g.outcome.tokensIn || 0), 0);
  const tokensOut = graded.reduce((s, g) => s + (g.outcome.tokensOut || 0), 0);

  let verdict;
  if (accuracy >= readyMin && unguardedFailures.length === 0) verdict = failed === 0 ? 'ready' : 'gated-ready';
  else if (unguardedFailures.length === 0) verdict = 'not-ready';
  else verdict = 'unsafe'; // has failures that no gate would have caught

  return {
    blueprint: bp.blueprint, title: bp.title, scenarios: total,
    passed, failed, accuracy, avgScore,
    gateSafetyNet: {
      ofFailures: failed,
      guarded: guardedFailures.length,
      unguarded: unguardedFailures.length,
      rate: failed ? guardedFailures.length / failed : 1,
    },
    failures, unguardedFailures,
    tokensIn, tokensOut, verdict, readyMin,
  };
}

/** One call: run scenarios and produce the report. */
export async function shadowEval(bp, scenarios, opts = {}) {
  const graded = await runScenarios(bp, scenarios, opts);
  return { graded, report: readinessReport(bp, graded, opts) };
}

/** Render a readiness report as plain text for the CLI / console. */
export function renderReadiness(report) {
  const pct = (n) => `${(n * 100).toFixed(0)}%`;
  const lines = [];
  lines.push(`READINESS — ${report.title} (${report.blueprint})`);
  lines.push(`  verdict:   ${report.verdict.toUpperCase()}`);
  lines.push(`  scenarios: ${report.scenarios}   passed: ${report.passed}   failed: ${report.failed}`);
  lines.push(`  accuracy:  ${pct(report.accuracy)}   avg score: ${pct(report.avgScore)}   (bar: ${pct(report.readyMin)})`);
  const g = report.gateSafetyNet;
  lines.push(`  of ${g.ofFailures} failure(s): ${g.guarded} a gate would catch, ${g.unguarded} would ship silently`);
  lines.push(`  eval cost: ${report.tokensIn} in / ${report.tokensOut} out tokens`);
  if (report.failures.length) {
    lines.push('  failing scenarios:');
    for (const f of report.failures) {
      const flag = f.guarded ? '[gated]' : '[UNGUARDED]';
      const miss = f.misses.map((m) => `${m.path}: expected ${JSON.stringify(m.expected)}, got ${JSON.stringify(m.actual)}`).join('; ');
      lines.push(`    ${flag} ${f.id}${f.note ? ` — ${f.note}` : ''}: ${miss || f.status}`);
    }
  }
  return lines.join('\n');
}
