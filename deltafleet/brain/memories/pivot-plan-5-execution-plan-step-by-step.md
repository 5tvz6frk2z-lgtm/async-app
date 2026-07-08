---
name: 5 · Execution plan — step by step
summary: 1. Freeze positioning one-liner + ICP (owner-led, 10–200 employees, $1M–50M revenue, services/commerce). · ICP SLA ROI AEO CTA MCP VPC MVP freeze liner commerce exclusion
tags: blueprint, week, recon, ledger, client, phase
pointers: adr-agentloop-platform-architecture-decision-record, pivot-plan-delta-fleet-v9-the-integration-pivot, readme-delta-fleet-deltafleet-ai
updated: 2026-07-08T00:00:00.000Z
---
# 5 · Execution plan — step by step

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

_source: PIVOT-PLAN.md_
