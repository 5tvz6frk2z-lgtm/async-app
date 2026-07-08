---
name: Gates are the platform, not a feature
summary: **4. Gates are the platform, not a feature.** Every tool call is classified / / from the blueprint plus ledgered overrides. Approval-gated calls PARK the run mi
tags: adr, feature, platform, call, verdict, human
pointers: 
updated: 2026-07-08T00:00:00.000Z
---
# Gates are the platform, not a feature

**4. Gates are the platform, not a feature.** Every tool call is classified `auto` / `log` / `approve` from the blueprint plus ledgered overrides. Approval-gated calls PARK the run mid-loop (the runtime awaits the verdict promise) and resume with the human's approved/edited input; rejection is final and fed back to the model as an instruction not to retry. Gate relaxations are evidence-based proposals (≥20 verdicts, ≤5% intervention over the trailing 100) that a human applies — never automatic, always reversible, always ledgered (`gate.change`).

_source: platform/ADR.md_
