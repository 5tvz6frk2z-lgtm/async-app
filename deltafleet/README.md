# DELTA FLEET · deltafleet.ai

A futuristic, highly interactive single-file site for **Delta Fleet** — an AI **workflow integration studio** that installs supervised agent fleets into the tools a business already uses: six installable corridors (Speed-to-Lead, Inbox & CRM Hygiene, Reporting Autopilot, Content/AEO, Document Intake, Review & Reputation), a read-only $79/mo Daily Brief starter, gated and measured, run from one console.

**One file. Zero build step. Zero JS dependencies.** The only external request is Google Fonts. The **platform** that actually runs the fleets lives in `platform/` (Node, also zero-dependency) — see `platform/README.md`.

> v9 positioning: the company pivoted from a marketing-only agency to an **integration studio** (marketing is now three of six corridors). The pricing ladder is Daily Brief → Recon → Install → Flight Ops. Earlier general-ops pages and off-niche posts are **archived, not deleted** — URLs stay live with banners to preserve citations and link equity. Full arc in `PIVOT-PLAN.md` and `HANDOFF.md`.

## Quick start

- **Open it:** double-click `index.html` in any modern browser. That's the whole app.
- **Deploy it:** drop `index.html` on any static host (Netlify, Vercel, Cloudflare Pages, GitHub Pages, S3). Routing is hash-based (`#/pricing`, `#/blog/slug`), so no rewrite rules are needed — it even works from `file://`.

## What's inside

- **20 pages:** Home · Services hub · Custom Agent Fleets · Agentloop · The Swarm · Delta Fleet Marketing · **Answer Engine Optimization** · White-Label Partnerships · Industries hub · SaaS & Technology · Professional Services · Financial Services · The Agents (searchable 504-agent directory) · Pricing (tiers + retainer calculator) · **Answer Hub** (Direct Answers auto-extracted from every post, with FAQPage schema) · **AEO Grader** (free client-side citability scoring tool) · About · Contact · Blog hub · 404.
- **20 pillar blog posts** ("The Flight Log"), each ~2,000 words with a Direct Answer block, key takeaways, an animated SVG chart, tables, FAQs, and auto-generated FAQPage + BlogPosting JSON-LD. Category filter chips on the hub.
- **The fleet roster:** 504 procedurally generated agents with callsigns from the Norse and Greek pantheons (ODIN, ATHENA, PROMETHEUS… repeat tours get generation suffixes like "ODIN II"), per-agent stats (missions, uptime, precision/autonomy/throughput), procedurally varied robot SVGs (visor styles, blinking eyes, lapel beacons, lead epaulettes), and a click-to-open **dossier modal** with stat bars and a mission log.
- **Hero:** hand-rolled WebGL shader Earth (fbm continents, drifting clouds, night-side city lights, atmospheric rim — no three.js, zero dependencies; CSS fallback when WebGL is unavailable), canvas starfield, HUD grid overlay, a **raymarched SDF interceptor** (faceted stealth hull via plane-intersection geometry, glass canopy, engine cores with noise flicker, volumetric exhaust plume, fresnel star reflections — also hand-rolled WebGL with SVG fallback), telemetry ticker.
- **Agentloop demo:** a live-updating dashboard mockup with a simulated task feed.
- **AI-SEO / AEO:** answer-first Direct Answer blocks, entity-rich copy, question-shaped headings, Organization + WebSite JSON-LD in head, FAQPage + BlogPosting JSON-LD per article, per-route titles and meta descriptions, freshness badges on articles, an **AEO X-ray toggle** on every post (dims prose, labels the extractable blocks), and an `llms.txt` for AI crawlers.
- **Accessibility:** semantic landmarks, `aria-live` routing, keyboard-operable agent cards and modal (Enter/Space/Escape, `/` to search), focus styles, and full `prefers-reduced-motion` support.

## Architecture (single file, four zones)

1. **Head** — meta/OG/Twitter tags, Organization JSON-LD, inline SVG favicon, fonts.
2. **`<style>`** — the whole design system (CSS custom-property tokens; tie colours map to agent departments).
3. **`<template>` blocks** — every page and post, inert until routed.
4. **`<script>`** — hash router, IntersectionObserver reveal/counter system, starfield, flight system, agents directory, pricing calculator, blog filter, contact validation, Agentloop feed. Every page init registers teardowns in `CLEANUP[]`.

## Editing cheatsheet

- **Add a page:** add `<template id="page-x">`, register it in `ROUTES` and `TITLES`, link it in the nav/footer.
- **Add a post:** add `<template id="post-my-slug">` (no `<h1>`/meta/CTA — the router adds article chrome, TOC, related posts and JSON-LD), then prepend its metadata to `POSTS`.
- **Reskin:** swap the token values in `:root` — generated SVGs read the same `TIES` map.
- **Pricing:** formula and tier thresholds live in `initPricing()`; slider ranges on the `page-pricing` template.

## Before going to production

1. Replace illustrative statistics with real data (charts are labelled "illustrative").
2. Wire the contact form (`initContact()` submit handler) to a real endpoint.
3. Add an `og:image`, analytics, and a canonical/prerender strategy if organic search matters.
4. Audit claims ("500+ trained agents", testimonials, POC references) against reality.

## Validation

- `node --check` on the extracted engine — passing.
- 27 templates; every route and post slug wired; zero dead internal links (see `scripts` note in repo history for the checker).
- Rendered and smoke-tested headlessly in Chromium across all routes, including 404.
