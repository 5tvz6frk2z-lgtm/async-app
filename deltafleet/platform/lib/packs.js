// Industry Packs — layer 2 of the specialization cascade:
//   Blueprint (generic) → PACK (industry defaults) → Profile (this client) → Memory (learned)
// A pack makes a corridor speak the industry's language and respect its rules
// on day one, before any client-specific tuning. Packs are data, not code —
// adding an industry is a JSON file, not a fork of the agent roster.
import fs from 'node:fs';
import path from 'node:path';

export function validatePack(p) {
  const errs = [];
  if (!p.pack || !/^[a-z0-9-]+$/.test(p.pack)) errs.push('pack id must be kebab-case');
  if (!p.title) errs.push('title required');
  for (const k of ['terminology', 'corridorHints']) {
    if (p[k] !== undefined && (typeof p[k] !== 'object' || Array.isArray(p[k]))) errs.push(`${k} must be an object`);
  }
  for (const k of ['standingRules', 'urgency', 'compliance']) {
    if (p[k] !== undefined && !Array.isArray(p[k])) errs.push(`${k} must be an array`);
  }
  return errs;
}

export function loadPackDir(dir) {
  const out = new Map();
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
    const p = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    const errs = validatePack(p);
    if (errs.length) throw new Error(`invalid pack ${f}: ${errs.join('; ')}`);
    out.set(p.pack, p);
  }
  if (!out.has('generic')) throw new Error('packs dir must include generic.json');
  return out;
}

/** Prompt lines a pack contributes to a run in a given corridor. */
export function packContext(pack, blueprintId) {
  if (!pack) return [];
  const lines = [`Industry context (${pack.title}):`];
  const term = Object.entries(pack.terminology || {});
  if (term.length) lines.push(`- Terminology: ${term.map(([k, v]) => `"${v}" (not "${k}")`).join(', ')}.`);
  for (const r of pack.standingRules || []) lines.push(`- ${r}`);
  if ((pack.urgency || []).length) lines.push(`- Treat as urgent: ${pack.urgency.join('; ')}.`);
  for (const c of pack.compliance || []) lines.push(`- COMPLIANCE: ${c}`);
  const hint = (pack.corridorHints || {})[blueprintId];
  if (hint) lines.push(`- This corridor: ${hint}`);
  return lines.length > 1 ? lines : [];
}
