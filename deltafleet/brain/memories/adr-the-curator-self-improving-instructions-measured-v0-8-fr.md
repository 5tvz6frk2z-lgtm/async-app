---
name: The Curator: self-improving instructions, MEASURED (v0.8, FRONTIER-PLAN Bet 4; depends on Bet 2)
summary: **19. The Curator: self-improving instructions, MEASURED (v0.8, FRONTIER-PLAN Bet 4; depends on Bet 2).** The memory flywheel already captures every human correction as context.
tags: adr, instruction, accept, curator, measur, bet
pointers: 
updated: 2026-07-08T00:00:00.000Z
---
# The Curator: self-improving instructions, MEASURED (v0.8, FRONTIER-PLAN Bet 4; depends on Bet 2)

**19. The Curator: self-improving instructions, MEASURED (v0.8, FRONTIER-PLAN Bet 4; depends on Bet 2).** The memory flywheel already captures every human correction as context. The Curator (`lib/curator.js`) turns that passive context into an active improvement to an agent's own standing instructions — but only when it can *prove* the change helps. Loop: `curate()` (one inference distills the agent's correction history into a proposed instruction overlay) → `abTest()` (run the **Shadow Eval Harness twice on the same scenarios** — current context vs current + overlay — and score both) → `evaluate()` (accept only on measured lift ≥ `CURATE_MIN_LIFT` **and** no new silent failure) → `Curator.propose()` (ledger it; a human accepts/rejects; accepted overlays are versioned, injected into future runs via the context cascade's top layer, and reversible). The safety gate is absolute and is the novel part: naive curator prompt-rewriting shows ~+10% gains but risks silent drift/regressions, so **a candidate that raises accuracy while introducing an unguarded failure (or turning the corridor "unsafe") is rejected regardless of the gain** — measured improvement, never blind. Store is ledger-derived like memory/gates (`instruction.proposed/accepted/rejected/reverted`, state by replay, `activeOverlays()`/`contextLines()` for injection). Wired: `contextFor` injects accepted overlays, `/api/state.instructions` surfaces proposals, `POST /api/instruction {action}` is the human accept/reject/revert, console has a "Curated instructions" panel showing each proposal's measured A/B delta and recommendation. This is compounding per-client quality a static-prompt competitor cannot match — the deepest moat on the frontier list, made safe by refusing to ship any change the harness can't prove.

_source: platform/ADR.md_
