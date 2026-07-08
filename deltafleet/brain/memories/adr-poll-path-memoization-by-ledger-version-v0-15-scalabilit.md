---
name: Poll-path memoization by ledger version (v0.15, scalability)
summary: **26. Poll-path memoization by ledger version (v0.15, scalability).** With now O(1), the dominant steady-state cost is the console polling ~every 1.5s: each pol
tags: adr, ledger, poll, state, version, path
pointers: 
updated: 2026-07-08T00:00:00.000Z
---
# Poll-path memoization by ledger version (v0.15, scalability)

**26. Poll-path memoization by ledger version (v0.15, scalability).** With `state()` now O(1), the dominant steady-state cost is the console polling `GET /api/state` ~every 1.5s: each poll recomputed the full derived payload (`trustStats`/`verificationStats`/`confidenceStats`/`opsSummary`, each a scan over all history, plus sorting all runs and rebuilding the gate map). That payload only changes when the ledger changes, so the ledger now carries a `version` counter (bumped on every `append`) and the server memoizes the serialized `/api/state` body by it — N concurrent operator pollers and back-to-back idle ticks collapse to a single recompute per append, and an idle deployment serves a cached string. Also collapsed the double `ledger.state()` call in `trustStats` and removed a stray NUL byte that had crept into a gates.js comment (made the file read as binary to tooling). Run-loop hot-path scans (`confidenceStats` per gated action) and metrics-sample growth are addressed separately (ADR #27).

_source: platform/ADR.md_
