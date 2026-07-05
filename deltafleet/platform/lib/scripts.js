// Script Registry — the deterministic spine of hybrid pipelines.
// A script is plain code: same input, same output, zero tokens. Scripts are
// ledgered and gated exactly like agent tool calls, so the console and the
// audit trail don't care whether a step was code or model.
//
// Doctrine (see ADR §11): anything that CAN be deterministic MUST be a script.
// The model is reserved for judgment: classify, summarize, draft, decide
// what's an exception. Numbers in client deliverables come from scripts —
// a computed figure can't be hallucinated.
export class ScriptRegistry {
  constructor() { this.scripts = new Map(); }
  register(name, { description = '', handler }) {
    if (typeof handler !== 'function') throw new Error(`script ${name} needs a handler`);
    this.scripts.set(name, { name, description, handler });
    return this;
  }
  has(name) { return this.scripts.has(name); }
  async execute(name, input, ctx) {
    const s = this.scripts.get(name);
    if (!s) throw new Error(`script ${name} not registered`);
    return s.handler(input, ctx);
  }
}

/** Startup guard: every script step in every pipeline blueprint must exist. */
export function assertScriptsCovered(blueprints, registry) {
  const missing = [];
  for (const bp of blueprints.values()) {
    for (const step of bp.pipeline || []) {
      if (step.script && !registry.has(step.script)) missing.push(`${bp.blueprint} needs script ${step.script}`);
    }
  }
  if (missing.length) throw new Error(`unregistered scripts:\n  ${[...new Set(missing)].join('\n  ')}`);
}

/* ------------------------------------------------------------------ */
/* Built-in simulated scripts for the Daily Brief corridor. Real
   deployments replace the pull/deliver handlers with MCP-backed or
   IMAP-backed ones; compute.* scripts are real logic already and ship
   to production unchanged. */
export function demoScriptRegistry() {
  const reg = new ScriptRegistry();

  reg.register('pull.email_stats', {
    description: 'Read-only: message counts, senders, waiting-on-reply list for the trailing window (simulated)',
    handler: async () => ({
      simulated: true,
      received: 47, sent: 19,
      needsReply: [
        { from: 'dana@ironvale.example', subject: 'Re: proposal timeline', ageH: 22 },
        { from: 'billing@corvid.example', subject: 'Invoice PO-7731 question', ageH: 9 },
        { from: 'm.calloway@gmail.example', subject: 'Follow-up from Tuesday', ageH: 31 },
      ],
      threadsOpenedNotAnswered: 6,
      busiestHour: '10:00',
    }),
  });

  reg.register('pull.calendar_today', {
    description: 'Read-only: today\'s events and free blocks (simulated)',
    handler: async () => ({
      simulated: true,
      events: [
        { at: '09:30', title: 'Ops standup', mins: 15 },
        { at: '11:00', title: 'Demo — Bluegrain Analytics', mins: 45 },
        { at: '15:00', title: 'Renewal review — Atlas Legal', mins: 30 },
      ],
      freeBlocks: ['13:00–15:00'],
    }),
  });

  reg.register('compute.brief', {
    description: 'Deterministic rollup: reply debt, aging, day shape. Pure function of its inputs.',
    handler: async ({ email, calendar }) => {
      const needs = email?.needsReply || [];
      const overdue = needs.filter((m) => m.ageH >= 24);
      return {
        replyDebt: needs.length,
        overdue: overdue.length,
        oldest: needs.reduce((a, b) => (a && a.ageH > b.ageH ? a : b), null),
        meetings: (calendar?.events || []).length,
        meetingMins: (calendar?.events || []).reduce((s, e) => s + (e.mins || 0), 0),
        firstMeeting: (calendar?.events || [])[0] || null,
        freeBlocks: calendar?.freeBlocks || [],
        inOut: `${email?.received ?? 0} in / ${email?.sent ?? 0} out`,
      };
    },
  });

  reg.register('deliver.brief', {
    description: 'Send the assembled brief to the subscriber (simulated delivery)',
    handler: async ({ to, narrative, stats }) => ({
      simulated: true, delivered: true, to: to || 'owner@client.example',
      chars: (narrative || '').length, replyDebt: stats?.replyDebt,
    }),
  });

  return reg;
}
