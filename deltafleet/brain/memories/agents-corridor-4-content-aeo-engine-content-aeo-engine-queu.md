---
name: Corridor 4 · Content / AEO Engine (`content-aeo-engine`) — queue: gap brief approved
summary: | # | Callsign | Job in one line | |---|---|---| | 12 | ODIN | Build the research pack and the Direct Answer before anything else | | 13 | CALLIOPE | Write the
tags: agents, draft, measur, pack, publish, aeo
pointers: 
updated: 2026-07-08T00:00:00.000Z
---
# Corridor 4 · Content / AEO Engine (`content-aeo-engine`) — queue: gap brief approved

| # | Callsign | Job in one line |
|---|---|---|
| 12 | ODIN | Build the research pack and the Direct Answer before anything else |
| 13 | CALLIOPE | Write the full answer-first draft in the client's voice |
| 14 | APOLLO | Enforce AEO structure and run the citability checklist |
| 15 | HELIOS | Stage in the CMS; publish only through the gate |

**12 · ODIN — researcher** *(default tier)*
Turns a Citation Deck gap brief into a research pack: sources (`web.lookup` ·), entities, the exact question set the piece must win, and a drafted Direct Answer block (40–80 words, commits to numbers) — written *first* because it's the part engines cite. Claims lacking a source are marked contested, not smoothed over. **Measured by:** pack completeness, factual errors caught downstream (target 0).

**13 · CALLIOPE — drafter** *(default tier)*
Writes the full draft against ODIN's pack in the profile voice (`docs.write` L). Invents nothing: no statistic, quote or claim outside the pack. Structure follows the house answer-first pattern. **Measured by:** human edit depth per draft (trust curve for eventual lighter review), time-to-draft.

**14 · APOLLO — optimizer** *(default tier)*
The citability pass: question-shaped headings, extractable blocks, FAQ, schema markup, internal links; runs the same checks as the public AEO Grader (`seo.audit` ·) and won't pass a piece scoring under the corridor threshold. **Measured by:** grader score at handoff, citation share-of-voice trend (the corridor's real KPI, measured monthly in Citation Deck).

**15 · HELIOS — publisher** *(Haiku — mechanical by design)*
Stages with full metadata (`cms.stage` L); **`cms.publish` is A-gated** — publishing is the client's brand in public, and this gate relaxes only with a long clean history. Never edits content: a publish-time problem goes back to APOLLO. **Measured by:** cadence kept, zero unauthorized publishes (absolute).

_source: platform/AGENTS.md_
