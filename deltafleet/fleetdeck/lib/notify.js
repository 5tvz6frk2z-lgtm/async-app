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

/**
 * Deliver alerts to the configured channels. config: { webhook?: url, slack?: url,
 * title?: string }. Returns { delivered, results:[{channel, url, ok, status|error}] }.
 * Never throws — a channel failure is reported, not propagated (one dead webhook
 * must not sink a check).
 */
export async function deliver(alerts, config = {}, { fetchImpl = fetch, timeoutMs = 8000 } = {}) {
  if (!alerts || !alerts.length) return { delivered: 0, results: [] };
  // build() is deferred INTO the per-channel try so a malformed alert (e.g. a null
  // element that throws in slackBody) is caught and reported, never propagated —
  // deliver() must never throw, as documented.
  const channels = [];
  if (config.slack) channels.push({ channel: 'slack', url: config.slack, build: () => slackBody(alerts, { title: config.title }) });
  if (config.webhook) channels.push({ channel: 'webhook', url: config.webhook, build: () => ({ title: config.title, alerts }) });

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
      results.push({ channel: ch.channel, url: redact(ch.url), ok: false, error: e.message });
    }
  }
  return { delivered: results.filter((r) => r.ok).length, results };
}
