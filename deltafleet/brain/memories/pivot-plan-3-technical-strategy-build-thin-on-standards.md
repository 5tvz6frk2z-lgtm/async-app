---
name: 3 · Technical strategy — build thin, on standards
summary: The unlock: build on MCP (Model Context Protocol). · MCP SDK CRM 10 30 protocol integratable ecosystem mature databas
tags: build, engine, client, connector, proof, console
pointers: 
updated: 2026-07-08T00:00:00.000Z
---
# 3 · Technical strategy — build thin, on standards

**The unlock: build on MCP (Model Context Protocol).** "Integratable" is already solved
by the ecosystem — mature MCP servers exist for CRMs, email, calendars, Slack, sheets,
databases, ticketing. We **curate and configure connectors; we don't write them.**

Per-client stack (isolated per client — this *is* The Swarm, made real):

```
[Client's existing tools] ←MCP→ [Agent runtime (Claude Agent SDK)]
                                      │
                          [Gate engine: auto / log-only / approve]
                                      │
                     [Run ledger: every action, input, output, verdict]
                                      │
                 [Agentloop console (web)] + [Delta Proof reports]
```

**We build only the defensible layer:** the gate/approval engine, the run ledger, the
console UI, the Proof/metrics engine, and the blueprint format. We do **not** build:
our own models, our own workflow engine, our own connector library, multi-tenant SaaS
plumbing (until ≥10 clients justify it).

**Blueprint spec v1** (the atomic unit of IP — sales quotes it, delivery deploys it,
the console renders it, Proof measures it):

```yaml
blueprint: speed-to-lead
trigger: new lead in CRM / form / inbox
agents: [qualifier, enricher, first-responder, scheduler]
gates: { outbound-message: approve, crm-write: log-only, enrich: auto }
connectors: [hubspot-mcp, gmail-mcp, calendar-mcp]
metrics: { baseline: [response-time, contact-rate], target: [<5min, +30%] }
rollback: disable trigger; queue drains to human inbox
```

_source: PIVOT-PLAN.md_
