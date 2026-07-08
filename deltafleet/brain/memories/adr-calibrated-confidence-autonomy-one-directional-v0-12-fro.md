---
name: Calibrated-confidence autonomy — one-directional (v0.12, FRONTIER-PLAN reach idea)
summary: **23. Calibrated-confidence autonomy — one-directional (v0.12, FRONTIER-PLAN reach idea).** An agent may attach a self-reported (0–1) to a gated action ( or an
tags: adr, confidence, calibrat, autonomy, agent, directional
pointers: 
updated: 2026-07-08T00:00:00.000Z
---
# Calibrated-confidence autonomy — one-directional (v0.12, FRONTIER-PLAN reach idea)

**23. Calibrated-confidence autonomy — one-directional (v0.12, FRONTIER-PLAN reach idea).** An agent may attach a self-reported `confidence` (0–1) to a gated action (`call.confidence` or an `input._confidence` field). `lib/confidence.js` treats it strictly safely: (1) confidence can only **escalate** a gate — a low-confidence action on an `auto`/`log` gate is bumped up to human `approve` — and can **never relax** one (an `approve` gate stays `approve` at any confidence), so the two never-relax actions (CRM merges, negative-review responses) are untouched and autonomy is still earned only through the human-applied trust curve; (2) raw confidence is **calibrated** against how well this agent's past confidence on this tool actually predicted human agreement (`calibrate` discounts a chronically overconfident agent, so it escalates *more*); (3) `GateEngine.confidenceStats()` measures calibration per blueprint+tool — agreement rate, Brier score, and the overconfidence gap (mean confidence − agreement) — surfaced in `/api/state.confidence`. The mechanism only ever adds oversight where the agent is unsure, which is why it was safe to build now that verification (ADR #17) exists. Uncertainty buys more supervision, never less.

_source: platform/ADR.md_
