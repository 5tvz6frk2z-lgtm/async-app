---
name: Confidence calibration off the run hot path (v0.16, scalability)
summary: 27. Confidence calibration off the run hot path (v0.16, scalability). · onEvent calibrationOf agreementRate pendingApprovals trustStats verificationStats opsSummary ADR v0.16 gateengine.request whenever carri
tags: calibration, confidence, path, scan, test, action
pointers: readme-agentloop-platform-v0-1
updated: 2026-07-08T00:00:00.000Z
---
# Confidence calibration off the run hot path (v0.16, scalability)

**27. Confidence calibration off the run hot path (v0.16, scalability).** `GateEngine.request()` — called for every gated action inside the live agent/pipeline loop — computed calibration by calling `confidenceStats()`, an O(all-actions) scan, whenever an action carried a self-reported confidence. That put a full-history scan on the worst possible path: it inflated in-flight run latency as a client's ledger grew. Now the GateEngine folds a per-`${blueprint} ${tool}` calibration aggregate (`{samples, agree, confSum, brier}`) incrementally on each decided confidence-bearing action (a ledger `onEvent` listener, replayed once from history on construct), so `request()`'s calibration lookup and `confidenceStats()` are O(1)/O(keys) — no scan. Output is identical to the former `calibrationOf` computation (same agreement rate / Brier / gap), verified by the unchanged confidence test suite — including the load-bearing detail that `#calibFor` rounds `agreementRate` to 3dp before feeding `calibrate()`, exactly as the old `confidenceStats().find()` path did; an adversarial sub-agent review caught that an unrounded rate would flip a borderline escalation across the 0.5 threshold (one direction silently reducing oversight), and a regression test now pins the parity. Independently, a new ledger test validates `pendingApprovals` against the canonical filter (approve-gated, unverdicted, run alive) computed from scratch, closing the gap an adversarial review flagged (the equivalence test alone shares `#applyOne`). The only remaining history-scan consumers (`trustStats`/`verificationStats`/`opsSummary`) run solely on the memoized poll path (ADR #26), so they recompute at most once per append — acceptable; folding them incrementally too is a future option if a deployment ever shows it in a profile.

_source: platform/ADR.md_
