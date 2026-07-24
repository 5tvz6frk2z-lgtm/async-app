---
name: Bounded metric-sample window; ledger snapshotting deliberately deferred (v0.17, scalability)
summary: 28. Bounded metric-sample window; ledger snapshotting deliberately deferred (v0.17, scalability). · sample proofFor count ledger.events JSONL RAM NOT ADR v0.17 retain reader latest
tags: ledger, sample, bound, window, projection, scalability
pointers: adr-not-built-yet-deliberately
updated: 2026-07-08T00:00:00.000Z
---
# Bounded metric-sample window; ledger snapshotting deliberately deferred (v0.17, scalability)

**28. Bounded metric-sample window; ledger snapshotting deliberately deferred (v0.17, scalability).** The projection retained every `sample` event forever in `metrics[bp][key].samples`, even though the only readers (`proofFor`) need the latest value and the total count. Now the projection keeps a bounded window (`Ledger.SAMPLE_WINDOW = 200`, the latest samples) plus a true `count`; `proofFor` reports `count`. The full sample history remains in the JSONL audit trail — this bounds hot RAM without touching the durability contract. **Deliberately NOT built (yet): full ledger snapshot/segmentation.** A scalability audit ranked it the one large architectural investment, but honestly scoped it as "before the first client crosses a year of heavy use," and our own doctrine warns against over-engineering ahead of need. With `state()` now a materialized view (ADR #25), the memoized poll path (#26), and the hot-path scan removed (#27), the actual bottlenecks are gone; a snapshot would mainly cut *boot* CPU, and doing it correctly means coordinating snapshots across the ledger, memory, and curator projections (each replays `ledger.events` on construct) or it would silently drop history — real risk against the audit-trail-is-the-product contract for a win nobody at current SMB scale is feeling. The design is recorded for when it's warranted: checkpoint each projection's state + a boundary marker (event count + the boundary event's timestamp for validation); on boot, load the checkpoint and replay only the tail; never delete the raw JSONL. Building it now would be bloat; building it then will be a scheduled, test-guarded change with the single `#applyOne` derivation path making equivalence provable.

_source: platform/ADR.md_
