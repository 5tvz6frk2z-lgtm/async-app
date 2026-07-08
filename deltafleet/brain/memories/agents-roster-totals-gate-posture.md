---
name: Roster totals & gate posture
summary: 22 agents · 7 corridors. Permanently human-gated regardless of trust curve: (ATHENA), negative-review responses (EIR).
tags: agents, posture, roster, saga, total, publish
pointers: 
updated: 2026-07-08T00:00:00.000Z
---
# Roster totals & gate posture

22 agents · 7 corridors. Permanently human-gated regardless of trust curve: `crm.merge` (ATHENA), negative-review responses (EIR). Long-probation gates: `erp.write` (TYR, 60 days clean), `cms.publish` (HELIOS). Standard trust-curve gates: `email.send` (HERMOD, SAGA, BRAGI), `calendar.book` (SAGA), `reviews.publish` (ECHO). Everything else is log or auto — visible, ledgered, reversible.

New-agent checklist: define mission + the one number it's accountable for → pick model tier by whether voice/judgment is the product → default every write to `log`, every brand-visible or irreversible action to `approve` → name its escalation conditions → add it to a blueprint and this file in the same commit.

_source: platform/AGENTS.md_
