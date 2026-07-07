# Agentloop Platform (v0.1)

The real thing behind the Delta Fleet pitch: per-client agent runtime + gate engine + append-only run ledger + the client console. Zero dependencies, Node ≥ 22.

```bash
npm test          # 68 tests, node:test, no deps
npm run demo      # console with simulated connectors → http://localhost:4600
node bin/shadow.js daily-brief scenarios/daily-brief.example.json   # grade a corridor before launch
```

In demo mode, hit **▸ Run demo sortie** — four corridor runs (HERMOD speed-to-lead, BRAGI reporting, TYR document intake, ECHO review response) execute through the real runtime and park at their human gates. Approve, edit, reject, or kill from the console; watch the trust stats accrue on the corridor cards.

| Path | What |
|---|---|
| `blueprints/*.json` | The six launch blueprints (spec + validator in `lib/blueprint.js`) |
| `lib/ledger.js` | Append-only JSONL event log; all state derived by replay |
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
| `lib/packs.js` + `packs/` | Industry packs — terminology, standing rules, compliance per industry; one JSON file per industry |
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

## Production deployment

```bash
ANTHROPIC_API_KEY=… FLEET_HOOK_SECRET=… \
  node server.js --connectors connectors.json --triggers --data /var/fleet/ledger.jsonl
```

- **Tools:** `--connectors` binds fleet tool names (`crm.read`, `email.send`, …) to the client's MCP servers; startup fails loudly if any blueprint tool is unmapped.
- **Intake:** `--triggers` arms the cron scheduler for schedule blueprints; `FLEET_HOOK_SECRET` enables `POST /hooks/{blueprint}` (header `x-fleet-secret`) for event blueprints. Trigger-launched runs start at the blueprint's `entry` agent (default: first agent).
- **Models:** live mode uses the Anthropic adapter (adaptive thinking; default `claude-opus-4-8`, per-agent overrides like `claude-haiku-4-5` in the blueprint).

The demo path exists so nothing ships that we can't first fly in simulation.
