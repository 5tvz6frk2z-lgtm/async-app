---
name: FRONTIER PLAN — the unproven bets
summary: > **STATUS UPDATE (July 2026): ALL FIVE BETS BUILT, TESTED, AND WIRED.** Platform v0.6–v0.9, 82 tests green, zero dependencies. Bet 2 Shadow Eval Harness ( + ,
tags: frontier-plan, shadow, test, plan, agent, unproven
pointers: 
updated: 2026-07-08T00:00:00.000Z
---
# FRONTIER PLAN — the unproven bets

> **STATUS UPDATE (July 2026): ALL FIVE BETS BUILT, TESTED, AND WIRED.** Platform v0.6–v0.9, 82 tests green, zero dependencies. Bet 2 Shadow Eval Harness (`lib/shadow.js` + `bin/shadow.js`, ADR #16) · Bet 1 Adversarial Verification Layer (`lib/verify.js`, ADR #17) · Bet 3 Multi-Agent Orchestration (`lib/orchestrate.js`, ADR #18) · Bet 4 The Curator (`lib/curator.js`, ADR #19) · Bet 5 Agent Skills (`lib/skills.js`, ADR #20). Everything below was the plan; it is now the built architecture. The reach ideas at the bottom remain parked.

**Status:** proposal · **Date:** July 2026 · Everything here is buildable and *provable* in the existing zero-dependency mock harness (the `MockAdapter` lets us script agent behavior — including deliberately wrong outputs — and assert the architecture catches them) before a single API key. Same doctrine as the rest of the platform: it ships with tests or it doesn't ship.

_source: platform/FRONTIER-PLAN.md_
