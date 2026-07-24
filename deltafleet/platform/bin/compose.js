#!/usr/bin/env node
// Squadron Composer CLI — design a corridor from a plain-language description.
//
//   node bin/compose.js "when a lead lands, research them and send a first touch" [--save]
//
// Requires ANTHROPIC_API_KEY (the Composer is a model). The output is only
// printed (or saved) if it PASSES the blueprint schema; otherwise the validation
// errors are shown and the process exits non-zero. --save writes the validated
// blueprint to blueprints/<id>.json.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadBlueprintDir } from '../lib/blueprint.js';
import { AnthropicAdapter } from '../lib/runtime.js';
import { composeBlueprint, composerCatalog } from '../lib/composer.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const save = argv.includes('--save');
const description = argv.filter((a) => !a.startsWith('--')).join(' ').trim();
if (!description) { console.error('usage: node bin/compose.js "<workflow description>" [--save]'); process.exit(2); }
if (!process.env.ANTHROPIC_API_KEY) { console.error('the Composer needs ANTHROPIC_API_KEY set.'); process.exit(2); }

const bpDir = path.join(here, '..', 'blueprints');
const catalog = composerCatalog(loadBlueprintDir(bpDir));
const adapter = new AnthropicAdapter({});

const result = await composeBlueprint({ adapter, description, catalog });
if (!result.ok) {
  console.error(`composition failed after ${result.attempts} attempt(s):\n  - ${result.errors.join('\n  - ')}`);
  process.exit(1);
}
console.log(JSON.stringify(result.blueprint, null, 2));
if (save) {
  const file = path.join(bpDir, `${result.blueprint.blueprint}.json`);
  if (fs.existsSync(file)) { console.error(`\nrefusing to overwrite existing ${file}`); process.exit(1); }
  fs.writeFileSync(file, JSON.stringify(result.blueprint, null, 2) + '\n');
  console.error(`\nsaved → ${file} (validated). Review it, then wire connectors and gates before running.`);
}
