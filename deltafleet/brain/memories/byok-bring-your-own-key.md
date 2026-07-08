---
name: BYOK — bring your own key
summary: When a client opts in, inference bills to their own Anthropic key via profile.byok, decoupling our margin from their token volume.
tags: byok, pricing, inference, profile, cost
pointers: the-pricing-ladder
updated: 2026-07-08T00:00:00.000Z
---
# BYOK — bring your own key

Bring-your-own-key: when the client profile opts in (`profile.byok.enabled`), inference bills to the client's own Anthropic key (env-var named in the profile) instead of ours. Their cost at cost, our margin decoupled from their token volume. It drops the Daily Brief starter from $79 to $49/month.
