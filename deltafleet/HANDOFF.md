# DELTA FLEET — Project Handoff

**Date:** July 3, 2026 · **Status:** ✅ all validation passing, everything committed & pushed
**Repo:** `5tvz6frk2z-lgtm/async-app` · **Branch:** `claude/ultrathink-homepage-redesign-3tjsgf` · **Folder:** `deltafleet/`
**Browse:** https://github.com/5tvz6frk2z-lgtm/async-app/tree/claude/ultrathink-homepage-redesign-3tjsgf/deltafleet

This document is sufficient to continue the project in a fresh session with zero prior context.

---

## 1 · What this project is

**Delta Fleet (deltafleet.ai)** — an AI **marketing** agency that deploys specialist agent fleets. Current positioning (v8, the "niche pivot"): marketing services **only** — AEO is the flagship, supported by Content Engine, Lifecycle & Nurture, Analytics & Reporting, and White-Label for agencies. The company's earlier general-ops positioning (quote-to-cash / RevOps) is **archived, not deleted**: those pages keep live URLs with archive banners, per the project's own AEO doctrine (never kill a URL an engine may have cited). The pivot is narrated honestly on the home page ("Specialists beat generalists. We took our own advice.") and About page.

**Business model:** fixed-fee build $10k–$25k+ (CapEx) + managed retainer $500–$3k/mo (OpEx). Tiers: Scout (measurement + starter cadence) / Squadron (the full marketing department, $1,000–$1,800/mo, "most deployed") / Armada (multi-brand & agencies). Retainer auto-formula: `350 + agents×95 + weeklyTasks×0.35 + integrations×40`, clamped $500–$3,400, rounded to $50.

**Fictional-facts caveat:** all statistics, testimonials, POC references and the AEO scoreboard are **plausible-but-illustrative** and labelled as such in figcaptions. Replace with real data before real-world publishing (see §8).

## 2 · Deliverables & where they live

| File | What it is |
|---|---|
| `deltafleet/index.html` | The entire site. One file, ~466 KB, zero build step, zero JS libraries. Only external request: Google Fonts. |
| `deltafleet/tools/audit-cockpit.html` | Internal tool #1 — CFO-grade corridor business cases (see §5). Single file, localStorage. |
| `deltafleet/tools/citation-deck.html` | Internal tool #2 — AEO citation-audit console (see §5). Single file, localStorage. |
| `deltafleet/llms.txt` | AI-crawler descriptor for the marketing positioning (deploy at site root as `/llms.txt`). |
| `deltafleet/README.md` | Site feature/architecture summary + editing cheatsheet. |
| `deltafleet/HANDOFF.md` | This file. |

**Live preview artifacts** (claude.ai, private to owner; redeploy by rebuilding the artifact copy — see §7):
- Site: https://claude.ai/code/artifact/3c557067-1ca4-4745-ac11-9a40304d5a38
- Audit Cockpit: https://claude.ai/code/artifact/a6ab0adf-df17-49bc-9762-e1e29538d52d
- Citation Deck: https://claude.ai/code/artifact/248210e5-eff9-4fe1-9151-0940845eae5c

**New-repo intent:** the user wants this in its own repository. Session GitHub integration returned 403 on repo creation. Path: user creates an empty repo (e.g. `deltafleet`), then in-session `add_repo` → copy the `deltafleet/` folder contents to its root → push. `index.html` works from GitHub Pages as-is (hash routing, no rewrites).

## 3 · Site architecture (index.html, four zones)

1. **Head** — title/meta/OG/Twitter (marketing positioning), Organization + WebSite JSON-LD, inline SVG favicon, Google Fonts (Space Grotesk / Instrument Sans / JetBrains Mono).
2. **`<style>`** — full design system on CSS custom properties. Tie colors = departments: gold AEO & Search · crimson Content Studio · magenta Lifecycle · violet Analytics · cyan Data & Integrations · emerald Web & CRO. Mobile hardening at ≤820px (incl. a `[style*="grid-template-columns"]` collapse rule — inline grids MUST stay collapsible), ≤560px refinements, `prefers-reduced-motion` everywhere.
3. **`<template>` blocks** — 43 templates: 23 pages + 20 posts. Pages inert until routed.
4. **`<script>` engine** — hash router (`ROUTES`/`TITLES` maps; `''`=home; unknown→404; `#/blog/:slug` dynamic via `articleHTML()`), `CLEANUP[]` teardown registry (every page-init pushes stoppers), IntersectionObserver reveal/counter system, and the modules below.

