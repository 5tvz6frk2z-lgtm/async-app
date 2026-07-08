---
name: Benchmark ledger: the data moat (v0.5)
summary: **15. Benchmark ledger: the data moat (v0.5).** Clients run isolated deployments, so no process sees cross-client data. Each deployment emits an **anonymized**
tags: adr, install, benchmark, data, v0.5, improv
pointers: 
updated: 2026-07-08T00:00:00.000Z
---
# Benchmark ledger: the data moat (v0.5)

**15. Benchmark ledger: the data moat (v0.5).** Clients run isolated deployments, so no process sees cross-client data. Each deployment emits an **anonymized** export (`GET /api/benchmark-export`): per-corridor metric rows carrying only `{blueprint, metric, direction, deltaPct, improved}` plus an **opaque salted-hash install token** — never a brand, never absolute baselines/currents, never free text. A central aggregator (`bin/aggregate.js`) pulls exports from each deployment, dedupes by install token, and computes per-metric install count, improved-rate, and median/p25/p75 gain among improved installs. `claimFor()` turns a cell into a publishable sentence **only above a minimum install count** (honesty gate — the platform mirror of the site's "illustrative until real" rule). This is what eventually lets us say "median 34% cycle-time reduction across 25 installs" — a claim no competitor can copy without our client base — and feeds evidence-based targets back into Recon quotes.

_source: platform/ADR.md_
