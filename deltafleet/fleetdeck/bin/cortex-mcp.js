#!/usr/bin/env node
// Cortex MCP server — expose the second brain over the MCP stdio transport.
//
//   node bin/cortex-mcp.js [brain-dir]
//
// Add it to an MCP client (e.g. Claude Code) as a stdio server pointing at this
// file. It advertises `memory_search` and `memory_stats`; every response is a
// compact, deterministic evidence block. Because it is a real MCP server, you can
// pin and guard it with Tollgate like any other — the memory server behind the
// same firewall.
//
// Logs go to stderr ONLY: stdout is the JSON-RPC channel and must stay clean.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BrainIndex } from '../../brain/lib/index.js';
import { CortexMcpServer, runStdio } from '../lib/cortex-mcp.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const brainDir = process.argv[2] || path.resolve(__dirname, '../../brain');

const index = new BrainIndex(brainDir);
const server = new CortexMcpServer({ index });
runStdio(server);
console.error(`cortex-mcp: serving ${index.all().length} memories from ${brainDir} over stdio`);
