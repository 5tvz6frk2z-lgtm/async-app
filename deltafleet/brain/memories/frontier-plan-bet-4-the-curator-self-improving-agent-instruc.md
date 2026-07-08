---
name: Bet 4 · The Curator — *self-improving agent instructions, measured*
summary: **What:** periodically synthesize an agent's accumulated correction-memories into a **proposed improvement to its own instructions**, then **A/B the proposal ag
tags: frontier-plan, instruction, agent, measur, propos, curator
pointers: 
updated: 2026-07-08T00:00:00.000Z
---
# Bet 4 · The Curator — *self-improving agent instructions, measured*

**What:** periodically synthesize an agent's accumulated correction-memories into a **proposed improvement to its own instructions**, then **A/B the proposal against the current instructions on the Shadow Eval Harness** (Bet 2). Keep it only if it measurably wins; a human approves; the change is versioned and reversible (like a gate change). The memory flywheel stops being passive context and starts rewriting the agent's own guidance — safely, because nothing lands without measured proof.

**Why it's a frontier bet:** the "curator" pattern (distill experience into an updated playbook, inject next run) shows ~+10% agent-benchmark gains without fine-tuning — but naively applied it's dangerous (prompt drift, regressions). Gating it behind a measured A/B on the eval harness is the novel, safe version. It's compounding, per-client quality that a competitor starting from a static prompt cannot match — the deepest moat on this list.

**How we build & prove it:** a `curate(agent, memories)` step (one infer call → proposed instruction delta), an A/B runner over eval scenarios (current vs proposed, same scenarios, scored), an accept/reject gate on measured lift, and `instruction.*` ledger events (versioned, reversible). Mock proof: current instructions score 6/10 on scenarios, a "better" mock instruction scores 9/10 → assert the curator proposes and the A/B accepts it; a "worse" proposal → assert it's rejected.

**Ships with:** ~6 tests, ADR entry. **Depends on Bet 2.**

---

_source: platform/FRONTIER-PLAN.md_
