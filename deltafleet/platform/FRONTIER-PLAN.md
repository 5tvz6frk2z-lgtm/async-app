# FRONTIER PLAN — the unproven bets

> **STATUS UPDATE (July 2026): ALL FIVE BETS BUILT, TESTED, AND WIRED.** Platform v0.6–v0.9, 82 tests green, zero dependencies. Bet 2 Shadow Eval Harness (`lib/shadow.js` + `bin/shadow.js`, ADR #16) · Bet 1 Adversarial Verification Layer (`lib/verify.js`, ADR #17) · Bet 3 Multi-Agent Orchestration (`lib/orchestrate.js`, ADR #18) · Bet 4 The Curator (`lib/curator.js`, ADR #19) · Bet 5 Agent Skills (`lib/skills.js`, ADR #20). Everything below was the plan; it is now the built architecture. The reach ideas at the bottom remain parked.

**Status:** proposal · **Date:** July 2026 · Everything here is buildable and *provable* in the existing zero-dependency mock harness (the `MockAdapter` lets us script agent behavior — including deliberately wrong outputs — and assert the architecture catches them) before a single API key. Same doctrine as the rest of the platform: it ships with tests or it doesn't ship.

## The thesis

We've built the safe, proven layer: gated tool-use, hybrid pipelines, a trust curve, per-client memory, Delta Proof, a benchmark ledger. It works because a human is on every gate. The frontier that *fits our DNA* is the next reliability step:

> **Agents that verify themselves, improve themselves, and coordinate as real crews — every gain measured, nothing taken on faith.**

The competitor story is "our AI does your workflow." Ours becomes "our fleet catches its own mistakes before you have to, proves it on your data before it touches production, and gets measurably better every week — and we can show you the numbers." That is defensible in a way features aren't.

Today the runtime runs **one agent per run**; the "crew" in a blueprint is descriptive, not executed. Verification is a human. Improvement is passive (memory). These are the three gaps the frontier bets close.

---

## Bet 1 · Adversarial Verification Layer — *the self-checking fleet*

**What:** a new gate tier, `verify`, that sits between `log` and `approve`. Before a gated action executes, the engine spawns **N independent verifier agents** with fresh context and an adversarial brief ("try to refute that this action is correct/on-brand/safe; default to refuted if unsure"). They vote. Majority-refute → the action is auto-held and sent back for revision (a self-repair loop) *before* it ever reaches the human queue; clean → it proceeds, or downgrades to a lighter human touch. Every verdict is ledgered.

**Why it's a frontier bet:** adversarial self-verification is the most-cited reliability technique in 2026 agent research and almost nobody productizes it for SMB workflows. It attacks the platform's two real weaknesses at once — **gate fatigue** (humans rubber-stamping) and **silent errors** — by having the fleet filter its own output. It also makes the trust curve *stronger*: "verified-clean" history earns autonomy faster and more safely than raw approvals.

**How we build & prove it:** a `Verifier` run type (reuses `AgentRun` with a refute-shaped system prompt + a structured `{verdict, confidence, reason}` output), a `verifyAction()` orchestrator (spawn k, tally, pessimistic ties), a `verify` level in `gates.js`, and `verification.*` ledger events feeding a "verified" column into `trustStats()`. Mock proof: script a bad draft + 3 skeptic mocks that refute → assert the action is held and never executed; script a good draft + skeptics that pass → assert it proceeds. Perspective-diverse verifiers (correctness / brand / policy) for actions that can fail multiple ways.

**Ships with:** ~8 tests, a console "caught before you" counter, ADR entry.

---

## Bet 2 · Shadow Eval Harness — *the Shadow Grader; de-risk before real traffic*

**What:** run a corridor against a set of **scenarios with known-good outcomes** (synthetic now; a client's historical data at install) with *nothing written* to real systems, then grade each agent output against ground truth. Produces a **readiness report**: accuracy, false-pass rate, "the gate would have caught this" rate, and the specific cases where the corridor fails — per corridor, before it goes live.

**Why it's a frontier bet:** this is how you *actually* de-risk an install instead of hoping. It turns "trust us" into "here's how this corridor performed on 200 of your past invoices before we touched anything," and it produces the evidence that lets a gate **start** relaxed rather than crawling up the trust curve from zero. It's also the measurement substrate for Bets 1 and 4 — you can't prove verification or self-improvement helps without it. This is the platform-level version of the promise the whole company is built on: proof over faith.

**How we build & prove it:** a `Scenario = {trigger, groundTruth}`, a `runScenarios(corridor, scenarios, {adapter})` that executes each in a sandbox ledger, a pluggable `scorer(output, groundTruth)` (exact/numeric/semantic), and a `readinessReport()` aggregator. A synthetic scenario generator seeds it today. Mock proof: feed scenarios + a mock agent that's right 8/10 → assert the report shows 80% accuracy and names the 2 failures.

**Ships with:** ~8 tests, a `bin/shadow.js` CLI (`node bin/shadow.js <corridor> scenarios.json`), a printable readiness report, ADR entry.

---

## Bet 3 · Multi-Agent Orchestration — *make the crew real*

**What:** a `Coordinator` that executes a blueprint's agents as an actual graph, not a single run. Four composable primitives: **sequential handoff** (have it, formalize), **parallel fan-out + gather** (run independent sub-tasks concurrently, collect), **delegate** (a coordinator spawns a scoped sub-agent and consumes its result), and **judge/debate** (spawn competing attempts, a judge picks or synthesizes — for high-stakes steps). Sub-agents get isolated context; the coordinator sees only their returned results (context hygiene). All threaded into the ledger.

**Why it's a frontier bet:** reliable multi-agent coordination is genuinely hard and mostly unsolved in production — most "multi-agent" products are marketing over a single loop (which is honestly what ours is today). Doing it *with* our gate/ledger/verification discipline is differentiated. It unlocks corridors that a single agent can't do well: a document-intake crew where extraction and validation run in parallel and a judge reconciles disagreements; a content corridor where three drafters compete and a judge picks the best.

**How we build & prove it:** a `Coordinator` over an `orchestration` block in the blueprint spec (`{type: 'sequential'|'parallel'|'delegate'|'judge', agents, ...}`), sub-run spawning with result-passing, and thread events in the ledger + console. Mock proof: a parallel fan-out of 3 mocked agents → assert all ran and results gathered; a judge over 3 attempts → assert the judge's pick is what proceeds; a delegate whose sub-agent fails → assert graceful handling.

**Ships with:** ~10 tests, console thread view, ADR entry. (Reference: our own `multi-agent-orchestration-patterns` blog post — we'd finally do what we wrote about.)

---

## Bet 4 · The Curator — *self-improving agent instructions, measured*

**What:** periodically synthesize an agent's accumulated correction-memories into a **proposed improvement to its own instructions**, then **A/B the proposal against the current instructions on the Shadow Eval Harness** (Bet 2). Keep it only if it measurably wins; a human approves; the change is versioned and reversible (like a gate change). The memory flywheel stops being passive context and starts rewriting the agent's own guidance — safely, because nothing lands without measured proof.

**Why it's a frontier bet:** the "curator" pattern (distill experience into an updated playbook, inject next run) shows ~+10% agent-benchmark gains without fine-tuning — but naively applied it's dangerous (prompt drift, regressions). Gating it behind a measured A/B on the eval harness is the novel, safe version. It's compounding, per-client quality that a competitor starting from a static prompt cannot match — the deepest moat on this list.

**How we build & prove it:** a `curate(agent, memories)` step (one infer call → proposed instruction delta), an A/B runner over eval scenarios (current vs proposed, same scenarios, scored), an accept/reject gate on measured lift, and `instruction.*` ledger events (versioned, reversible). Mock proof: current instructions score 6/10 on scenarios, a "better" mock instruction scores 9/10 → assert the curator proposes and the A/B accepts it; a "worse" proposal → assert it's rejected.

**Ships with:** ~6 tests, ADR entry. **Depends on Bet 2.**

---

## Bet 5 · Agent Skills — *reusable, progressively-disclosed capability modules*

**What:** a `Skill` = a named capability pack — `{name, description, guidance, examples, validator}` — that an agent loads **on demand** when a task matches, rather than carrying every instruction all the time. The agent sees a one-line description of each available skill; it loads the full guidance only when relevant (progressive disclosure), and the skill's deterministic `validator` checks the output. Skills are **reusable across corridors and clients** — the complement to per-client memory (which is bespoke). Examples: `brand-voice-email`, `invoice-reconciliation`, `meeting-scheduling`, `review-response-tone`, `exec-summary`.

**Why it's a frontier bet:** it mirrors where the whole industry is heading (Anthropic's Skills), applied to our fleet. It's the reuse layer that makes install #15 cheaper than #1 at the *capability* level, not just the blueprint level, and it keeps prompts lean (skills load only when needed → cheaper, more reliable). Less unproven than 1–4, highest immediate reuse leverage.

**How we build & prove it:** a `SkillRegistry`, description-based selection injected into the run context, full-guidance loading on match, and validator enforcement on output. Mock proof: an agent with a `brand-voice-email` skill available → assert the skill's guidance reaches the prompt only when the task matches, and a malformed output fails the validator and is retried.

**Ships with:** ~6 tests, a starter skill library, ADR entry.

---

## Reach ideas — NOW BUILT (v0.11–v0.13)

- **Dynamic model routing** ✅ — `lib/routing.js` (ADR #22). Deterministic difficulty classifier picks the model tier per step; high-stakes work never routes to the cheap tier (safety floor). Opt-in `route: true`.
- **Calibrated-confidence autonomy** ✅ — `lib/confidence.js` (ADR #23). Self-reported confidence can only *escalate* oversight, never relax it; calibrated against the agent's track record. Built once verification (Bet 1) was proven.
- **Squadron Composer** ✅ — `lib/composer.js` + `bin/compose.js` (ADR #24). An agent that designs a corridor from a plain-language description, accepted only if it passes the blueprint schema (validate + repair loop). The model proposes; the schema disposes.

## Also shipped alongside — universal memory hardening (v0.10)

- **Version-controlled sources** ✅ — `lib/sources.js` + `sources/*.json` (ADR #21). Durable client truth in reviewable, diffable files → live semantic memory; idempotent sync (dedupe/update/retire), freshness window retires stale facts, `memory.stats()` for scale observability. The "version-controlled files for up-to-date sources, nothing built to bloat" contract.

---

## Recommended sequence

**2 → 1 → 3 → 4 → 5.** The Shadow Eval Harness (Bet 2) is the measurement substrate everything else is proven on, and it's independently valuable (de-risks installs) — build it first. Then the Verification Layer (Bet 1), the flagship moat, measured by it. Then real Orchestration (Bet 3). Then the Curator (Bet 4, needs 2). Skills (Bet 5) can slot in at any point as a parallel track.

Fastest path to a *demoable* frontier story: **Bet 2 + Bet 1 together** — "here's a corridor graded on 200 scenarios before launch, and here's the fleet catching its own bad outputs before a human sees them." That pair is the pitch that no competitor can answer.
