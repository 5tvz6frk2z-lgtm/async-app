# DELTA FLEET — Project Handoff (v2)

**Date:** July 5, 2026 · **Status:** ✅ 40/40 platform tests green, site validated, everything committed & pushed
**Repo:** `5tvz6frk2z-lgtm/async-app` · **Branch:** `claude/ultrathink-homepage-redesign-3tjsgf` · **Folder:** `deltafleet/`
**Browse:** https://github.com/5tvz6frk2z-lgtm/async-app/tree/claude/ultrathink-homepage-redesign-3tjsgf/deltafleet
**Draft PR:** https://github.com/5tvz6frk2z-lgtm/async-app/pull/1

This document is sufficient to continue in a fresh session with zero prior context. Read it before touching anything.

---

## 1 · What this business is now (it evolved — follow the arc)

**Delta Fleet (deltafleet.ai)** started as an AI *marketing* agency site (v1–v8), then pivoted (see `PIVOT-PLAN.md`) into an **AI workflow integration studio**: we install supervised agent fleets into a client's existing tools, gated and measured, and leave them a console. Current strategy layers, decided with the owner across sessions:

- **The ladder:** Daily Brief ($99 setup + $79/mo, or $49/mo BYOK) → Recon (paid audit, ~$2k, fee credited from starter setup) → Install ($8–20k fixed, 30 days) → Flight Ops retainer. Affordability at the bottom, moat at the top. No à-la-carte agent marketplace (deliberately rejected — see chat history rationale in PIVOT-PLAN framing).
- **Execution doctrine: "deterministic spine, agent joints."** Anything that can be plain code IS plain code (zero tokens, reproducible); models are reserved for judgment (classify, summarize, draft in brand voice). Numbers in deliverables are computed, never generated.
- **Plug-and-play across industries** via a four-layer specialization cascade: Blueprint (generic) → Industry Pack (JSON data file) → Client Profile (onboarding call) → **Memory** (learned per client, forever).
- **Trust curve:** brand-visible/irreversible actions start approve-gated; ≥20 verdicts with ≤5% intervention earns a relaxation *proposal* a human applies. Two things never relax: CRM merges, negative-review responses.
- **The flywheel (key moat):** every human edit/rejection at a gate is auto-captured as client memory, so interventions teach the fleet. Trust curve reduces gating; memory reduces the need for edits at all.

## 2 · Repo layout

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

## 3 · Platform architecture (deltafleet/platform — the crown jewels)

One Node process per client. `npm test` (40 tests) · `npm run demo` → console at :4600.

```
blueprints/*.json  7 corridors (6 install + daily-brief starter). Spec: trigger, agents
                   (callsign/role/model/tools), gates {tool: auto|log|approve}, optional
                   pipeline[] (script/infer steps + $refs), metrics, rollback, entry, tier.
packs/*.json       6 industry packs: terminology, standing rules, urgency, compliance
                   (healthcare pack carries PHI guardrails), corridorHints.
lib/ledger.js      Append-only JSONL; ALL state derived by replay (runs, actions,
                   approvals, metrics, gate overrides, memory). Never mutate events.
lib/gates.js       auto/log/approve classification; approve/edit/reject verdicts resolve
                   parked promises; trustStats() → relaxation proposals; changeGate().
lib/runtime.js     AgentRun (tool loop; parks on approval, resumes w/ edited input,
                   rejection final, AbortController kill, step/token budgets) +
                   AnthropicAdapter (fetch, adaptive thinking, default claude-opus-4-8)
                   + MockAdapter (scripted; tests/demo).
lib/pipeline.js    PipelineRun — hybrid executor: script steps (ScriptRegistry, gated
                   like tools) + infer steps (SINGLE completion, numbers-from-input rule);
                   $trigger/$profile/$results refs.
lib/scripts.js     ScriptRegistry + Daily Brief sim handlers + coverage guard.
lib/memory.js      MemoryEngine: rule/preference/fact/pattern, provenance, confidence,
                   confirms; events in the SAME ledger; enableCorrectionCapture() =
                   the flywheel; retrieve() scoped+ranked+budgeted; consolidate() decay.
lib/packs.js       Pack loader + packContext() prompt lines.
lib/mcp.js         Zero-dep MCP client (Streamable HTTP, JSON+SSE responses, session id).
lib/connectors.js  connectors.json maps fleet tool names → MCP server tools;
                   assertBlueprintsCovered = unmapped tool is a BOOT failure.
lib/triggers.js    5-field cron (dom/dow OR rule) + TriggerEngine + webhook handler
                   (x-fleet-secret; schedule blueprints 409 webhooks).
lib/metrics.js     proofFor (baseline vs current, direction-aware) + opsSummary.
lib/report.js      Delta Proof: reportData (activity in window, proof all-time) +
                   printable HTML. Served at GET /report.
server.js          Wires everything. Flags: --demo --port --data --profile
                   --connectors --triggers --hook-secret. BYOK via profile.byok.
console/index.html Client console: approvals queue (approve/edit/reject), run feed
                   with traces, kill, corridor cards (proof + gates + trust), Client
                   Memory panel (teach/retire), Delta Proof button, demo sortie.
profile.example.json / connectors.example.json  Per-client config templates.
```

