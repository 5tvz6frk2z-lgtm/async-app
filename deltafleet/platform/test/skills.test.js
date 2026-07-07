import test from 'node:test';
import assert from 'node:assert/strict';
import { Skill, SkillRegistry, starterSkillRegistry } from '../lib/skills.js';
import { Ledger } from '../lib/ledger.js';
import { GateEngine } from '../lib/gates.js';
import { PipelineRun } from '../lib/pipeline.js';
import { ScriptRegistry } from '../lib/scripts.js';

test('Skill validates name and description; matches by trigger or predicate', () => {
  assert.throws(() => new Skill({ name: 'Bad Name', description: 'x' }), /kebab-case/);
  assert.throws(() => new Skill({ name: 'ok', description: '' }), /description/);
  const s = new Skill({ name: 'emailer', description: 'writes email', triggers: ['email', 'reply'] });
  assert.equal(s.matches({ task: 'draft an EMAIL reply' }), true);
  assert.equal(s.matches({ task: 'reconcile invoice' }), false);
  const p = new Skill({ name: 'pred', description: 'x', match: (c) => c.urgent === true });
  assert.equal(p.matches({ urgent: true }), true);
  assert.equal(p.matches({ urgent: false }), false);
});

test('validate: missing validator passes; failing validator reports; throw fails closed', () => {
  assert.deepEqual(new Skill({ name: 'g', description: 'guidance only' }).validate('anything'), { ok: true });
  const s = new Skill({ name: 'v', description: 'x', validator: (o) => (o === 'good' ? { ok: true } : { ok: false, error: 'not good' }) });
  assert.equal(s.validate('good').ok, true);
  assert.equal(s.validate('bad').ok, false);
  assert.equal(s.validate('bad').error, 'not good');
  const boom = new Skill({ name: 'b', description: 'x', validator: () => { throw new Error('kaboom'); } });
  const r = boom.validate('x');
  assert.equal(r.ok, false);
  assert.match(r.error, /kaboom/);
});

test('progressive disclosure: catalog always shown, full guidance only for matched skills', () => {
  const reg = starterSkillRegistry();
  const lines = reg.contextLines({ task: 'draft a follow-up email to the lead' }).join('\n');
  // catalog: every skill's one-line description is present
  assert.match(lines, /brand-voice-email: Write a customer email/);
  assert.match(lines, /invoice-reconciliation: Reconcile an invoice/);
  // full guidance loaded ONLY for the matching skill
  assert.match(lines, /Skill loaded — brand-voice-email/);
  assert.doesNotMatch(lines, /Skill loaded — invoice-reconciliation/);
  // and select() names just the matches
  assert.deepEqual(reg.select({ task: 'draft a follow-up email' }).map((s) => s.name), ['brand-voice-email']);
});

test('starter validators enforce real, deterministic rules', () => {
  const reg = starterSkillRegistry();
  assert.equal(reg.get('brand-voice-email').validate('Hi Dana — following up on Tuesday. Two options below.').ok, true);
  assert.equal(reg.get('brand-voice-email').validate('BUY NOW!!! guaranteed results').ok, false);
  assert.equal(reg.get('invoice-reconciliation').validate({ variance: 12.5 }).ok, true);
  assert.equal(reg.get('invoice-reconciliation').validate({ note: 'looks fine' }).ok, false);
  assert.equal(reg.get('meeting-scheduling').validate('Two options: Tue 10:00 or Wed 09:00 (ET).').ok, true);
  assert.equal(reg.get('meeting-scheduling').validate('sometime next week works').ok, false);
  assert.equal(reg.get('exec-summary').validate('CPL down 11% WoW; no-shows doubled — needs a play.').ok, true);
  assert.equal(reg.get('exec-summary').validate('Things went well this week overall.').ok, false);
});

// Pipeline integration: a skill-governed infer step loads guidance and enforces
// its validator, retrying once on a bad draft and failing hard if it can't pass.
function pipelineBp() {
  return {
    blueprint: 'reply-corridor', title: 'Reply (skill-test)', trigger: { type: 'webhook' },
    agents: [{ name: 'writer', callsign: 'CALLIOPE', role: 'Draft the reply', tools: [], model: 'claude-haiku-4-5' }],
    pipeline: [{ infer: 'writer', task: 'reply to the customer', input: { q: '$trigger.q' }, save: 'reply', skill: 'brand-voice-email' }],
    gates: { '*': 'log' }, connectors: [], metrics: { baseline: [{ key: 'x', unit: 'n', direction: 'up' }] }, rollback: 'off',
  };
}

test('infer step with a skill: bad first draft is rejected, retry passes validation', async () => {
  const bp = pipelineBp();
  const ledger = new Ledger(null);
  const gates = new GateEngine(ledger, new Map([[bp.blueprint, bp]]));
  let call = 0;
  const adapter = { complete: async () => { call++; return { text: call === 1 ? 'ACT NOW!!! guaranteed savings' : 'Hi Dana — here are two options that fit.', usage: { in: 10, out: 5 } }; } };
  const run = new PipelineRun({ blueprint: bp, ledger, gates, scripts: new ScriptRegistry(), adapter, skills: starterSkillRegistry() });
  const res = await run.run({ q: 'help?' });
  assert.equal(res.status, 'done');
  assert.equal(call, 2, 'the bad draft forced exactly one retry');
  assert.match(res.results.reply, /two options/);
  // the guidance actually reached the model
});

test('infer step with a skill: a persistently invalid output fails the step', async () => {
  const bp = pipelineBp();
  const ledger = new Ledger(null);
  const gates = new GateEngine(ledger, new Map([[bp.blueprint, bp]]));
  const adapter = { complete: async () => ({ text: 'GUARANTEED!!! act now', usage: { in: 10, out: 5 } }) };
  const run = new PipelineRun({ blueprint: bp, ledger, gates, scripts: new ScriptRegistry(), adapter, skills: starterSkillRegistry() });
  const res = await run.run({ q: 'help?' });
  assert.equal(res.status, 'error');
});

test('a skill-governed infer step still passes blueprint validation; a bad skill name is caught', async () => {
  const { validateBlueprint } = await import('../lib/blueprint.js');
  assert.deepEqual(validateBlueprint(pipelineBp()), []);
  const bad = pipelineBp();
  bad.pipeline[0].skill = 'Not Kebab';
  assert.ok(validateBlueprint(bad).some((e) => /kebab-case skill name/.test(e)));
});
