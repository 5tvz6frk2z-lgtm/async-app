import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Ledger } from '../lib/ledger.js';
import { GateEngine } from '../lib/gates.js';
import { MemoryEngine } from '../lib/memory.js';
import { loadPackDir, packContext, validatePack } from '../lib/packs.js';
import { loadBlueprintDir } from '../lib/blueprint.js';
import { AgentRun, ToolRegistry } from '../lib/runtime.js';
import { PipelineRun } from '../lib/pipeline.js';
import { demoScriptRegistry } from '../lib/scripts.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const BP_DIR = path.join(here, '..', 'blueprints');
const PACK_DIR = path.join(here, '..', 'packs');

/* ---------------- memory core ---------------- */

test('memory: add, dedupe-as-confirm, retire, scoped retrieval ranking', () => {
  const led = new Ledger(null);
  const mem = new MemoryEngine(led);
  mem.add({ kind: 'rule', text: 'Dana approves anything involving money.', scope: 'client' });
  mem.add({ kind: 'pattern', text: 'Afternoon threads go unanswered.', scope: 'daily-brief', source: { type: 'observation' } });
  mem.add({ kind: 'preference', text: 'Numbers first, no exclamation marks.', scope: 'daily-brief' });
  // duplicate text confirms instead of duplicating
  const dup = mem.add({ kind: 'rule', text: 'Dana approves anything involving money.', scope: 'client' });
  assert.equal(dup.confirms, 2);
  assert.equal(mem.active().length, 3);

  const got = mem.retrieve({ blueprint: 'daily-brief' });
  assert.equal(got.length, 3); // client-wide + both daily-brief
  assert.equal(got[0].kind, 'rule', 'rules rank first');
  assert.equal(got[got.length - 1].kind, 'pattern', 'patterns rank last');
  // other corridor sees only client-wide
  assert.equal(mem.retrieve({ blueprint: 'speed-to-lead' }).length, 1);

  mem.retire(got[0].id, { by: 'kv', reason: 'no longer true' });
  assert.equal(mem.active().length, 2);
  assert.throws(() => mem.retire(got[0].id), /already retired/);
});

test('memory: char budget truncates, contextBlock renders instructions header', () => {
  const led = new Ledger(null);
  const mem = new MemoryEngine(led);
  for (let i = 0; i < 30; i++) mem.add({ kind: 'fact', text: `Fact number ${i} about the client business. `.repeat(3), scope: 'client' });
  const got = mem.retrieve({ blueprint: 'x', charBudget: 500 });
  assert.ok(got.length < 30 && got.length > 0);
  const block = mem.contextBlock({ blueprint: 'x' });
  assert.ok(block.startsWith('Client memory ('));
  assert.equal(new MemoryEngine(new Ledger(null)).contextBlock({ blueprint: 'x' }), '');
});

test('memory: survives restart via ledger replay', () => {
  const file = path.join(os.tmpdir(), `mem-${Date.now()}.jsonl`);
  {
    const led = new Ledger(file);
    const mem = new MemoryEngine(led);
    mem.add({ kind: 'rule', text: 'Quiet hours before 7am.', scope: 'client' });
    mem.add({ kind: 'fact', text: 'Corvid is a vendor.', scope: 'client' });
    mem.retire(mem.active().find((m) => m.text.includes('Corvid')).id, { by: 'kv' });
  }
  const led2 = new Ledger(file);
  const mem2 = new MemoryEngine(led2);
  assert.equal(mem2.active().length, 1);
  assert.equal(mem2.active()[0].text, 'Quiet hours before 7am.');
  fs.unlinkSync(file);
});

/* ---------------- the flywheel ---------------- */

test('corrections become memory: edits create preferences, repeats confirm, reasons become rules', async () => {
  const bps = loadBlueprintDir(BP_DIR);
  const led = new Ledger(null);
  const gates = new GateEngine(led, bps);
  const mem = new MemoryEngine(led).enableCorrectionCapture();

  for (let i = 0; i < 2; i++) {
    const run = `r${i}`;
    led.append({ type: 'run.start', run, blueprint: 'speed-to-lead', agent: 'first-responder', callsign: 'HERMOD', trigger: {} });
    const { action, promise } = gates.request(run, 'speed-to-lead', 'email.send', { to: 'a@b.c', body: `Hey there!! Draft ${i}` });
    gates.verdict(action, { verdict: 'edited', by: 'kv', editedInput: { to: 'a@b.c', body: `Hello — draft ${i}, numbers first.` } });
    await promise;
  }
  const prefs = mem.active('speed-to-lead').filter((m) => m.kind === 'preference');
  assert.equal(prefs.length, 1, 'same-field edits confirm one memory, not two');
  assert.equal(prefs[0].confirms, 2);
  assert.ok(prefs[0].confidence > 0.55, 'confidence grows with repetition');
  assert.equal(prefs[0].source.type, 'correction');

  led.append({ type: 'run.start', run: 'r9', blueprint: 'speed-to-lead', agent: 'first-responder', callsign: 'HERMOD', trigger: {} });
  const { action } = gates.request('r9', 'speed-to-lead', 'email.send', { body: 'x' });
  gates.verdict(action, { verdict: 'rejected', by: 'kv', reason: 'off-brand tone' });
  const rules = mem.active('speed-to-lead').filter((m) => m.kind === 'rule');
  assert.equal(rules.length, 1);
  assert.ok(rules[0].text.includes('off-brand tone'));
});

