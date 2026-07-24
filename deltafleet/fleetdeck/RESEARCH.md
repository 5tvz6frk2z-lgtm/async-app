# Fleet Deck — Technical Research Dossier

Prepared: 2026-07-18. Purpose: verify precise technical facts before baking them into Fleet Deck
(Tollgate, Flight Recorder, Agent-Ready Monitor). Every claim carries a source URL. Items that
could not be independently verified, or where sources conflict, are called out explicitly.

## Method note / reliability caveat (read first)

- **`WebFetch` was blocked for the entire session** (HTTP 403 from destination bot-protection on
  `modelcontextprotocol.io`, `opentelemetry.io`, `raw.githubusercontent.com`, `answer.ai`,
  vendor blogs, etc.). The authenticated GitHub MCP tool is scoped to this repo only, so I could
  **not** open the primary spec pages directly.
- Consequently, facts below come from **`WebSearch` result summaries of the primary pages** plus
  corroborating secondary sources. Where a value is load-bearing for code (defaults, exact tokens,
  attribute spelling) I cite the primary URL **and** at least one corroborating URL, and I flag
  anything I could only get from a single secondary source.
- **Recommendation:** before shipping, re-open the four canonical URLs from an unblocked machine to
  eyeball exact JSON and defaults:
  MCP tools spec `https://modelcontextprotocol.io/specification/2025-06-18/server/tools`;
  OTel GenAI registry `https://opentelemetry.io/docs/specs/semconv/registry/attributes/gen-ai/`;
  OTel GenAI spans `https://github.com/open-telemetry/semantic-conventions/blob/main/docs/gen-ai/gen-ai-spans.md`;
  llms.txt proposal `https://www.answer.ai/posts/2024-09-03-llmstxt.html`.

---

## 1. MCP protocol (for "Tollgate", a local MCP firewall)

### 1.1 `tools/list` response shape and the tool object

`tools/list` returns a JSON-RPC 2.0 result with a `tools` array and an optional `nextCursor`
(opaque, for pagination). Representative response from the 2025-06-18 spec:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "get_weather",
        "title": "Weather Information Provider",
        "description": "Get current weather information for a location",
        "inputSchema": {
          "type": "object",
          "properties": {
            "location": { "type": "string", "description": "City name or zip code" }
          },
          "required": ["location"]
        }
      }
    ],
    "nextCursor": "next-page-cursor"
  }
}
```

Each **tool object** carries these fields:

| Field | Required | Notes |
|---|---|---|
| `name` | yes | Unique programmatic identifier for the tool. |
| `title` | no | Human-readable display name. Added as a top-level field in the 2025-06-18 revision (also available inside `annotations.title`); spec guidance is to prefer the top-level `title`. |
| `description` | no (recommended) | Natural-language description fed into the model's context. **This is the primary tool-poisoning surface** (see 1.3). |
| `inputSchema` | yes | JSON Schema (`type: "object"` + `properties` + `required`) describing arguments. Nested `properties[].description` strings are ALSO model-visible and poisonable. |
| `outputSchema` | no | JSON Schema for structured results. Added in the 2025-06-18 revision; pairs with `structuredContent` in `tools/call` results. |
| `annotations` | no | Behavioral hints object (see 1.2). Untrusted. |
| `_meta` | no | Optional metadata bag. |

Sources: `https://modelcontextprotocol.io/specification/2025-06-18/server/tools` ·
`https://www.merge.dev/blog/mcp-tool-schema` ·
`https://zenn.dev/7shi/articles/20250710-output-schema?locale=en` (outputSchema/structuredContent).
`title` and `outputSchema` being 2025-06-18 additions is corroborated by
`https://obot.ai/resources/learning-center/mcp-tools/`. **Flag:** the exact wire JSON and the
`title`/`outputSchema` "added in 2025-06-18" claim were read from search summaries, not the live
spec page — verify against the canonical URL before hardcoding field presence.

