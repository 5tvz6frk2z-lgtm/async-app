---
name: Bet 2 · Shadow Eval Harness — *the Shadow Grader; de-risk before real traffic*
summary: What: run a corridor against a set of scenarios with known-good outcomes (synthetic now; a client's historical data at install) with nothing written to real systems, then · bin/shadow.js CLI ADR shadow.js scenarios.json 200 1 4 historical ground runscenario synthetic
tags: scenario, shadow, corridor, risk, report, real
pointers: handoff-5-version-history
updated: 2026-07-08T00:00:00.000Z
---
# Bet 2 · Shadow Eval Harness — *the Shadow Grader; de-risk before real traffic*

**What:** run a corridor against a set of **scenarios with known-good outcomes** (synthetic now; a client's historical data at install) with *nothing written* to real systems, then grade each agent output against ground truth. Produces a **readiness report**: accuracy, false-pass rate, "the gate would have caught this" rate, and the specific cases where the corridor fails — per corridor, before it goes live.

**Why it's a frontier bet:** this is how you *actually* de-risk an install instead of hoping. It turns "trust us" into "here's how this corridor performed on 200 of your past invoices before we touched anything," and it produces the evidence that lets a gate **start** relaxed rather than crawling up the trust curve from zero. It's also the measurement substrate for Bets 1 and 4 — you can't prove verification or self-improvement helps without it. This is the platform-level version of the promise the whole company is built on: proof over faith.

**How we build & prove it:** a `Scenario = {trigger, groundTruth}`, a `runScenarios(corridor, scenarios, {adapter})` that executes each in a sandbox ledger, a pluggable `scorer(output, groundTruth)` (exact/numeric/semantic), and a `readinessReport()` aggregator. A synthetic scenario generator seeds it today. Mock proof: feed scenarios + a mock agent that's right 8/10 → assert the report shows 80% accuracy and names the 2 failures.

**Ships with:** ~8 tests, a `bin/shadow.js` CLI (`node bin/shadow.js <corridor> scenarios.json`), a printable readiness report, ADR entry.

---

_source: platform/FRONTIER-PLAN.md_
