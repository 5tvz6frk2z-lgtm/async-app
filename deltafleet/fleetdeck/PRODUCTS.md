# Fleet Deck — subscription products

Two recurring products sit on top of the Fleet Deck engines. Both are built and
tested; the numbers below are proposed positioning, not booked revenue.

---

## Agent-Ready Monitor — $99–299/mo

**What it is.** A watchtower for how legible your site is to AI agents and answer
engines (ChatGPT, Claude, Perplexity, Google AI). It scores a page 0–100 on the
signals that decide whether an agent can read and cite you — structured data,
content that survives without JavaScript, and (most of all) whether your robots.txt
lets the answer-engine crawlers in — then it re-checks on a schedule and **tells you
the moment a score slips.**

**Who it's for.** Marketing/SEO teams and site owners who've noticed AI search
sending traffic and don't want a quiet redesign to erase them from the answers.

**What it catches (ranked by real impact):**
1. **A newly-blocked answer-engine retrieval bot** (OAI-SearchBot, Claude-SearchBot,
   PerplexityBot) — the citation-killer. Flagged *critical*; a training-bot block is
   only a warning.
2. **A page turning into a JS shell** after a framework migration — AI crawlers don't
   run JavaScript, so the content vanishes. *Critical.*
3. **Structured data (JSON-LD) disappearing** — ~two-thirds of AI-cited pages carry
   schema. *Warning.*
4. **/llms.txt removed** — low severity (still largely unadopted in 2026).

**Why a subscription and not a one-time audit.** The failure mode is a *regression*
you didn't know you shipped. A score you checked once is worthless a deploy later.
The value is the alert, and the alert only exists if something is watching.

**Delivery.** Slack or webhook on any new regression; a live deck with per-URL score
trend; a cron line and you're done. Alerts fire only on a *worsening change* — a
steady site is silent, so no fatigue.

**Tiers (proposed).** Starter (a few URLs, weekly) → Pro (more URLs, daily, Slack)
→ Agency (many URLs, white-label report).

---

## AI Register — $49–199/mo

**What it is.** A compliance-evidence layer that turns the audit trail you already
have into the artifact an auditor asks for. It maps your fleet's real activity —
human approvals, blocked dangerous actions, tool-supply-chain integrity — onto a
framework's controls, shows honest gaps, exports the evidence as CSV, and **alerts
when your posture slips** (a control that was satisfied moving to a gap).

**Who it's for.** Teams running AI/agents who face the EU AI Act, a US state AI law,
or an internal governance bar, and need continuous evidence rather than a
once-a-year scramble.

**Why it's timely.** EU AI Act **Article 50 transparency obligations apply from
2 August 2026**; the high-risk logging/oversight duties (Art. 12/14) were deferred to
2027–2028. US state laws (Texas TRAIGA, California) took effect in 2026; Colorado's
ADMT framework lands Jan 2027. *(Dates from mid-2026 research — verify against the
Official Journal; the Register maps evidence, it is not legal advice.)*

**What it gives you:**
- A live register per framework (swappable law-packs: baseline governance, EU AI Act)
  with each control marked satisfied / attention / gap and the evidence behind it.
- Tamper-evident records — approvals and denials live on an append-only log, so the
  evidence can't be edited after the fact (the log itself is Article-12 record-keeping).
- CSV export auditors accept, and a regression alert when a control slips.

**Why a subscription.** Compliance is a *posture over time*, not a certificate. The
product's job is to keep the evidence current and warn you the moment it degrades.

**Tiers (proposed).** Basic (governance pack, monthly snapshot) → Standard (a
regulatory pack, weekly, CSV export) → Plus (multiple packs, alerting, retention).

---

## What's shared (the moat)

Both products are *views over one spine* — the same append-only event log the whole
Fleet Deck suite reads. That means an operator who buys one already has the timeline,
the firewall, and the cost meter a step away, and the marginal cost of running a check
is a few microseconds of local compute. Local-first, zero-dependency, deterministic:
nothing to breach, nothing to bill per-seat, nothing to bit-rot.