### 1.2 Tool annotations — the five fields, defaults, and trust status

`annotations` is an optional `ToolAnnotations` object. The spec defines five fields:

| Annotation | Type | Default | Meaning |
|---|---|---|---|
| `title` | string | — | Human-readable display title. |
| `readOnlyHint` | boolean | `false` | If true, tool does not modify its environment. |
| `destructiveHint` | boolean | `true` | If true, tool may perform destructive/irreversible updates. Only meaningful when `readOnlyHint == false`. |
| `idempotentHint` | boolean | `false` | If true, repeated calls with the same args have no additional effect. Only meaningful when `readOnlyHint == false`. |
| `openWorldHint` | boolean | `true` | If true, tool interacts with an "open world" of external entities (e.g. the web). |

Defaults (readOnlyHint=false, destructiveHint=true, idempotentHint=false, openWorldHint=true)
confirmed across multiple sources:
`https://mcpblog.dev/blog/2026-03-13-mcp-tool-annotations` ·
`https://github.com/modelcontextprotocol/ruby-sdk/issues/259` ·
`https://chatforest.com/guides/mcp-tool-annotations-explained/`.

**Advisory vs. trustworthy — the load-bearing point for Tollgate:**
- **All annotations are advisory hints, not guarantees, and are NOT a security feature.** The MCP
  spec explicitly states clients **must treat annotations as untrusted unless the server itself is
  trusted**, and must not rely on them for access control or sandboxing.
- **`readOnlyHint` (and all four hints) is server-asserted → untrusted.** A malicious or compromised
  server can label a destructive tool `readOnlyHint: true`. Tollgate must not grant reduced scrutiny
  (e.g. auto-approve / parallel dispatch) based on server-supplied hints alone.
- Real clients nonetheless *act* on them: Claude Code uses `readOnlyHint` to decide parallel vs.
  serialized dispatch; ChatGPT/Codex CLI use `destructiveHint`/`openWorldHint` to trigger
  confirmation prompts. This is exactly the trust-misplacement Tollgate should guard against.

Sources: `https://blog.modelcontextprotocol.io/posts/2026-03-16-tool-annotations/`
(official MCP blog: "Tool Annotations as Risk Vocabulary: What Hints Can and Can't Do") ·
`https://mcpblog.dev/blog/2026-03-13-mcp-tool-annotations` ·
`https://codex.danielvaughan.com/2026/04/12/mcp-tool-annotations-risk-vocabulary-codex-cli/` ·
`https://sunpeak.ai/blogs/testing-mcp-tool-annotations/`.

### 1.3 Tool poisoning and rug-pull mechanics — what to snapshot/hash

**Tool poisoning** (first disclosed by Invariant Labs, April 2025): an attacker embeds
prompt-injection instructions inside model-visible tool **metadata the human rarely inspects** —
the `description` text, per-parameter `description` fields in `inputSchema`, and the schema itself.
Because tool descriptions enter the agent's context as trusted content, the LLM reads and acts on
them.
Sources: `https://invariantlabs.ai/blog/mcp-security-notification-tool-poisoning-attacks` ·
`https://policylayer.com/attacks/hidden-instructions-in-tool-descriptions`.

**Rug pull:** the tool set is benign at approval time, then the server **silently changes a tool
definition after approval**. Most clients bind trust to the tool **name** and do not re-validate the
definition on later calls, so no re-approval fires. Cross-session changes often leave no audit trail
unless the client keeps one.
Sources: `https://policylayer.com/attacks/mcp-rug-pull` ·
`https://securew2.com/blog/mcp-rug-pull-attack` ·
`https://www.elastic.co/security-labs/mcp-tools-attack-defense-recommendations`.

