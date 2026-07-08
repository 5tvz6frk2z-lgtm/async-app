---
name: MCP is the connector seam (v0.2)
summary: **9. MCP is the connector seam (v0.2).** is a minimal zero-dep MCP client over Streamable HTTP: initialize → initialized → tools/list → tools/call, handling bot
tags: adr, mcp, tool, connector, server, client
pointers: 
updated: 2026-07-08T00:00:00.000Z
---
# MCP is the connector seam (v0.2)

**9. MCP is the connector seam (v0.2).** `lib/mcp.js` is a minimal zero-dep MCP client over Streamable HTTP: initialize → initialized → tools/list → tools/call, handling both JSON and SSE response modes and echoing `mcp-session-id`. `lib/connectors.js` binds fleet tool names to a client's MCP servers via `connectors.json`; schemas and descriptions come from the server's own tools/list, and `assertBlueprintsCovered` makes an unmapped tool a startup failure, not a mid-run surprise. Deliberately not implemented: stdio transport (we deploy against hosted/gateway MCP servers), resources/prompts (tools are all the runtime consumes), streaming partial results.

_source: platform/ADR.md_
