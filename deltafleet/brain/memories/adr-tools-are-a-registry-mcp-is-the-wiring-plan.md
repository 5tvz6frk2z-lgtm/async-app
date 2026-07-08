---
name: Tools are a registry; MCP is the wiring plan
summary: 6. Tools are a registry; MCP is the wiring plan. · ToolRegistry domain.verb MCP API 6 proxy since restrict character
tags: tool, registry, handler, plan, name, character
pointers: 
updated: 2026-07-08T00:00:00.000Z
---
# Tools are a registry; MCP is the wiring plan

**6. Tools are a registry; MCP is the wiring plan.** `ToolRegistry` holds name → schema → handler. In demo mode handlers are simulated connectors. Production wiring = handlers that proxy to MCP servers (per-client credentials, per-tool scoping); the runtime, gates, ledger and console do not change when that lands. Tool names use `domain.verb` (dots translated to `__` on the wire since the API restricts tool-name characters).

_source: platform/ADR.md_
