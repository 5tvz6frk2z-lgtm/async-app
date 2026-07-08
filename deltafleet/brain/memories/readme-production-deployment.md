---
name: Production deployment
summary: - **Tools:** binds fleet tool names (, , …) to the client's MCP servers; startup fails loudly if any blueprint tool is unmapped.
tags: readme, blueprint, fleet, agent, connector, hook
pointers: 
updated: 2026-07-08T00:00:00.000Z
---
# Production deployment

```bash
ANTHROPIC_API_KEY=… FLEET_HOOK_SECRET=… \
  node server.js --connectors connectors.json --triggers --data /var/fleet/ledger.jsonl
```

- **Tools:** `--connectors` binds fleet tool names (`crm.read`, `email.send`, …) to the client's MCP servers; startup fails loudly if any blueprint tool is unmapped.
- **Intake:** `--triggers` arms the cron scheduler for schedule blueprints; `FLEET_HOOK_SECRET` enables `POST /hooks/{blueprint}` (header `x-fleet-secret`) for event blueprints. Trigger-launched runs start at the blueprint's `entry` agent (default: first agent).
- **Models:** live mode uses the Anthropic adapter (adaptive thinking; default `claude-opus-4-8`, per-agent overrides like `claude-haiku-4-5` in the blueprint).

The demo path exists so nothing ships that we can't first fly in simulation.

_source: platform/README.md_
