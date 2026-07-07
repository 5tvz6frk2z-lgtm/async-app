// Blueprint spec v1 — the atomic unit of Delta Fleet IP.
// A blueprint fully describes one workflow corridor: what triggers it, which
// agents run it, what each action is allowed to do unsupervised (gates),
// which connectors it touches, how it is measured, and how to turn it off.
// Sales quotes it, the runtime executes it, the console renders it, and
// Delta Proof measures it — all from this one document.
import fs from 'node:fs';
import path from 'node:path';

// Gate tiers, least to most supervision. `verify` (adversarial self-check by N
// verifier agents) sits between `log` and `approve`: it can HOLD a bad action
// with no human, and clean actions proceed without one. See lib/verify.js.
export const GATE_LEVELS = ['auto', 'log', 'verify', 'approve'];

const REQUIRED = ['blueprint', 'title', 'trigger', 'agents', 'gates', 'connectors', 'metrics', 'rollback'];

export function validateBlueprint(bp) {
  const errs = [];
  const err = (m) => errs.push(m);
  if (typeof bp !== 'object' || bp === null) return ['blueprint must be an object'];

  for (const k of REQUIRED) if (!(k in bp)) err(`missing required field "${k}"`);
  if (errs.length) return errs;

  if (!/^[a-z0-9][a-z0-9-]*$/.test(bp.blueprint)) err('blueprint id must be kebab-case');
  if (typeof bp.title !== 'string' || !bp.title) err('title must be a non-empty string');
  if (typeof bp.trigger !== 'object' || !bp.trigger.type) err('trigger must have a type');

  if (!Array.isArray(bp.agents) || bp.agents.length === 0) err('agents must be a non-empty array');
  else bp.agents.forEach((a, i) => {
    if (!a.name || !/^[a-z0-9-]+$/.test(a.name)) err(`agents[${i}].name must be kebab-case`);
    if (!a.role) err(`agents[${i}].role required`);
    if (!Array.isArray(a.tools)) err(`agents[${i}].tools must be an array`);
    else if (a.tools.length === 0 && !bp.pipeline && !bp.orchestration) err(`agents[${i}].tools must be non-empty (empty allowed only in pipeline/orchestration blueprints)`);
    if (a.model !== undefined && typeof a.model !== 'string') err(`agents[${i}].model must be a string`);
  });

  // Hybrid pipelines: deterministic script steps + single-shot infer steps.
  if (bp.pipeline !== undefined) {
    if (!Array.isArray(bp.pipeline) || bp.pipeline.length === 0) err('pipeline must be a non-empty array');
    else bp.pipeline.forEach((s, i) => {
      const kinds = ['script', 'infer'].filter((k) => k in s);
      if (kinds.length !== 1) err(`pipeline[${i}] must have exactly one of "script" or "infer"`);
      if (s.script && !/^[a-z0-9_.-]+$/.test(s.script)) err(`pipeline[${i}].script has an invalid name`);
      if (s.infer && !(bp.agents || []).some((a) => a.name === s.infer)) err(`pipeline[${i}].infer references unknown agent "${s.infer}"`);
      if (s.save !== undefined && !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(s.save)) err(`pipeline[${i}].save must be an identifier`);
    });
  }

  // Multi-agent orchestration: execute the blueprint's agents as a graph rather
  // than a single run. See lib/orchestrate.js.
  if (bp.orchestration !== undefined) {
    const o = bp.orchestration;
    const types = ['sequential', 'parallel', 'delegate', 'judge'];
    const names = new Set((bp.agents || []).map((a) => a.name));
    const chk = (n, where) => { if (!names.has(n)) err(`orchestration.${where} references unknown agent "${n}"`); };
    if (typeof o !== 'object' || o === null || !types.includes(o.type)) err(`orchestration.type must be one of ${types.join('/')}`);
    else if (o.type === 'sequential' || o.type === 'parallel') {
      if (!Array.isArray(o.agents) || o.agents.length < 1) err(`orchestration.agents must be a non-empty array for ${o.type}`);
      else o.agents.forEach((n) => chk(n, 'agents'));
    } else if (o.type === 'judge') {
      if (!Array.isArray(o.attempts) || o.attempts.length < 2) err('orchestration.attempts must list ≥2 agents for judge');
      else o.attempts.forEach((n) => chk(n, 'attempts'));
      if (!o.judge) err('orchestration.judge (an agent name) is required for judge'); else chk(o.judge, 'judge');
    } else if (o.type === 'delegate') {
      if (!o.parent) err('orchestration.parent is required for delegate'); else chk(o.parent, 'parent');
      if (!o.child) err('orchestration.child is required for delegate'); else chk(o.child, 'child');
    }
  }

  if (typeof bp.gates !== 'object') err('gates must be an object');
  else {
    if (!('*' in bp.gates)) err('gates must define a "*" default');
    for (const [tool, level] of Object.entries(bp.gates)) {
      if (!GATE_LEVELS.includes(level)) err(`gates["${tool}"] must be one of ${GATE_LEVELS.join('/')}`);
    }
  }

  if (!Array.isArray(bp.connectors)) err('connectors must be an array');

  if (typeof bp.metrics !== 'object' || !Array.isArray(bp.metrics.baseline)) {
    err('metrics.baseline must be an array');
  } else {
    bp.metrics.baseline.forEach((m, i) => {
      if (!m.key || !m.unit || !m.direction) err(`metrics.baseline[${i}] needs key, unit, direction`);
      if (m.direction && !['down', 'up'].includes(m.direction)) err(`metrics.baseline[${i}].direction must be up|down`);
    });
  }

  if (typeof bp.rollback !== 'string' || !bp.rollback) err('rollback must be a non-empty string');

  // Optional entry agent for trigger-launched runs (defaults to agents[0]).
  if (bp.entry !== undefined && !(bp.agents || []).some((a) => a.name === bp.entry)) {
    err(`entry "${bp.entry}" does not name an agent`);
  }

  // Every tool named in gates (other than *) should belong to some agent or
  // be a pipeline script step.
  if (Array.isArray(bp.agents)) {
    const known = new Set([
      ...bp.agents.flatMap((a) => a.tools || []),
      ...(bp.pipeline || []).map((s) => s.script).filter(Boolean),
    ]);
    for (const tool of Object.keys(bp.gates || {})) {
      if (tool !== '*' && !known.has(tool)) err(`gates["${tool}"] refers to a tool no agent or pipeline step uses`);
    }
  }
  return errs;
}

export function loadBlueprint(file) {
  const bp = JSON.parse(fs.readFileSync(file, 'utf8'));
  const errs = validateBlueprint(bp);
  if (errs.length) throw new Error(`invalid blueprint ${path.basename(file)}:\n  - ${errs.join('\n  - ')}`);
  return bp;
}

export function loadBlueprintDir(dir) {
  const out = new Map();
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
    const bp = loadBlueprint(path.join(dir, f));
    if (out.has(bp.blueprint)) throw new Error(`duplicate blueprint id "${bp.blueprint}"`);
    out.set(bp.blueprint, bp);
  }
  return out;
}

/** Effective gate level for a tool under a blueprint, honoring runtime overrides
 *  (gate.change events relax/tighten gates without editing the blueprint file). */
export function gateFor(bp, tool, overrides = {}) {
  if (tool in overrides) return overrides[tool];
  if (tool in bp.gates) return bp.gates[tool];
  return bp.gates['*'];
}
