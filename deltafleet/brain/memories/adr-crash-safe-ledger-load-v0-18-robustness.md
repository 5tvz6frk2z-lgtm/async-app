---
name: Crash-safe ledger load (v0.18, robustness)
summary: 29. Crash-safe ledger load (v0.18, robustness). · append JSON.parse JSONL JSON 29 18 json.parse parse eagerly newline otherwise
tags: append, line, crash, record, robustness, torn
pointers: readme-production-deployment
updated: 2026-07-08T00:00:00.000Z
---
# Crash-safe ledger load (v0.18, robustness)

**29. Crash-safe ledger load (v0.18, robustness).** The append-only JSONL is the durability contract, but a process killed mid-`append` can leave a torn final line — and the old loader `JSON.parse`d every line eagerly, so one partial trailing record made the entire deployment fail to boot. Now the loader tolerates exactly one torn *trailing* record: it drops it in memory **and truncates the torn bytes from disk** (a partial line has no newline, so the next append would otherwise concatenate onto it and corrupt the record), logging a warning; the next append writes cleanly after the last intact record. A malformed line anywhere but the end is treated as real corruption and throws with the line number — silently skipping it would rewrite history, which the audit-trail-is-the-product doctrine forbids. On a read-only filesystem the truncate is best-effort and the in-memory drop still yields a correct boot. This makes restart-after-crash a non-event for a system whose whole model is append-and-recover.

_source: platform/ADR.md_
