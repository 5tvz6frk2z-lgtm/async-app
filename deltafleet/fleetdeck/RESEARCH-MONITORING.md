# Fleet Deck — Monitoring Layer Research (2026)

**Purpose:** Current (2026) facts for a recurring *monitoring* subscription over two products: (1) Agent-Ready / AEO page legibility, and (2) AI Register / compliance evidence. Written to feed detector rules, severity thresholds, and product copy.

**As of:** 2026-07-24. Sourcing note: many law-firm and vendor pages block automated fetching, so most claims below are corroborated across multiple independent search results rather than a single primary fetch. **Confidence flags are called out inline as `[FLAG]`.** Verify anything marked `[FLAG]` against a primary source before it becomes hard product copy or a legal assertion.

---

## 1. Agent-Ready / AEO Monitoring

### 1.1 What AEO / AI-visibility tools track over time, and what triggers alerts

The active 2026 field: **Profound** (enterprise), **Peec AI** (analytics-grade citation tracking, small teams), **Otterly.AI** (budget multi-engine), **Scrunch AI** (AEO + crawlability + real-time alerting), **Ahrefs Brand Radar** (add-on to Ahrefs, ~370M prompts/mo), plus newer entrants **Omnia**, **AthenaHQ**, **Alhena**, **AirOps Insights**.

