# Fleet Deck — Architecture Decision Record

Terse, numbered decisions with their rationale. Read before changing the core.

### 1 · One spine, many views
Every tool is a *view* over a single append-only event log (`lib/spine.js`), never
its own store. A tool registers a projection; the spine keeps it current. **Why:**
an approval, the tool call it gated, and that call's cost are the same events —
holding them in one log makes a dashboard internally consistent by construction,
with no cross-store reconciliation and no drift between tools.

### 2 · Derivation is one code path
The spine's projection build (full replay) and its incremental advance route
through the same `apply`. **Why:** replay and incremental can never diverge — the
bug class where "rebuilt state ≠ live state" is designed out. (Same discipline as
the platform ledger.)

### 3 · The stamp is unforgeable
`append()` applies `id/seq/ts/kind` *after* spreading the caller payload, so a
caller can't overwrite them. **Why:** those four fields *are* the audit trail; if a
caller could forge them the record would be worthless. (Found by adversarial review
— the payload was originally spread last.)

### 4 · Fail loud on corruption, tolerate exactly one torn tail
Load drops a single torn final line (a crash mid-append) and truncates it; anything
else unparseable — including a non-object JSON line — throws. **Why:** silently
dropping a committed-looking line is the history rewrite the spine exists to prevent.

### 5 · Query equals a linear scan
`query()` uses stringified index buckets but re-verifies every constraint with
strict `===`. **Why:** without it, values that stringify alike (`1` vs `"1"`,
`true` vs `"true"`) collide and the index returns wrong results — the maintained
view must equal a brute-force scan or it's a silent correctness hole.

### 6 · Deny is a hard floor (Tollgate)
`decide()` unions deny patterns across ALL applicable scopes (agent, server,
global); review/allow come only from the most-specific rule. **Why:** a narrow
per-agent allow must never widen past a broad deny, so "nobody touches prod-db" is
expressible. Deny-by-default remains the posture; unlisted tools are denied.

### 7 · Fingerprint every model-visible field; annotations are advisory
The rug-pull fingerprint covers name, title, description, inputSchema AND
annotations — a change to any is drift (title/description/schema = critical,
annotations = warn). `readOnlyHint` is recorded but NEVER grants permission. **Why:**
the server we're guarding sets the annotations; trusting them for a grant hands the
attacker the key. Title and annotations were added after review found them uncovered.

### 8 · Views observe; actors write — and say which they are
Meter, Flight Recorder, Register, Preflight only read. Approvals, Contextsmith and
the proxy write events (a verdict, a version, a decision) — deliberately, and those
writes are themselves auditable timeline entries. **Why:** keep the read/write
boundary explicit so a "view" can never quietly mutate the log it reports on.

### 9 · The proxy fails closed on critical drift
When a pinned server's tools change in a poisoning-shaped way, the proxy BLOCKS
`tools/list` (default) rather than passing the poisoned tools to the model. `--warn`
opts into pass-through-but-record. **Why:** the whole point of detection is to stop
the model reading the injected instruction; the safe default is to refuse.

### 10 · Approvals are single-use
When the proxy lets a held call through on a prior approval, it consumes that
approval (an `approval.consumed` event); a second call needs its own. Check and
consume are synchronous (no await between), so there's no TOCTOU double-spend under
Node's single thread. **Why:** a one-time human approval must not become a permanent
standing grant for every future call of that tool.

### 11 · Illustrative until real
Demo figures, pricing tables and law-pack article mappings are labeled illustrative
/ not-legal-advice. **Why:** the suite must never present engineered defaults as
measured fact or legal determination.

### 12 · Zero dependencies, deterministic
Node ≥22 stdlib only; given the same events, every view is a pure function of the
log. **Why:** auditability and longevity — nothing to bit-rot, nothing to trust but
the standard library, and every result is reproducible and testable offline.
