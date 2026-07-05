# Agentloop Platform — Architecture Decision Record

**Version:** 0.1 · **Status:** built, tested, demo-able · **Scope:** per-client deployment (PIVOT-PLAN §Phase 2)

## Decisions

**1. One process, one client.** Each client deployment is a single Node process with its own ledger file and console. No multi-tenancy until ≥10 clients justify it (PIVOT-PLAN risk table). Isolation is the security story ("The Swarm"), and it keeps blast radius per-client.

**2. Zero runtime dependencies.** Node ≥22 stdlib only: `node:http`, `node:fs`, `node:test`, global `fetch`. Rationale: nothing to audit or patch downstream, trivially deployable to any VPS, and the same doctrine that kept the marketing site honest. If a future need genuinely requires a dependency, it gets its own ADR entry.

**3. Append-only JSONL ledger; all state is replay.** Events are never mutated. Runs, actions, approvals, metrics and gate overrides are derived by replaying the log (`Ledger.state()`). The audit trail is the product — a client (or we) can reconstruct any past moment from the file. At demo/SMB scale replay cost is negligible; snapshotting is a later optimization, not a design change.

**4. Gates are the platform, not a feature.** Every tool call is classified `auto` / `log` / `approve` from the blueprint plus ledgered overrides. Approval-gated calls PARK the run mid-loop (the runtime awaits the verdict promise) and resume with the human's approved/edited input; rejection is final and fed back to the model as an instruction not to retry. Gate relaxations are evidence-based proposals (≥20 verdicts, ≤5% intervention over the trailing 100) that a human applies — never automatic, always reversible, always ledgered (`gate.change`).

**5. Model access is an adapter.** `AnthropicAdapter` (Messages API over fetch, adaptive thinking, default `claude-opus-4-8`, per-agent override e.g. `claude-haiku-4-5` for triage-grade work) and `MockAdapter` (deterministic scripts for tests + demo). The blueprint format is runtime-agnostic on purpose — vendor dependency is a named risk in the plan.

**6. Tools are a registry; MCP is the wiring plan.** `ToolRegistry` holds name → schema → handler. In demo mode handlers are simulated connectors. Production wiring = handlers that proxy to MCP servers (per-client credentials, per-tool scoping); the runtime, gates, ledger and console do not change when that lands. Tool names use `domain.verb` (dots translated to `__` on the wire since the API restricts tool-name characters).

**7. Console is served by the same process.** One HTML file, polls `/api/state`. The five MVP features and nothing else: approvals queue (approve / approve-edited / reject with reason), run feed with full trace, kill switch, metric tiles, blueprint viewer with trust stats. Kill lands mid-request via AbortController; killed runs void their pending approvals.

**8. Budgets are hard.** `maxSteps` and `maxTokens` per run; exceeding either ends the run as `error` with the reason ledgered. Runaways die loudly.

**9. MCP is the connector seam (v0.2).** `lib/mcp.js` is a minimal zero-dep MCP client over Streamable HTTP: initialize → initialized → tools/list → tools/call, handling both JSON and SSE response modes and echoing `mcp-session-id`. `lib/connectors.js` binds fleet tool names to a client's MCP servers via `connectors.json`; schemas and descriptions come from the server's own tools/list, and `assertBlueprintsCovered` makes an unmapped tool a startup failure, not a mid-run surprise. Deliberately not implemented: stdio transport (we deploy against hosted/gateway MCP servers), resources/prompts (tools are all the runtime consumes), streaming partial results.

**10. Intake mirrors the blueprint's trigger block (v0.2).** Schedule blueprints (`cron: …`) fire from an in-process 5-field cron scheduler (with the classic dom/dow OR rule; at-most-once per matching minute). Event blueprints accept `POST /hooks/{blueprint}` authenticated by a shared `x-fleet-secret`; schedule blueprints refuse webhooks (409). Trigger-launched runs start at the blueprint's optional `entry` agent (default: first listed). All intake funnels through one `launchRun` path — same runtime, gates, ledger.

## Not built yet (deliberately)

Auth on the console (deployments sit behind a client-scoped tunnel/VPN until this lands), Delta Proof PDF export (data is already computed by `proofFor`), snapshot/compaction of long ledgers, MCP stdio transport + OAuth token refresh (gateway concern for now), webhook payload schemas per blueprint.

## Test coverage

`npm test` — 21 cases. Core (13): blueprint validation, ledger replay, verdict lifecycle + double-verdict rejection, trust-curve relaxation proposal + gate change, runtime happy path, approval park/resume with edited input, rejection-as-final, kill-while-parked, step-budget enforcement, proof math direction-awareness, ops rollup. Intake (8): MCP handshake/session/tool-call over both JSON and SSE wire modes, connector mapping + error surfacing + coverage guard, cron matching (steps/ranges/lists/dom-dow OR), scheduler once-per-minute semantics, webhook auth/routing/schedule-rejection.
