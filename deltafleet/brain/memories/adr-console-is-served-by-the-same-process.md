---
name: Console is served by the same process
summary: **7. Console is served by the same process.** One HTML file, polls . The five MVP features and nothing else: approvals queue (approve / approve-edited / reject
tags: adr, serv, kill, process, same, console
pointers: 
updated: 2026-07-08T00:00:00.000Z
---
# Console is served by the same process

**7. Console is served by the same process.** One HTML file, polls `/api/state`. The five MVP features and nothing else: approvals queue (approve / approve-edited / reject with reason), run feed with full trace, kill switch, metric tiles, blueprint viewer with trust stats. Kill lands mid-request via AbortController; killed runs void their pending approvals.

_source: platform/ADR.md_
