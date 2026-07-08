---
name: Squadron Composer: design corridors, schema-gated (v0.13, FRONTIER-PLAN reach idea)
summary: **24. Squadron Composer: design corridors, schema-gated (v0.13, FRONTIER-PLAN reach idea).** The meta-level capability: an agent that *designs* a corridor from
tags: adr, blueprint, design, corridor, gat, composer
pointers: 
updated: 2026-07-08T00:00:00.000Z
---
# Squadron Composer: design corridors, schema-gated (v0.13, FRONTIER-PLAN reach idea)

**24. Squadron Composer: design corridors, schema-gated (v0.13, FRONTIER-PLAN reach idea).** The meta-level capability: an agent that *designs* a corridor from a plain-language workflow description, emitting a complete blueprint (trigger, agents, gates, connectors, metrics, rollback). `lib/composer.js` `composeBlueprint()` runs one inference, extracts the JSON (tolerating prose/fences via a balanced-brace parser), and — the safety rail — **accepts the design only if it passes `validateBlueprint`**; a design that fails is fed its own validation errors and asked to repair (bounded `maxRepairs`), then given up on cleanly. It never returns a broken blueprint. The system prompt encodes the platform's own rules (brand-visible/irreversible tools must be `approve`/`verify`, every gated tool must be used, a `*` default is required) and seeds reuse from a `composerCatalog` of tools + pantheon callsigns harvested from existing blueprints. `bin/compose.js "<description>" [--save]` is the CLI (needs a key; `--save` writes a validated blueprint to `blueprints/`, refusing to overwrite). The model proposes; the schema disposes — the same "code is the guarantee, the model is the judgment" doctrine, applied to blueprint authorship itself. This is the substrate for eventually letting a Recon call end with a drafted, validated corridor.

_source: platform/ADR.md_