**Key engine modules:**
- `initEarthGL` — WebGL fragment-shader Earth (fbm continents, clouds, night lights, atmo rim + vignetted halo). CSS-earth fallback if no WebGL. Mobile: DPR 1, framebuffer cap 640px.
- `initShipGL` — **raymarched SDF interceptor** (convex faceted hull from plane intersections, smin glass canopy, swept fins, engine cores + volumetric plume sampled along ray, fresnel star env). SVG ship fallback (`#ship-svg`, shown unless `.glship` class set). Mobile cap 360px. The old "robot flyers" system was removed in v7.
- `botSVG(tie,bow,cls,seed)` — procedurally varied suited-robot SVGs (per-instance gradient ids via `BOTUID`). `hydrateBots()` fills `.bot-slot` spans.
- `FLEET` — 504 agents: Norse (36) + Greek (48) deity callsigns, stride 11 (coprime with 84), generation suffixes (ODIN II…) per 84-block; leads via `Math.floor(i/6)%14===13` (bow tie + epaulettes + pocket square); deterministic stats (missions/uptime/precision/autonomy/throughput). `openAgent(i)` = hologram dossier modal (spin rings, scanline, cursor tilt).
- `POSTS` (20) — 18 live + 2 with `arch:1` (`ai-agents-revenue-operations`, `ai-agents-customer-support-operations`). Archived posts: hidden from blog hub, Answer Hub and related-links; still routable with an "ARCHIVED — PRE-SPECIALIZATION" chip.
- `articleHTML()` — adds header, freshness badges, **AEO X-RAY toggle** (`.xray` class dims prose, labels extractable blocks via CSS ::after), TOC, related posts, CTA, **FAQPage + BlogPosting JSON-LD** (note the `<\/script>` escape inside the template literal — keep it).
- `ANSQ` + `initAnswers()` — Answer Hub: question→slug map; answers **auto-extracted at runtime** from each post's first `.callout p` (single source of truth) + FAQPage JSON-LD.
- `gradeAEO()` + `initGrader()` — the free AEO Grader: 7 heuristic checks (direct answer ≤150 words / quotable 40–80w block / hedging rate / entity+number density / question-shaped headings / lists-tables / FAQ signals) → score dial, band, top-3 fixes. Pure client-side.
- `initAgentloop` — simulated live feed (marketing missions); `initPricing` — retainer calculator; `initContact` — front-end-only validation (backend hook = the submit handler).

**Routes (22):** home, services (hub), services/{aeo, content-engine, lifecycle, analytics, white-label, agentloop, the-swarm, agent-fleets*, marketing*}, industries* + 3 industry pages*, agents, pricing, about, contact, blog, answers, aeo-grader. `*` = archived (banner via `.arch-note`, removed from nav/footer).

## 4 · How to edit (conventions that must hold)

- **Add a page:** `<template id="page-x">` + entries in `ROUTES` and `TITLES` + link it. **Add a post:** `<template id="post-slug">` (no h1/meta/CTA — router adds chrome; end with `details.faq` block) + prepend metadata to `POSTS`.
- **Never delete published routes/posts** — archive: add `arch:1` (posts) or an `.arch-note` banner (pages) and remove from nav.
- **Zero dependencies is a hard rule** — no CDNs, no npm. New visual tech = hand-rolled WebGL/canvas with graceful fallback (this also keeps the claude.ai artifact preview working, since its CSP blocks external requests).
- **Answer-first content pattern** on every substantive page: Direct Answer callout (40–80 words, commits to numbers), entity-rich copy, question-shaped headings, tables, FAQ.
- All temporary work in the session scratchpad; patches to index.html done via anchored Python replaces with `assert`-style guards (see repo history), then validated (§7) before commit.

## 5 · Internal tools (v2.2, research-hardened)

**Audit Cockpit** (`tools/audit-cockpit.html`, storage `df-audit-v2`, migrates v1):
Clients → corridors → baseline (roles×loaded-rate×hours, volume, rate-based errors 1–4% benchmark, revenue lift) → model: coverage-adjusted hours (60/40/25 by process type) × residual touch × redeployment factor (1.0/0.7/0.5 hard-vs-soft split); credits 60% errors / 50% lift(soft); ramped 36-month cash (go-live + 25/50/75% ramp); NPV @ hurdle (default 14%, editable in Assumptions tab), IRR (bisection), hard-only NPV, breakeven "survives at X%", 800-iter triangular Monte Carlo via M/E/G confidence tags (±12/28/50%) → P50/P90 payback, P(NPV>0); tornado chart; 6-factor suitability gate (<55 ⇒ RESHAPE); verdict = P50≤12 ∧ P90≤18 ∧ NPV>0 ∧ suit≥55; CD3 portfolio tab; printable client blueprint with measurement plan.

**Citation Deck** (`tools/citation-deck.html`, storage `df-citation-v2`, migrates v1):
Question bank (topic, P1–P3, funnel stage aw/co/de) × 5 engines (ChatGPT, Perplexity, Gemini, Claude, AI Overviews). Cell = outcome (ABSENT/INFLUENCED/MENTIONED/CITED) × position (1 lead/.6 mid/.3 trailing) × sentiment ± inaccuracy × recommended × competitor checkboxes (fixed 3–6 set; delete remaps indices across history) × cited URL; **k=3 samples on P1** (modal outcome, pessimistic ties) → stability index. Metrics: weighted visibility (outcome×position×rec), **true SoV = us/(us+competitor appearances)**, inclusion rate ±95% CI (<5pt deltas display FLAT), mention-vs-citation link gap, rec rate, net sentiment (+corrections trigger >5% inaccurate), leader gap, stage-weighted presence, win/loss with 2-run confirmation rule, domain ledger, gap briefs ranked `pri×stage×absence×(1+compPressure)` with publish tracking + close velocity. Editable tracked brand (run decks per client) + printable client report.

