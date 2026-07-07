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
Platform: **v0.1** ledger/gates/runtime/console → **v0.2** MCP bridge + cron/webhook intake → **v0.3** hybrid pipelines + profile + BYOK + daily-brief blueprint → **v0.4** memory engine + industry packs + cascade → **v0.4.1** Delta Proof report → **v0.5** benchmark ledger (anonymized cross-install exports + aggregator + honesty-gated claims — the data moat) → **v0.6** frontier bets (see `platform/FRONTIER-PLAN.md`): **Shadow Eval Harness** (Bet 2 — grade a corridor against known-good scenarios in an isolated sandbox before launch; `lib/shadow.js` + `bin/shadow.js`; readiness verdict + guarded-vs-silent safety signal) and the **Adversarial Verification Layer** (Bet 1 — `verify` gate tier; N skeptic verifier agents refute an action before it executes, strict-majority-clean to pass else held + self-repair; `lib/verify.js`; "caught before you" counter + verify→log trust curve; wired into runtime + pipeline + console) → **v0.7** **Multi-Agent Orchestration** (Bet 3 — `Coordinator` runs a blueprint's agents as a graph: sequential / parallel / judge / delegate; each sub-agent isolated with its own adapter+context, gated/killable/verifiable, threaded in the ledger; `lib/orchestrate.js` + `orchestration` blueprint block; console crew badge) → **v0.8** **The Curator** (Bet 4 — distills corrections into a proposed instruction overlay, A/B-tests it on the Shadow Eval Harness, accepts only on measured lift AND no new silent failure; versioned/reversible, human-approved, injected into future runs; `lib/curator.js` + `/api/instruction` + console panel) → **v0.9** **Agent Skills** (Bet 5 — reusable `{name,description,guidance,examples,validator}` capability modules, progressively disclosed so full guidance loads only on a task match; deterministic validators; starter library; pipeline `infer` steps can pin a `skill` that validates output with one retry; `lib/skills.js`; catalog injected into run context). **82 tests.** All five frontier bets (FRONTIER-PLAN Bets 1–5) built, tested, wired → **v0.10** version-controlled **sources** → clean-scaling memory (`lib/sources.js`, dedupe/update/retire + freshness + `memory.stats()`) → **v0.11** **dynamic model routing** with safety floor (`lib/routing.js`) → **v0.12** **calibrated-confidence autonomy**, escalate-only (`lib/confidence.js`) → **v0.13** **Squadron Composer** — schema-gated corridor design (`lib/composer.js` + `bin/compose.js`). **112 tests.** **All five bets AND all three reach ideas are now built; the universal memory architecture is version-controlled, freshness-managed, and anti-bloat.** Nothing on the frontier list remains unbuilt except the documented ledger snapshot/compaction seam (ADR #21, only needed once a deployment's raw log gets large).
Site v9 detail: home + `#/corridors` catalog + **3 corridor deep-dive pages** (`#/services/inbox-hygiene`, `#/services/document-intake`, `#/services/review-response`) + 4 marketing service pages reframed to corridor framing + About reframed + Agentloop page upgraded to show real platform capabilities + **5 integration pillar posts** (`how-to-integrate-ai-into-business-workflows`, `ai-invoice-processing-guide`, `ai-speed-to-lead-response`, `ai-automated-reporting`, `ai-review-management`). All six corridors have a linked home. 28 routes, 25 posts. Home `<title>` fixed to integration-studio.
`git log --oneline` on the branch narrates all of it.

## 6 · Open items (priority order)

1. **Real read-only connectors for Daily Brief** (Gmail/GCal MCP w/ read-only scopes) — needs owner-created OAuth credentials; the bridge already accepts them via connectors.json.
2. **Stripe checkout link** in the Daily Brief CTA + **contact form backend** — account setup, not engineering.
3. **Install #0:** run our own corridors daily on the platform; replace demo scripts with real handlers; first real Delta Proof.
4. **v9 site + content: DONE.** Home, `#/corridors`, all 6 corridor pages, service-page reframe, About, **5 integration pillar posts** (integrate-workflows, invoice-processing, speed-to-lead, automated-reporting, review-management), and the Agentloop page upgraded to show the real platform (approvals queue / trust curve / memory flywheel / Delta Proof). Optional polish only: `#/services` hub page + archived pages still carry older framing (low priority, not in main nav); consider og:image + analytics before real launch.
5. Move `deltafleet/` to its own repo (blocked: integration can't create repos; owner creates empty repo → add_repo → push).
6. Console auth; Recon print mode in Audit Cockpit; VOR observation→pattern memories; per-blueprint webhook payload schemas.
7. Pre-launch reality pass on the site (replace illustrative stats, og:image, analytics).

## 7 · Voice & doctrine quick-reference

Dark sci-fi HUD (`--void #05070f`, ion cyan, coral warm; JetBrains Mono klabels). Copy voice: operator-to-operator, numbers over adjectives, honest about limits ("illustrative" labels stay until real data exists). Agents are named colleagues (pantheon callsigns) — change-management doctrine. Business writing: lead with the outcome; never let a model state a number code didn't compute.
