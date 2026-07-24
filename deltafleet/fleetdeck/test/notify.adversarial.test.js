// Adversarial tests for Notify (alert delivery via injectable fetch).
//
// Convention (mirrors spine.adversarial.test.js): a test named `BUG:` asserts the
// CORRECT behavior and is written to FAIL against the current code, so each real
// defect is visible when the suite runs. Tests without that prefix confirm behavior
// that is actually correct, or document a known non-code hazard.
//
// Never hits the network — every test injects a fake fetchImpl.
import test from 'node:test';
import assert from 'node:assert/strict';
import { deliver, slackBody, alertText, redact } from '../lib/notify.js';

const ALERTS = [
  { severity: 'critical', monitor: 'agent-ready', target: 'https://acme.com', message: 'score fell 20 points' },
  { severity: 'warning', monitor: 'agent-ready', target: 'https://acme.com', message: 'structured data disappeared' },
];

function fakeFetch(behavior = () => ({ ok: true, status: 200 })) {
  const calls = [];
  const fn = async (url, opts) => { calls.push({ url, opts }); return behavior(url, opts); };
  return { fn, calls };
}

// ---------------------------------------------------------------------------
// redact() — must never leak the secret part of a webhook URL.
// ---------------------------------------------------------------------------

test('redact never leaks a secret in userinfo / query / fragment / non-std scheme', () => {
  // userinfo `user:SECRET@host` — the password must be dropped (u.host excludes it).
  assert.equal(redact('https://user:SECRET@host/x'), 'https://host/…');
  // a whole-userinfo token `SECRET@host`.
  assert.equal(redact('https://SECRET@hooks.example/x'), 'https://hooks.example/…');
  // query-string token — the path+query are dropped.
  assert.equal(redact('https://host/services/T0/B0/XXX?token=SECRET'), 'https://host/…');
  // fragment secret.
  assert.equal(redact('https://host/p#SECRET'), 'https://host/…');
  // non-standard scheme with userinfo.
  assert.equal(redact('ftp://u:SECRET@host/p'), 'ftp://host/…');
  // none of the redactions may contain the literal secret.
  for (const u of ['https://user:SECRET@host/x', 'https://host/?token=SECRET', 'https://host/p#SECRET'])
    assert.ok(!redact(u).includes('SECRET'), `redact leaked secret for ${u}`);
  // a non-URL degrades to a constant, never echoing input.
  assert.equal(redact('not a url'), 'webhook');
  // port is kept (not a secret) — host includes it.
  assert.equal(redact('https://host:8443/x?k=SECRET'), 'https://host:8443/…');
});

// ---------------------------------------------------------------------------
// Payload injection — the alert message is attacker-influenced text.
// ---------------------------------------------------------------------------

test('a hostile alert message cannot corrupt the JSON payload (it is JSON.stringify\'d)', async () => {
  const { fn, calls } = fakeFetch();
  const evil = {
    severity: 'critical', monitor: 'm', target: 't',
    message: 'line1\nline2 "quote" `tick` \\backslash </script> \u0000  {"x":1}',
  };
  const r = await deliver([evil], { slack: 'https://hooks.slack.com/x', webhook: 'https://api/x' }, { fetchImpl: fn });
  assert.equal(r.delivered, 2);
  // Both bodies must round-trip as valid JSON (proves no structural corruption).
  for (const c of calls) {
    const parsed = JSON.parse(c.opts.body); // throws if the payload was corrupted
    assert.ok(parsed);
  }
  const slack = JSON.parse(calls.find((c) => c.url.includes('slack')).opts.body);
  // The message survives verbatim as DATA inside the text field.
  assert.ok(slack.text.includes('line1\nline2 "quote"'));
});