**Gotchas:** memory/baseline seeding order (capture `FRESH_LEDGER` before seeds — regression fixed in the Delta Proof commit); killed runs void pending approvals in `Ledger.state()`; tool names use `domain.verb`, translated to `__` on the Anthropic wire; `pkill node server.js` from a compound Bash command kills the shell (exit 144) — run it alone.

## 4 · Site (index.html) essentials

Same conventions as ever: hash router (`ROUTES`/`TITLES` maps + init dispatch in `render()`), inert `<template>` pages, `CLEANUP[]` teardowns, archive-don't-delete, zero deps, anchored-Python-patch workflow. Key newer pages: `#/workflow-grader` (12-question corridor-readiness scorer feeding the funnel), `#/daily-brief` (starter product page; sample brief is REAL pipeline output), pricing has a "Phase 00 Starter Rung" panel. Keep the `<\/script>` escape in `articleHTML()`. Validate: `node --check` on extracted script + route/template/link audit + headless render (`--use-angle=swiftshader --enable-unsafe-swiftshader`; headless min width ≈500px). Artifact redeploy: strip doctype/html/head/body + 3 font links, swap `--font-*` fallbacks, publish to the SAME artifact URL.

## 5 · Version history

Site: v1 handoff → v2 corporate → v3 pantheon+20 posts → v4 WebGL Earth/dossiers → v5 AEO stack → v6 mobile → v7 raymarched ship → v8 marketing-niche + archives → **v8.5** Workflow Grader + Daily Brief page → **v9** integration-studio repositioning (home rewrite, `#/corridors` catalog page, nav/footer/meta/llms.txt reframed; marketing = 3 of 6 corridors) + flagship pillar post `how-to-integrate-ai-into-business-workflows`. Marketing service pages (aeo/content-engine/lifecycle/analytics/white-label) intentionally kept as corridor deep-dives, NOT yet rewritten to corridor framing (see open items).
Platform: **v0.1** ledger/gates/runtime/console → **v0.2** MCP bridge + cron/webhook intake → **v0.3** hybrid pipelines + profile + BYOK + daily-brief blueprint → **v0.4** memory engine + industry packs + cascade → **v0.4.1** Delta Proof report.
`git log --oneline` on the branch narrates all of it.

## 6 · Open items (priority order)

1. **Real read-only connectors for Daily Brief** (Gmail/GCal MCP w/ read-only scopes) — needs owner-created OAuth credentials; the bridge already accepts them via connectors.json.
2. **Stripe checkout link** in the Daily Brief CTA + **contact form backend** — account setup, not engineering.
3. **Install #0:** run our own corridors daily on the platform; replace demo scripts with real handlers; first real Delta Proof.
4. **Finish the v9 site pass:** home + `#/corridors` + shell + 1 flagship pillar post are DONE. Remaining: (a) the four marketing service pages still open with marketing-agency framing — reframe as corridor deep-dives, and consider building 3 dedicated deep-dive pages for the corridors that only have catalog entries (Inbox Hygiene, Document Intake, Review Response — their home cards currently link to `#/corridors`/`#/workflow-grader`); (b) 4 more integration pillar posts (per-corridor: "AI for invoice processing", "AI for lead response", etc.) to build the content cluster around the flagship; (c) the About page still tells the marketing-pivot story — update to the integration-studio arc.
5. Move `deltafleet/` to its own repo (blocked: integration can't create repos; owner creates empty repo → add_repo → push).
6. Console auth; Recon print mode in Audit Cockpit; VOR observation→pattern memories; per-blueprint webhook payload schemas.
7. Pre-launch reality pass on the site (replace illustrative stats, og:image, analytics).

## 7 · Voice & doctrine quick-reference

Dark sci-fi HUD (`--void #05070f`, ion cyan, coral warm; JetBrains Mono klabels). Copy voice: operator-to-operator, numbers over adjectives, honest about limits ("illustrative" labels stay until real data exists). Agents are named colleagues (pantheon callsigns) — change-management doctrine. Business writing: lead with the outcome; never let a model state a number code didn't compute.
