---
name: Delta Fleet — Agent Field Manual
summary: The operational spec for every agent we deploy.
tags: agents, agent, human, ledger, field, verdict
pointers: 
updated: 2026-07-08T00:00:00.000Z
---
# Delta Fleet — Agent Field Manual

The operational spec for every agent we deploy. Blueprints (`blueprints/*.json`) are the machine-readable contract; this file is the human one: mission, authority, escalation, and the number each agent is accountable for. **One rule above all: agents do volume, humans keep judgment.** Anything brand-visible or irreversible starts behind an `approve` gate and earns autonomy through the trust curve (≥20 verdicts, ≤5% intervention) — never by default.

**Shared doctrine (applies to all 22):**
- **The numbers rule.** Any figure in a deliverable is computed by code or quoted from a tool result. Infer/agent prompts forbid invented numbers; hybrid pipelines make it structural.
- **The profile is the personality.** Voice, industry, audience, escalation names and quiet hours come from the client profile — agents have no opinions of their own about tone.
- **Rejection is final.** A human "no" on a gated action is never retried; the agent adapts or ends with a note.
- **Everything is ledgered.** Every action, verdict, note and token lands in the append-only run ledger. If it isn't in the ledger, it didn't happen.
- **Model tiering.** Haiku-tier for classify/route/extract-adjacent work (cheap, fast, high-volume); default tier (Opus-class) wherever brand voice or multi-factor judgment is the product. The blueprint's `model` field is the source of truth.

Legend — gates: **A** approve (parks for human verdict) · **L** log (executes, surfaced in feed) · **·** auto (silent, still ledgered).

---

_source: platform/AGENTS.md_
