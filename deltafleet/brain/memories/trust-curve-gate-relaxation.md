---
name: Trust curve & gate relaxation
summary: A gate becomes a relaxation candidate after at least 20 verdicts with under 5% intervention over the trailing 100; two actions never auto-relax.
tags: trust-curve, relaxation, gate, verdict, candidate, intervention
pointers: adr-gates-are-the-platform-not-a-feature
updated: 2026-07-08T00:00:00.000Z
---
# Trust curve & gate relaxation

Brand-visible or irreversible actions start behind a human approval gate. A gate becomes a **relaxation candidate** only on measured evidence: at least **20 verdicts** in the trailing window with an intervention rate (edits + rejects) **under 5%**. Relaxations are proposals a human applies — never automatic, always reversible, always ledgered.

**Two actions never auto-relax:** CRM merges and negative-review responses.

The adversarial verification layer strengthens this: a "verified-clean" history earns autonomy faster than raw approvals.
