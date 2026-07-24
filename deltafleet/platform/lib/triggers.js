// Trigger engine — how work enters the platform without a human clicking.
// Two intake paths, both declared in the blueprint's trigger block:
//   schedule  → "cron: m h dom mon dow" matched by the in-process scheduler
//   event     → POST /hooks/{blueprint} (webhook from the client's stack),
//               authenticated with a shared secret header
// Every launch goes through the same runtime/gates/ledger as everything else.

/* ---------------- cron ---------------- */

// Standard 5-field cron. Supports * , - / and the classic dom/dow OR rule:
// when BOTH day-of-month and day-of-week are restricted, either may match.
export function parseCron(expr) {
  const src = expr.replace(/^cron:\s*/i, '').trim();
  const fields = src.split(/\s+/);
  if (fields.length !== 5) throw new Error(`cron needs 5 fields, got "${src}"`);
  const [min, hour, dom, mon, dow] = fields;

  const partMatch = (part, value, lo, hi) => {
    let range = part, step = 1;
    const slash = part.indexOf('/');
    if (slash > -1) { step = parseInt(part.slice(slash + 1), 10); range = part.slice(0, slash); if (!step) throw new Error(`bad step in "${part}"`); }
    let a = lo, b = hi;
    if (range !== '*') {
      const dash = range.indexOf('-');
      if (dash > -1) { a = parseInt(range.slice(0, dash), 10); b = parseInt(range.slice(dash + 1), 10); }
      else { a = b = parseInt(range, 10); if (slash > -1) b = hi; }
    }
    if (Number.isNaN(a) || Number.isNaN(b)) throw new Error(`bad cron part "${part}"`);
    return value >= a && value <= b && (value - a) % step === 0;
  };
  const fieldMatch = (spec, value, lo, hi) => spec.split(',').some((p) => partMatch(p, value, lo, hi));

  // Validate now so bad expressions fail at load, not at fire time.
  for (const [spec, lo, hi] of [[min, 0, 59], [hour, 0, 23], [dom, 1, 31], [mon, 1, 12], [dow, 0, 7]]) fieldMatch(spec, lo, lo, hi);

  return {
    source: src,
    match(date) {
      const okMin = fieldMatch(min, date.getMinutes(), 0, 59);
      const okHour = fieldMatch(hour, date.getHours(), 0, 23);
      const okMon = fieldMatch(mon, date.getMonth() + 1, 1, 12);
      const d = date.getDay(); // 0=Sun; cron allows 7=Sun too
      const okDow = fieldMatch(dow, d, 0, 7) || (d === 0 && fieldMatch(dow, 7, 0, 7));
      const okDom = fieldMatch(dom, date.getDate(), 1, 31);
      const domRestricted = dom !== '*', dowRestricted = dow !== '*';
      const dayOk = domRestricted && dowRestricted ? (okDom || okDow) : (okDom && okDow);
      return okMin && okHour && okMon && dayOk;
    },
  };
}

/* ---------------- engine ---------------- */

export class TriggerEngine {
  /** launch(blueprintId, triggerInput, meta) is provided by the server. */
  constructor({ blueprints, launch, log = () => {} }) {
    this.launch = launch;
    this.log = log;
    this.schedules = [];
    this.lastFired = new Map(); // blueprint -> minute key
    for (const bp of blueprints.values()) {
      if (bp.trigger?.type === 'schedule' && /^cron:/i.test(bp.trigger.source || '')) {
        this.schedules.push({ blueprint: bp.blueprint, cron: parseCron(bp.trigger.source) });
      }
    }
  }

  /** Evaluate all schedules against `date`; fire at most once per minute each. */
  checkNow(date = new Date()) {
    const minuteKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()} ${date.getHours()}:${date.getMinutes()}`;
    const fired = [];
    for (const s of this.schedules) {
      if (!s.cron.match(date)) continue;
      if (this.lastFired.get(s.blueprint) === minuteKey) continue;
      this.lastFired.set(s.blueprint, minuteKey);
      this.log(`trigger: schedule fired for ${s.blueprint} (${s.cron.source})`);
      this.launch(s.blueprint, { schedule: s.cron.source, firedAt: date.toISOString() }, { via: 'schedule' });
      fired.push(s.blueprint);
    }
    return fired;
  }

  start(everyMs = 20_000) {
    this.timer = setInterval(() => this.checkNow(new Date()), everyMs);
    this.timer.unref?.();
    return this;
  }
  stop() { clearInterval(this.timer); }
}

/* ---------------- webhooks ---------------- */

/** Framework-free hook handler; the server routes POST /hooks/{id} here.
 *  Returns {status, body} so it is directly unit-testable. */
export function makeHookHandler({ blueprints, launch, secret }) {
  return (blueprintId, headers, payload) => {
    if (!secret) return { status: 503, body: { ok: false, error: 'webhook intake disabled: no secret configured' } };
    const given = headers['x-fleet-secret'];
    if (given !== secret) return { status: 401, body: { ok: false, error: 'bad or missing x-fleet-secret' } };
    const bp = blueprints.get(blueprintId);
    if (!bp) return { status: 404, body: { ok: false, error: `unknown blueprint ${blueprintId}` } };
    if (bp.trigger?.type === 'schedule') return { status: 409, body: { ok: false, error: `${blueprintId} is schedule-triggered; webhooks not accepted` } };
    const runId = launch(blueprintId, payload ?? {}, { via: 'webhook' });
    return { status: 202, body: { ok: true, run: runId } };
  };
}
