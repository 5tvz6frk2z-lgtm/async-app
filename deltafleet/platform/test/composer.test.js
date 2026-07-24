import test from 'node:test';
import assert from 'node:assert/strict';
import { validateBlueprint } from '../lib/blueprint.js';
import { composerSystem, extractJson, composeBlueprint, composerCatalog, PANTHEON } from '../lib/composer.js';

const validBp = {
  blueprint: 'speed-to-lead-composed', title: 'Speed to Lead', summary: 'Respond to inbound leads fast.',
  trigger: { type: 'webhook' },
  agents: [
    { name: 'responder', callsign: 'HERMOD', role: 'Draft and send first touch', model: 'claude-haiku-4-5', tools: ['crm.read', 'email.send'] },
  ],
  gates: { '*': 'log', 'email.send': 'approve' },
  connectors: ['crm', 'email'],
  metrics: { baseline: [{ key: 'first_response_min', unit: 'minutes', direction: 'down' }] },
  rollback: 'Disable the webhook; leads route to the manual queue.',
};

test('composerSystem states the fields, the gating rule, and callsigns', () => {
  const s = composerSystem({ tools: ['crm.read', 'email.send'] });
  assert.match(s, /Output ONLY a JSON object/);
  assert.match(s, /MUST be gated "approve" or "verify"/);
  assert.match(s, /crm\.read, email\.send/);
  assert.match(s, new RegExp(PANTHEON[0]));
});

test('extractJson pulls a blueprint out of prose or fences', () => {
  assert.equal(extractJson('```json\n{"a":1}\n```').a, 1);
  assert.equal(extractJson('Here you go: {"a":{"b":2}} — enjoy').a.b, 2);
  assert.equal(extractJson('no json'), null);
  assert.equal(extractJson('{ broken '), null);
  // a brace inside a string must not end the object early
  assert.equal(extractJson('{"note":"a } brace","ok":true}').ok, true);
});

test('composeBlueprint accepts a valid design on the first try', async () => {
  const adapter = { complete: async () => ({ text: JSON.stringify(validBp), usage: { in: 100, out: 200 } }) };
  const r = await composeBlueprint({ adapter, description: 'respond to leads fast' });
  assert.equal(r.ok, true);
  assert.equal(r.attempts, 1);
  assert.deepEqual(validateBlueprint(r.blueprint), []);
});

test('composeBlueprint repairs an invalid design against its own errors', async () => {
  const broken = structuredClone(validBp);
  delete broken.rollback;          // fails validation
  delete broken.gates['email.send']; // and now send is only "log" — but validation only checks structure here
  let call = 0;
  const adapter = { complete: async ({ messages }) => {
    call++;
    // second call should have received the validation errors as feedback
    if (call === 2) assert.match(messages[messages.length - 1].content, /failed validation/);
    return { text: JSON.stringify(call === 1 ? broken : validBp), usage: { in: 50, out: 80 } };
  } };
  const r = await composeBlueprint({ adapter, description: 'x', maxRepairs: 1 });
  assert.equal(r.ok, true);
  assert.equal(r.attempts, 2, 'one repair round');
});

test('composeBlueprint gives up cleanly (never returns a broken blueprint)', async () => {
  const broken = structuredClone(validBp); delete broken.rollback;
  const adapter = { complete: async () => ({ text: JSON.stringify(broken), usage: { in: 10, out: 10 } }) };
  const r = await composeBlueprint({ adapter, description: 'x', maxRepairs: 1 });
  assert.equal(r.ok, false);
  assert.equal(r.blueprint, null);
  assert.ok(r.errors.some((e) => /rollback/.test(e)));
  assert.equal(r.attempts, 2);
});

test('non-JSON output is handled and retried', async () => {
  let call = 0;
  const adapter = { complete: async () => { call++; return { text: call === 1 ? 'I think we should...' : JSON.stringify(validBp), usage: { in: 5, out: 5 } }; } };
  const r = await composeBlueprint({ adapter, description: 'x', maxRepairs: 1 });
  assert.equal(r.ok, true);
});

test('composerCatalog harvests reusable tools + callsigns from existing blueprints', () => {
  const bps = new Map([['a', { agents: [{ tools: ['crm.read', 'email.send'] }], pipeline: [{ script: 'compute.brief' }] }]]);
  const cat = composerCatalog(bps);
  assert.deepEqual(cat.tools, ['compute.brief', 'crm.read', 'email.send']);
  assert.equal(cat.callsigns, PANTHEON);
});
