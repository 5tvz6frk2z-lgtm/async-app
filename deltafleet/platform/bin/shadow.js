#!/usr/bin/env node
// Shadow Eval CLI — grade a corridor against known-good scenarios BEFORE it
// touches production, and print a readiness report.
//
//   node bin/shadow.js <corridor-id> <scenarios.json> [--profile p.json] [--json]
//
// Nothing is written to any real system: every scenario runs against a fresh
// in-memory ledger with approve-gates downgraded in the sandbox (see lib/shadow.js).
// Exit code is 0 when the corridor is ready/gated-ready, 1 otherwise — so a CI
// step can refuse to promote a corridor that regressed.
//
// Model access: infer steps use AnthropicAdapter when ANTHROPIC_API_KEY is set;
// otherwise a deterministic stub narrator runs so pure-script checks still grade
// (its output is clearly a stub and should not be trusted for model-graded cases).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadBlueprintDir } from '../lib/blueprint.js';
import { demoScriptRegistry, assertScriptsCovered } from '../lib/scripts.js';
import { AnthropicAdapter } from '../lib/runtime.js';
import { shadowEval, renderReadiness } from '../lib/shadow.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const flag = (name) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true) : null; };
const positional = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--') && typeof flag(argv[i - 1].slice(2)) === 'string'));

const [corridorId, scenariosPath] = positional;
if (!corridorId || !scenariosPath) {
  console.error('usage: node bin/shadow.js <corridor-id> <scenarios.json> [--profile p.json] [--json]');
  process.exit(2);
}

const blueprints = loadBlueprintDir(path.join(here, '..', 'blueprints'));
const bp = blueprints.get(corridorId);
if (!bp) { console.error(`unknown corridor "${corridorId}". Known: ${[...blueprints.keys()].join(', ')}`); process.exit(2); }

const scenarios = JSON.parse(fs.readFileSync(scenariosPath, 'utf8'));
if (!Array.isArray(scenarios)) { console.error('scenarios file must be a JSON array of {id, trigger, groundTruth, note?}'); process.exit(2); }

const profilePath = flag('profile');
const profile = typeof profilePath === 'string' ? JSON.parse(fs.readFileSync(profilePath, 'utf8')) : {};

const scripts = demoScriptRegistry();
assertScriptsCovered(blueprints, scripts);

// Deterministic stub narrator when no key is present — lets script-graded
// scenarios run offline. Real readiness on model output needs a real key.
const stubAdapter = { complete: async ({ messages }) => ({
  text: `[stub narrator — set ANTHROPIC_API_KEY for real model grading] ${(messages?.[0]?.content || '').slice(0, 120)}`,
  usage: { in: 0, out: 0 },
}) };
const adapter = process.env.ANTHROPIC_API_KEY ? new AnthropicAdapter({}) : stubAdapter;
if (!process.env.ANTHROPIC_API_KEY) console.error('[shadow] no ANTHROPIC_API_KEY — infer steps use a stub narrator; script-graded checks are still real.\n');

const { report } = await shadowEval(bp, scenarios, { blueprints, scripts, adapter, profile });

if (flag('json')) console.log(JSON.stringify(report, null, 2));
else console.log(renderReadiness(report));

process.exit(report.verdict === 'ready' || report.verdict === 'gated-ready' ? 0 : 1);
