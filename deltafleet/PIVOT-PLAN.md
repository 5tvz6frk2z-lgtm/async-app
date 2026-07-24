# DELTA FLEET v9 — The Integration Pivot

**Status:** PLAN (not yet executed) · **Date:** July 2026
**From:** AI marketing agency (v8) · **To:** AI workflow integration studio with an embedded platform

---

## 1 · The thesis

**What we sell:** *We install supervised AI agent fleets inside the tools a business already
uses — live in 30 days, with approval gates, an audit trail, and measurable before/after proof —
and we leave the client with a console they run it from every day.*

The market gap is real and specific. Every SMB and mid-market owner wants AI in their
workflows; almost none succeed, because the three available options all fail them:

| Option | Why it fails the buyer |
|---|---|
| DIY tools (Zapier AI, Make, n8n, Copilot Studio) | The buyer still has to do the integration work — which is exactly the thing they can't do. Tools aren't outcomes. |
| Big consultancies / SIs | Won't touch sub-$50k engagements; leave slideware, not running software. |
| Vertical AI SaaS | Solves one workflow in isolation. Nobody owns the connective tissue across the business. |

The open position: **done-for-you integration with an operating layer the client keeps**,
priced for companies with 10–200 employees. Service margin today, platform moat tomorrow.

**Why us:** everything we built in v1–v8 rehearses this. The fleet brand and named-agent
doctrine (change management), approval-gate methodology, Audit Cockpit (ROI cases),
Citation Deck (measurement discipline), Agentloop (the console concept), The Swarm
(data-local deployment story). The pivot doesn't discard the marketing practice — it
demotes it from "the business" to "one corridor we install" (and our own growth engine).

## 2 · The moat, in four layers (ordered by durability)

1. **Blueprint library (IP moat).** Every install is captured as a reusable blueprint:
   trigger → agent chain → gates → connectors → metrics → rollback. Install #15 costs a
   fraction of install #1. Generalist consultants start from zero every time; we don't.
2. **The console (switching-cost moat).** Agentloop becomes real software the client logs
   into daily: approvals queue, run feed, kill switch, metrics. Consultants leave decks;
   we leave a habit. Cancel the retainer and the console — and its history — goes dark.
3. **Benchmark data (data moat).** Standardized baseline→delta measurement on every
   corridor from client #1, anonymized and aggregated. After ~25 installs we can say
   "median 34% cycle-time reduction across 25 lead-intake installs" — a claim no
   competitor can copy without our client base.
4. **Trust architecture (positioning moat).** Gates, audit trails, per-client isolation,
   data-local option (The Swarm), rollback plans. The #1 buyer blocker is fear.
   We are the "seatbelts included" installer, and we can prove our gate stats.

## 3 · Technical strategy — build thin, on standards

**The unlock: build on MCP (Model Context Protocol).** "Integratable" is already solved
by the ecosystem — mature MCP servers exist for CRMs, email, calendars, Slack, sheets,
databases, ticketing. We **curate and configure connectors; we don't write them.**

Per-client stack (isolated per client — this *is* The Swarm, made real):

```
[Client's existing tools] ←MCP→ [Agent runtime (Claude Agent SDK)]
                                      │
                          [Gate engine: auto / log-only / approve]
                                      │
                     [Run ledger: every action, input, output, verdict]
                                      │
                 [Agentloop console (web)] + [Delta Proof reports]
```

**We build only the defensible layer:** the gate/approval engine, the run ledger, the
console UI, the Proof/metrics engine, and the blueprint format. We do **not** build:
our own models, our own workflow engine, our own connector library, multi-tenant SaaS
plumbing (until ≥10 clients justify it).

**Blueprint spec v1** (the atomic unit of IP — sales quotes it, delivery deploys it,
the console renders it, Proof measures it):

```yaml
blueprint: speed-to-lead
trigger: new lead in CRM / form / inbox
agents: [qualifier, enricher, first-responder, scheduler]
gates: { outbound-message: approve, crm-write: log-only, enrich: auto }
connectors: [hubspot-mcp, gmail-mcp, calendar-mcp]
metrics: { baseline: [response-time, contact-rate], target: [<5min, +30%] }
rollback: disable trigger; queue drains to human inbox
```

## 4 · The productized offer

| Stage | Price | Duration | Deliverable |
|---|---|---|---|
| **Recon** | $1,500–3,000 (credited into Install) | 1 week | Workflow audit → scored corridor map, ROI cases (Audit Cockpit output), baseline metrics captured, fixed-price Install quote |
| **Install** | $8,000–20,000 fixed | 30 days | 1–3 corridors live: agents wired via MCP, gates configured, runbook, console access, staff walkthrough |
| **Flight Ops** | $750–2,500/mo | ongoing | Monitoring, gate reviews, monthly Delta Proof report, one improvement sprint per quarter. Console access lives here — this is the recurring hook |
| **White-label** | wholesale | later | Agencies/MSPs resell installs under their brand (reuses v8 white-label motif) |

**Beachhead corridors** (universal, connector-overlapping, provable in weeks):
1. **Speed-to-lead** — intake → qualification → follow-up → booking (minutes matter, easy baseline)
2. **Inbox & CRM hygiene** — triage, logging, data entry, handoffs
3. **Reporting autopilot** — weekly ops/exec reports assembled from live systems
4. **Content/AEO engine** — the v8 practice, now one corridor among peers
5. **Document intake** — invoices/POs/applications → extract, validate, route
6. **Review & reputation response** — monitor, draft, gated publish