Both: demo seed buttons, JSON export/import, mobile-hardened. Deliberately excluded (per research briefs): WACC/tax modeling, per-cell confidence intervals, prompt-volume indexes, sub-monthly trends.

## 6 · Version history (all on the branch)

v1 handoff (construction-niche original, in first commit message context) → **v2** corporate RevOps rebrand, 17 pages, 10 posts → **v3** pantheon roster + dossiers, +10 posts (20 total), telemetry ticker → **v4** WebGL shader Earth + hologram dossiers + bot art v3 → tools v1 → tools **v2** (two research subagents: RPA/CFO metrics; Profound/Peec/Otterly AEO metrics) → review pass (slider drag fix, v1 data migration, competitor-index integrity, client-report printing) → **v5** AEO stack (service page, Answer Hub, Grader, X-ray, llms.txt, badges) → **v6** mobile pass (inline-grid collapse, table scroll, iOS input zoom, WebGL caps) → **v7** raymarched ship, flyers removed → **v8** marketing-niche specialization + archives. `git log --oneline` on the branch narrates the same.

## 7 · Dev workflow: validate, preview, deploy

```bash
cd deltafleet
# 1) JS syntax (engine extraction)
awk 'f&&/^<\/script>$/{exit} f{print} /^<script>$/{f=1}' index.html > /tmp/app.js && node --check /tmp/app.js
# 2) Wiring: every ROUTES id has a template; every POSTS slug has post-* (and vice versa);
#    every TITLES entry exists; zero dead #/ links. (Validator script pattern lives in repo history;
#    trivially re-derivable: parse ROUTES/POSTS/template ids/hrefs from source.)
# 3) Headless render (WebGL needs swiftshader in containers):
chrome --headless=new --no-sandbox --disable-gpu-sandbox --use-angle=swiftshader \
  --enable-unsafe-swiftshader --hide-scrollbars --virtual-time-budget=7000 \
  --window-size=1440,950 --screenshot=out.png "file://$PWD/index.html#/route"
# NOTE: headless window min-width ≈500px — test mobile breakpoints at 500 (560/820 queries both fire);
# a DOM scrollWidth-vs-clientWidth probe beats eyeballing screenshots for overflow.
```
**Artifact redeploy** (claude.ai previews): strip `<!DOCTYPE html>`, `<html>`, `<head>`, `</head>`, `<body>`, `</body>`, `</html>` wrapper lines (artifact supplies its own skeleton), remove the 3 Google-Fonts `<link>` lines (CSP), and swap the three `--font-*` tokens to fallback stacks (`'Space Grotesk','Avenir Next','Segoe UI',system-ui,...` / `'JetBrains Mono',ui-monospace,...`). Then publish to the same artifact URL. Deployed real site keeps the true fonts.

**Git:** develop on `claude/ultrathink-homepage-redesign-3tjsgf`; push with `git push -u origin <branch>`.

## 8 · Open items / next steps (in rough priority)

1. **Move to its own repo** (blocked only by integration permissions — see §2).
2. **Pre-launch reality pass:** replace illustrative stats + testimonials + scoreboard with real data; wire contact form backend (`initContact` submit handler); og:image + analytics (fire pageviews in `render()`); prerender/canonical strategy if organic search matters (hash URLs = one URL to crawlers; all content IS in source).
3. **Run the first real citation audit** in Citation Deck and publish the scoreboard numbers on `/services/aeo` (replacing "ILLUSTRATIVE" labels) + a dated "Citation Audit: <month>" post — the build-in-public proof loop.
4. **Tool queue** (agreed ideas, unbuilt): **Rulebook** (exceptions→rulings→standing rules, gate-threshold registry), **Fleet Ledger** (client/retainer/MRR ops), **Shadow Grader** (human-vs-agent output grading → gate-relaxation evidence), **Squadron Composer** (visual fleet architect → feeds Audit Cockpit).
5. Nice-to-haves parked: per-dept agent detail expansion, sitemap generator, per-post OG images, second distant escort ship in hero, ship heading tracking Earth's limb.

## 9 · Voice & design quick-reference

Dark sci-fi HUD ("orbital command"): tokens `--void #05070f`, `--ion #4fd8ff` primary, `--coral #ff6a3d` warm accent; JetBrains Mono for labels/data in `.klabel`-style uppercase letter-spaced; Space Grotesk display. Copy voice: confident operator-to-operator, specific numbers over adjectives, honest about limits (illustrative labels, "we'll say so at audit"), space-mission vocabulary (squadrons, missions, sorties, ground control) used consistently but never at the expense of clarity. Agents are named colleagues (ODIN, ATHENA) — this is deliberate change-management doctrine, not just theming.