**Concrete CVE:** `CVE-2025-54136` ("MCPoison", Check Point Research) — Cursor IDE approved an MCP
config by **key name** and then re-executed whatever command was bound to that key on every project
open, enabling persistent silent RCE after a one-time approval. Fixed in Cursor **1.3 (2025-07-29)**,
which now forces re-approval on **any** change to an MCP config (even adding a space).
Sources: `https://nvd.nist.gov/vuln/detail/CVE-2025-54136` ·
`https://research.checkpoint.com/2025/cursor-vulnerability-mcpoison/` ·
`https://thehackernews.com/2025/08/cursor-ai-code-editor-vulnerability.html`.

**What a defender should hash/snapshot (direct guidance for Tollgate):** snapshot the full
`tools/list` response at approval time and re-compare on every session start / list refresh, alerting
on any change. Include in the fingerprint, per tool:
- `name`
- full `description` text (verbatim — semantic edits to natural language are the main payload and
  are exactly what naive schema-only diffs miss),
- the complete `inputSchema` **including nested `properties[].description` strings**,
- `annotations`,
- and ideally `title`/`outputSchema`.

A plain structural (schema-shape) diff is insufficient — you must hash the natural-language text too.
Trail of Bits' **trust-on-first-use (TOFU)** is the control that actually stops rug pulls: capture the
description on first approval and re-prompt the user if it ever changes.
Vercel's AI SDK shipped `fingerprintTools` + `detectToolDrift` (in `ai@7.0.19`, 2026-07-09) doing
exactly this. Invariant Labs' `mcp-scan` detects poisoned descriptions statically.
Sources: `https://www.mintmcp.com/blog/mcp-tool-poisoning` (hash-pinning + snapshot-on-approval) ·
`https://christian-schneider.net/blog/securing-mcp-defense-first-architecture/` (TOFU) ·
`https://www.digitalapplied.com/blog/vercel-ai-sdk-mcp-tool-drift-fingerprint-security-2026` ·
`https://www.elastic.co/security-labs/mcp-tools-attack-defense-recommendations`.
**Flag:** the "hash `name` + description + inputSchema, including parameter descriptions" recipe is
synthesized from multiple defender write-ups (Elastic, MintMCP, Trail of Bits summary), not from a
single normative spec statement — but the sources are consistent.

### 1.4 `notifications/tools/list_changed`

**Yes, it exists.** A server that supports it MUST declare capability
`tools: { "listChanged": true }` during initialization. When its tool list changes it SHOULD send a
parameterless JSON-RPC notification (no `id`, no response expected):

```json
{ "jsonrpc": "2.0", "method": "notifications/tools/list_changed" }
```

It signals only that the available tool set changed; the client is expected to respond by issuing a
fresh `tools/list` to retrieve the new definitions. **Security-relevant for Tollgate:** this is the
legitimate channel a malicious server rides to deliver a rug-pull — Tollgate should re-run its
snapshot/diff on every `list_changed`-triggered refresh, not trust it as benign.
Sources: `https://modelcontextprotocol.io/specification/2024-11-05/server/tools` ·
`https://github.com/orgs/modelcontextprotocol/discussions/76` ·
`https://portkey.ai/blog/mcp-message-types-complete-json-rpc-reference-guide/`.

### 1.5 Current (2025–2026) client-side allowlisting / permission-pinning guidance

Consensus defensive guidance for MCP clients:
- **Pin server + tool versions** using a hash/checksum of the tool definition; verify integrity
  before every execution rather than trusting the persisted "approved" flag.
- **Snapshot `tools/list` at approval, re-check each session/refresh, alert on drift** (TOFU).
- **Disable auto-approval for untrusted / third-party servers**; require explicit human re-approval
  when a definition changes (this is precisely the fix Cursor 1.3 adopted).
- **Allowlist tools explicitly** rather than trusting server-supplied risk hints; treat annotations
  as untrusted metadata (see 1.2).
Sources: `https://www.mintmcp.com/blog/mcp-tool-poisoning` ·
`https://pipelab.org/blog/state-of-mcp-security-2026/` ·
`https://christian-schneider.net/blog/securing-mcp-defense-first-architecture/`.
**Flag:** there is no single normative "MCP allowlisting standard"; this is best-practice guidance
aggregated from security vendors and the Cursor CVE remediation, not a spec requirement.

