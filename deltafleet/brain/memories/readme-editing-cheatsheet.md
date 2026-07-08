---
name: Editing cheatsheet
summary: - **Add a page:** add , register it in and , link it in the nav/footer.
tags: readme, add, post, page, template, pric
pointers: 
updated: 2026-07-08T00:00:00.000Z
---
# Editing cheatsheet

- **Add a page:** add `<template id="page-x">`, register it in `ROUTES` and `TITLES`, link it in the nav/footer.
- **Add a post:** add `<template id="post-my-slug">` (no `<h1>`/meta/CTA — the router adds article chrome, TOC, related posts and JSON-LD), then prepend its metadata to `POSTS`.
- **Reskin:** swap the token values in `:root` — generated SVGs read the same `TIES` map.
- **Pricing:** formula and tier thresholds live in `initPricing()`; slider ranges on the `page-pricing` template.

_source: README.md_
