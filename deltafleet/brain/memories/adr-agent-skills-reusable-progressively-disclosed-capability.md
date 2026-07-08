---
name: Agent Skills: reusable, progressively-disclosed capability modules (v0.9, FRONTIER-PLAN Bet 5)
summary: **20. Agent Skills: reusable, progressively-disclosed capability modules (v0.9, FRONTIER-PLAN Bet 5).** A () is a named capability pack — . It is the **reuse la
tags: adr, skill, capability, match, agent, guidance
pointers: 
updated: 2026-07-08T00:00:00.000Z
---
# Agent Skills: reusable, progressively-disclosed capability modules (v0.9, FRONTIER-PLAN Bet 5)

**20. Agent Skills: reusable, progressively-disclosed capability modules (v0.9, FRONTIER-PLAN Bet 5).** A `Skill` (`lib/skills.js`) is a named capability pack — `{name, description, guidance, examples, triggers/match, validator}`. It is the **reuse layer that complements per-client memory** (memory is bespoke; a skill serves install #1 and install #15 alike), so capability compounds across the whole book. **Progressive disclosure** keeps prompts lean: an agent sees only a one-line *description* of each available skill by default (`SkillRegistry.descriptions`), and the full *guidance* is injected only when a task actually matches the skill (`matches()` by keyword `triggers` or a `match()` predicate; `contextLines()` returns catalog + loaded guidance). The deterministic **validator** is the teeth — the same "code checks the model" doctrine as scripts/gates/verification, packaged for reuse: `brand-voice-email` rejects exclamation marks / all-caps / hype, `invoice-reconciliation` requires a numeric computed variance, `meeting-scheduling` requires ≥2 concrete slots, `review-response-tone` bans template filler, `exec-summary` requires a leading number under 80 words. Wired: a pipeline `infer` step may pin a `skill`, which loads that skill's guidance into the step and **enforces its validator with one retry** (bad draft rejected, failure fed back, hard-fail if it still can't pass); the server injects the trigger-matched skills catalog into every run's context and passes the registry to pipelines. Starter library ships in `starterSkillRegistry()`; validation is fail-closed. This makes install #N cheaper than #1 at the *capability* level, not just the blueprint level, and keeps prompts cheap and reliable by loading only the manual for the job in front of the agent.

_source: platform/ADR.md_
