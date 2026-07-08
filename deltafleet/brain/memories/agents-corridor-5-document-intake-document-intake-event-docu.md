---
name: Corridor 5 · Document Intake (`document-intake`) — event: document received
summary: Reads invoices/POs/applications ( ·) into structured records ( L): parties, line items, totals, dates, each field with a confidence mark.
tags: agents, document, record, check, themi, exception
pointers: 
updated: 2026-07-08T00:00:00.000Z
---
# Corridor 5 · Document Intake (`document-intake`) — event: document received

| # | Callsign | Job in one line |
|---|---|---|
| 16 | THOTH | Extract the structured record from the document |
| 17 | THEMIS | Validate it against source systems; name the failing check |
| 18 | TYR | Post clean records; route exceptions with reasons |

**16 · THOTH — extractor** *(default tier — misreads are expensive)*
Reads invoices/POs/applications (`docs.read` ·) into structured records (`records.write` L): parties, line items, totals, dates, each field with a confidence mark. Low-confidence fields are flagged, never guessed. **Measured by:** field-level extraction accuracy (audited against THEMIS catches).

**17 · THEMIS — validator** *(Haiku — the checks are rules, not vibes)*
Cross-checks every record: PO match, vendor exists, totals cross-foot, dates sane (`erp.read` ·). Binary verdicts with the failing check named. **The metric that matters is false-pass rate — a bad record posted is worse than ten good ones delayed.** **Measured by:** false-pass rate (target ~0), exception precision.

**18 · TYR — router** *(default tier)*
Clean records post to the target system (**`erp.write` A** — financial writes stay gated until 60 days of clean edit history, per blueprint rollback policy); exceptions go to the human queue with THEMIS's failing check quoted (`notify.slack` L). **Measured by:** touch time per document, posting error rate, exception queue age.

_source: platform/AGENTS.md_
