// Connector bridge — builds a ToolRegistry whose handlers proxy to MCP
// servers. The mapping file is per-client deployment configuration:
//
// connectors.json:
// {
//   "servers": {
//     "hubspot": { "url": "https://mcp.example/hubspot", "headers": { "authorization": "Bearer …" } }
//   },
//   "map": {
//     "crm.read":   { "server": "hubspot", "tool": "get_contact" },
//     "crm.update": { "server": "hubspot", "tool": "update_contact" }
//   }
// }
//
// Blueprints keep speaking Delta Fleet tool names (domain.verb); the map is
// where a deployment binds those names to a client's actual stack. Anything
// a blueprint needs that isn't mapped fails loudly at startup, not mid-run.
import fs from 'node:fs';
import { McpClient } from './mcp.js';
import { ToolRegistry } from './runtime.js';

const tryJson = (s) => { try { return JSON.parse(s); } catch { return s; } };

export async function buildMcpRegistry(configPath, { clientFactory = (opts) => new McpClient(opts) } = {}) {
  const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  if (!cfg.servers || !cfg.map) throw new Error('connectors config needs "servers" and "map"');

  const clients = {};
  for (const [name, s] of Object.entries(cfg.servers)) {
    clients[name] = await clientFactory({ url: s.url, headers: s.headers || {} }).connect();
  }

  const registry = new ToolRegistry();
  for (const [ourName, m] of Object.entries(cfg.map)) {
    const client = clients[m.server];
    if (!client) throw new Error(`connectors.map["${ourName}"] references unknown server "${m.server}"`);
    const def = client.toolDef(m.tool);
    if (!def) throw new Error(`server "${m.server}" does not expose tool "${m.tool}" (needed for ${ourName}). Available: ${client.tools.map((t) => t.name).join(', ')}`);
    registry.register(ourName, {
      description: def.description || `${ourName} via ${m.server}`,
      schema: def.inputSchema || { type: 'object' },
      handler: async (input) => {
        const r = await client.callTool(m.tool, input);
        if (r.isError) throw new Error(`${m.server}/${m.tool}: ${r.text.slice(0, 400) || 'tool error'}`);
        return r.text ? tryJson(r.text) : r.content;
      },
    });
  }
  return { registry, clients, mapped: Object.keys(cfg.map) };
}

/** Startup guard: every tool every agent of every blueprint uses must be mapped. */
export function assertBlueprintsCovered(blueprints, registry) {
  const missing = [];
  for (const bp of blueprints.values()) {
    for (const a of bp.agents) for (const t of a.tools) {
      if (!registry.tools.has(t)) missing.push(`${bp.blueprint}/${a.name} needs ${t}`);
    }
  }
  if (missing.length) throw new Error(`unmapped tools:\n  ${[...new Set(missing)].join('\n  ')}`);
}