test('NUISANCE (not a code bug): Slack control mentions pass through verbatim and would ping a channel', async () => {
  // deliver does NOT neutralize Slack mention syntax. A hostile message containing
  // `<!channel>` / `@channel` is JSON-safe but, once rendered by Slack, pings every
  // member. This is a real abuse vector even though the JSON encoding is correct —
  // callers must sanitize mentions, deliver won't. Documented, not asserted-as-fixed.
  const { fn, calls } = fakeFetch();
  await deliver([{ severity: 'info', message: 'ping <!channel> @here' }], { slack: 'https://hooks.slack.com/x' }, { fetchImpl: fn });
  const slack = JSON.parse(calls[0].opts.body);
  assert.ok(slack.text.includes('<!channel>'), 'mention passes through unescaped — caller must sanitize');
});

// ---------------------------------------------------------------------------
// "Never throws" — a channel/transport hiccup is reported, not propagated.
// ---------------------------------------------------------------------------

test('deliver returns cleanly for a fetchImpl that returns null / a number / an object without .ok', async () => {
  for (const bad of [null, undefined, 42, 'nope', {}]) {
    const r = await deliver(ALERTS, { webhook: 'https://api/x' }, { fetchImpl: async () => bad });
    assert.equal(r.delivered, 0, `bad result ${String(bad)} -> not delivered`);
    assert.equal(r.results.length, 1);
    assert.equal(r.results[0].ok, false);
    // url is still redacted even on the failure path.
    assert.ok(r.results[0].url.endsWith('/…'));
  }
});

test('deliver catches a SYNCHRONOUS throw from fetchImpl (not just a rejected promise)', async () => {
  const fetchImpl = () => { throw new Error('sync boom'); }; // throws before returning a promise
  let r;
  await assert.doesNotReject(async () => { r = await deliver(ALERTS, { webhook: 'https://api/x' }, { fetchImpl }); });
  assert.equal(r.delivered, 0);
  assert.match(r.results[0].error, /sync boom/);
});

test('delivered always equals the count of ok results (mixed success/failure)', async () => {
  const fn = async (url) => (url.includes('slack') ? { ok: true, status: 200 } : { ok: false, status: 500 });
  const r = await deliver(ALERTS, { slack: 'https://hooks.slack.com/x', webhook: 'https://api/x' }, { fetchImpl: fn });
  assert.equal(r.delivered, r.results.filter((x) => x.ok).length);
  assert.equal(r.delivered, 1);
});

// ---------------------------------------------------------------------------
// Timeout / abort — the AbortController timer must fire and always be cleared.
// ---------------------------------------------------------------------------

test('a fetch that never resolves is aborted at timeoutMs and the rejection is caught', async () => {
  // The fake honours the injected signal, resolving only when the timeout aborts it.
  const fetchImpl = (url, opts) => new Promise((_res, reject) => {
    opts.signal.addEventListener('abort', () => reject(new Error('The operation was aborted')));
  });
  let r;
  await assert.doesNotReject(async () => { r = await deliver(ALERTS, { webhook: 'https://api/x' }, { fetchImpl, timeoutMs: 10 }); });
  assert.equal(r.delivered, 0);
  assert.match(r.results[0].error, /abort/i, 'the abort surfaced as a caught error');
  // Node would flag an unhandled rejection / open handle if the timer leaked; a clean
  // exit of the process (which node --test asserts) is the corroborating signal.
});

// ---------------------------------------------------------------------------
// BUG: the "never throws" contract is broken during payload construction.
// ---------------------------------------------------------------------------

test('FIXED: deliver throws (not reports) when Slack payload construction hits a malformed alert', async () => {
  // slackBody(alerts) is called at line 38 — BEFORE the per-target try/catch. It maps
  // alertText over every alert, and alertText does `a.severity` with no guard, so a
  // null/undefined element in the alerts array throws synchronously and the whole
  // deliver() rejects — violating the documented "Never throws" contract. (A malformed
  // payload hit during the webhook path's JSON.stringify, which IS inside the try, is
  // reported cleanly; only the pre-loop slackBody build escapes it. Note: the intended
  // caller never passes a null alert, so this is a robustness gap, not a live outage.)
  const { fn } = fakeFetch();
  await assert.doesNotReject(
    () => deliver([null], { slack: 'https://hooks.slack.com/x' }, { fetchImpl: fn }),
    'a malformed alert must be reported, not propagated',
  );
});