/* ---------------- forgetting ---------------- */

test('consolidation decays stale patterns and enforces scope caps', () => {
  const led = new Ledger(null);
  const mem = new MemoryEngine(led, { maxPerScope: 5, decayAfterDays: 30, retireBelow: 0.3, decayStep: 0.2 });
  const old = mem.add({ kind: 'pattern', text: 'Old observed pattern.', scope: 'client', source: { type: 'observation' }, confidence: 0.4 });
  // backdate via direct update event (simulating age)
  led.append({ type: 'memory.update', id: old.id, patch: {} });
  mem.mems.get(old.id).updated = new Date(Date.now() - 60 * 86400_000).toISOString();
  const rule = mem.add({ kind: 'rule', text: 'Fresh rule.', scope: 'client' });
  const r1 = mem.consolidate();
  assert.equal(r1.retired, 1, 'stale pattern below floor retires');
  assert.equal(mem.active().find((m) => m.id === rule.id).status, 'active', 'rules never decay');

  for (let i = 0; i < 8; i++) mem.add({ kind: 'fact', text: `Cap fact ${i}`, scope: 'client' });
  const r2 = mem.consolidate();
  assert.ok(r2.retired >= 4, 'scope cap enforced');
  assert.ok(mem.active('client').length <= 5);
});

/* ---------------- packs ---------------- */

test('all packs load and validate; context renders terminology, compliance, corridor hints', () => {
  const packs = loadPackDir(PACK_DIR);
  assert.ok(packs.size >= 6);
  for (const id of ['generic', 'professional-services', 'ecommerce', 'saas', 'healthcare', 'home-services']) {
    assert.ok(packs.has(id), `missing pack ${id}`);
  }
  const lines = packContext(packs.get('healthcare'), 'daily-brief').join('\n');
  assert.ok(lines.includes('COMPLIANCE'));
  assert.ok(lines.includes('PHI'));
  assert.ok(lines.includes('Counts and categories only'));
  const ps = packContext(packs.get('professional-services'), 'speed-to-lead').join('\n');
  assert.ok(ps.includes('"inquiry" (not "lead")'));
  assert.ok(validatePack({}).length > 0);
});

/* ---------------- cascade injection ---------------- */

test('AgentRun and PipelineRun inject pack + memory context into system prompts', async () => {
  const bps = loadBlueprintDir(BP_DIR);
  const led = new Ledger(null);
  const gates = new GateEngine(led, bps);
  const mem = new MemoryEngine(led);
  mem.add({ kind: 'rule', text: 'Referrals get thanked by name.', scope: 'client' });
  const packs = loadPackDir(PACK_DIR);
  const context = [...packContext(packs.get('professional-services'), 'speed-to-lead'), mem.contextBlock({ blueprint: 'speed-to-lead' })];

  let sys;
  const adapter = { complete: async (a) => { sys = a.system; return { text: 'done', toolCalls: [], usage: { in: 1, out: 1 } }; } };
  const reg = new ToolRegistry();
  for (const t of ['crm.read', 'crm.update', 'web.lookup', 'email.draft', 'email.send', 'calendar.read', 'calendar.book']) {
    reg.register(t, { handler: async () => ({}) });
  }
  await new AgentRun({ blueprint: bps.get('speed-to-lead'), agentName: 'qualifier', ledger: led, gates, adapter, tools: reg, context }).run({});
  assert.ok(sys.includes('Professional Services'));
  assert.ok(sys.includes('Referrals get thanked by name'));
  assert.ok(sys.includes('[RULE]'));

  let sys2;
  const adapter2 = { complete: async (a) => { sys2 = a.system; return { text: 'brief', usage: { in: 1, out: 1 } }; } };
  const dbCtx = [mem.contextBlock({ blueprint: 'daily-brief' })].filter(Boolean);
  await new PipelineRun({ blueprint: bps.get('daily-brief'), ledger: led, gates, scripts: demoScriptRegistry(), adapter: adapter2, profile: { brand: 'X' }, context: dbCtx }).run({});
  assert.ok(sys2.includes('Referrals get thanked by name'), 'client-wide memory reaches pipeline infer steps');
});
