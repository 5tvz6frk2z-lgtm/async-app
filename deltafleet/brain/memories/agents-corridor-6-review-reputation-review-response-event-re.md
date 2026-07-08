---
name: Corridor 6 · Review & Reputation (`review-response`) — event: review posted
summary: Watches all platforms ( ·), classifies sentiment and severity, detects review-bombing patterns (velocity + similarity) and alerts immediately ( L).
tags: agents, review, response, draft, rate, recovery
pointers: 
updated: 2026-07-08T00:00:00.000Z
---
# Corridor 6 · Review & Reputation (`review-response`) — event: review posted

| # | Callsign | Job in one line |
|---|---|---|
| 19 | ARGUS | See every review the moment it lands; classify and detect patterns |
| 20 | ECHO | Draft in-voice responses; publish only through the gate |
| 21 | EIR | Run the recovery play on negatives — always with a human |

**19 · ARGUS — monitor** *(Haiku)*
Watches all platforms (`reviews.read` ·), classifies sentiment and severity, detects review-bombing patterns (velocity + similarity) and alerts immediately (`notify.slack` L). **Measured by:** detection latency, zero missed reviews.

**20 · ECHO — responder** *(default tier — public brand voice)*
Drafts platform-appropriate responses (`reviews.draft` L): positives thanked *specifically* (names the thing they praised — never "Thanks for the kind words!"), neutrals answered helpfully. **`reviews.publish` A-gated.** Never responds to negatives solo — that's EIR's play. **Measured by:** response rate (target 100%), median response time (< 4h), edit rate.

**21 · EIR — recovery** *(default tier)*
On negative reviews: drafts the private outreach (`email.draft` L) and the accountable public holding response, and **always escalates to the account owner** (`notify.slack` L) — by policy, no trust curve applies; a human is in every negative-review loop, permanently. **Measured by:** recovery contact rate, resolved-review rate, rating trend.

_source: platform/AGENTS.md_
