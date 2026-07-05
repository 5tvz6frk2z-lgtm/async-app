# Agentloop Platform (v0.1)

The real thing behind the Delta Fleet pitch: per-client agent runtime + gate engine + append-only run ledger + the client console. Zero dependencies, Node ≥ 22.

```bash
npm test          # 13 tests, node:test, no deps
npm run demo      # console with simulated connectors → http://localhost:4600
```

In demo mode, hit **▸ Run demo sortie** — four corridor runs (HERMOD speed-to-lead, BRAGI reporting, TYR document intake, ECHO review response) execute through the real runtime and park at their human gates. Approve, edit, reject, or kill from the console; watch the trust stats accrue on the corridor cards.

| Path | What |
|---|---|
| `blueprints/*.json` | The six launch blueprints (spec + validator in `lib/blueprint.js`) |
| `lib/ledger.js` | Append-only JSONL event log; all state derived by replay |
| `lib/gates.js` | auto/log/approve classification, verdicts, trust curve, relaxation proposals |
| `lib/runtime.js` | Agent loop: park-on-approval, resume-with-edit, kill switch, hard budgets; Anthropic + Mock adapters |
| `lib/metrics.js` | Delta Proof math (baseline vs current) + ops rollups |
| `lib/demo.js` | Simulated connectors + scripted scenarios (what Install #0 dry-runs look like) |
| `server.js` | node:http — console + JSON API (`/api/state`, `/api/verdict`, `/api/kill`, `/api/gate`, `/api/simulate`) |
| `console/index.html` | The Agentloop console (five MVP features, house HUD style) |
| `ADR.md` | Why it's built this way, and what's deliberately not built yet |

Production deployment = this process + a real `ANTHROPIC_API_KEY` (AnthropicAdapter) + MCP-backed tool handlers per client. The demo path exists so nothing ships that we can't first fly in simulation.
