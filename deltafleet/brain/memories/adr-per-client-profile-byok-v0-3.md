---
name: Per-client profile + BYOK (v0.3)
summary: **12. Per-client profile + BYOK (v0.3).** carries brand, voice, industry, website, audience — injected into every infer step's system prompt. This is the "confi
tags: adr, profile, byok, client, v0.3, cost
pointers: 
updated: 2026-07-08T00:00:00.000Z
---
# Per-client profile + BYOK (v0.3)

**12. Per-client profile + BYOK (v0.3).** `--profile profile.json` carries brand, voice, industry, website, audience — injected into every infer step's system prompt. This is the "configured to your brand" layer and a switching-cost artifact in its own right. `byok.enabled` bills inference to the client's own Anthropic key (env-var name in the profile) instead of ours — their cost at cost, our margin decoupled from their token volume.

_source: platform/ADR.md_