---

## 2. OpenTelemetry GenAI semantic conventions (for "Flight Recorder")

### 2.1 Attribute names (current spelling) and stability

| Attribute | Current status | Notes |
|---|---|---|
| `gen_ai.operation.name` | **Development** | Enum values include `chat`, `generate_content`, `embeddings`, `execute_tool`, `invoke_agent`, `create_agent`. |
| `gen_ai.provider.name` | **Development** | Current provider identifier (`anthropic`, `openai`, `gcp.vertex_ai`, …). |
| `gen_ai.system` | **Deprecated** | Superseded by `gen_ai.provider.name`; reported as removed from the current attribute registry. |
| `gen_ai.request.model` | **Development** | Requested model name. (`gen_ai.response.model` is the served model.) |
| `gen_ai.usage.input_tokens` | **Development** | Current name for prompt/input tokens. |
| `gen_ai.usage.output_tokens` | **Development** | Current name for completion/output tokens. |
| `gen_ai.tool.name` | **Development** | Tool name on `execute_tool` spans. |
| `gen_ai.tool.call.id` | **Development** | Tool-call correlation id. |
| `gen_ai.tool.type` | **Development** | e.g. `function` (client-side) vs `extension` (agent-side). |
| `gen_ai.tool.description` | **Development** | Tool description. |
| `gen_ai.tool.call.arguments` / `gen_ai.tool.call.result` | **Development** | Standardized arg/result attrs (replace ad-hoc `tool_arguments`/`tool_response`). |

Sources: `https://opentelemetry.io/docs/specs/semconv/registry/attributes/gen-ai/` (registry) ·
`https://opentelemetry.io/blog/2026/genai-observability/` ·
`https://github.com/open-telemetry/semantic-conventions/blob/main/docs/gen-ai/gen-ai-spans.md` ·
`https://techbytes.app/posts/opentelemetry-genai-agent-semconv-cheat-sheet-2026/`.

**`gen_ai.system` → `gen_ai.provider.name` deprecation** corroborated by
`https://github.com/pydantic/pydantic-ai/issues/2964` and the OTel 2026 GenAI observability blog.

**Historical rename (flag):** `gen_ai.usage.input_tokens` / `output_tokens` replaced the earlier
`gen_ai.usage.prompt_tokens` / `completion_tokens`. The current names are firmly confirmed; I could
**not** pin the exact semconv version where the rename landed from search results (commonly cited as
~v1.27/1.28). Treat the version number as unverified; treat the current names as verified.

### 2.2 Span naming conventions

- LLM call: span name `chat {gen_ai.request.model}` (operation `chat`), span kind CLIENT.
- Tool execution: span name `execute_tool {gen_ai.tool.name}`, span kind INTERNAL.
- Agent invocation: span name `invoke_agent {gen_ai.agent.name}`.
A typical tree is a top-level `invoke_agent` span with child `chat` spans per LLM call and
`execute_tool` spans per tool call.
Sources: `https://opentelemetry.io/blog/2026/genai-observability/` ·
`https://greptime.com/blogs/2026-05-09-opentelemetry-genai-semantic-conventions`.

### 2.3 Stability — the headline for Flight Recorder

- **All GenAI semantic conventions are still "Development" (a.k.a. experimental) — NOT stable.**
  As of OTel Semantic Conventions **1.40.0 (docs surfaced ~2026-04-17)**, the GenAI (and the newer
  MCP) semconv pages are still labeled **Development**. Expect breaking renames.
- Migration/opt-in mechanics: instrumentations gate the newer attribute format behind
  `OTEL_SEMCONV_STABILITY_OPT_IN=gen_ai_latest_experimental`; older instrumentations default to the
  prior format. (v1.36 was cited as the transition baseline.)