**Metrics tracked as time series** (the things a monitor diffs):
- **Presence / visibility rate** — share of AI answers your brand appears in, per engine.
- **Citation frequency / citation rate** and the **specific source URLs** cited. ([airops.com](https://www.airops.com/blog/answer-engine-optimization-tools), [seranking](https://visible.seranking.com/blog/best-answer-engine-optimization-tools-2026/))
- **Mention rate** and **sentiment** of the mention. ([airops.com](https://www.airops.com/blog/answer-engine-optimization-tools))
- **Share of voice vs named competitors** / competitor displacement. ([alhena.ai](https://alhena.ai/blog/profound-vs-peec-vs-scrunch-vs-alhena/))
- **Per-model breakdown** — ChatGPT, Perplexity, Google AI Overviews, Google AI Mode, Gemini, Claude, Copilot, Grok (Peec tracks up to ~10 models, multi-language/multi-country). ([contently](https://contently.com/2026/04/29/top-10-tools-answer-engine-optimization-aeo-2026/), [omnia](https://www.useomnia.com/blog/ai-search-monitoring-tools))
- **Prompt volume** for the category (Profound's specialty). ([airops.com](https://www.airops.com/blog/answer-engine-optimization-tools))

**What events trigger their alerts** (relevant to your severity model):
- **Change-based competitor alerts** — Scrunch "notifies you when competitors gain or lose visibility," emphasizing *real-time* notifications on visibility shifts. ([alhena.ai](https://alhena.ai/blog/profound-vs-peec-vs-scrunch-vs-alhena/), [omnia](https://www.useomnia.com/blog/ai-search-monitoring-tools))
- **Citation gained / lost** and **ranking/position change** within AI answers. ([alhena.ai](https://alhena.ai/blog/profound-vs-peec-vs-scrunch-vs-alhena/))
- **Sentiment shift** on brand mentions.
- Cadence differs: **Peec = daily** prompt runs, **Scrunch = real-time**, **Profound = trend analysis / periodic**. ([alhena.ai](https://alhena.ai/blog/profound-vs-peec-vs-scrunch-vs-alhena/))

**Takeaway for Fleet Deck:** these tools alert on *brand-outcome* deltas (citations, share of voice, sentiment). Your differentiation is alerting on *page-cause* regressions (Section 1.2) that precede an outcome drop — a leading indicator, not a lagging one.

### 1.2 Agent-legibility regressions, ranked by real-world impact

Ranked highest→lowest impact on whether an AI system can actually read and cite a page:

**1. An AI *retrieval/search* crawler getting newly blocked in robots.txt — HIGHEST.**
Critical nuance: AI vendors run **two fleets** — *training* bots (GPTBot, Google-Extended, ClaudeBot, CCBot) and *retrieval/search* bots used at query time (OAI-SearchBot, ChatGPT-User, PerplexityBot, Claude-SearchBot). **Blocking the retrieval bot is what kills live citations.** Cloro's July 2026 analysis: the median GPTBot-blocking domain earns near-zero ChatGPT citations per Google ranking (0.003 vs 0.417 for domains that allow it), and blocking OpenAI's crawlers "collapses ChatGPT propensity to near zero." Sites that unblocked GPTBot+PerplexityBot+ClaudeBot in Q4 2025 saw +186% AI-attributed traffic in 90 days. ([cloro.dev](https://cloro.dev/research/ai-crawler-blocks/)) A BuzzStream study (Mar 19 2026, 4M citations / 3,600 prompts) is the counterweight showing the relationship is weaker than assumed — but even it found ~70% of ChatGPT citations came from sites *not* blocking ChatGPT-User/OAI-SearchBot. ([buzzstream](https://www.buzzstream.com/blog/news-block-ai-bots-citations/), [ppc.land](https://ppc.land/blocking-ai-crawlers-doesnt-stop-citations-new-data-shows-why/)) **Detector implication:** distinguish a newly-added `Disallow` for a *retrieval* token (critical) from one for a *training-only* token (warning) — they are not the same severity.

**2. A page becoming a JS shell (client-side-rendered) after a redesign — HIGH.**
AI crawlers (GPTBot, ClaudeBot, PerplexityBot) **do not execute JavaScript.** A redesign that moves body content into client-side rendering makes the content — and any JSON-LD injected after load — invisible on direct fetch. ([searchenginejournal](https://www.searchenginejournal.com/ai-search-optimization-make-your-structured-data-accessible/537843/), [upgrowth](https://upgrowth.in/schema-markup-structured-data-2026/)) This is often silent: the page still 200s and looks fine to humans.

**3. Structured data (JSON-LD) disappearing or moving to JS injection — HIGH/MEDIUM.**
~65% of pages cited by ChatGPT include structured data; schema must be **server-rendered / in the initial HTML** to be seen. Schema inserted into the DOM via JS after load is "not detected by any AI system during Direct Fetch." ([alhena.ai](https://alhena.ai/blog/schema-markup-ai-search-ecommerce/), [searchenginejournal](https://www.searchenginejournal.com/ai-search-optimization-make-your-structured-data-accessible/537843/)) Overlaps heavily with #2.

**4. `llms.txt` removed — LOW.**
Because no major AI vendor is confirmed to consume it (Section 1.4), removal has little measurable retrieval/citation impact today. Worth a low-severity/informational signal for agent-doc completeness, not a page-down alert.

**Also worth detecting (high impact, adjacent to the four asked):** a retrieval crawler starting to receive **5xx/timeouts or a `noindex`**, or content newly moved **behind auth/paywall** — each removes the page from AI answers as effectively as a robots block.

### 1.3 AI-crawler user-agent tokens — current (2026) confirmed set

Canonical machine-readable community list: **ai-robots-txt/ai.robots.txt `robots.json`** ([github](https://github.com/ai-robots-txt/ai.robots.txt/blob/main/robots.json)). Vendor breakdown, with role and robots.txt posture:

| Vendor | Token(s) | Role | robots.txt | Notes / changes since mid-2025 |
|---|---|---|---|---|
| **OpenAI** | `GPTBot` | training | honors | Docs clarified Dec 2025 splitting the three roles ([gradientgroup](https://gradientgroup.com/complete-crawler-list-for-ai-user-agents-dec-2025/)) |
| | `OAI-SearchBot` | retrieval/index (ChatGPT Search) | honors | Retrieval fleet — blocking this kills citations |
| | `ChatGPT-User` | on-demand user fetch | honors | |
| **Anthropic** | `ClaudeBot` | training | honors | Anthropic documented **three** crawlers; doc update ~Feb 20 `[FLAG: confirm year — likely 2025]` ([ppc.land](https://ppc.land/anthropic-clarifies-what-its-three-web-crawlers-do-and-how-to-block-them/), [seroundtable](https://www.seroundtable.com/anthropic-updates-its-crawler-docs-40978.html)) |
| | `Claude-SearchBot` | retrieval/index | honors | **New** — launched with Claude web search |
| | `Claude-User` | on-demand user fetch | honors | **New** |
| | `anthropic-ai`, `Claude-Web` | legacy/secondary | honors | Older strings still seen |
| **Perplexity** | `PerplexityBot` | declared crawler/index | claims to honor | See stealth-crawling dispute below |
| | `Perplexity-User` | user-initiated fetch | **disputed** | Perplexity calls it "an agent, not a bot" and asserts it need not honor robots.txt ([malwarebytes](https://www.malwarebytes.com/blog/news/2025/08/perplexity-ai-ignores-no-crawling-rules-on-websites-crawls-them-anyway)) |
| **Google** | `Googlebot` | search (not AI-specific) | honors | Required for Search ranking |
| | `Google-Extended` | robots.txt opt-out token for Gemini/Vertex **training** (no separate crawler) | token only | Introduced Sep 2023; blocking it does not affect Search |
| | `GoogleOther`, `Google-CloudVertexBot`, `Gemini-Deep-Research` | misc / Vertex Agent Builder / Gemini Deep Research | honors | **New agentic tokens** ([openshadow](https://www.openshadow.io/guides/ai-bot-user-agents-2026)) |
| **Meta** | `Meta-ExternalAgent` | training/product | honors | **Renamed from `FacebookBot`/`MetaAIBot`** ([trakkr](https://trakkr.ai/bots/meta-externalagent), [51degrees](https://51degrees.com/blog/meta-crawlers-2026)) |
| | `Meta-ExternalFetcher` | user-initiated fetch | honors | **New** |
| | `FacebookBot` | legacy | — | |
| **Amazon** | `Amazonbot` | crawler (product info + AI/Alexa/Rufus) | honors | |
| **Apple** | `Applebot` | search crawler (Siri, Spotlight) | honors | |
| | `Applebot-Extended` | robots.txt opt-out token for Apple Intelligence **training** (no separate crawler) | token only | |
| **New major entrants (2025–26)** | `MistralAI-User` (Mistral / Le Chat citation fetch); `DuckAssistBot` (DuckDuckGo AI answers, retrieval not training); `GrokBot/1.0`, `xAI-Grok/1.0`, `Grok-DeepSearch/1.0` (xAI); DeepSeek emerging | retrieval / user-fetch | honors (per docs) | ([openshadow](https://www.openshadow.io/guides/ai-bot-user-agents-2026), [gradientgroup](https://gradientgroup.com/complete-crawler-list-for-ai-user-agents-dec-2025/)) |
| **Aggregators feeding many** | `CCBot` (Common Crawl); `Bytespider` (ByteDance — **does NOT reliably honor robots.txt**); `cohere-ai` (Cohere); `Diffbot`, `YouBot` | mixed | varies | Bytespider and (per some reports) Meta historically non-compliant ([lumengeo](https://lumengeo.co/blog/ai-crawler-list-2026), [nohacks](https://nohacks.co/blog/ai-user-agents-landscape-2026)) |

**What changed since mid-2025 (the deltas to bake in):**
- OpenAI (Dec 2025) and Anthropic split monolithic crawlers into **training / retrieval / user-fetch** triplets — a monitor must track each token separately, since blocking the *retrieval* one is the high-severity event.
- Meta consolidated to `Meta-ExternalAgent` + `Meta-ExternalFetcher`, retiring `FacebookBot` for AI.
- **Perplexity stealth-crawling incident (Aug 4 2025):** Cloudflare published evidence of undeclared crawlers rotating UAs/IPs/ASNs and impersonating Chrome-on-macOS to evade `Disallow`; Cloudflare **de-listed Perplexity from its verified-bots list.** ([seerinteractive](https://www.seerinteractive.com/insights/perplexity-stealth-ai-crawling-and-the-impacts-on-geo-and-log-file-analysis), [malwarebytes](https://www.malwarebytes.com/blog/news/2025/08/perplexity-ai-ignores-no-crawling-rules-on-websites-crawls-them-anyway)) Practical effect: a robots.txt block against Perplexity is **not reliable**; monitor server logs, not just robots.txt.
- New vendors: **xAI (Grok), Mistral, DuckAssistBot, DeepSeek.**
- **AWS + Cloudflare joint agent-key registry** announced Feb 2026 (Web Bot Auth-style signed-agent verification) — an emerging way to *cryptographically* verify agent traffic vs. spoofed UAs. `[FLAG: nascent — verify current adoption]` ([openshadow](https://www.openshadow.io/guides/ai-bot-user-agents-2026))

### 1.4 llms.txt adoption in 2026 — still effectively unadopted by consumers

- **No major AI vendor is confirmed to consume `llms.txt`.** OpenAI's crawler docs don't mention it and point owners to robots.txt; Anthropic references it only in dev docs; **Google clarified on 2026-06-15 that `llms.txt` is not required for Google Search.** ([getpassionfruit](https://www.getpassionfruit.com/blog/should-i-create-an-llms.txt-file-google-s-2026-guidance-explained), [codersera](https://codersera.com/blog/llms-txt-complete-guide-2026/))
- Google's John Mueller (June 2025): "no AI system currently uses llms.txt." Still broadly true in 2026. `[FLAG: sentiment, not a formal vendor statement]`
- **Adoption of publishing files rose ~8.8x, but ~97% of `llms.txt` files receive zero AI requests.** ([ppc.land](https://ppc.land/llms-txt-adoption-rises-8-8x-but-97-of-files-get-zero-ai-requests/), [presenc.ai](https://presenc.ai/research/state-of-llms-txt-2026))
- Publishers include Anthropic, Stripe, Cursor, Cloudflare, Vercel, Supabase, etc. — but adoption ≠ consumption. Treat `llms.txt` as **agent-readiness documentation**, not a ranking/citation lever. **Monitoring value = low-severity completeness signal**, not a page-down alert.

---

## 2. AI Register / Compliance Monitoring

> **Bottom line up front:** As of 2026-07-24, **EU AI Act Article 50 transparency obligations are NOT delayed and take effect 2 August 2026 (~9 days away).** The Digital Omnibus deferred the *high-risk* obligations (Articles 9–15, incl. 12 & 14) — **not** Article 50 — to 2 December 2027 / 2 August 2028. **Colorado's original AI Act was repealed and replaced; the new law takes effect 1 January 2027.** Details and citations below.

### 2.1 EU AI Act Article 50 (transparency) — in effect 2 August 2026, NOT postponed

- **Article 50 applies from 2 August 2026 and was deliberately left untouched by the Digital Omnibus** (which only moved high-risk deadlines). ([aiactblog](https://www.aiactblog.nl/en/posts/article-50-transparency-deadline-2-august-2026), [datamatters.sidley](https://datamatters.sidley.com/2026/06/24/eu-ai-act-transparency-obligations-preparing-for-compliance-by-2-august-2026/), [compliancehub](https://compliancehub.wiki/eu-ai-act-article-50-transparency-digital-omnibus-2026/))
- **What is enforceable from 2 Aug 2026:** users must be told when interacting with a chatbot; deepfakes and AI-generated public-interest text must be labelled; generative outputs must be machine-readable-marked. ([techtimes](https://www.techtimes.com/articles/319996/20260709/ai-content-labeling-enforcement-begins-24-days-eu-clears-compliance-code.htm))
- **Grandfathering grace (from the Omnibus):** generative systems already **on the EU market before 2 Aug 2026** have until **2 December 2026** to bring machine-readable marking/detection into conformity. Systems placed after 2 Aug must comply from day one. ([techtimes](https://www.techtimes.com/articles/321174/20260721/eu-finalizes-ai-disclosure-rules-watermarking-mandate-outpaces-technology.htm), [compliancehub](https://compliancehub.wiki/eu-ai-act-marking-labelling-code-of-practice-article-50-2026/))
- **Further milestone:** watermark-detection **interoperability** solutions expected ~**February 2027**. A **Code of Practice on marking/labelling of AI-generated content** underpins compliance. ([digital-strategy.ec.europa.eu](https://digital-strategy.ec.europa.eu/en/policies/code-practice-ai-generated-content))
- **Monitoring implication:** the near-term "deadline about to hit" alert is Article 50 (Aug 2), then the Dec 2 2026 marking-conformity date for grandfathered systems.

### 2.2 Articles 12 (record-keeping/logging) & 14 (human oversight) — high-risk, deferred with the Omnibus

- Articles 12 and 14 are **Chapter III high-risk obligations.** Their application date rides the high-risk timeline, which the **Digital Omnibus deferred**:
  - **Annex III high-risk (Art 6(2)): 2 August 2026 → 2 December 2027.**
  - **Annex I product-embedded high-risk (Art 6(1)): → 2 August 2028.** ([orrick](https://www.orrick.com/en/Insights/2026/05/EUs-Digital-Omnibus-on-AI-7-Key-Changes-You-Need-to-Know), [aiactblog](https://www.aiactblog.nl/en/posts/digital-omnibus-high-risk-postponement-december-2027), [verifywise](https://verifywise.ai/blog/eu-ai-act-omnibus-what-changed), [gibsondunn](https://www.gibsondunn.com/eu-ai-act-omnibus-agreement-postponed-high-risk-deadlines-and-other-key-changes/))
- **Substance of the articles (unchanged):** Art 12 requires high-risk systems to **automatically record events (logs) over their lifetime**; Art 14 requires **effective human oversight** via human-machine interface tools. ([artificialintelligenceact.eu/12](https://artificialintelligenceact.eu/article/12/), [artificialintelligenceact.eu/14](https://artificialintelligenceact.eu/article/14/))
- **The deferral is conditional / readiness-based:** tied to a high-risk **registration database** the AI Office is standing up and to finalization of harmonised standards and support tools; Art 6 classification **draft guidelines** were published 2026-05-19 (consultation closed 2026-06-23; final expected end-2026). ([globalpolicywatch](https://www.globalpolicywatch.com/2026/06/eu-ai-act-update-timeline-relief-targeted-simplification-and-new-prohibitions-2/))

**Digital Omnibus legislative status** (verify carefully — this is the fast-moving piece):
- Commission proposed it ~19 Nov 2025; **political (trilogue) agreement 7 May 2026; Parliament adopted 16 June 2026; Council approved 29 June 2026; final act signed 8 July 2026; awaiting Official Journal publication / entry into force** as of late July 2026. ([whitecase](https://www.whitecase.com/insight-alert/eu-agrees-digital-omnibus-deal-simplify-ai-rules), [medialaws tracker](https://www.medialaws.eu/digital-omnibus-legislative-tracker/), [europarl legislative train](https://www.europarl.europa.eu/legislative-train/package-digital-package/file-digital-omnibus-on-ai)) `[FLAG: confirm it has been published in the OJ and the exact entry-into-force date; the multiple search sources agree on these dates but I could not fetch a primary EU source directly. This is the single most important item to re-verify — the deferral is only legally locked once published.]`

### 2.3 US state AI laws — 2026 status

- **Colorado — repealed and replaced (not merely delayed).** Timeline: original SB 24-205 was to take effect **Feb 1 2026 → delayed to June 30 2026** (SB 25B-004, Aug 2025) → then **SB 26-189, signed 2026-05-14, REPEALS AND RE-ENACTS the Act with a new framework, effective 1 January 2027.** ([crowell](https://www.crowell.com/en/insights/client-alerts/colorado-hits-reset-on-ai-regulation-sb-26-189-repeals-and-reenacts-the-colorado-ai-act), [finnegan](https://www.finnegan.com/en/insights/articles/colorado-replaces-landmark-ai-act-an-overview-of-the-new-sb-26-189-framework.html), [leg.colorado.gov/sb26-189](https://leg.colorado.gov/bills/sb26-189)) The new law drops the "high-risk AI system" model for **"covered automated decision-making technology (ADMT)"** and **removes** the mandatory risk-management program, annual impact assessments, and the freestanding duty of care to prevent algorithmic discrimination. `[FLAG: your prompt's framing ("Feb 2026 after a delay from Jan 1 2027") was inverted — the correct sequence is Feb 2026 → June 2026 → Jan 1 2027, and the Act was rewritten, not just postponed.]`
- **Texas TRAIGA (Responsible AI Governance Act, HB 149)** — **effective 1 January 2026.** AG-exclusive enforcement, no private right of action, civil penalties up to $200k/violation, 60-day cure period, regulatory sandbox, AI Advisory Council. ([TRAIGA/Wikipedia](https://en.wikipedia.org/wiki/TRAIGA), [nortonrosefulbright](https://www.nortonrosefulbright.com/en/knowledge/publications/c6c60e0c/the-texas-responsible-ai-governance-act), [lw.com](https://www.lw.com/en/insights/texas-signs-responsible-ai-governance-act-into-law))
- **California — three relevant laws:**
  - **SB 53 (Transparency in Frontier AI Act)** — **effective 1 Jan 2026.** Frontier developers publish safety protocols, report critical safety incidents, whistleblower protections; penalties up to $1M/violation. ([wilmerhale](https://www.wilmerhale.com/en/insights/blogs/wilmerhale-privacy-and-cybersecurity-law/20251001-transparency-in-frontier-artificial-intelligence-act-sb-53-california-requires-new-standardized-ai-safety-disclosures))
  - **AB 2013 (Generative AI Training Data Transparency)** — **effective 1 Jan 2026.** Publish high-level training-data documentation. ([kslaw](https://www.kslaw.com/news-and-insights/new-state-ai-laws-are-effective-on-january-1-2026-but-a-new-executive-order-signals-disruption))
  - **SB 942 (California AI Transparency Act)** — originally 1 Jan 2026 but **delayed by AB 853 to 2 August 2026.** Large GenAI providers (>1M MAU) must offer free AI-detection tools + visible/latent disclosures; $5,000/violation/day. ([leginfo SB942](https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202320240SB942), [pillsburylaw](https://www.pillsburylaw.com/en/news-and-insights/new-california-ai-laws.html))

### 2.4 Compliance-EVIDENCE monitoring — what counts as a "regression," and retention periods

**What auditors/tools flag as a compliance regression over time** ("compliance drift"): a control that **passes at assessment then silently slips to a gap between audit cycles** — "a control may pass testing one quarter, drift out of compliance the next, and remain unnoticed until the next audit." ([zipsec](https://www.zipsec.com/blog/compliance-drift), [scytale CCM](https://scytale.ai/center/grc/continuous-controls-monitoring/)) The notable 2026 shift: **auditors increasingly want the continuous-monitoring alert log itself as evidence** — the implicit ask is "we have a tool that alerts on drift, and here is the alert log for the period." ([scrut](https://www.scrut.io/post/compliance-monitoring)) This is directly your product's wedge: an **evidence timeline + drift-alert log** is now audit-grade artifact, not just ops nicety. Continuous-controls-monitoring is reported as the **weakest-covered capability across GRC platforms in 2026** — a gap to exploit.

**Detector pattern:** treat each control as `satisfied → gap` a **regression event** (high severity), `gap → satisfied` an **informational recovery**, and stamp every state change with immutable time + evidence hash so the alert log is itself the audit trail.

**Mandated retention periods** (bake into retention/expiry detectors):

| Regime | Artifact | Minimum retention |
|---|---|---|
| **EU AI Act Art 19** | Automatically generated **logs** (high-risk) | **≥ 6 months** from generation (unless longer required by other Union/national law) ([artificialintelligenceact.eu/19](https://artificialintelligenceact.eu/article/19/), [deepinspect](https://www.deepinspect.ai/blog/eu-ai-act-article-19-logs)) |
| **EU AI Act Art 18** | **Technical documentation** (high-risk) | **10 years** from placing on market ([artificialintelligenceact.eu/18](https://artificialintelligenceact.eu/article/18/)) |
| **Colorado (repealed SB 24-205)** | Records / impact assessments | **3 years** (longer of "in use" or 3 yrs after discontinuation; impact assessments 3 yrs after final deployment) ([almcorp](https://almcorp.com/blog/colorado-ai-act-sb-205-compliance-guide/), [co-aims](https://co-aims.com/blog/colorado-ai-act-sb-24-205-complete-compliance-guide)) `[FLAG: the 3-year figure is from the now-repealed SB 24-205. Retention specifics under the new SB 26-189 ADMT framework (eff. 1 Jan 2027) may differ — confirm before quoting the 3-year number as current Colorado law.]` |

---

## 3. Alerting Best Practices (brief)

**Severity model** — standard 3-tier (map to whatever P1–P4 you prefer):
- **Critical** — pages/interrupts a human; reserved for "wake someone up" events. Only critical alerts should interrupt sleep.
- **Warning** — actionable but not urgent; queue for business hours.
- **Informational** — routed to a dashboard/report, never to an inbox or pager.
- **Every alert maps to a specific escalation path**, and critical is routed to paging/on-call while lower tiers stay on dashboards. ([incident.io](https://incident.io/blog/sre-alerting-best-practices), [oneuptime](https://oneuptime.com/blog/post/2026-02-20-monitoring-alerting-best-practices/view))

**Avoiding alert fatigue** (the levers, in priority order for a change-monitoring product):
1. **Only alert on change / delta**, not on steady-state — SLO-/threshold-based, so a value must cross a defined threshold before firing. ([oneuptime](https://oneuptime.com/blog/post/2026-02-20-monitoring-alerting-best-practices/view))
2. **Deduplication windows** — collapse repeats of the same detection within a period so one event ≠ 50 alerts. ([panther](https://panther.com/blog/mastering-alert-fatigue-best-practices-for-centralized-management))
3. **Correlation / grouping** — bundle related signals (e.g., "robots block + citations dropping") into one incident rather than N alerts. ([incident.io](https://incident.io/blog/sre-alerting-best-practices))
4. **Actionability test** — "if an alert fires and the on-call engineer cannot take a specific action, the alert should not exist." Use this to prune informational noise. ([rootly](https://rootly.com/on-call-software/alert-fatigue), [incident.io](https://incident.io/blog/sre-alerting-best-practices))

**Direct application to Fleet Deck detectors:** fire on `state → worse` transitions (e.g. `retrieval-crawler allowed → blocked`, `JSON-LD present → absent`, `control satisfied → gap`); dedupe re-detections of the same regression; group cause-signals (page legibility) with their outcome-signals (citation drop) into one incident; and set severity by *impact*, not by *event type* — a retrieval-bot block or a satisfied→gap control transition is Critical; an llms.txt removal or a training-only-bot block is Warning/Info.

---

### Residual verification checklist (the `[FLAG]` items)
1. **Digital Omnibus OJ publication + entry-into-force date** — signed 8 Jul 2026, but confirm it's published and in force (deferral is only locked once published). *Most important.*
2. **Anthropic crawler-doc update date** — confirm Feb 20 year (2025 vs 2026).
3. **Colorado SB 26-189 retention periods** under the new ADMT framework (the 3-year figure is from the repealed act).
4. **AWS/Cloudflare agent-key registry** adoption status (nascent as of Feb 2026).
5. **John Mueller llms.txt quote** is sentiment/informal, not a formal vendor policy statement.
