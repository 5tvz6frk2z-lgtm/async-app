// Demo driver — scripted corridor activity so the console can be exercised
// end-to-end with zero API keys and zero client connectors. Every tool here
// is a stub that returns SIMULATED data; the runtime, gates and ledger paths
// are the real ones. This is also what Install #0 dry-runs look like before
// real MCP connectors are wired in.
import { ToolRegistry } from './runtime.js';

export function demoToolRegistry() {
  const reg = new ToolRegistry();
  const sim = (name, out) => reg.register(name, {
    description: `${name} (simulated connector)`,
    handler: async (input) => { await new Promise((r) => setTimeout(r, 40 + Math.random() * 120)); return { simulated: true, ...out(input) }; },
  });
  sim('crm.read', (i) => ({ lead: { name: 'Dana Reyes', company: 'Ironvale Manufacturing', title: 'VP Ops', source: 'workflow-grader', ...i } }));
  sim('crm.update', (i) => ({ updated: true, fields: Object.keys(i || {}) }));
  sim('crm.merge', () => ({ merged: true }));
  sim('web.lookup', () => ({ company: { employees: 140, industry: 'Industrial equipment', site: 'ironvale.example' } }));
  sim('email.draft', (i) => ({ draftId: 'd_' + Math.random().toString(36).slice(2, 7), subject: i?.subject }));
  sim('email.send', (i) => ({ sent: true, to: i?.to }));
  sim('email.read', () => ({ messages: 3 }));
  sim('email.label', (i) => ({ labeled: i?.label }));
  sim('calendar.read', () => ({ free: ['Tue 10:00', 'Tue 15:30', 'Wed 09:00'] }));
  sim('calendar.book', (i) => ({ booked: true, slot: i?.slot }));
  sim('notify.slack', (i) => ({ posted: true, channel: i?.channel || '#ops' }));
  sim('ads.read', () => ({ spend: 8420, cpl: 31.2 }));
  sim('sheets.read', () => ({ rows: 214 }));
  sim('sheets.write', () => ({ written: true }));
  sim('docs.read', () => ({ doc: 'invoice-1042.pdf', pages: 2 }));
  sim('docs.write', () => ({ saved: true }));
  sim('records.read', () => ({ record: { po: 'PO-7731', total: 12480.5 } }));
  sim('records.write', () => ({ recorded: true }));
  sim('erp.read', () => ({ vendor: 'Corvid Studios', poMatch: true }));
  sim('erp.write', () => ({ posted: true }));
  sim('seo.audit', () => ({ score: 86, fixes: ['add FAQ block'] }));
  sim('cms.stage', () => ({ staged: true, url: '/drafts/answer-engine-audit' }));
  sim('cms.publish', (i) => ({ published: true, url: i?.url }));
  sim('reviews.read', () => ({ review: { rating: 2, platform: 'Google', text: 'Slow response last week.' } }));
  sim('reviews.draft', () => ({ draftId: 'rv_' + Math.random().toString(36).slice(2, 6) }));
  sim('reviews.publish', () => ({ published: true }));
  return reg;
}

