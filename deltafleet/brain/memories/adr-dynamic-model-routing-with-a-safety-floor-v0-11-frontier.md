---
name: Dynamic model routing, with a safety floor (v0.11, FRONTIER-PLAN reach idea)
summary: 22. Dynamic model routing, with a safety floor (v0.11, FRONTIER-PLAN reach idea). · lib/routing.js classifyDifficulty infer FRONTIER PLAN TIER DETERMINISTIC routing.js classifydifficulty negotiable refund cheapest
tags: rout, model, floor, tier, safety, frontier
pointers: readme-agentloop-platform-v0-1
updated: 2026-07-08T00:00:00.000Z
---
# Dynamic model routing, with a safety floor (v0.11, FRONTIER-PLAN reach idea)

**22. Dynamic model routing, with a safety floor (v0.11, FRONTIER-PLAN reach idea).** A static per-agent model wastes capability on easy work and under-powers hard work. `lib/routing.js` picks the model TIER per step from a cheap, DETERMINISTIC difficulty classifier (`classifyDifficulty` — plain code, no tokens, reproducible: signals are input size, judgment vs routine verbs, ambiguity markers, high-stakes markers, field count → a 0–1 score → fast/mid/deep tier). The non-negotiable is the **safety floor**: a high-stakes task (legal, refund, press, compliance, negative review) never routes to the cheapest tier no matter how short the input, and high-stakes + judgment forces the deepest tier — cost optimization must never quietly downgrade the work that most needs judgment. Opt-in per pipeline `infer` step (`route: true`, validated infer-only); an un-routed step uses its pinned model exactly as before, and the routing decision is ledgered as a note. Tiers map to the current model lineup (`fast: claude-haiku-4-5`, `mid: claude-sonnet-5`, `deep: claude-opus-4-8`). This is the efficiency frontier — capability spent where it's needed — kept honest by the floor.

_source: platform/ADR.md_