Go-to-market stays niched even though the platform is horizontal: lead with whichever
vertical produces the first 3 case studies, then clone the motion.

## 5 · Execution plan — step by step

### Phase 0 · Lock the strategy (week 0–1)
1. Freeze positioning one-liner + ICP (owner-led, 10–200 employees, $1M–50M revenue, services/commerce).
2. Write the offer sheet: Recon / Install / Flight Ops — prices, deliverables, exclusions, SLA.
3. Ratify Blueprint spec v1 (schema above). Every later artifact reads this format.
4. Pick the 6 launch blueprints (§4) and write each as a one-page spec.

### Phase 1 · Productize the front door (weeks 1–3)
5. Add a client-facing "Recon Report" print mode to Audit Cockpit (it's ~80% there — corridor map, ROI case, verdict become the paid deliverable).
6. Build the **Workflow Grader** lead magnet (sibling of the AEO Grader, single-file, on-site): ~12 questions → per-corridor readiness score → which blueprint fits → CTA to Recon.
7. Site v9 repositioning: home, services, pricing rebuilt around Install/Recon/Flight Ops. v8 marketing service pages **archived, not deleted** (house doctrine — banners, URLs live). Marketing remains as the "Growth corridor" service page.
8. Five new pillar posts targeting "how to integrate AI into <workflow>" questions, AEO-optimized — we remain our own best case study.

### Phase 2 · Make Agentloop real (weeks 2–8, overlaps)
9. Write the architecture decision record: per-client = agent runtime + curated MCP servers + run-ledger DB + web console. One repo, deployed per client (VPC/on-prem option = The Swarm).
10. Build the **gate engine**: every agent action classified auto / log-only / needs-approval per blueprint; approvals via console + Slack/email escalation; every verdict stored.
11. Console MVP — exactly five features, hard line: approvals queue (approve/edit/reject, reasons captured), run feed with full trace, pause/kill switch, metric tiles from the ledger, blueprint viewer. **Not** in MVP: self-serve editing, billing, SSO, multi-tenancy.
12. Baseline capture kit: standard before-metrics per blueprint (cycle time, touch time, error rate, response time), captured during Recon week, stored in the ledger.
13. **Install #0 = ourselves.** Delta Fleet's own content engine, lead follow-up and reporting run on the platform. Nothing ships to a client we don't run in production ourselves.

### Phase 3 · The proof engine (weeks 6–10)
14. Generalize Citation Deck's report pattern into **Delta Proof**: monthly per-client report — baseline vs current per corridor, exceptions handled, gate stats (approval rate, edit rate = the trust curve), realized $ vs the Recon promise. Closes the loop Audit Cockpit opens.
15. Benchmark ledger from day one: anonymized cross-client metrics. The data moat starts at install #1, not at scale.
16. Gate-relaxation reviews (absorbs the planned Shadow Grader): when edit rate on a gated action stays under threshold for N weeks, propose moving it to log-only — documented, reversible. This is the visible "trust curve" clients pay to climb.

### Phase 4 · Design partners (weeks 4–12, overlaps)
17. Recruit **3 design partners**: half-price Install + 3 months free Flight Ops for case-study rights and weekly feedback. Sources: existing network, Workflow Grader leads, build-in-public posts.
18. Run the full motion end-to-end on each. Time every step; blueprint everything; fix or kill any step that ran >2× estimate.
19. Publish 3 case studies with real Proof numbers — which also retires the site's "illustrative" stats (a standing pre-launch item closes itself).

### Phase 5 · Scale gate (month 4)
20. Proceed criteria: ≥2 of 3 partners convert to paid Flight Ops · gross margin ≥60% on retainers (Fleet Ledger tells us) · install effort ≤25 person-hours with blueprints.
21. If green: raise prices, open the white-label program, hire/contract strategist #2 before capacity crosses 70% (Fleet Ledger's capacity bar is the tripwire).
22. If not green: narrow to the single best-performing corridor and go vertical with it. The blueprint + console + proof machinery all survive that narrowing untouched.

### Continuous · Run the business on our own tools
- **Fleet Ledger** (shipped): the book — MRR movements, NRR, margins, renewal radar, capacity.
- **Audit Cockpit** → the Recon engine. **Citation Deck** → stays, scoped to the Growth corridor.
- **Rulebook** (queued): becomes the gate-threshold registry inside the platform — a feature now, not a side tool.

## 6 · Risks & how the plan absorbs them

| Risk | Mitigation |
|---|---|
| Platform scope creep ("agency accidentally builds a SaaS") | Console MVP is five features; platform is delivery leverage, not the product, until ≥10 clients. Revenue = services. |
| Model/vendor dependency | Blueprint format is runtime-agnostic; MCP is the integration seam; runtime is swappable per client. |
| Trust/security objections | Per-client isolation, audit ledger, data-local option, DPA template written in Phase 0 — objection handling is the architecture. |
| Giants move down-market | They sell tools and seats; our unit is the *installed outcome* + accountable human ops. Also: blueprints + benchmarks compound locally, not in their favor. |
| Solo-operator bandwidth | Phases overlap but each has one deliverable owner-checkable in a week; the scale gate (step 20) is an explicit go/no-go before any hiring. |

## 7 · What changes on the site now vs later

**Now (cheap, we own the machine):** v9 positioning, Workflow Grader, offer/pricing pages,
5 integration pillar posts, llms.txt rewrite. **Later (when true):** console screenshots,
real case-study numbers, benchmark claims. Nothing illustrative gets presented as real —
same honesty rule as always.
