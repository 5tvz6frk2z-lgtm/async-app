# Cortex — a second brain for Claude Code

A zero-dependency second brain for this workspace. It answers a question by
**scoring a one-line index, opening one file, pulling one section, following one
pointer** — then hands the model evidence that's already attached. No model
calls in the retrieval path; numbers are computed, never generated. Same doctrine
as the rest of Delta Fleet: deterministic spine, agent joints.

```bash
node bin/brain.js ask "how does the append-only ledger derive state?"   # retrieve → evidence block
node bin/brain.js save --name "Trust curve" --summary "…" --tags a,b     # write file + index line (atomic)
node bin/brain.js seed /path/to/workspace                                # scan docs + overlay curated notes
node bin/brain.js bench bench.json                                       # the fair test (exits non-zero until it wins)
node bin/brain.js bench bench-general.json                               # independent generalization set (17 fresh questions)
node server.js                                                           # the interactive UI → http://localhost:4700
npm test                                                                 # 11 tests, node:test, zero deps
```

## The path (lib/retrieve.js)

1. **strip to keywords** — stopwords out, light stemming, dotted tool-ids kept.
2. **score the index without opening files** — field-weighted IDF over one-line
   entries (name/tags/summary/id), fuzzy common-prefix matching, a coverage
   factor that rewards answering the *whole* question.
3. **open only the single best file.**
4. **pull only the answering section** (best heading + body).
5. **follow at most one pointer** — the referenced memory that best fits the query.
6. **hand back an evidence block** + a token/latency readout. The model only
   sees this.

## Files

| Path | What |
|---|---|
| `index.jsonl` | The catalogue — one line per memory (id, name, tags, summary, pointers). The thing retrieval scores. |
| `memories/*.md` | The memories — markdown with frontmatter. The durable source of truth. |
| `curated.json` | Hand-written concept notes overlaid on the scan (the things we look up often). |
| `lib/` | tokenize · index · retrieve · sections · store · scan · bench · tokens |
| `bin/brain.js` | CLI. `server.js` + `ui/index.html` | the interactive UI. |
| `bench.json` | Rerunnable fair-test prompts. |

## Fair test (rerun anytime: `npm run bench` or the UI's "Fair test")

Brain path vs. the honest no-retrieval baseline (load the whole knowledge base
into context). Current result on this workspace (~87 memories):

- **90× fewer tokens** (median) than dumping the store — evidence is ~400
  tokens vs ~36k.
- **12/12** on the primary set; **15/17 (88%)** on an *independent* generalization
  set written by a separate agent with fresh phrasing (`bench-general.json`).
- **~0.8 ms** median retrieval.

That's the 5× memory/Claude-usage target cleared ~18×. The independent set is the
honest number: it's the ceiling of zero-embedding keyword retrieval on unseen
phrasing, and it's why the retrieval path does a body-aware re-rank (open the top
few, let the body break the tie) rather than trusting the one-line index alone.

## Routing note for CLAUDE.md

Add this so every session uses the brain **index-first**:

> **Second brain:** before reading files to answer a question about this
> workspace, run `node deltafleet/brain/bin/brain.js ask "<question>"` (or open
> the UI). It scores the one-line index, opens only the best file, and returns
> the answering section as an evidence block — check the index first, open files
> second. Save durable facts with `brain save` so the catalogue stays current.
