---
name: Intake mirrors the blueprint's trigger block (v0.2)
summary: 10. Intake mirrors the blueprint's trigger block (v0.2). · x-fleet-secret entry launchRun POST 10 2 5 409 classic launchrun authenticat funnel
tags: blueprint, intake, trigger, v0.2, mirror, block
pointers: 
updated: 2026-07-08T00:00:00.000Z
---
# Intake mirrors the blueprint's trigger block (v0.2)

**10. Intake mirrors the blueprint's trigger block (v0.2).** Schedule blueprints (`cron: …`) fire from an in-process 5-field cron scheduler (with the classic dom/dow OR rule; at-most-once per matching minute). Event blueprints accept `POST /hooks/{blueprint}` authenticated by a shared `x-fleet-secret`; schedule blueprints refuse webhooks (409). Trigger-launched runs start at the blueprint's optional `entry` agent (default: first listed). All intake funnels through one `launchRun` path — same runtime, gates, ledger.

_source: platform/ADR.md_
