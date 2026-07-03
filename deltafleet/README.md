# DELTA FLEET · deltafleet.ai

A futuristic, highly interactive single-file marketing site for **Delta Fleet** — an agency that designs, deploys and manages custom multi-agent AI ecosystems ("fleets") for high-growth companies.

**One file. Zero build step. Zero JS dependencies.** The only external request is Google Fonts.

> This is v2 of the site: rebranded from the original niche vertical to a corporate **revenue-operations** example (quote-to-cash across Salesforce · NetSuite · Stripe), with every page filled out, a blog category filter, and small UX upgrades. It is intended to live in its own repository.

## Quick start

- **Open it:** double-click `index.html` in any modern browser. That's the whole app.
- **Deploy it:** drop `index.html` on any static host (Netlify, Vercel, Cloudflare Pages, GitHub Pages, S3). Routing is hash-based (`#/pricing`, `#/blog/slug`), so no rewrite rules are needed — it even works from `file://`.

## What's inside

- **17 pages:** Home · Services hub · Custom Agent Fleets · Agentloop · The Swarm · Delta Fleet Marketing · White-Label Partnerships · Industries hub · SaaS & Technology · Professional Services · Financial Services · The Agents (searchable 504-agent directory) · Pricing (tiers + retainer calculator) · About · Contact · Blog hub · 404.
- **20 pillar blog posts** ("The Flight Log"), each ~2,000 words with a Direct Answer block, key takeaways, an animated SVG chart, tables, FAQs, and auto-generated FAQPage + BlogPosting JSON-LD. Category filter chips on the hub.
- **The fleet roster:** 504 procedurally generated agents with callsigns from the Norse and Greek pantheons (ODIN, ATHENA, PROMETHEUS… repeat tours get generation suffixes like "ODIN II"), per-agent stats (missions, uptime, precision/autonomy/throughput), procedurally varied robot SVGs (visor styles, blinking eyes, lapel beacons, lead epaulettes), and a click-to-open **dossier modal** with stat bars and a mission log.
- **Hero:** hand-rolled WebGL shader Earth (fbm continents, drifting clouds, night-side city lights, atmospheric rim — no three.js, zero dependencies; CSS fallback when WebGL is unavailable), canvas starfield, HUD grid overlay, animated delta ship, robot deployment flights, telemetry ticker.
- **Agentloop demo:** a live-updating dashboard mockup with a simulated task feed.
- **AI-SEO / AEO:** answer-first Direct Answer blocks, entity-rich copy, question-shaped headings, Organization + WebSite JSON-LD in head, FAQPage + BlogPosting JSON-LD per article, per-route titles and meta descriptions.
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
