---
name: Architecture (single file, four zones)
summary: 1. Head — meta/OG/Twitter tags, Organization JSON-LD, inline SVG favicon, fonts.
tags: readme, system, four, page, architecture, single
pointers: 
updated: 2026-07-08T00:00:00.000Z
---
# Architecture (single file, four zones)

1. **Head** — meta/OG/Twitter tags, Organization JSON-LD, inline SVG favicon, fonts.
2. **`<style>`** — the whole design system (CSS custom-property tokens; tie colours map to agent departments).
3. **`<template>` blocks** — every page and post, inert until routed.
4. **`<script>`** — hash router, IntersectionObserver reveal/counter system, starfield, flight system, agents directory, pricing calculator, blog filter, contact validation, Agentloop feed. Every page init registers teardowns in `CLEANUP[]`.

_source: README.md_
