---
name: Corridor 2 · Inbox & CRM Hygiene (`inbox-crm-hygiene`) — event: message received
summary: | # | Callsign | Job in one line | |---|---|---| | 5 | HEIMDALL | Classify and label every inbound message | | 6 | MNEMOSYNE | Log every conversation against th
tags: agents, crm, label, urgent, deal, measur
pointers: 
updated: 2026-07-08T00:00:00.000Z
---
# Corridor 2 · Inbox & CRM Hygiene (`inbox-crm-hygiene`) — event: message received

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

_source: platform/AGENTS.md_
