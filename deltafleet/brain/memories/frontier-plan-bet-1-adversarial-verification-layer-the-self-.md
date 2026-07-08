---
name: Bet 1 · Adversarial Verification Layer — *the self-checking fleet*
summary: **What:** a new gate tier, , that sits between and .
tags: frontier-plan, action, refute, adversarial, before, human
pointers: 
updated: 2026-07-08T00:00:00.000Z
---
# Bet 1 · Adversarial Verification Layer — *the self-checking fleet*

**What:** a new gate tier, `verify`, that sits between `log` and `approve`. Before a gated action executes, the engine spawns **N independent verifier agents** with fresh context and an adversarial brief ("try to refute that this action is correct/on-brand/safe; default to refuted if unsure"). They vote. Majority-refute → the action is auto-held and sent back for revision (a self-repair loop) *before* it ever reaches the human queue; clean → it proceeds, or downgrades to a lighter human touch. Every verdict is ledgered.

**Why it's a frontier bet:** adversarial self-verification is the most-cited reliability technique in 2026 agent research and almost nobody productizes it for SMB workflows. It attacks the platform's two real weaknesses at once — **gate fatigue** (humans rubber-stamping) and **silent errors** — by having the fleet filter its own output. It also makes the trust curve *stronger*: "verified-clean" history earns autonomy faster and more safely than raw approvals.

**How we build & prove it:** a `Verifier` run type (reuses `AgentRun` with a refute-shaped system prompt + a structured `{verdict, confidence, reason}` output), a `verifyAction()` orchestrator (spawn k, tally, pessimistic ties), a `verify` level in `gates.js`, and `verification.*` ledger events feeding a "verified" column into `trustStats()`. Mock proof: script a bad draft + 3 skeptic mocks that refute → assert the action is held and never executed; script a good draft + skeptics that pass → assert it proceeds. Perspective-diverse verifiers (correctness / brand / policy) for actions that can fail multiple ways.

**Ships with:** ~8 tests, a console "caught before you" counter, ADR entry.

---

_source: platform/FRONTIER-PLAN.md_
