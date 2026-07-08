---
name: Model access is an adapter
summary: 5. Model access is an adapter. · AnthropicAdapter claude-opus-4-8 claude-haiku-4-5 MockAdapter API 5 4 8 purpose messag override agnostic
tags: access, adapter, model, claude, purpose, agnostic
pointers: 
updated: 2026-07-08T00:00:00.000Z
---
# Model access is an adapter

**5. Model access is an adapter.** `AnthropicAdapter` (Messages API over fetch, adaptive thinking, default `claude-opus-4-8`, per-agent override e.g. `claude-haiku-4-5` for triage-grade work) and `MockAdapter` (deterministic scripts for tests + demo). The blueprint format is runtime-agnostic on purpose — vendor dependency is a named risk in the plan.

_source: platform/ADR.md_
