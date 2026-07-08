---
name: Corridor 1 · Speed-to-Lead (`speed-to-lead`) — event: new lead
summary: | # | Callsign | Job in one line | |---|---|---| | 1 | HERMES | Score and route every new lead in under a minute | | 2 | MIMIR | Enrich the lead so the first to
tags: agents, lead, send, book, first, reply
pointers: 
updated: 2026-07-08T00:00:00.000Z
---
# Corridor 1 · Speed-to-Lead (`speed-to-lead`) — event: new lead

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

_source: platform/AGENTS.md_
