---
name: Bet 5 · Agent Skills — *reusable, progressively-disclosed capability modules*
summary: **What:** a = a named capability pack — — that an agent loads **on demand** when a task matches, rather than carrying every instruction all the time.
tags: frontier-plan, skill, agent, guidance, load, validator
pointers: 
updated: 2026-07-08T00:00:00.000Z
---
# Bet 5 · Agent Skills — *reusable, progressively-disclosed capability modules*

**What:** a `Skill` = a named capability pack — `{name, description, guidance, examples, validator}` — that an agent loads **on demand** when a task matches, rather than carrying every instruction all the time. The agent sees a one-line description of each available skill; it loads the full guidance only when relevant (progressive disclosure), and the skill's deterministic `validator` checks the output. Skills are **reusable across corridors and clients** — the complement to per-client memory (which is bespoke). Examples: `brand-voice-email`, `invoice-reconciliation`, `meeting-scheduling`, `review-response-tone`, `exec-summary`.

**Why it's a frontier bet:** it mirrors where the whole industry is heading (Anthropic's Skills), applied to our fleet. It's the reuse layer that makes install #15 cheaper than #1 at the *capability* level, not just the blueprint level, and it keeps prompts lean (skills load only when needed → cheaper, more reliable). Less unproven than 1–4, highest immediate reuse leverage.

**How we build & prove it:** a `SkillRegistry`, description-based selection injected into the run context, full-guidance loading on match, and validator enforcement on output. Mock proof: an agent with a `brand-voice-email` skill available → assert the skill's guidance reaches the prompt only when the task matches, and a malformed output fails the validator and is retried.

**Ships with:** ~6 tests, a starter skill library, ADR entry.

---

_source: platform/FRONTIER-PLAN.md_
