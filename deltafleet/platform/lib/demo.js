// Demo driver — scripted corridor activity so the console can be exercised
// end-to-end with zero API keys and zero client connectors. Every tool here
// is a stub that returns SIMULATED data; the runtime, gates and ledger paths
// are the real ones. This is also what Install #0 dry-runs look like before
// real MCP connectors are wired in.
import { ToolRegistry, AgentRun, MockAdapter } from './runtime.js';

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

// Scenario scripts: what the MockAdapter has each agent "decide" per step.
export const SCENARIOS = {
  'speed-to-lead': {
    agent: 'first-responder',
    trigger: { lead: 'Dana Reyes', company: 'Ironvale Manufacturing', source: 'workflow-grader' },
    script: [
      { text: 'New lead from the Workflow Grader. Pulling CRM context.', toolCalls: [{ tool: 'crm.read', input: { leadId: 'L-2214' } }] },
      { text: 'ICP fit is strong (industrial, 140 seats). Drafting first touch referencing their grader results.', toolCalls: [{ tool: 'email.draft', input: { to: 'dana@ironvale.example', subject: 'Your workflow readiness results — two corridors stand out' } }] },
      { text: 'Draft ready. Requesting send approval.', toolCalls: [{ tool: 'email.send', input: { to: 'dana@ironvale.example', draftId: 'd_1', body: 'Hi Dana — your intake and reporting corridors scored highest for automation readiness. Two specific numbers stood out…' } }] },
      { text: 'First touch sent 3m 41s after form submit. Logging to CRM.', toolCalls: [{ tool: 'crm.update', input: { leadId: 'L-2214', status: 'contacted', note: 'First touch sent; grader results referenced.' } }] },
      { text: 'Lead contacted and logged. Handing off to SAGA for scheduling on reply.' },
    ],
  },
  'reporting-autopilot': {
    agent: 'narrator',
    trigger: { schedule: 'Monday 07:00', client: 'Meridian SaaS' },
    script: [
      { text: 'Weekly report run. Pulling final numbers.', toolCalls: [{ tool: 'sheets.read', input: { sheet: 'weekly-rollup' } }] },
      { text: 'CPL improved 11% WoW; demo no-shows doubled — flagging as the exception this week. Drafting narrative.', toolCalls: [{ tool: 'email.draft', input: { subject: 'Week 27: CPL down 11%, no-shows need a play' } }] },
      { text: 'Report drafted. Requesting send approval to client distribution list.', toolCalls: [{ tool: 'email.send', input: { to: 'exec@meridian.example', body: 'Headline: CPL down 11% WoW on the new AEO pages. Exception: demo no-shows 2×…' } }] },
      { text: 'Weekly report delivered on schedule.' },
    ],
  },
  'document-intake': {
    agent: 'router',
    trigger: { document: 'invoice-1042.pdf', from: 'billing@corvid.example' },
    script: [
      { text: 'Invoice received. Reading extracted record.', toolCalls: [{ tool: 'records.read', input: { doc: 'invoice-1042.pdf' } }] },
      { text: 'PO-7731 matches, totals cross-foot. Posting to accounting.', toolCalls: [{ tool: 'erp.write', input: { po: 'PO-7731', vendor: 'Corvid Studios', total: 12480.5 } }] },
      { text: 'Posted. Notifying ops channel.', toolCalls: [{ tool: 'notify.slack', input: { channel: '#ap', text: 'Invoice PO-7731 posted, clean match.' } }] },
      { text: 'Document processed end-to-end; zero exceptions.' },
    ],
  },
  'review-response': {
    agent: 'responder',
    trigger: { platform: 'Google', rating: 2, author: 'M. Calloway' },
    script: [
      { text: '2-star review detected. Reading full text and history.', toolCalls: [{ tool: 'reviews.read', input: { id: 'gr_9921' } }] },
      { text: 'Service-speed complaint, first-time reviewer. Drafting public holding response; EIR handles private recovery.', toolCalls: [{ tool: 'reviews.draft', input: { tone: 'accountable, specific, no template smell' } }] },
      { text: 'Response drafted. Requesting publish approval.', toolCalls: [{ tool: 'reviews.publish', input: { id: 'gr_9921', text: 'You are right that last week was slower than our standard, and that is on us…' } }] },
      { text: 'Response published 47 minutes after the review appeared.' },
    ],
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
}

/** Launch one scripted scenario run. Returns the AgentRun (caller keeps it for kill()). */
export function launchScenario({ ledger, gates, blueprints, tools, scenario }) {
  const sc = SCENARIOS[scenario];
  if (!sc) throw new Error(`unknown scenario ${scenario}`);
  const run = new AgentRun({
    blueprint: blueprints.get(scenario), agentName: sc.agent, ledger, gates,
    adapter: new MockAdapter(structuredClone(sc.script)), tools,
  });
  const finished = run.run(sc.trigger);
  return { run, finished };
}