- The GenAI conventions are being **moved to a dedicated repo**
  (`open-telemetry/semantic-conventions-genai`); older `gen_ai.*` content in the main repo is being
  deprecated/relocated.
- Related deprecations to avoid baking in: `gen_ai.prompt` / `gen_ai.completion` are deprecated in
  favor of `gen_ai.input.messages` / `gen_ai.output.messages` (+ `gen_ai.system_instructions`).
Sources: `https://opentelemetry.io/docs/specs/semconv/registry/attributes/gen-ai/` ·
`https://github.com/traceloop/openllmetry/issues/3515` ·
`https://greptime.com/blogs/2026-05-09-opentelemetry-genai-semantic-conventions` ·
`https://github.com/open-telemetry/semantic-conventions-genai`.
**Practical implication for code:** emit the current names above, but keep them behind a
config/version constant — they are explicitly unstable and actively churning.

---

## 3. Agent-Ready / AEO facts (for the "Agent-Ready Monitor" checker)

### 3.1 `llms.txt` — the proposal

- **Author/origin:** proposed by **Jeremy Howard (Answer.AI)**, published **2024-09-03**. It is a
  *proposal/community convention*, not a ratified standard.
  Sources: `https://www.answer.ai/posts/2024-09-03-llmstxt.html` ·
  `https://github.com/answerdotai/llms-txt`.
- **Location:** a Markdown file at the site **root**: `https://example.com/llms.txt`. A companion
  convention `llms-full.txt` inlines the full expanded content.
- **Structure (per the spec):**
  1. An **H1** with the project/site name — **the only required element**.
  2. An optional **blockquote (`>`)** with a short summary containing key info needed to understand
     the rest of the file.
  3. Zero or more Markdown sections (paragraphs, lists — *any* Markdown except headings) giving
     detail/context.
  4. Zero or more **H2 (`##`) "file-list" sections**, each a bullet list of hyperlinks in the form
     `- [name](url): optional notes`.
  5. A special **`## Optional`** H2 section: URLs listed there are secondary and **may be skipped**
     if a shorter context is needed. (This name is semantically meaningful, not just a label.)
  It deliberately uses Markdown (not XML) because the files are meant to be consumed by LLMs/agents.
  Sources: `https://github.com/answerdotai/llms-txt` ·
  `https://www.answer.ai/posts/2024-09-03-llmstxt.html` ·
  `https://medium.com/data-science/llms-txt-explained-414d5121bcb3`.
  **Flag:** the exact "only H1 required / everything else optional" wording is from search summaries
  of the answer.ai post and repo (WebFetch blocked) — high confidence but worth an eyeball.

- **Adoption status — important, flag this loudly for the checker's messaging:** llms.txt is **NOT
  an adopted standard and has essentially no crawler uptake.** Google (Gary Illyes at Search Central
  Live; John Mueller publicly) states Google **does not support and has no plans to support**
  llms.txt, with Mueller comparing it to "the discredited keywords meta tag." No major LLM vendor
  (Google, OpenAI, Anthropic, Meta, Mistral) has committed to honoring it as of mid-2026. Empirical
  data: an Ahrefs study of ~137k sites found ~97% of llms.txt files got zero traffic (May 2026); a
  90-day study of 500M+ AI-bot visits found only ~408 hits to `llms.txt`.
  So: the Agent-Ready Monitor can *check for presence/well-formedness*, but should **not** claim it
  improves AI visibility.
  Sources: `https://www.searchenginejournal.com/google-says-llms-txt-is-purely-speculative-for-now/577576/` ·
  `https://www.seroundtable.com/google-does-not-endorse-llms-txt-40789.html` ·
  `https://www.stanventures.com/news/google-dismisses-llms-txt-as-ineffective-and-unused-by-ai-bots-2479/`.

### 3.2 AI crawler user-agent tokens (as of 2026)

Product **tokens** are what you match in `robots.txt` and log analysis (case-insensitive). Full UA
strings are versioned; version numbers below are illustrative and were **not** independently
re-verified this session (WebFetch to vendor JSON/docs was blocked).

