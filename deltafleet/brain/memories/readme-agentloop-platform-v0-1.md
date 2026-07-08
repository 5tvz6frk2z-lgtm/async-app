---
name: Agentloop Platform (v0.1)
summary: The real thing behind the Delta Fleet pitch: per-client agent runtime + gate engine + append-only run ledger + the client console.
tags: readme, agent, json, client, blueprint, report
pointers: 
updated: 2026-07-08T00:00:00.000Z
---
# Agentloop Platform (v0.1)

The real thing behind the Delta Fleet pitch: per-client agent runtime + gate engine + append-only run ledger + the client console. Zero dependencies, Node ≥ 22.

```bash
npm test          # 116 tests, node:test, no deps
npm run demo      # console with simulated connectors → http://localhost:4600
node bin/shadow.js daily-brief scenarios/daily-brief.example.json   # grade a corridor before launch
```

In demo mode, hit **▸ Run demo sortie** — four corridor runs (HERMOD speed-to-lead, BRAGI reporting, TYR document intake, ECHO review response) execute through the real runtime and park at their human gates. Approve, edit, reject, or kill from the console; watch the trust stats accrue on the corridor cards.

| Path | What |
|---|---|
| `blueprints/*.json` | The six launch blueprints (spec + validator in `lib/blueprint.js`) |
| `lib/ledger.js` | Append-only JSONL event log; state is an incrementally-maintained materialized view (O(1) amortized reads), built once then kept current on append |
| `lib/gates.js` | auto/log/approve classification, verdicts, trust curve, relaxation proposals |
| `lib/runtime.js` | Agent loop: park-on-approval, resume-with-edit, kill switch, hard budgets; Anthropic + Mock adapters |
| `lib/verify.js` | **Adversarial Verification Layer:** `verify` gate tier — N skeptic verifier agents refute an action before it executes; strict-majority-clean to pass, else held + self-repair; fail-safe; `caught` counter + verify→log trust curve |
| `lib/orchestrate.js` | **Multi-Agent Orchestration:** `Coordinator` runs a blueprint's agents as a graph — sequential / parallel / judge / delegate; each sub-agent isolated (own adapter + context), gated/killable/verifiable, threaded in the ledger |
| `lib/mcp.js` | Zero-dep MCP client (Streamable HTTP: JSON + SSE responses, session handling) |
| `lib/connectors.js` | connectors.json → ToolRegistry bridge; startup coverage guard |
| `lib/triggers.js` | Intake: 5-field cron scheduler + authenticated webhook handler |
| `lib/pipeline.js` | Hybrid executor: deterministic `script` steps + single-shot `infer` steps, `$ref` wiring, profile-configured prompts |
| `lib/scripts.js` | ScriptRegistry (the deterministic spine) + Daily Brief sim handlers; startup coverage guard |
| `lib/memory.js` | Learning layer: typed memories (rule/pref/fact/pattern) in the ledger; correction capture from gate verdicts; decay + consolidation |
| `lib/curator.js` | **The Curator:** distills corrections into a proposed instruction overlay, A/B-tests it on the Shadow Eval Harness, accepts only on measured lift with no new silent failure; versioned, reversible, human-approved overlays injected into future runs |
| `lib/skills.js` | **Agent Skills:** reusable `{name, description, guidance, examples, validator}` modules, progressively disclosed (guidance loads only on a task match), deterministic output validators; starter library; pipeline steps can pin a skill (validate + one retry) |
| `lib/routing.js` | **Dynamic model routing:** deterministic difficulty classifier picks the model tier per step (fast/mid/deep); high-stakes work never routes to the cheap tier (safety floor); opt-in per infer step (`route: true`) |
| `lib/confidence.js` | **Calibrated-confidence autonomy:** a self-reported confidence can only escalate a gate to human approval, never relax it; calibrated against the agent's track record; agreement/Brier/gap stats |
| `lib/composer.js` + `bin/compose.js` | **Squadron Composer:** an agent that designs a corridor from a plain-language description, accepted only if it passes the blueprint schema (validate + repair loop); CLI writes validated blueprints |
| `lib/packs.js` + `packs/` | Industry packs — terminology, standing rules, compliance per industry; one JSON file per industry |
| `lib/sources.js` + `sources/` | **Version-controlled sources:** durable client truth in diffable files → live semantic memory; idempotent sync (dedupe/update/retire), freshness (`ttlDays`) retires stale facts, `memory.stats()` for scale observability. `--sources <dir>` |
| `lib/metrics.js` | Delta Proof math (baseline vs current) + ops rollups |
| `lib/report.js` | Delta Proof monthly client report (data + printable HTML); served at `GET /report` |
| `lib/benchmark.js` + `bin/aggregate.js` | Data moat: anonymized per-install export (`GET /api/benchmark-export`) + cross-install aggregator with an honesty-gated claim generator |
| `lib/shadow.js` + `bin/shadow.js` | **Shadow Eval Harness:** grade a corridor against known-good scenarios in an isolated sandbox (nothing written, approve-gates downgraded), producing a readiness report — accuracy, named failures, and the guarded-vs-silent safety signal. CLI exits non-zero when a corridor isn't ready |
| `lib/demo.js` | Simulated connectors + scripted scenarios (what Install #0 dry-runs look like) |
| `server.js` | node:http — console + JSON API (`/api/state`, `/api/verdict`, `/api/kill`, `/api/gate`, `/api/simulate`) + `POST /hooks/{blueprint}` |
| `console/index.html` | The Agentloop console (five MVP features, house HUD style) |
| `connectors.example.json` | Template for binding fleet tool names to a client's MCP servers |
| `profile.example.json` | Per-client brand/voice/industry config + BYOK (client's own API key) |
| `ADR.md` | Why it's built this way, and what's deliberately not built yet |

_source: platform/README.md_
