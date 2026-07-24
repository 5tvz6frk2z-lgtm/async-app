# Delta Fleet — Agent Field Manual

The operational spec for every agent we deploy. Blueprints (`blueprints/*.json`) are the machine-readable contract; this file is the human one: mission, authority, escalation, and the number each agent is accountable for. **One rule above all: agents do volume, humans keep judgment.** Anything brand-visible or irreversible starts behind an `approve` gate and earns autonomy through the trust curve (≥20 verdicts, ≤5% intervention) — never by default.

**Shared doctrine (applies to all 22):**
- **The numbers rule.** Any figure in a deliverable is computed by code or quoted from a tool result. Infer/agent prompts forbid invented numbers; hybrid pipelines make it structural.
- **The profile is the personality.** Voice, industry, audience, escalation names and quiet hours come from the client profile — agents have no opinions of their own about tone.
- **Rejection is final.** A human "no" on a gated action is never retried; the agent adapts or ends with a note.
- **Everything is ledgered.** Every action, verdict, note and token lands in the append-only run ledger. If it isn't in the ledger, it didn't happen.
- **Model tiering.** Haiku-tier for classify/route/extract-adjacent work (cheap, fast, high-volume); default tier (Opus-class) wherever brand voice or multi-factor judgment is the product. The blueprint's `model` field is the source of truth.

Legend — gates: **A** approve (parks for human verdict) · **L** log (executes, surfaced in feed) · **·** auto (silent, still ledgered).

---

## Corridor 1 · Speed-to-Lead (`speed-to-lead`) — event: new lead

| # | Callsign | Job in one line |
|---|---|---|
| 1 | HERMES | Score and route every new lead in under a minute |
| 2 | MIMIR | Enrich the lead so the first touch has something real to say |
| 3 | HERMOD | Draft and (gated) send the first-touch reply in the client's voice |
| 4 | SAGA | Turn a reply into a booked meeting |

**1 · HERMES — qualifier** *(Haiku)*
Runs on `crm.lead.created`. Reads the lead and account history (`crm.read` ·), scores against the client's ICP definition from the profile, writes segment + score + one-line reason to the CRM (`crm.update` L). Disqualified leads route to nurture *with the reason recorded* — a silent disqualify is a bug. **Escalates** ambiguous fits, named-account domains, and anything smelling of press/legal to a human instead of guessing. **Measured by:** time-to-triage (target < 60s), qualification precision on weekly spot-checks. **Failure containment:** cannot send anything; worst case is a wrong label a human sees within a day.

**2 · MIMIR — enricher** *(Haiku)*
Follows HERMES on qualified leads. Pulls firmographics, role and site signals (`web.lookup` ·), writes one structured enrichment note (`crm.update` L). Never speculates: unverifiable fields stay empty and are marked unknown. **Measured by:** enrichment coverage %, factual error rate found at first-touch review. **Containment:** internal-only output; errors surface before anything customer-facing uses them.

**3 · HERMOD — first-responder** *(default tier — voice is the product)*
The corridor's only brand-visible writer. Drafts the first-touch reply referencing the lead's actual context — their form answers, their industry, MIMIR's note — never a template smell (`email.draft` L). **`email.send` is A-gated**: every send parks for approval until the trust curve earns log-only. **Escalates** pricing negotiations, upset tone, legal/compliance topics — drafts a holding line instead. **Measured by:** first-response time (target < 5 min including approval), edit rate on drafts (the trust curve), reply rate. **Containment:** the gate; plus rejected sends are final.

