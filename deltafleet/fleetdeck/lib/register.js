// AI Register — a regulation-agnostic compliance-evidence layer over the spine.
//
// The insight that makes this cheap: the evidence auditors and regulators ask for
// already exists on the timeline. A human approval is Article-14 human oversight.
// The append-only log is Article-12 record-keeping. A denied dangerous call and a
// tool-poisoning alert are risk controls doing their job. The Register does not
// collect anything new — it MAPS spine events onto a framework's controls through
// a swappable "law-pack", so the same evidence answers the EU AI Act today and
// whatever ships next year by swapping the pack, not the plumbing.
//
// IMPORTANT: the article mappings below are an engineering aid, not legal advice.
// They show which operational evidence bears on which control; a compliance
// professional owns the determination. Every control states what it counts and why.

const STATUS = { satisfied: 'satisfied', attention: 'attention', gap: 'gap' };

// ---- evidence extractors (pure functions of the spine) -----------------------

const verdicts = (spine) => spine.query({ kind: 'approval.verdict' });
const reviews = (spine) => spine.query({ kind: 'tool.call' }).filter((e) => e.decision === 'review');
const denials = (spine) => spine.query({ kind: 'tool.call' }).filter((e) => e.decision === 'deny');
const toolCalls = (spine) => spine.query({ kind: 'tool.call' });
const pins = (spine) => spine.query({ kind: 'mcp.pin' });
const drifts = (spine) => spine.query({ kind: 'mcp.drift' });

// Which review requests never received a verdict (open human-oversight items).
function openReviews(spine) {
  const decided = new Set(verdicts(spine).map((v) => v.ref));
  return reviews(spine).filter((r) => !decided.has(r.id));
}

// ---- controls ----------------------------------------------------------------
// Each control: evidence(spine) -> { status, count, detail, items } where items
// are the immutable evidence records (they carry their own event id + ts).

const CONTROLS = {
  humanOversight: (spine) => {
    const decided = verdicts(spine);
    const open = openReviews(spine);
    const status = open.length ? STATUS.attention : STATUS.satisfied;
    return {
      status, count: decided.length,
      detail: open.length
        ? `${decided.length} decision(s) recorded; ${open.length} awaiting human review`
        : `${decided.length} human decision(s) recorded; none outstanding`,
      items: decided.map((v) => ({ ref: v.ref, verdict: v.verdict, by: v.by, note: v.note ?? '', at: v.ts })),
    };
  },
  recordKeeping: (spine) => {
    const all = spine.all();
    const first = all[0], last = all[all.length - 1];
    return {
      status: STATUS.satisfied, // append-only by construction — the log cannot be edited in place
      count: all.length,
      detail: all.length
        ? `${all.length} events on an append-only ledger, ${first.ts} → ${last.ts}`
        : 'append-only ledger (empty)',
      items: all.length ? [{ from: first.ts, to: last.ts, events: all.length }] : [],
    };
  },
  dangerousActionControl: (spine) => {
    const denied = denials(spine);
    const total = toolCalls(spine).length;
    return {
      status: total ? STATUS.satisfied : STATUS.gap, // firewall in the call path?
      count: denied.length,
      detail: total
        ? `${denied.length} of ${total} tool call(s) blocked by policy before execution`
        : 'no tool calls recorded — is the firewall in the call path?',
      items: denied.map((d) => ({ ref: d.id, agent: d.agent, tool: d.tool, server: d.server, at: d.ts, reason: d.reason })),
    };
  },
  supplyChainIntegrity: (spine) => {
    const pinned = pins(spine);
    const drift = drifts(spine);
    const critical = drift.filter((d) => d.severity === 'critical');
    const status = !pinned.length ? STATUS.gap : critical.length ? STATUS.attention : STATUS.satisfied;
    return {
      status, count: drift.length,
      detail: !pinned.length
        ? 'no MCP servers pinned — tool-poisoning cannot be detected'
        : critical.length
          ? `${pinned.length} server(s) pinned; ${critical.length} CRITICAL drift alert(s) need response`
          : `${pinned.length} server(s) pinned; ${drift.length} drift alert(s), none critical`,
      items: drift.map((d) => ({ server: d.server, severity: d.severity, at: d.ts, changes: (d.changes || []).length })),
    };
  },
  transparencyDisclosure: (spine) => {
    // We do not yet record user-facing AI-disclosure events, so this is an honest gap.
    const disclosures = spine.query({ kind: 'disclosure' });
    return {
      status: disclosures.length ? STATUS.satisfied : STATUS.gap,
      count: disclosures.length,
      detail: disclosures.length
        ? `${disclosures.length} disclosure record(s)`
        : 'no AI-disclosure records — log a "disclosure" event when users are told they are interacting with AI',
      items: disclosures.map((d) => ({ at: d.ts, ...d })),
    };
  },
};