**OpenAI** — `https://developers.openai.com/api/docs/bots`
- `GPTBot` — training crawler. Full UA (as reported): `Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.1; +https://openai.com/gptbot`. Respects robots.txt. IPs: `openai.com/gptbot.json`.
- `OAI-SearchBot` — ChatGPT search indexing. UA: `... OAI-SearchBot/1.0; +https://openai.com/searchbot`. Respects robots.txt. IPs: `openai.com/searchbot.json`.
- `ChatGPT-User` — user-initiated in-conversation fetch. UA: `... ChatGPT-User/1.0; +https://openai.com/bot`. IPs: `openai.com/chatgpt-user.json`.

**Anthropic** — `https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler`
- `ClaudeBot` — training-data crawler.
- `Claude-User` — user-initiated in-conversation fetch.
- `Claude-SearchBot` — indexing for Claude's search feature.
- Anthropic states **all three honor `robots.txt`** and it also honors the non-standard `Crawl-delay`.
- **Naming note (flag):** the task listed `Claude-User/Claude-Web`. In the current (2026) three-bot
  model the tokens are **`ClaudeBot`, `Claude-User`, `Claude-SearchBot`**. Older/legacy tokens
  `Claude-Web` and `anthropic-ai` are historical and largely deprecated — do not rely on them as the
  current set. Source: `https://www.searchenginejournal.com/anthropics-claude-bots-make-robots-txt-decisions-more-granular/568253/`.

**Perplexity** — `https://www.openshadow.io/guides/ai-bot-user-agents-2026`
- `PerplexityBot` — indexing for Perplexity answers/citations (respects robots.txt).
- `Perplexity-User` — user-initiated fetch; **robots.txt generally does NOT apply** (per Perplexity).

**Google**
- `Google-Extended` — **NOT a crawler and NOT a user-agent that appears in logs.** It is a
  **robots.txt control token only**, used to opt content out of training/grounding Gemini & Vertex AI
  **without** affecting Google Search. Actual crawling is done by `Googlebot` (search) and, for
  Vertex/AI grounding, agents like `Google-CloudVertexBot` / `Google-NotebookLM` /
  `Google-Read-Aloud`. Do not expect to see `Google-Extended` hits in access logs.
  Sources: `https://crawlercheck.com/directory/ai-bots/google-extended` ·
  `https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers`.

**Amazon**
- `Amazonbot` — real crawler (training/indexing). Blockable via `User-agent: Amazonbot`.
  Source: `https://www.openshadow.io/guides/ai-bot-user-agents-2026`.

**Meta**
- `meta-externalagent` (a.k.a. `Meta-ExternalAgent`) — crawls public pages for Meta AI / Llama
  training and indexing.
- `Meta-ExternalFetcher` — on-the-spot fetch when a Meta AI user references a specific URL.
  (Legacy `facebookexternalhit` is a separate, older token.)
  Source: `https://www.openshadow.io/guides/ai-bot-user-agents-2026`.

**Token case note:** robots.txt user-agent matching is case-insensitive per RFC 9309, so match
tokens case-insensitively (`meta-externalagent` == `Meta-ExternalAgent`).

### 3.3 robots.txt compliance nuances (matters for the checker's accuracy)

- **Respect robots.txt:** GPTBot, OAI-SearchBot, PerplexityBot, ClaudeBot, Claude-SearchBot,
  Claude-User, Amazonbot, meta-externalagent.
- **User-initiated fetchers are the gray zone:** Perplexity says robots.txt generally does **not**
  apply to `Perplexity-User`; Anthropic says `Claude-User` **does** honor robots.txt.
