// Notify — deliver alerts off the box. A monitoring subscription's promise is "we
// tell you the moment it slips," so a regression can't just sit on the spine and in
// the UI; it has to reach a human. This posts alerts to a webhook and/or a Slack
// incoming webhook via the global fetch — zero dependencies, and fully testable by
// injecting a fake fetch. Delivery separates cleanly from detection: the Monitor
// finds regressions, Notify ships them.
//
// The transport is intentionally dumb (fire a POST); retry/backoff and dedup belong
// to the caller (the CLI already only passes NEW alerts, so there's no re-spam).

/** A one-line human-readable rendering of an alert. */
export function alertText(a) {
  const sev = (a.severity || 'info').toUpperCase();
  const scope = [a.monitor, a.target].filter(Boolean).join(' · ');
  return `[${sev}] ${scope ? scope + ' — ' : ''}${a.message}`;
}

/** A Slack incoming-webhook payload ({ text }) for a batch of alerts. */
export function slackBody(alerts, { title } = {}) {
  const head = title || `Fleet Deck: ${alerts.length} alert${alerts.length === 1 ? '' : 's'}`;
  return { text: [head, ...alerts.map((a) => '• ' + alertText(a))].join('\n') };
}

// Show a webhook's host but not its secret path — delivery logs must not leak the URL.
export function redact(url) {
  try { const u = new URL(url); return `${u.protocol}//${u.host}/…`; } catch { return 'webhook'; }
}

// A Slack/webhook URL IS the secret, and transport errors embed it ("request to <url>
// failed…", "Failed to parse URL from <url>"). Scrub it out of an error message before it
// reaches the returned result (which the CLI logs) — covering BOTH the raw config string and
// the NORMALIZED forms a transport builds from the parsed URL (default :443 dropped, host
// case-folded), which are not byte-identical to the config.
function scrubError(e, url) {
  let msg = (e && e.message) || String(e);
  const hidden = redact(url);
  // 1) The raw config URL and its normalized href (covers a malformed URL the sweep can't match).
  const forms = new Set([url]);
  try { forms.add(new URL(url).href); } catch { /* malformed URL — raw form only */ }
  for (const f of forms) if (typeof f === 'string' && f) msg = msg.split(f).join(hidden);
  // 2) Redact the URL's PATH (where the Slack/webhook secret actually lives) wherever it
  //    appears — path is invariant under host/scheme/port normalization, so this scrubs the
  //    token even when the transport emits a form that matches neither the raw nor the href.
  try {
    const u = new URL(url);
    if (u.pathname && u.pathname !== '/') msg = msg.split(u.pathname + u.search).join('/…').split(u.pathname).join('/…');
    if (u.search) msg = msg.split(u.search).join('?…');
    for (const val of u.searchParams.values()) if (val) msg = msg.split(val).join('…'); // a secret in the QUERY (?token=…), even detached from the URL
  } catch { /* malformed URL — steps 1 & 3 cover it */ }
  // 3) Sweep any remaining well-formed http(s) URL down to its host.
  msg = msg.replace(/https?:\/\/[^\s"'<>]+/gi, (m) => redact(m));
  return msg;
}

/**
 * Deliver alerts to the configured channels. config: { webhook?: url, slack?: url,
 * title?: string }. Returns { delivered, results:[{channel, url, ok, status|error}] }.
 * Never throws — a channel failure is reported, not propagated (one dead webhook
 * must not sink a check).
 */
export async function deliver(alerts, config, opts) {
  if (!Array.isArray(alerts) || alerts.length === 0) return { delivered: 0, results: [] }; // Array.isArray guards a hostile non-array whose .length getter throws
  // The `= {}` param default only fires for undefined; an explicit null (config OR opts) must
  // not throw — deliver()'s contract is NEVER throws. Normalize both here.
  config = config || {};
  // Destructuring opts can itself throw (a hostile getter); guard it so even a malicious opts
  // object can't defeat the never-throws contract.
  let fetchImpl = fetch, timeoutMs = 8000;
  try { ({ fetchImpl = fetch, timeoutMs = 8000 } = opts || {}); } catch { /* hostile opts — use defaults */ }
  // build() is deferred INTO the per-channel try so a malformed alert (e.g. a null
  // element that throws in slackBody) is caught and reported, never propagated.
  const channels = [];
  // Reading config.slack/webhook can itself throw (a getter/Proxy config); guard it so even a
  // hostile config object can't defeat the never-throws guarantee.
  try {
    if (config.slack) channels.push({ channel: 'slack', url: config.slack, build: () => slackBody(alerts, { title: config.title }) });
    if (config.webhook) channels.push({ channel: 'webhook', url: config.webhook, build: () => ({ title: config.title, alerts }) });
  } catch { /* malformed/hostile config — deliver nothing rather than throw */ }

  const results = [];
  for (const ch of channels) {
    try {
      const body = ch.build();
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), timeoutMs);
      let res;
      try {
        res = await fetchImpl(ch.url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: ctl.signal });
      } finally { clearTimeout(timer); }
      results.push({ channel: ch.channel, url: redact(ch.url), ok: !!(res && res.ok), status: res && res.status });
    } catch (e) {
      results.push({ channel: ch.channel, url: redact(ch.url), ok: false, error: scrubError(e, ch.url) });
    }
  }
  return { delivered: results.filter((r) => r.ok).length, results };
}
