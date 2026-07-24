---
name: Append-only JSONL ledger; all state is replay
summary: 3. Append-only JSONL ledger; all state is replay. · JSONL SMB 3 reconstruct moment negligible snapshott mutat
tags: replay, state, ledger, jsonl, append, only
pointers: 
updated: 2026-07-08T00:00:00.000Z
---
# Append-only JSONL ledger; all state is replay

**3. Append-only JSONL ledger; all state is replay.** Events are never mutated. Runs, actions, approvals, metrics and gate overrides are derived by replaying the log (`Ledger.state()`). The audit trail is the product — a client (or we) can reconstruct any past moment from the file. At demo/SMB scale replay cost is negligible; snapshotting is a later optimization, not a design change.

_source: platform/ADR.md_
