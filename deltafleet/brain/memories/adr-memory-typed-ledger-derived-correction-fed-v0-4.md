---
name: Memory: typed, ledger-derived, correction-fed (v0.4)
summary: 13. Memory: typed, ledger-derived, correction-fed (v0.4). · edited rejected SAME 13 4 2026 10 memoryengine.retrieve taxonomy procedural episodic distillate
tags: correction, memory, ledger, v0.4, deriv, semantic
pointers: 
updated: 2026-07-08T00:00:00.000Z
---
# Memory: typed, ledger-derived, correction-fed (v0.4)

**13. Memory: typed, ledger-derived, correction-fed (v0.4).** The learning layer uses the standard taxonomy (rule/preference = procedural, fact = semantic, pattern = episodic-distillate) with provenance (onboarding/operator/correction/observation), confidence, confirmation counts, decay and retirement. Memory events live in the SAME append-only ledger as everything else — state by replay, versioning and audit free, nothing silently rewritten. **The flywheel:** every human `edited`/`rejected` gate verdict is captured as a keyed memory candidate; repeated corrections confirm (confidence grows) rather than duplicate; retrieval is scoped (client-wide + corridor), authority-ranked (rule > preference > fact > pattern) and token-budgeted into every prompt. Research basis (validated Jul 2026): the episodic/semantic/procedural taxonomy is the field standard; production practice has moved beyond pure vector similarity toward structured, auditable stores; the curator-playbook injection pattern shows ~+10% agent-benchmark gains; importance scoring + dynamic forgetting are considered required, not optional. **No embeddings at this scale** (hundreds of entries per client, scoped scans) — the seam is `MemoryEngine.retrieve()`; revisit only past ~5k entries per client or cross-corridor semantic search needs.

_source: platform/ADR.md_
