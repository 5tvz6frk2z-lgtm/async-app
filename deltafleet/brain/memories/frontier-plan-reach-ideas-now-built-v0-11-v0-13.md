---
name: Reach ideas — NOW BUILT (v0.11–v0.13)
summary: Dynamic model routing ✅ — lib/routing.js (ADR #22). · lib/routing.js lib/confidence.js lib/composer.js bin/compose.js ADR routing.js confidence.js composer.js dispos classifier oversight language
tags: confidence, built, rout, model, v0.11, v0.13
pointers: adr-dynamic-model-routing-with-a-safety-floor-v0-11-frontier, adr-squadron-composer-design-corridors-schema-gated-v0-13-fr, readme-agentloop-platform-v0-1
updated: 2026-07-08T00:00:00.000Z
---
# Reach ideas — NOW BUILT (v0.11–v0.13)

- **Dynamic model routing** ✅ — `lib/routing.js` (ADR #22). Deterministic difficulty classifier picks the model tier per step; high-stakes work never routes to the cheap tier (safety floor). Opt-in `route: true`.
- **Calibrated-confidence autonomy** ✅ — `lib/confidence.js` (ADR #23). Self-reported confidence can only *escalate* oversight, never relax it; calibrated against the agent's track record. Built once verification (Bet 1) was proven.
- **Squadron Composer** ✅ — `lib/composer.js` + `bin/compose.js` (ADR #24). An agent that designs a corridor from a plain-language description, accepted only if it passes the blueprint schema (validate + repair loop). The model proposes; the schema disposes.

_source: platform/FRONTIER-PLAN.md_