// ---- law-packs (swappable frameworks) ----------------------------------------
// A pack binds named controls to a framework's articles/labels. Evidence is
// shared; only the mapping and language change per pack.

export const LAW_PACKS = {
  governance: {
    id: 'governance',
    framework: 'Baseline AI governance (regulation-agnostic)',
    note: 'A vendor-neutral control set; a starting point that maps onto most frameworks.',
    controls: [
      { id: 'HO-1', name: 'Human oversight of gated actions', requirement: 'A human reviews and decides actions the policy holds for review.', control: 'humanOversight' },
      { id: 'RK-1', name: 'Tamper-evident record-keeping', requirement: 'Actions are logged to an append-only, timestamped record.', control: 'recordKeeping' },
      { id: 'RC-1', name: 'Dangerous-action control', requirement: 'High-risk tool calls are blocked before execution.', control: 'dangerousActionControl' },
      { id: 'SC-1', name: 'Tool supply-chain integrity', requirement: 'MCP tool sets are pinned and monitored for post-approval changes.', control: 'supplyChainIntegrity' },
      { id: 'TR-1', name: 'AI transparency', requirement: 'Users are told when they interact with an AI system.', control: 'transparencyDisclosure' },
    ],
  },
  'eu-ai-act': {
    id: 'eu-ai-act',
    framework: 'EU AI Act (illustrative article mapping — not legal advice)',
    note: 'Maps operational evidence to Articles 12/14/15/50. A compliance professional owns the determination.',
    controls: [
      { id: 'Art.14', name: 'Human oversight', requirement: 'Art. 14 — natural persons can oversee and intervene in the system.', control: 'humanOversight' },
      { id: 'Art.12', name: 'Record-keeping (logging)', requirement: 'Art. 12 — automatic recording of events over the system lifetime.', control: 'recordKeeping' },
      { id: 'Art.15', name: 'Accuracy, robustness & cybersecurity', requirement: 'Art. 15 — resilience against manipulation of the system (incl. tooling).', control: 'supplyChainIntegrity' },
      { id: 'Art.15b', name: 'Risk controls', requirement: 'Art. 15 — measures preventing unsafe actions.', control: 'dangerousActionControl' },
      { id: 'Art.50', name: 'Transparency to users', requirement: 'Art. 50 — inform natural persons they are interacting with an AI system.', control: 'transparencyDisclosure' },
    ],
  },
};

const RANK = { satisfied: 0, attention: 1, gap: 2 };

export class Register {
  /** @param {object} opts { spine, pack? } — pack is a LAW_PACKS id (default 'governance'). */
  constructor({ spine, pack = 'governance' }) {
    this.spine = spine;
    this.setPack(pack);
  }

  setPack(pack) {
    const p = typeof pack === 'string' ? LAW_PACKS[pack] : pack;
    if (!p) throw new Error(`unknown law-pack "${pack}" (have: ${Object.keys(LAW_PACKS).join(', ')})`);
    this.pack = p;
    return this;
  }

  /** The compliance register: every control with its status, detail and evidence. */
  register() {
    const controls = this.pack.controls.map((c) => {
      const ev = CONTROLS[c.control](this.spine);
      return { id: c.id, name: c.name, requirement: c.requirement, ...ev };
    });
    const worst = controls.reduce((s, c) => (RANK[c.status] > RANK[s] ? c.status : s), 'satisfied');
    const summary = {
      satisfied: controls.filter((c) => c.status === 'satisfied').length,
      attention: controls.filter((c) => c.status === 'attention').length,
      gap: controls.filter((c) => c.status === 'gap').length,
    };
    return { pack: this.pack.id, framework: this.pack.framework, note: this.pack.note, overall: worst, summary, controls };
  }

  /** The flat, immutable evidence record across all controls — the export artifact. */
  evidence() {
    const out = [];
    for (const c of this.pack.controls) {
      const ev = CONTROLS[c.control](this.spine);
      for (const item of ev.items) out.push({ control: c.id, name: c.name, ...item });
    }
    return out;
  }

  /** Evidence as CSV (a form auditors actually accept). */
  toCsv() {
    const rows = this.evidence();
    if (!rows.length) return 'control,name\n';
    const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
    const esc = (v) => { const s = v == null ? '' : String(v); return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    return [cols.join(','), ...rows.map((r) => cols.map((k) => esc(r[k])).join(','))].join('\n');
  }
}
