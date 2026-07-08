---
name: Industry packs: the specialization cascade (v0.4)
summary: **14. Industry packs: the specialization cascade (v0.4).** Plug-and-play across industries is a four-layer resolution, not per-industry agent forks: **Blueprint
tags: adr, pack, industry, specialization, v0.4, cascade
pointers: 
updated: 2026-07-08T00:00:00.000Z
---
# Industry packs: the specialization cascade (v0.4)

**14. Industry packs: the specialization cascade (v0.4).** Plug-and-play across industries is a four-layer resolution, not per-industry agent forks: **Blueprint** (generic workflow) → **Pack** (industry terminology, standing rules, urgency defaults, compliance — data files in `packs/`) → **Profile** (this client's brand/voice/contacts, filled on the onboarding call) → **Memory** (learned, forever). Higher layers override lower. Adding an industry = one JSON file. Compliance-sensitive packs (e.g. healthcare: PHI handling, no care-relationship acknowledgment in reviews) put the guardrails in the pack so no individual setup call can forget them.

_source: platform/ADR.md_
