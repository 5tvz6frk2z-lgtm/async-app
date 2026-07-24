---
name: Also shipped alongside — universal memory hardening (v0.10)
summary: Version-controlled sources ✅ — lib/sources.js + sources/.json (ADR #21). · lib/sources.js ADR sources.js memory.stats 21 reviewable observability durable diffable
tags: sourc, memory, alongside, harden, v0.10, controll
pointers: adr-universal-memory-version-controlled-sources-freshness-no
updated: 2026-07-08T00:00:00.000Z
---
# Also shipped alongside — universal memory hardening (v0.10)

- **Version-controlled sources** ✅ — `lib/sources.js` + `sources/*.json` (ADR #21). Durable client truth in reviewable, diffable files → live semantic memory; idempotent sync (dedupe/update/retire), freshness window retires stale facts, `memory.stats()` for scale observability. The "version-controlled files for up-to-date sources, nothing built to bloat" contract.

---

_source: platform/FRONTIER-PLAN.md_
