# Fleet Deck

A local-first, zero-dependency operator suite for AI agents. Not a stack of
separate apps — a set of **views over one shared spine**: the append-only event
timeline every tool reads and writes. An approval, the tool call it gated, and
that call's token cost are the same events seen through different lenses, never
separate databases to reconcile.

Node ≥22, standard library only. No npm dependencies. No telemetry leaves the box.

## The spine

`lib/spine.js` — an append-only JSONL event log with:

- **Crash-safe load** — tolerates one torn final line; anything else corrupt
  (including a non-object line) throws rather than silently rewrite history.
- **Incremental named projections** — each tool registers a view, built once by
  replay then advanced on every append; replay and incremental are the same code
  path, so they can't diverge.
- **Maintained query indexes** — ordered query by kind / subject / time, verified
  against a strict-equality scan.
- **Unforgeable stamps** — `id`/`seq`/`ts`/`kind` are spine-authoritative; a
  caller's payload can never overwrite them. The audit trail *is* the product.

## The views

| Tool | File | What it does |
|------|------|--------------|
| **Tollgate** | `lib/tollgate.js` | Local MCP firewall. Deny-by-default per-agent tool scoping (deny is a hard floor across scopes). Pins each server's advertised tools and raises **CRITICAL drift** when a description / title / input-schema changes on an already-approved tool — the tool-poisoning / rug-pull signature. `readOnlyHint` is advisory, never a grant. |
| **Flight Recorder** | `lib/recorder.js` | One chronological timeline of every agent action; correlates call→result into a single entry with duration and cost; exports **OpenTelemetry GenAI** spans (`execute_tool`). |
| **Meter** | `lib/meter.js` | Token/cost FinOps rollups by agent / model / day / total, with budget alarms (ok → warning → exceeded). Pure read-model. |
| **Approvals Inbox** | `lib/approvals.js` | Cross-agent human-in-the-loop. A Tollgate `review` decision is the request; a human resolves it with an `approval.verdict` event. Doubles as tamper-evident compliance evidence. |
| **AI Register** | `lib/register.js` | Regulation-agnostic compliance evidence. Maps spine events to a swappable **law-pack**'s controls (baseline governance, EU AI Act). Exports the evidence as CSV. |
| **Preflight** | `lib/preflight.js` | CI for your agent policy. Replays a candidate Tollgate manifest against real history and reports which calls would newly be denied / allowed / held — and dry-runs an MCP server update against its pin without recording. Flags a change UNSAFE if it would newly *allow* a previously-blocked call. |
| **Agent-Ready** | `lib/agentready.js` | Scores how legible a web page is to AI agents / answer engines (JSON-LD, content density, robots.txt AI-crawler access across 13 known tokens, llms.txt, semantics) into a transparent 0–100 rubric with prioritized fixes. Pure `analyze()`; fetch is separate. |
| **Cortex-as-MCP** | `lib/cortex-mcp.js` | Wraps the Cortex second brain (`../brain`) as a real **MCP server** (`memory_search` / `memory_stats`) over the stdio transport. Any MCP client can query the second brain as a tool and get a compact evidence block. Because it's a real MCP server, Tollgate can pin and guard it like any other. |

## Run it

```bash
node bin/fleetdeck.js seed          # play the demo scenario onto a spine
node bin/fleetdeck.js serve         # operator UI + JSON API at http://localhost:7420
node bin/cortex-mcp.js              # serve the second brain as an MCP server (stdio)
```

Other CLI verbs: `timeline`, `alerts`, `meter`, `inbox`, `approve/reject`,
`register [pack] [--csv]`, `check <url>`.

```bash
node --test                         # the whole suite
```

## Design doctrine

- **One spine, many views.** A view never owns state; it registers a projection.
- **Deterministic.** Given the same events, every view is a pure function of the log.
- **Actors vs observers.** Meter, Recorder, Register only read. Tollgate and the
  Approvals Inbox write events (a decision, a verdict) — deliberately, and those
  writes are themselves auditable timeline entries.
- **Illustrative until real.** Demo figures and pricing are labeled illustrative;
  law-pack article mappings are an engineering aid, not legal advice.

Every module is covered by `node:test` suites, including adversarial suites that
attack the firewall's permission logic and the spine's durability guarantees.