// Scenario scripts. Each corridor runs its FULL crew as a sequential handoff
// (the blueprint's `orchestration` block) — every agent gets a scripted turn, so
// the demo shows the whole fleet working, not just the entry agent. Shape:
//   SCENARIOS[corridor] = { trigger, crew: { agentName: [ {text, toolCalls?} ] } }
const done = (t) => ({ text: t });
export const SCENARIOS = {
  'speed-to-lead': {
    trigger: { lead: 'Dana Reyes', company: 'Ironvale Manufacturing', source: 'workflow-grader' },
    crew: {
      qualifier: [
        { text: 'New lead Dana Reyes. Reading CRM and scoring against the ICP.', toolCalls: [{ tool: 'crm.read', input: { leadId: 'L-2214' } }] },
        { text: 'ICP fit strong — industrial, 140 seats, VP Ops. Marking qualified.', toolCalls: [{ tool: 'crm.update', input: { leadId: 'L-2214', status: 'qualified', note: 'ICP 8/10' } }] },
        done('Qualified. Handing to MIMIR for enrichment.'),
      ],
      enricher: [
        { text: 'Pulling firmographics for Ironvale Manufacturing.', toolCalls: [{ tool: 'web.lookup', input: { company: 'Ironvale Manufacturing' } }] },
        { text: '140 employees, dealer network, recent capex signal. Writing the enrichment note.', toolCalls: [{ tool: 'crm.update', input: { leadId: 'L-2214', note: '140 emp; dealer network; capex signal' } }] },
        done('Enriched. Handing to HERMOD for the first touch.'),
      ],
      'first-responder': [
        { text: 'Drafting the first touch in Ironvale voice, referencing their grader results.', toolCalls: [{ tool: 'email.draft', input: { to: 'dana@ironvale.example', subject: 'Your workflow readiness — two corridors stand out' } }] },
        { text: 'Draft ready. Requesting send approval.', toolCalls: [{ tool: 'email.send', input: { to: 'dana@ironvale.example', body: 'Hi Dana — your intake and reporting corridors scored highest for automation readiness…' } }] },
        done('First touch sent 3m 41s after submit. Handing to SAGA.'),
      ],
      scheduler: [
        { text: 'Reading the calendar for slots to offer on reply.', toolCalls: [{ tool: 'calendar.read', input: {} }] },
        done('Two slots ready (Tue 10:00, Wed 09:00 ET) — books automatically when Dana replies.'),
      ],
    },
  },
  'document-intake': {
    trigger: { document: 'invoice-1042.pdf', from: 'billing@corvid.example' },
    crew: {
      extractor: [
        { text: 'Reading invoice-1042.pdf; extracting parties, line items and totals.', toolCalls: [{ tool: 'docs.read', input: { doc: 'invoice-1042.pdf' } }] },
        { text: 'Extracted Corvid Studios / PO-7731 / $12,480.50. Writing the record; handing to THEMIS.', toolCalls: [{ tool: 'records.write', input: { record: 'inv-1042' } }] },
      ],
      validator: [
        { text: 'Cross-checking the record against the ERP.', toolCalls: [{ tool: 'records.read', input: { record: 'inv-1042' } }] },
        { text: 'PO-7731 exists, vendor matches, totals cross-foot — no exceptions. Handing to TYR.', toolCalls: [{ tool: 'erp.read', input: { po: 'PO-7731' } }] },
      ],
      router: [
        { text: 'Clean match — posting to accounting.', toolCalls: [{ tool: 'erp.write', input: { po: 'PO-7731', total: 12480.5 } }] },
        { text: 'Posted. Notifying the AP channel.', toolCalls: [{ tool: 'notify.slack', input: { channel: '#ap', text: 'Invoice PO-7731 posted, clean match.' } }] },
        done('Document processed end-to-end; zero exceptions.'),
      ],
    },
  },
  'content-aeo-engine': {
    trigger: { topic: 'AI invoice processing', gap: 'citation-gap-list' },
    crew: {
      researcher: [
        { text: 'Assembling sources and the question set for "AI invoice processing".', toolCalls: [{ tool: 'web.lookup', input: { topic: 'AI invoice processing' } }] },
        { text: 'Research pack ready: 6 questions, 4 stats, Direct Answer drafted. Three drafters will now compete.', toolCalls: [{ tool: 'docs.write', input: { doc: 'research-pack' } }] },
      ],
      'drafter-answer': [
        { text: 'Answer-first angle: Direct Answer up top, question-shaped headings.', toolCalls: [{ tool: 'docs.write', input: { doc: 'draft-answer' } }] },
        done('Answer-first draft submitted for judging.'),
      ],
      'drafter-example': [
        { text: 'Example-led angle: two concrete AP scenarios with real numbers carry it.', toolCalls: [{ tool: 'docs.write', input: { doc: 'draft-example' } }] },
        done('Example-led draft submitted for judging.'),
      ],
      'drafter-concise': [
        { text: 'Concise angle: shortest path from question to a citable answer.', toolCalls: [{ tool: 'docs.write', input: { doc: 'draft-concise' } }] },
        done('Concise draft submitted for judging.'),
      ],
      editor: [
        { text: 'Judging the three drafts against the citability checklist.', toolCalls: [{ tool: 'docs.read', input: { docs: ['draft-answer', 'draft-example', 'draft-concise'] } }] },
        { text: 'Answer-first wins on extractability; grafting the example-led numbers block in. Handing to APOLLO.', toolCalls: [{ tool: 'docs.write', input: { doc: 'draft-chosen' } }] },
      ],
      optimizer: [
        { text: 'Applying AEO structure and running the citability checklist.', toolCalls: [{ tool: 'seo.audit', input: { doc: 'draft-v1' } }] },
        { text: 'Score 86 — added an FAQ block and schema. Handing to HELIOS.', toolCalls: [{ tool: 'docs.write', input: { doc: 'draft-v2' } }] },
      ],
      publisher: [
        { text: 'Staging in the CMS with schema and internal links.', toolCalls: [{ tool: 'cms.stage', input: { doc: 'draft-v2' } }] },
        { text: 'Staged. Requesting publish approval.', toolCalls: [{ tool: 'cms.publish', input: { url: '/blog/ai-invoice-processing' } }] },
        done('Published through the gate.'),
      ],
    },
  },
  'inbox-crm-hygiene': {
    trigger: { window: '12h', mailbox: 'ops@ironvale.example' },
    crew: {
      triage: [
        { text: 'Reading the overnight inbox — 47 messages.', toolCalls: [{ tool: 'email.read', input: { window: '12h' } }] },
        { text: '12 need action, 3 billing, 6 noise. Labeling.', toolCalls: [{ tool: 'email.label', input: { applied: ['action', 'billing', 'noise'] } }] },
        done('Triaged. Handing to MNEMOSYNE.'),
      ],
      logger: [
        { text: 'Logging the action threads to the CRM.', toolCalls: [{ tool: 'crm.read', input: { match: 'senders' } }] },
        { text: '3 contacts matched, 1 new. Logging interactions.', toolCalls: [{ tool: 'crm.update', input: { logged: 4 } }] },
        done('Logged. Handing to ATHENA.'),
      ],
      'data-steward': [
        { text: 'Found a duplicate contact for M. Calloway.', toolCalls: [{ tool: 'crm.read', input: { dupCheck: true } }] },
        { text: 'Proposing a merge — this never auto-relaxes, requesting approval.', toolCalls: [{ tool: 'crm.merge', input: { keep: 'C-102', merge: 'C-889' } }] },
        done('Merge queued for approval. Handing to IRIS.'),
      ],
      router: [
        { text: 'Routing the two exceptions that need a human.', toolCalls: [{ tool: 'notify.slack', input: { channel: '#ops', text: '2 threads need a decision: refund + contract question.' } }] },
        done('Inbox cleared to zero unrouted; 2 exceptions escalated.'),
      ],
    },
  },
  'reporting-autopilot': {
    trigger: { schedule: 'Monday 07:00', client: 'Meridian SaaS' },
    crew: {
      'data-puller': [
        { text: 'Pulling the week: CRM, ads and the rollup sheet.', toolCalls: [{ tool: 'sheets.read', input: { sheet: 'weekly-rollup' } }] },
        { text: 'Numbers in. Handing to MUNINN.', toolCalls: [{ tool: 'ads.read', input: {} }] },
      ],
      assembler: [
        { text: 'Computing the deltas — every number from the sheet, none invented.', toolCalls: [{ tool: 'sheets.read', input: { tab: 'raw' } }] },
        { text: 'CPL −11% WoW; demo no-shows 2×. Written to the report tab. Handing to BRAGI.', toolCalls: [{ tool: 'sheets.write', input: { tab: 'week-27' } }] },
      ],
      narrator: [
        { text: 'Drafting the narrative around the computed numbers.', toolCalls: [{ tool: 'email.draft', input: { subject: 'Week 27: CPL down 11%, no-shows need a play' } }] },
        { text: 'Report ready. Requesting send approval to the client list.', toolCalls: [{ tool: 'email.send', input: { to: 'exec@meridian.example', body: 'Headline: CPL down 11% WoW on the new AEO pages…' } }] },
        done('Weekly report delivered on schedule.'),
      ],
    },
  },
  'review-response': {
    trigger: { platform: 'Google', rating: 2, author: 'M. Calloway' },
    crew: {
      monitor: [
        { text: 'New 2★ Google review from M. Calloway. Reading it and the history.', toolCalls: [{ tool: 'reviews.read', input: { id: 'gr_9921' } }] },
        { text: 'Service-speed complaint, first-time reviewer. Flagging. Handing to ECHO.', toolCalls: [{ tool: 'notify.slack', input: { channel: '#reviews', text: '2★ review needs a response.' } }] },
      ],
      responder: [
        { text: 'Drafting an accountable public response — no template smell.', toolCalls: [{ tool: 'reviews.draft', input: { tone: 'accountable, specific' } }] },
        { text: 'Draft ready. Requesting publish approval — this never auto-relaxes.', toolCalls: [{ tool: 'reviews.publish', input: { id: 'gr_9921', text: 'You are right that last week was slower than our standard…' } }] },
        done('Response published. Handing to EIR for private recovery.'),
      ],
      recovery: [
        { text: 'Opening a private recovery path with the reviewer.', toolCalls: [{ tool: 'email.draft', input: { to: 'calloway@example.com', subject: 'Making last week right' } }] },
        { text: 'Recovery offer drafted; ops notified to expedite.', toolCalls: [{ tool: 'notify.slack', input: { channel: '#ops', text: 'Expedite Calloway to recover the account.' } }] },
        done('Review handled end-to-end: public response + private recovery.'),
      ],
    },
  },
};

