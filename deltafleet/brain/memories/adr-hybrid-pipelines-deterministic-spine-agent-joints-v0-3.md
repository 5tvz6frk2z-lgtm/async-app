---
name: Hybrid pipelines: deterministic spine, agent joints (v0.3)
summary: **11. Hybrid pipelines: deterministic spine, agent joints (v0.3).** Blueprints may declare a — ordered steps that are either (plain code from the ScriptRegistry
tags: adr, script, step, pipelin, deterministic, agent
pointers: 
updated: 2026-07-08T00:00:00.000Z
---
# Hybrid pipelines: deterministic spine, agent joints (v0.3)

**11. Hybrid pipelines: deterministic spine, agent joints (v0.3).** Blueprints may declare a `pipeline` — ordered steps that are either `script` (plain code from the ScriptRegistry: same input, same output, zero tokens) or `infer` (a SINGLE model completion for judgment: classify, summarize, draft — no tool loop). Rule: anything that can be deterministic must be a script; numbers in client deliverables come from scripts, so a figure can't be hallucinated — the infer system prompt additionally forbids inventing numbers. Script steps are gated and ledgered identically to tool calls (approve-gated script steps park/resume like agent actions). `$refs` (`$trigger.*`, `$profile.*`, `$results.*`) wire step outputs to step inputs. Corridors needing open-ended agentic behavior keep the AgentRun loop; corridors that can be pipelines should be — this is what makes the starter tier ("Daily Brief") economically real at ~cents/run.

_source: platform/ADR.md_