- **CONFLICT — `ChatGPT-User` + robots.txt:** sources disagree. OpenAI's own documentation and
  several trackers state GPTBot/OAI-SearchBot respect robots.txt and historically described
  ChatGPT-User as respecting it too; but 2026 secondary reporting asserts **"ChatGPT-User will no
  longer comply with robots.txt."** I could not confirm the current behavior against
  `developers.openai.com` directly (WebFetch blocked). **Do not hardcode ChatGPT-User's robots.txt
  behavior — re-verify against OpenAI's live bots page before shipping any claim about it.**
  Sources (conflicting): `https://developers.openai.com/api/docs/bots` ·
  `https://www.searchengineworld.com/tracking-openai-chatgpt-bots-a-fresh-guide-for-webmasters-site-owners-and-seos`.
- Independent-of-robots controls: `Google-Extended` (training opt-out, robots.txt token only).

### 3.4 schema.org / JSON-LD signals that matter for AI answer engines

- **Format:** Google (and, by extension, AI answer engines) prefer **JSON-LD** over microdata/RDFa —
  it lives in a `<script type="application/ld+json">` block, decoupled from visible HTML.
- **`Organization` + `sameAs`:** establishes brand/entity identity; `sameAs` points to authoritative
  external profiles (official social accounts, Wikipedia/Wikidata) so engines can disambiguate and
  link the entity (powers Google Knowledge Panel). High value for entity grounding by LLMs.
- **`FAQPage`:** Q&A structured data. **Flag / important nuance:** Google **deprecated FAQ *rich
  results*** (the SERP accordion) around **May 2026**, but the `FAQPage` markup itself remains useful
  for AI/voice/LLM citation — so "no rich result" ≠ "useless." The checker should not penalize its
  presence.
- **`Article` / `BlogPosting`:** recommended on editorial pages (author, datePublished, headline)
  — helps engines attribute and date content.
- **`Product`:** for commerce entities (name, offers, price, availability, aggregateRating).
- General finding: pages with valid structured data (esp. FAQ/HowTo/QAPage) are cited noticeably more
  often in AI-generated answers than unstructured pages (cited figures ~20–30%, from Semrush/
  Measured.com benchmarks — treat as directional marketing data, not a hard guarantee).
Sources: `https://www.digitalapplied.com/blog/schema-markup-types-complete-structured-data-reference` ·
`https://ailabsaudit.com/blog/en/schema-markup-ai-visibility-guide` ·
`https://www.greadme.com/blog/schemas/what-is-faqpage-schema-complete-guide` (FAQ rich-result deprecation) ·
`https://writer.com/blog/geo-aeo-optimization/`.
**Flag:** the citation-uplift percentages are vendor benchmarks, not peer-reviewed; cite them as
"reported," not fact.

---

## Summary of flags / unverified items

1. **WebFetch blocked all session** — every primary-spec fact is via search summaries, not direct
   page reads. Re-verify the four canonical URLs (Method note) before hardcoding.
2. **MCP wire JSON + `title`/`outputSchema` as 2025-06-18 additions** — high confidence, from
   summaries; eyeball the live tools spec.
3. **OTel `input_tokens`/`output_tokens` rename version** — current names verified; the exact
   semconv version of the rename is unverified (~v1.27/1.28 commonly cited).
4. **OTel stability** — all GenAI conventions confirmed **Development/experimental** (unstable) as of
   semconv 1.40; keep attribute names behind a version constant.
5. **`ChatGPT-User` robots.txt behavior** — sources conflict (respects vs. no-longer-complies). Not
   resolved; re-check OpenAI's live docs.
6. **Anthropic token set** — current is `ClaudeBot` / `Claude-User` / `Claude-SearchBot`;
   `Claude-Web` and `anthropic-ai` are legacy.
7. **Google-Extended** — a robots.txt opt-out token, not a log-visible crawler.
8. **Full UA version strings** (GPTBot/1.1 etc.) — illustrative, not re-verified against vendor JSON.
9. **llms.txt** — a proposal with negligible real-world crawler adoption; do not market it as an AI-
   visibility win.
10. **FAQPage rich results deprecated (~May 2026)** — markup still useful for AI; don't penalize.
