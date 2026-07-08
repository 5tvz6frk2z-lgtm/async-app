---
name: 4 · Site (index.html) essentials
summary: Same conventions as ever: hash router (ROUTES/TITLES maps + init dispatch in render()), inert <template> pages, CLEANUP teardowns, archive-don't-delete, zero deps, anchor · ROUTES TITLES CLEANUP REAL SAME URL 12 00 convention dispatch archive anchor
tags: html, essential, swiftshader, font, headless, artifact
pointers: 
updated: 2026-07-08T00:00:00.000Z
---
# 4 · Site (index.html) essentials

Same conventions as ever: hash router (`ROUTES`/`TITLES` maps + init dispatch in `render()`), inert `<template>` pages, `CLEANUP[]` teardowns, archive-don't-delete, zero deps, anchored-Python-patch workflow. Key newer pages: `#/workflow-grader` (12-question corridor-readiness scorer feeding the funnel), `#/daily-brief` (starter product page; sample brief is REAL pipeline output), pricing has a "Phase 00 Starter Rung" panel. Keep the `<\/script>` escape in `articleHTML()`. Validate: `node --check` on extracted script + route/template/link audit + headless render (`--use-angle=swiftshader --enable-unsafe-swiftshader`; headless min width ≈500px). Artifact redeploy: strip doctype/html/head/body + 3 font links, swap `--font-*` fallbacks, publish to the SAME artifact URL.

_source: HANDOFF.md_
