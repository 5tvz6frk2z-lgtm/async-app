import test from 'node:test';
import assert from 'node:assert/strict';
import { deliver, slackBody, alertText, redact } from '../lib/notify.js';

const ALERTS = [
  { severity: 'critical', monitor: 'agent-ready', target: 'https://acme.com', message: 'score fell 20 points' },
  { severity: 'warning', monitor: 'agent-ready', target: 'https://acme.com', message: 'structured data disappeared' },
];

// A fake fetch that records calls and returns a chosen result.
function fakeFetch(behavior = () => ({ ok: true, status: 200 })) {
  const calls = [];
  const fn = async (url, opts) => { calls.push({ url, opts }); return behavior(url, opts); };
  return { fn, calls };
}

test('alertText renders severity, scope and message', () => {
  assert.equal(alertText(ALERTS[0]), '[CRITICAL] agent-ready · https://acme.com — score fell 20 points');
  assert.equal(alertText({ message: 'bare' }), '[INFO] bare');
});

test('slackBody batches alerts into one text payload with a header', () => {
  const b = slackBody(ALERTS);
  assert.match(b.text, /2 alerts/);
  assert.match(b.text, /• \[CRITICAL\]/);
  assert.match(b.text, /• \[WARNING\]/);
  assert.equal(slackBody([ALERTS[0]]).text.split('\n')[0], 'Fleet Deck: 1 alert');
});

test('redact hides the secret path but keeps the host', () => {
  assert.equal(redact('https://hooks.slack.com/services/T00/B00/XXXsecretXXX'), 'https://hooks.slack.com/…');
  assert.equal(redact('not a url'), 'webhook');
});

test('deliver posts to slack and webhook channels', async () => {
  const { fn, calls } = fakeFetch();
  const r = await deliver(ALERTS, { slack: 'https://hooks.slack.com/x', webhook: 'https://api.acme.com/hook', title: 'T' }, { fetchImpl: fn });
  assert.equal(r.delivered, 2);
  assert.equal(calls.length, 2);
  // slack gets { text }, webhook gets { alerts }
  const slackCall = calls.find((c) => c.url.includes('slack'));
  assert.ok(JSON.parse(slackCall.opts.body).text);
  const webhookCall = calls.find((c) => c.url.includes('acme'));
  assert.equal(JSON.parse(webhookCall.opts.body).alerts.length, 2);
  // logs are redacted
  assert.ok(r.results.every((x) => x.url.endsWith('/…')));
});

test('empty alert list delivers nothing (no spam)', async () => {
  const { fn, calls } = fakeFetch();
  const r = await deliver([], { slack: 'https://hooks.slack.com/x' }, { fetchImpl: fn });
  assert.equal(r.delivered, 0);
  assert.equal(calls.length, 0);
});

test('no channels configured is a clean no-op', async () => {
  const { fn, calls } = fakeFetch();
  const r = await deliver(ALERTS, {}, { fetchImpl: fn });
  assert.equal(r.delivered, 0);
  assert.equal(calls.length, 0);
});

test('a channel failure is reported, not thrown, and does not sink the other', async () => {
  const { fn } = fakeFetch((url) => { if (url.includes('slack')) throw new Error('ECONNREFUSED'); return { ok: true, status: 200 }; });
  const r = await deliver(ALERTS, { slack: 'https://hooks.slack.com/x', webhook: 'https://api.acme.com/hook' }, { fetchImpl: fn });
  assert.equal(r.delivered, 1, 'the webhook still delivered');
  const slack = r.results.find((x) => x.channel === 'slack');
  assert.equal(slack.ok, false);
  assert.match(slack.error, /ECONNREFUSED/);
});

test('a non-2xx response is recorded as not-ok', async () => {
  const { fn } = fakeFetch(() => ({ ok: false, status: 500 }));
  const r = await deliver(ALERTS, { webhook: 'https://api.acme.com/hook' }, { fetchImpl: fn });
  assert.equal(r.delivered, 0);
  assert.equal(r.results[0].status, 500);
});
