---
name: 3 · Platform architecture (deltafleet/platform — the crown jewels)
summary: One Node process per client. · PHI JSONL ALL SINGLE SAME MCP HTTP JSON profile.byok corridorhint mutate promis
tags: tool, json, pack, proof, client, kill
pointers: adr-append-only-jsonl-ledger-all-state-is-replay, readme-delta-fleet-deltafleet-ai, adr-console-is-served-by-the-same-process
updated: 2026-07-08T00:00:00.000Z
---
# 3 · Platform architecture (deltafleet/platform — the crown jewels)

One Node process per client. `npm test` (40 tests) · `npm run demo` → console at :4600.

```
blueprints/*.json  7 corridors (6 install + daily-brief starter). Spec: trigger, agents
                   (callsign/role/model/tools), gates {tool: auto|log|approve}, optional
                   pipeline[] (script/infer steps + $refs), metrics, rollback, entry, tier.
packs/*.json       6 industry packs: terminology, standing rules, urgency, compliance
                   (healthcare pack carries PHI guardrails), corridorHints.
lib/ledger.js      Append-only JSONL; ALL state derived by replay (runs, actions,
                   approvals, metrics, gate overrides, memory). Never mutate events.
lib/gates.js       auto/log/approve classification; approve/edit/reject verdicts resolve
                   parked promises; trustStats() → relaxation proposals; changeGate().
lib/runtime.js     AgentRun (tool loop; parks on approval, resumes w/ edited input,
                   rejection final, AbortController kill, step/token budgets) +
                   AnthropicAdapter (fetch, adaptive thinking, default claude-opus-4-8)
                   + MockAdapter (scripted; tests/demo).
lib/pipeline.js    PipelineRun — hybrid executor: script steps (ScriptRegistry, gated
                   like tools) + infer steps (SINGLE completion, numbers-from-input rule);
                   $trigger/$profile/$results refs.
lib/scripts.js     ScriptRegistry + Daily Brief sim handlers + coverage guard.
lib/memory.js      MemoryEngine: rule/preference/fact/pattern, provenance, confidence,
                   confirms; events in the SAME ledger; enableCorrectionCapture() =
                   the flywheel; retrieve() scoped+ranked+budgeted; consolidate() decay.
lib/packs.js       Pack loader + packContext() prompt lines.
lib/mcp.js         Zero-dep MCP client (Streamable HTTP, JSON+SSE responses, session id).
lib/connectors.js  connectors.json maps fleet tool names → MCP server tools;
                   assertBlueprintsCovered = unmapped tool is a BOOT failure.
lib/triggers.js    5-field cron (dom/dow OR rule) + TriggerEngine + webhook handler
                   (x-fleet-secret; schedule blueprints 409 webhooks).
lib/metrics.js     proofFor (baseline vs current, direction-aware) + opsSummary.
lib/report.js      Delta Proof: reportData (activity in window, proof all-time) +
                   printable HTML. Served at GET /report.
server.js          Wires everything. Flags: --demo --port --data --profile
                   --connectors --triggers --hook-secret. BYOK via profile.byok.
console/index.html Client console: approvals queue (approve/edit/reject), run feed
                   with traces, kill, corridor cards (proof + gates + trust), Client
                   Memory panel (teach/retire), Delta Proof button, demo sortie.
profile.example.json / connectors.example.json  Per-client config templates.
```

**Gotchas:** memory/baseline seeding order (capture `FRESH_LEDGER` before seeds — regression fixed in the Delta Proof commit); killed runs void pending approvals in `Ledger.state()`; tool names use `domain.verb`, translated to `__` on the Anthropic wire; `pkill node server.js` from a compound Bash command kills the shell (exit 144) — run it alone.

_source: HANDOFF.md_
