---
name: Zero runtime dependencies
summary: 2. Zero runtime dependencies. · fetch VPS ADR 2 22 stdlib global trivially deployable rationale
tags: dependency, node, runtime, zero, deployable, global
pointers: 
updated: 2026-07-08T00:00:00.000Z
---
# Zero runtime dependencies

**2. Zero runtime dependencies.** Node ≥22 stdlib only: `node:http`, `node:fs`, `node:test`, global `fetch`. Rationale: nothing to audit or patch downstream, trivially deployable to any VPS, and the same doctrine that kept the marketing site honest. If a future need genuinely requires a dependency, it gets its own ADR entry.

_source: platform/ADR.md_
