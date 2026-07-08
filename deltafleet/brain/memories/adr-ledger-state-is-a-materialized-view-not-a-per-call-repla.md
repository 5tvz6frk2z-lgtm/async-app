---
name: Ledger state is a materialized view, not a per-call replay (v0.14, scalability)
summary: **25. Ledger state is a materialized view, not a per-call replay (v0.14, scalability).** was O(events) — a full replay of the entire log — and it is called many
tags: adr, event, state, call, ledger, replay
pointers: 
updated: 2026-07-08T00:00:00.000Z
---
# Ledger state is a materialized view, not a per-call replay (v0.14, scalability)

**25. Ledger state is a materialized view, not a per-call replay (v0.14, scalability).** `Ledger.state()` was O(events) — a full replay of the entire log — and it is called many times per request (apiState, every trust/verification/confidence stat, memory correction-capture, reports). On a client's ledger that grows over months, that made the hot path degrade with history (rebuild-per-read is effectively O(events²) across a request). Now the ledger maintains a single **incrementally-updated materialized view**: `#applyOne(projection, event)` is the one derivation rule set, and both the one-time full-replay build (first `state()`) and every subsequent `append()` route through it, so they can never diverge. `state()` returns the live projection (built once, kept current), and `pendingApprovals` is tracked incrementally (a `pending` map updated on request/verdict/run-end) instead of an O(actions) scan. Repeated reads are O(1) amortized — measured ~10.4s → 0.1ms for 200 reads over a 150k-event log. Correctness is preserved exactly (a full-replay-vs-incremental equivalence test proves it), including the load-bearing detail that `append()` updates the projection **before** listeners fire, so the memory correction-capture listener — which calls `state()` from inside an `onEvent` handler — sees the just-appended event. The returned Maps are the live projection and callers treat them read-only (audited: every call site copies via spread/slice before any sort/reverse). This is the standard event-sourcing materialized-view pattern, applied where our use case actually needed it.

_source: platform/ADR.md_
