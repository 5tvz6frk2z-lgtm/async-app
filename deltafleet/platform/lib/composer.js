// Squadron Composer — an agent that DESIGNS a corridor from a plain-language
// business workflow (FRONTIER-PLAN reach idea; the meta-level, original
// tool-queue idea).
//
// Given "when a lead comes in from our site, research them and send a first
// touch within five minutes," the Composer emits a complete blueprint: trigger,
// agents (callsigns/roles/tools), gates, connectors, metrics, rollback. The
// safety rail is the same one the whole platform runs on: the output is only
// accepted if it PASSES `validateBlueprint`. A design that doesn't validate is
// fed its own errors and asked to repair (bounded retries); if it still fails,
// the Composer returns the errors, never a broken blueprint. The model proposes;
// the schema disposes.
import { validateBlueprint } from './blueprint.js';

export const PANTHEON = ['HERMES', 'MIMIR', 'HERMOD', 'SAGA', 'HEIMDALL', 'MNEMOSYNE', 'ATHENA', 'IRIS', 'HUGINN', 'MUNINN', 'BRAGI', 'ODIN', 'CALLIOPE', 'APOLLO', 'HELIOS', 'THOTH', 'THEMIS', 'TYR', 'ARGUS', 'ECHO', 'EIR', 'VOR'];

export function composerSystem(catalog = {}) {
  return [
    'You are the Squadron Composer for Delta Fleet. Given a plain-language business workflow, you DESIGN one corridor as a single JSON blueprint.',
    'Output ONLY a JSON object — no prose, no markdown fences — with exactly these fields:',
    '  blueprint: kebab-case id',
    '  title: short human title',
    '  summary: one sentence',
    '  trigger: { "type": "webhook"|"schedule"|"manual", ... } (schedule needs a 5-field "cron")',
    '  agents: [ { "name": kebab, "callsign": UPPER, "role": one line, "model": "claude-haiku-4-5"|"claude-sonnet-5"|"claude-opus-4-8", "tools": ["domain.verb", ...] } ]',
    '  gates: { "*": "auto"|"log"|"verify"|"approve", "<tool>": level }  — one entry per tool that needs a non-default gate',
    '  connectors: [ names of external systems ]',
    '  metrics: { "baseline": [ { "key": snake, "unit": string, "direction": "up"|"down" } ] }',
    '  rollback: one sentence describing how to turn the corridor off',
    'HARD RULES: anything brand-visible or irreversible (send/publish/merge/post/pay/delete) MUST be gated "approve" or "verify". Every tool named in "gates" must be used by some agent. gates MUST include a "*" default. Use 2–4 focused agents.',
    catalog.tools?.length ? `Known tools you may reuse (prefer these): ${catalog.tools.join(', ')}.` : '',
    `Suggested callsigns: ${(catalog.callsigns || PANTHEON).join(', ')}.`,
  ].filter(Boolean).join('\n');
}

/** Pull the first balanced JSON object out of a model reply (tolerates prose or
 *  fences around it). Returns the parsed object or null. */
export function extractJson(text) {
  const s = String(text ?? '');
  const start = s.indexOf('{');
  if (start < 0) return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (inStr) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === '"') inStr = false; continue; }
    if (ch === '"') inStr = true;
    else if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) { try { return JSON.parse(s.slice(start, i + 1)); } catch { return null; } } }
  }
  return null;
}

/** Design a corridor. Returns { ok, blueprint, errors, attempts }. A design is
 *  accepted only if it passes validateBlueprint; otherwise it is repaired (up to
 *  maxRepairs) against its own validation errors, then given up on cleanly. */
export async function composeBlueprint({ adapter, description, catalog = {}, model, maxRepairs = 1, signal }) {
  const messages = [{ role: 'user', content: `Business workflow to design a corridor for:\n${description}` }];
  let attempts = 0, errors = ['no output'];
  while (attempts <= maxRepairs) {
    attempts++;
    const res = await adapter.complete({ model, system: composerSystem(catalog), messages, tools: [], signal });
    const parsed = extractJson(res.text);
    if (!parsed) {
      errors = ['output was not parseable JSON'];
      messages.push({ role: 'assistant', content: res.text || '' }, { role: 'user', content: 'That was not valid JSON. Return ONLY a single JSON blueprint object.' });
      continue;
    }
    const errs = validateBlueprint(parsed);
    if (!errs.length) return { ok: true, blueprint: parsed, errors: [], attempts };
    errors = errs;
    messages.push(
      { role: 'assistant', content: res.text || '' },
      { role: 'user', content: `That blueprint failed validation:\n- ${errs.join('\n- ')}\nReturn a corrected JSON blueprint that fixes every issue.` },
    );
  }
  return { ok: false, blueprint: null, errors, attempts };
}

/** Build a catalog of reusable tools + callsigns from existing blueprints. */
export function composerCatalog(blueprints) {
  const tools = new Set();
  for (const bp of (blueprints instanceof Map ? blueprints.values() : blueprints || [])) {
    for (const a of bp.agents || []) for (const t of a.tools || []) tools.add(t);
    for (const s of bp.pipeline || []) if (s.script) tools.add(s.script);
  }
  return { tools: [...tools].sort(), callsigns: PANTHEON };
}
