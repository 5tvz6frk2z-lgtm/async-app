---
name: One process, one client
summary: **1. One process, one client.** Each client deployment is a single Node process with its own ledger file and console.
tags: adr, client, one, process, blast, console
pointers: 
updated: 2026-07-08T00:00:00.000Z
---
# One process, one client

**1. One process, one client.** Each client deployment is a single Node process with its own ledger file and console. No multi-tenancy until ≥10 clients justify it (PIVOT-PLAN risk table). Isolation is the security story ("The Swarm"), and it keeps blast radius per-client.

_source: platform/ADR.md_
