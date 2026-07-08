---
name: Bet 3 · Multi-Agent Orchestration — *make the crew real*
summary: **What:** a that executes a blueprint's agents as an actual graph, not a single run. Four composable primitives: **sequential handoff** (have it, formalize), **
tags: frontier-plan, agent, judge, multi, coordinator, parallel
pointers: 
updated: 2026-07-08T00:00:00.000Z
---
# Bet 3 · Multi-Agent Orchestration — *make the crew real*

**What:** a `Coordinator` that executes a blueprint's agents as an actual graph, not a single run. Four composable primitives: **sequential handoff** (have it, formalize), **parallel fan-out + gather** (run independent sub-tasks concurrently, collect), **delegate** (a coordinator spawns a scoped sub-agent and consumes its result), and **judge/debate** (spawn competing attempts, a judge picks or synthesizes — for high-stakes steps). Sub-agents get isolated context; the coordinator sees only their returned results (context hygiene). All threaded into the ledger.

**Why it's a frontier bet:** reliable multi-agent coordination is genuinely hard and mostly unsolved in production — most "multi-agent" products are marketing over a single loop (which is honestly what ours is today). Doing it *with* our gate/ledger/verification discipline is differentiated. It unlocks corridors that a single agent can't do well: a document-intake crew where extraction and validation run in parallel and a judge reconciles disagreements; a content corridor where three drafters compete and a judge picks the best.

**How we build & prove it:** a `Coordinator` over an `orchestration` block in the blueprint spec (`{type: 'sequential'|'parallel'|'delegate'|'judge', agents, ...}`), sub-run spawning with result-passing, and thread events in the ledger + console. Mock proof: a parallel fan-out of 3 mocked agents → assert all ran and results gathered; a judge over 3 attempts → assert the judge's pick is what proceeds; a delegate whose sub-agent fails → assert graceful handling.

**Ships with:** ~10 tests, console thread view, ADR entry. (Reference: our own `multi-agent-orchestration-patterns` blog post — we'd finally do what we wrote about.)

---

_source: platform/FRONTIER-PLAN.md_