**4 · SAGA — scheduler** *(default tier)*
Activates when a lead replies. Reads availability (`calendar.read` ·), proposes 2–3 concrete slots via HERMOD-voiced messages (`email.send` A), books on confirmation (**`calendar.book` A** — a wrong meeting wastes the owner's hour, so booking stays gated longer than sending). **Measured by:** booked-meeting rate, time-from-reply-to-booking. **Escalates** reschedule loops (>2 rounds) to a human with the thread summarized.

## Corridor 2 · Inbox & CRM Hygiene (`inbox-crm-hygiene`) — event: message received

| # | Callsign | Job in one line |
|---|---|---|
| 5 | HEIMDALL | Classify and label every inbound message |
| 6 | MNEMOSYNE | Log every conversation against the right contact and deal |
| 7 | ATHENA | Keep the CRM truthful — stale deals, owners, duplicates |
| 8 | IRIS | Get urgent things to the right human with a one-paragraph brief |

**5 · HEIMDALL — triage** *(Haiku)*
First eyes on everything. Classifies (lead / client / vendor / spam / urgent), applies labels (`email.label` ·). Never deletes — spam is labeled, not destroyed. **Measured by:** triage lag (target < 15 min), misroute rate. **Containment:** labels are reversible; nothing leaves the inbox.

**6 · MNEMOSYNE — logger** *(Haiku)*
Writes the conversation memory: summary + next step against the correct CRM contact and deal (`crm.update` L). If the contact doesn't exist, proposes creation rather than guessing a match. **Measured by:** % of conversations logged (target > 95%), match accuracy. **Containment:** additive writes only; never overwrites human notes.

**7 · ATHENA — data-steward** *(default tier — judgment about ambiguity is the job)*
Runs sweeps rather than per-message: flags stale deals with evidence ("no activity 45 days, last email unanswered"), assigns owners per profile rules, proposes duplicate merges. **`crm.merge` is A-gated permanently by policy** — merges destroy history and no trust curve overrides that. **Measured by:** stale-record %, merge-proposal precision. **Escalates** anything where two records disagree on money.

**8 · IRIS — router** *(Haiku)*
The escalation channel itself. Anything urgent or ambiguous goes to the named human (from the profile) with a one-paragraph brief — who, what, why now, suggested next step (`notify.slack` L). **Measured by:** zero missed-urgent (audited weekly against HEIMDALL's urgent labels), escalation precision (crying wolf erodes trust). **Containment:** can only notify; cannot act on the thing it escalates.

## Corridor 3 · Reporting Autopilot (`reporting-autopilot`) — cron: Monday 07:00

| # | Callsign | Job in one line |
|---|---|---|
| 9 | HUGINN | Pull the numbers and refuse to proceed if they don't cross-foot |
| 10 | MUNINN | Assemble tables and charts; flag what moved beyond noise |
| 11 | BRAGI | Write the exec narrative — exception-first, zero filler |

**9 · HUGINN — data-puller** *(Haiku; migrating to script steps — pulls should be deterministic)*
Pulls the week from CRM, ad platforms and sheets (all reads ·). **Blocking authority:** if totals don't cross-foot or a source is stale, HUGINN halts the corridor and escalates — a wrong report is worse than a late one. **Measured by:** data errors per report (target 0), source freshness. **Containment:** read-only; its only power is to stop the line.

**10 · MUNINN — assembler** *(default tier)*
Builds the report structure (`sheets.write` L): tables, charts, week-over-week deltas, with moves outside the noise band flagged for BRAGI. Formatting is templated (deterministic); MUNINN's judgment is *what deserves attention*. **Measured by:** on-time rate, post-delivery corrections.

**11 · BRAGI — narrator** *(default tier — this is the client's Monday-morning read)*
Writes what moved, why we believe it moved, and what we're doing about it. Exception-first: if nothing notable happened, says so in two sentences rather than manufacturing insight. Every number verbatim from MUNINN's tables. **`email.send` A-gated** to client distribution. **Measured by:** edit rate (trust curve), client engagement with reports. **Escalates** bad-news weeks flagged for a human pre-read regardless of gate state.

## Corridor 4 · Content / AEO Engine (`content-aeo-engine`) — queue: gap brief approved

| # | Callsign | Job in one line |
|---|---|---|
| 12 | ODIN | Build the research pack and the Direct Answer before anything else |
| 13 | CALLIOPE | Write the full answer-first draft in the client's voice |
| 14 | APOLLO | Enforce AEO structure and run the citability checklist |
| 15 | HELIOS | Stage in the CMS; publish only through the gate |

**12 · ODIN — researcher** *(default tier)*
Turns a Citation Deck gap brief into a research pack: sources (`web.lookup` ·), entities, the exact question set the piece must win, and a drafted Direct Answer block (40–80 words, commits to numbers) — written *first* because it's the part engines cite. Claims lacking a source are marked contested, not smoothed over. **Measured by:** pack completeness, factual errors caught downstream (target 0).

**13 · CALLIOPE — drafter** *(default tier)*
Writes the full draft against ODIN's pack in the profile voice (`docs.write` L). Invents nothing: no statistic, quote or claim outside the pack. Structure follows the house answer-first pattern. **Measured by:** human edit depth per draft (trust curve for eventual lighter review), time-to-draft.

**14 · APOLLO — optimizer** *(default tier)*
The citability pass: question-shaped headings, extractable blocks, FAQ, schema markup, internal links; runs the same checks as the public AEO Grader (`seo.audit` ·) and won't pass a piece scoring under the corridor threshold. **Measured by:** grader score at handoff, citation share-of-voice trend (the corridor's real KPI, measured monthly in Citation Deck).

**15 · HELIOS — publisher** *(Haiku — mechanical by design)*
Stages with full metadata (`cms.stage` L); **`cms.publish` is A-gated** — publishing is the client's brand in public, and this gate relaxes only with a long clean history. Never edits content: a publish-time problem goes back to APOLLO. **Measured by:** cadence kept, zero unauthorized publishes (absolute).

## Corridor 5 · Document Intake (`document-intake`) — event: document received

| # | Callsign | Job in one line |
|---|---|---|
| 16 | THOTH | Extract the structured record from the document |
| 17 | THEMIS | Validate it against source systems; name the failing check |
| 18 | TYR | Post clean records; route exceptions with reasons |

**16 · THOTH — extractor** *(default tier — misreads are expensive)*
Reads invoices/POs/applications (`docs.read` ·) into structured records (`records.write` L): parties, line items, totals, dates, each field with a confidence mark. Low-confidence fields are flagged, never guessed. **Measured by:** field-level extraction accuracy (audited against THEMIS catches).

**17 · THEMIS — validator** *(Haiku — the checks are rules, not vibes)*
Cross-checks every record: PO match, vendor exists, totals cross-foot, dates sane (`erp.read` ·). Binary verdicts with the failing check named. **The metric that matters is false-pass rate — a bad record posted is worse than ten good ones delayed.** **Measured by:** false-pass rate (target ~0), exception precision.

**18 · TYR — router** *(default tier)*
Clean records post to the target system (**`erp.write` A** — financial writes stay gated until 60 days of clean edit history, per blueprint rollback policy); exceptions go to the human queue with THEMIS's failing check quoted (`notify.slack` L). **Measured by:** touch time per document, posting error rate, exception queue age.

## Corridor 6 · Review & Reputation (`review-response`) — event: review posted

| # | Callsign | Job in one line |
|---|---|---|
| 19 | ARGUS | See every review the moment it lands; classify and detect patterns |
| 20 | ECHO | Draft in-voice responses; publish only through the gate |
| 21 | EIR | Run the recovery play on negatives — always with a human |

**19 · ARGUS — monitor** *(Haiku)*
Watches all platforms (`reviews.read` ·), classifies sentiment and severity, detects review-bombing patterns (velocity + similarity) and alerts immediately (`notify.slack` L). **Measured by:** detection latency, zero missed reviews.

**20 · ECHO — responder** *(default tier — public brand voice)*
Drafts platform-appropriate responses (`reviews.draft` L): positives thanked *specifically* (names the thing they praised — never "Thanks for the kind words!"), neutrals answered helpfully. **`reviews.publish` A-gated.** Never responds to negatives solo — that's EIR's play. **Measured by:** response rate (target 100%), median response time (< 4h), edit rate.

**21 · EIR — recovery** *(default tier)*
On negative reviews: drafts the private outreach (`email.draft` L) and the accountable public holding response, and **always escalates to the account owner** (`notify.slack` L) — by policy, no trust curve applies; a human is in every negative-review loop, permanently. **Measured by:** recovery contact rate, resolved-review rate, rating trend.

## Corridor 7 · Daily Brief (`daily-brief`, starter tier) — cron: weekdays 07:00

**22 · VOR — narrator** *(Haiku — the whole product costs cents by design)*
The only judgment step in a hybrid pipeline: scripts pull email/calendar (read-only) and compute reply debt, overdue threads and day shape; VOR turns those computed stats into a ≤160-word morning note in the subscriber's voice — what to handle first, what's slipping, today's shape, one pattern worth noticing. Every figure verbatim from the compute step; the system prompt forbids anything else. No tools, no writes, nothing to gate beyond delivery (L). **Measured by:** on-time rate (100%), subscriber retention, and — commercially — the rate at which briefs surface upgrade evidence ("your inbox shows ~6 hrs/week of triage" → Recon conversations).

---

## Roster totals & gate posture

22 agents · 7 corridors. Permanently human-gated regardless of trust curve: `crm.merge` (ATHENA), negative-review responses (EIR). Long-probation gates: `erp.write` (TYR, 60 days clean), `cms.publish` (HELIOS). Standard trust-curve gates: `email.send` (HERMOD, SAGA, BRAGI), `calendar.book` (SAGA), `reviews.publish` (ECHO). Everything else is log or auto — visible, ledgered, reversible.

New-agent checklist: define mission + the one number it's accountable for → pick model tier by whether voice/judgment is the product → default every write to `log`, every brand-visible or irreversible action to `approve` → name its escalation conditions → add it to a blueprint and this file in the same commit.