// Daily Brief is a hybrid pipeline (one infer agent), not a crew.
SCENARIOS['daily-brief'] = {
  trigger: { schedule: 'weekday 07:00', demo: true },
  crew: {
    narrator: [{ text: "Good morning, Dana. Handle Corvid's invoice question first — it's 9 hours old and it blocks AP. Reply debt is 3 threads; the oldest is M. Calloway at 31 hours. Today: 3 meetings, 90 minutes total, first at 09:30; your clear block is 13:00–15:00 — protect it for the Atlas renewal prep. One pattern: 6 threads this week were opened but never answered, all arriving after 4pm. A 4:30 reply pass would clear them same-day.", usage: { in: 900, out: 170 } }],
  },
};

export function seedBaselines(ledger) {
  const b = (blueprint, key, value) => ledger.append({ type: 'baseline', blueprint, key, value });
  const s = (blueprint, key, value) => ledger.append({ type: 'sample', blueprint, key, value });
  b('speed-to-lead', 'first_response_min', 252); s('speed-to-lead', 'first_response_min', 4);
  b('speed-to-lead', 'contact_rate_pct', 38);    s('speed-to-lead', 'contact_rate_pct', 52);
  b('speed-to-lead', 'booked_rate_pct', 9);      s('speed-to-lead', 'booked_rate_pct', 14);
  b('reporting-autopilot', 'report_hours', 5.5); s('reporting-autopilot', 'report_hours', 0.4);
  b('reporting-autopilot', 'on_time_pct', 60);   s('reporting-autopilot', 'on_time_pct', 100);
  b('document-intake', 'touch_min_per_doc', 11); s('document-intake', 'touch_min_per_doc', 1.5);
  b('document-intake', 'keying_error_rate_pct', 1.8); s('document-intake', 'keying_error_rate_pct', 0.3);
  b('review-response', 'response_rate_pct', 45); s('review-response', 'response_rate_pct', 100);
  b('review-response', 'response_time_h', 38);   s('review-response', 'response_time_h', 2.2);
  b('daily-brief', 'overdue_replies', 5);        s('daily-brief', 'overdue_replies', 1);
  s('daily-brief', 'briefs_on_time_pct', 100);
}

/** The scripted MockAdapter for one agent of a demo corridor (used by the
 *  server's adapterFor so the Coordinator can run the whole crew). */
export function demoScript(scenario, agentName) {
  const sc = SCENARIOS[scenario];
  return sc?.crew?.[agentName] ? structuredClone(sc.crew[agentName]) : null;
}
