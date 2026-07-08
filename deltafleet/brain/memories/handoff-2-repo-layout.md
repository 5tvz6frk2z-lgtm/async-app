---
name: 2 · Repo layout
summary: | Path | What | |---|---| | | The whole site (~486KB, single file, zero deps): 24 routes, 20 posts, WebGL Earth + raymarched ship, Workflow Grader, Daily Brief
tags: handoff, deltafleet, platform, html, site, file
pointers: 
updated: 2026-07-08T00:00:00.000Z
---
# 2 · Repo layout

| Path | What |
|---|---|
| `deltafleet/index.html` | The whole site (~486KB, single file, zero deps): 24 routes, 20 posts, WebGL Earth + raymarched ship, Workflow Grader, Daily Brief page, AEO stack. |
| `deltafleet/platform/` | **The real product.** Agentloop platform v0.4+: Node ≥22, zero npm deps. See §3. |
| `deltafleet/tools/` | Internal single-file tools: `audit-cockpit.html` (Recon ROI cases), `citation-deck.html` (AEO audits), `fleet-ledger.html` (client book/MRR/NRR). |
| `deltafleet/PIVOT-PLAN.md` | The v9 strategy + phased execution plan. |
| `deltafleet/platform/AGENTS.md` | Field manual for all 22 agents (missions, gates, KPIs, escalation). |
| `deltafleet/platform/ADR.md` | **Read before changing the platform.** 14 numbered decisions incl. memory (§13) and packs (§14) with research basis. |
| `deltafleet/HANDOFF.md` | This file. `README.md` + `llms.txt` = site docs/AI-crawler descriptor. |

**Live preview artifacts (claude.ai):** site https://claude.ai/code/artifact/3c557067-1ca4-4745-ac11-9a40304d5a38 · Audit Cockpit …/a6ab0adf-df17-49bc-9762-e1e29538d52d · Citation Deck …/248210e5-eff9-4fe1-9151-0940845eae5c

_source: HANDOFF.md_
