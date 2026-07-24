// Agent-Ready checker — a static analyzer that scores how "legible" a web page is
// to AI agents / answer engines (ChatGPT, Claude, Perplexity, Google AI, …). It
// separates FETCH from ANALYZE on purpose: `analyze()` is a PURE function of
// already-fetched inputs (html/robots.txt/llms.txt/headers) so the scoring is
// deterministic and testable with zero network. `fetchSite()` is the thin,
// side-effecting front that gathers those inputs with the global `fetch`.
//
// HEURISTIC, NOT A STANDARD. The weights below are an opinionated rubric for
// "does an agent stand a good chance of reading, parsing and citing this page?".
// They are NAMED CONSTANTS so the whole score is auditable and arguable — tune
// them, don't trust them as gospel.

// ── Scoring weights (must sum to MAX_SCORE = 100) ──────────────────────────────
export const WEIGHTS = {
  AI_CRAWLER_ACCESS: 20, // robots.txt / X-Robots lets AI crawlers in at all — table stakes
  JSON_LD: 18,           // structured data is the single biggest legibility lever
  CONTENT_DENSITY: 15,   // real text in the HTML, not a JS shell an agent can't read
  SEMANTICS: 12,         // <main>/<article>/one <h1>/sane outline — the reading map
  SOCIAL: 8,             // Open Graph / Twitter cards — cheap, widely consumed metadata
  LLMS_TXT: 8,           // /llms.txt — an explicit map written for models
  TITLE: 6,              // a non-empty <title>
  META_DESCRIPTION: 6,   // a meta description
  CANONICAL: 5,          // canonical link — dedupes what the agent indexes
  HEADERS: 2,            // content-type is html and no blocking X-Robots-Tag
};
export const MAX_SCORE = Object.values(WEIGHTS).reduce((a, b) => a + b, 0); // 100

// Known AI-crawler / answer-engine user-agent tokens (exact, case-insensitive).
// Split intentionally: `training` bots fetch corpus, `search` bots power live
// answer engines — both matter, we report per-agent regardless of bucket.
// Role matters: blocking a RETRIEVAL/answer crawler (the bot that fetches a page to
// cite it in a live answer) is what actually costs you AI-search citations — far more
// than blocking a TRAINING crawler or a per-user fetch. Detectors weight these
// differently. (research: Cloud/AEO 2026 — retrieval-block ≈ citations collapse.)
export const AI_AGENT_ROLES = {
  GPTBot: 'training', 'OAI-SearchBot': 'retrieval', 'ChatGPT-User': 'user',
  ClaudeBot: 'training', 'Claude-SearchBot': 'retrieval', 'Claude-User': 'user',
  PerplexityBot: 'retrieval', 'Perplexity-User': 'user',
  DuckAssistBot: 'retrieval',
  GrokBot: 'training', 'MistralAI-User': 'user',
  'Google-Extended': 'optout', 'meta-externalagent': 'training',
  'Meta-ExternalFetcher': 'user', Amazonbot: 'training', 'Applebot-Extended': 'optout',
};
export const AI_AGENTS = Object.keys(AI_AGENT_ROLES);

// JSON-LD @types we treat as high-value for agents, with common subtypes folded in.
const SCHEMA_TARGETS = {
  Organization: ['organization', 'localbusiness', 'corporation', 'onlinestore', 'ngo', 'educationalorganization'],
  Article: ['article', 'newsarticle', 'blogposting', 'techarticle', 'scholarlyarticle', 'report'],
  FAQPage: ['faqpage', 'qapage'],
  Product: ['product', 'productgroup'],
  BreadcrumbList: ['breadcrumblist'],
};

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const round1 = (n) => Math.round(n * 10) / 10;

// ── HTML helpers (regex/string only — no HTML parser dependency) ───────────────

/** Pull the visible text: drop comments, <script>/<style> bodies, then all tags. */
function visibleText(html) {
  return String(html || '')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Parse a tag's attributes into a lowercased map (handles ", ', and bare values). */
function attrs(tag) {
  const out = {};
  for (const m of String(tag).matchAll(/([a-z][a-z0-9-]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/gi)) {
    out[m[1].toLowerCase()] = (m[3] ?? m[4] ?? m[5] ?? '').trim();
  }
  return out;
}

const metaTags = (html) => [...String(html || '').matchAll(/<meta\b[^>]*>/gi)].map((m) => attrs(m[0]));

/** Recursively collect every @type value and note sameAs presence in a JSON-LD tree. */
function collectTypes(node, acc) {
  if (Array.isArray(node)) { for (const n of node) collectTypes(n, acc); return; }
  if (node && typeof node === 'object') {
    const t = node['@type'];
    if (t) (Array.isArray(t) ? t : [t]).forEach((x) => acc.types.add(String(x)));
    if (node.sameAs) acc.sameAs = true;
    for (const k of Object.keys(node)) collectTypes(node[k], acc);
  }
}

function analyzeHtml(html) {
  const src = String(html || '');

  // Title + meta description.
  const titleM = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(src);
  const title = titleM ? titleM[1].replace(/\s+/g, ' ').trim() : '';
  const metas = metaTags(src);
  const descTag = metas.find((a) => (a.name || '').toLowerCase() === 'description');
  const description = descTag ? (descTag.content || '').trim() : '';

  // Meta-robots. An in-HTML `<meta name="robots" content="noindex|none">` makes the page
  // non-indexable for every agent — as authoritative as, and MORE common than, the
  // X-Robots-Tag HTTP header. Catch it here so the noindex signal isn't blind to the
  // predominant declaration form.
  // Crawlers COMBINE every <meta name="robots"> directive and honor the most restrictive, so
  // aggregate all of them — a trailing noindex after an index,follow tag still makes the page
  // non-indexable (reading only the first tag would miss it).
  const robotsMetaContent = metas.filter((a) => (a.name || '').toLowerCase() === 'robots')
    .map((a) => a.content || '').join(', ');
  const metaNoindex = /\b(noindex|none)\b/i.test(robotsMetaContent);

  // JSON-LD blocks: parse each, tolerate garbage, collect types + sameAs.
  const acc = { types: new Set(), sameAs: false };
  let jsonLdBlocks = 0, jsonLdValid = 0, jsonLdInvalid = 0;
  for (const m of src.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    jsonLdBlocks++;
    try {
      const data = JSON.parse(m[1].trim());
      jsonLdValid++;
      collectTypes(data, acc);
    } catch {
      jsonLdInvalid++; // malformed JSON-LD is reported, never counted as valid
    }
  }
  const typeList = [...acc.types].sort();
  const lcTypes = typeList.map((t) => t.toLowerCase());
  const has = {};
  for (const [name, aliases] of Object.entries(SCHEMA_TARGETS)) has[name] = lcTypes.some((t) => aliases.includes(t));

  // Semantics: <main>, <article>, <h1> count, heading-outline sanity.
  const hasMain = /<main\b[^>]*>/i.test(src);
  const hasArticle = /<article\b[^>]*>/i.test(src);
  const h1Count = (src.match(/<h1\b[^>]*>/gi) || []).length;
  const outline = [...src.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)].map((m) => +m[1]);
  let outlineOk = outline.length > 0 && outline[0] === 1;
  for (let i = 1; i < outline.length && outlineOk; i++) if (outline[i] - outline[i - 1] > 1) outlineOk = false;

  // Social metadata: Open Graph + Twitter card tag counts.
  const ogCount = metas.filter((a) => (a.property || '').toLowerCase().startsWith('og:')).length;
  const twitterCount = metas.filter((a) => (a.name || '').toLowerCase().startsWith('twitter:')).length;

  // Canonical link.
  const canonical = /<link\b[^>]*rel\s*=\s*["']?[^"'>]*\bcanonical\b[^"'>]*["']?[^>]*>/i.test(src);

  // Content density: visible-text length vs raw markup length. A JS SPA shell is
  // almost all <script>/markup and near-zero readable text.
  const text = visibleText(src);
  const textLength = text.length;
  const htmlLength = src.length;
  const ratio = htmlLength ? textLength / htmlLength : 0;
  const likelyShell = textLength < 200 || ratio < 0.05;

  return {
    title: { present: title.length > 0, text: title },
    metaDescription: { present: description.length > 0, length: description.length },
    jsonLd: { blocks: jsonLdBlocks, valid: jsonLdValid, invalid: jsonLdInvalid, types: typeList, has, sameAs: acc.sameAs },
    semantics: { main: hasMain, article: hasArticle, h1Count, headingOutlineOk: outlineOk, outline },
    social: { ogCount, twitterCount, total: ogCount + twitterCount },
    canonical: { present: canonical },
    contentDensity: { textLength, htmlLength, ratio: round1(ratio * 100) / 100, likelyShell },
    metaRobots: { noindex: metaNoindex, content: robotsMetaContent },
  };
}

// ── robots.txt ─────────────────────────────────────────────────────────────────

/** Parse robots.txt into groups: [{ agents:[...], rules:[{type,value}] }]. A new
 *  User-agent line AFTER a rule line starts a fresh group (per the standard). */
function parseRobots(txt) {
  const groups = [];
  let cur = null, sawRule = false;
  for (const raw of String(txt || '').split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    const i = line.indexOf(':');
    if (i < 0) continue;
    const field = line.slice(0, i).trim().toLowerCase();
    const value = line.slice(i + 1).trim();
    if (field === 'user-agent') {
      if (!cur || sawRule) { cur = { agents: [], rules: [] }; groups.push(cur); sawRule = false; }
      if (value) cur.agents.push(value);
    } else if ((field === 'allow' || field === 'disallow') && cur) {
      cur.rules.push({ type: field, value });
      sawRule = true;
    }
  }
  return groups;
}

/** Does a robots path pattern (with * and $) match `path`? */
function pathMatches(pattern, path) {
  const anchored = pattern.endsWith('$');
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const rx = '^' + body.split('*').map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + (anchored ? '$' : '');
  try { return new RegExp(rx).test(path); } catch { return false; }
}

/** Evaluate a group's rules against a path. Longest match wins; on a tie Allow
 *  beats Disallow (Google's rule). No matching rule ⇒ allowed. */
function pathAllowed(group, path) {
  let best = null;
  for (const r of group.rules) {
    if (r.value === '') continue; // empty Disallow == allow everything (matches nothing)
    if (!pathMatches(r.value, path)) continue;
    const len = r.value.replace(/\$$/, '').length;
    if (!best || len > best.len || (len === best.len && r.type === 'allow')) best = { type: r.type, len };
  }
  return !best || best.type === 'allow';
}

/** Pick the group that applies to `agent`: an exact (case-insensitive) token match
 *  wins over the `*` wildcard group; no match ⇒ null (default-allow). */
function groupFor(groups, agent) {
  const lc = agent.toLowerCase();
  let specific = null, star = null;
  for (const g of groups) for (const ua of g.agents) {
    if (ua.toLowerCase() === lc) specific = g;
    else if (ua === '*') star = g;
  }
  return specific || star || null;
}

function analyzeRobots(robotsTxt) {
  const present = String(robotsTxt || '').trim().length > 0;
  const groups = parseRobots(robotsTxt);
  const agentsRep = {};
  let blockedCount = 0, blockedRetrieval = 0;
  for (const agent of AI_AGENTS) {
    const g = groupFor(groups, agent);
    const via = g ? (g.agents.find((a) => a.toLowerCase() === agent.toLowerCase()) ? agent : '*') : null;
    const allowed = g ? pathAllowed(g, '/') : true; // no applicable group ⇒ default-allow
    const role = AI_AGENT_ROLES[agent];
    if (!allowed) { blockedCount++; if (role === 'retrieval') blockedRetrieval++; }
    agentsRep[agent] = { allowed, blocked: !allowed, via, role };
  }
  return {
    present,
    knownCount: AI_AGENTS.length,
    blockedCount,
    blockedRetrieval, // blocking an answer-engine RETRIEVAL bot is the citation-killer
    allowedCount: AI_AGENTS.length - blockedCount,
    agents: agentsRep,
    summary: `blocks ${blockedCount} of ${AI_AGENTS.length} known AI agents${blockedRetrieval ? ` (incl. ${blockedRetrieval} answer-engine retrieval bot${blockedRetrieval > 1 ? 's' : ''})` : ''}`,
  };
}

// ── llms.txt ─────────────────────────────────────────────────────────────────

/** Sanity-check the llms.txt format (llmstxt.org): required H1, then usually a
 *  blockquote summary and/or H2 sections of markdown links. */
function analyzeLlms(llmsTxt) {
  const txt = String(llmsTxt || '');
  const present = txt.trim().length > 0;
  if (!present) return { present: false, valid: false, reason: 'no /llms.txt found' };
  const lines = txt.split(/\r?\n/);
  const firstReal = lines.find((l) => l.trim().length > 0) || '';
  const startsWithH1 = /^#\s+\S/.test(firstReal.trim());
  const hasBlockquote = lines.some((l) => /^\s*>\s+\S/.test(l));
  const hasSection = lines.some((l) => /^##\s+\S/.test(l));
  const hasLink = /\[[^\]]+\]\([^)]+\)/.test(txt); // markdown link anywhere
  const valid = startsWithH1 && (hasBlockquote || hasSection || hasLink);
  const reason = valid ? 'valid llms.txt'
    : !startsWithH1 ? 'does not start with an H1 title'
    : 'no blockquote summary, sections, or markdown links';
  return { present: true, valid, startsWithH1, hasBlockquote, hasSection, hasLink, reason };
}

// ── headers ──────────────────────────────────────────────────────────────────

function headerGet(headers, name) {
  if (!headers) return undefined;
  if (typeof headers.get === 'function') return headers.get(name) ?? undefined;
  const lc = name.toLowerCase();
  for (const k of Object.keys(headers)) if (k.toLowerCase() === lc) return headers[k];
  return undefined;
}

function analyzeHeaders(headers) {
  const contentType = headerGet(headers, 'content-type') || '';
  const xRobots = headerGet(headers, 'x-robots-tag') || '';
  const blocks = /\b(noindex|none)\b/i.test(xRobots);
  const isHtml = /text\/html|application\/xhtml/i.test(contentType);
  return { contentType, xRobotsTag: xRobots, blocks, isHtml };
}

// ── scoring ──────────────────────────────────────────────────────────────────

/**
 * Pure analyzer. Give it already-fetched inputs; get back a scored, explainable
 * report. Never throws on garbage input — every parse is defensive.
 * @param {{url?:string, html?:string, robotsTxt?:string, llmsTxt?:string, headers?:object}} input
 */
export function analyze({ url = '', html = '', robotsTxt = '', llmsTxt = '', headers = null } = {}) {
  const h = analyzeHtml(html);
  const robots = analyzeRobots(robotsTxt);
  const llms = analyzeLlms(llmsTxt);
  const hdr = analyzeHeaders(headers);

  const breakdown = [];
  const add = (signal, weight, earned, detail) =>
    breakdown.push({ signal, weight, earned: round1(clamp(earned, 0, weight)), detail });

  // AI crawler access — proportion of known agents allowed in, with an EXTRA penalty
  // for blocking answer-engine RETRIEVAL bots (blocking those is the citation-killer,
  // far worse than blocking a training crawler). An X-Robots noindex caps it hard.
  const retrievalTotal = Object.values(AI_AGENT_ROLES).filter((r) => r === 'retrieval').length;
  // Non-indexable either way: an X-Robots-Tag header OR an in-HTML meta-robots noindex/none.
  const noindexed = hdr.blocks || h.metaRobots.noindex;
  const noindexVia = hdr.blocks ? 'X-Robots-Tag' : h.metaRobots.noindex ? 'meta robots' : '';
  let accessFrac = robots.allowedCount / robots.knownCount;
  if (robots.blockedRetrieval > 0) accessFrac = Math.max(0, accessFrac - 0.4 * (robots.blockedRetrieval / retrievalTotal));
  let access = WEIGHTS.AI_CRAWLER_ACCESS * accessFrac;
  if (noindexed) access = Math.min(access, WEIGHTS.AI_CRAWLER_ACCESS * 0.25);
  add('AI_CRAWLER_ACCESS', WEIGHTS.AI_CRAWLER_ACCESS, access,
    noindexed ? `${robots.summary}; ${noindexVia} blocks indexing` : robots.summary);

  // JSON-LD — base credit for any valid block, then per high-value type + sameAs.
  const typesPresent = Object.values(h.jsonLd.has).filter(Boolean).length;
  let jsonLd = 0;
  if (h.jsonLd.valid > 0) jsonLd += 6;
  jsonLd += Math.min(typesPresent * 2, 10);
  if (h.jsonLd.sameAs) jsonLd += 2;
  add('JSON_LD', WEIGHTS.JSON_LD, jsonLd,
    h.jsonLd.blocks === 0 ? 'no JSON-LD structured data'
      : `${h.jsonLd.valid} valid / ${h.jsonLd.invalid} invalid block(s); types: ${h.jsonLd.types.join(', ') || 'none'}`);

  // Content density — linear credit between a shell (≤3%) and content-rich (≥15%);
  // a near-empty body earns nothing regardless of ratio.
  let densityFrac = clamp((h.contentDensity.ratio - 0.03) / (0.15 - 0.03), 0, 1);
  if (h.contentDensity.textLength < 200) densityFrac = 0;
  add('CONTENT_DENSITY', WEIGHTS.CONTENT_DENSITY, WEIGHTS.CONTENT_DENSITY * densityFrac,
    `${h.contentDensity.textLength} chars text, ${Math.round(h.contentDensity.ratio * 100)}% text/markup${h.contentDensity.likelyShell ? ' (likely JS shell)' : ''}`);

  // Semantics — <main> + <article> + exactly one <h1> + sane outline.
  let sem = 0;
  if (h.semantics.main) sem += 4;
  if (h.semantics.article) sem += 3;
  sem += h.semantics.h1Count === 1 ? 4 : h.semantics.h1Count === 0 ? 0 : 2;
  if (h.semantics.headingOutlineOk) sem += 1;
  add('SEMANTICS', WEIGHTS.SEMANTICS, sem,
    `main=${h.semantics.main} article=${h.semantics.article} h1=${h.semantics.h1Count} outlineOk=${h.semantics.headingOutlineOk}`);

  // Social cards — full credit at ≥4 og/twitter tags.
  add('SOCIAL', WEIGHTS.SOCIAL, WEIGHTS.SOCIAL * clamp(h.social.total / 4, 0, 1),
    `${h.social.ogCount} OG + ${h.social.twitterCount} Twitter tag(s)`);

  // llms.txt — full for valid, partial for present-but-malformed.
  add('LLMS_TXT', WEIGHTS.LLMS_TXT, llms.valid ? WEIGHTS.LLMS_TXT : llms.present ? 3 : 0, llms.reason);

  // Title / meta description / canonical — cheap binaries.
  add('TITLE', WEIGHTS.TITLE, h.title.present ? WEIGHTS.TITLE : 0, h.title.present ? `"${h.title.text.slice(0, 60)}"` : 'missing or empty <title>');
  add('META_DESCRIPTION', WEIGHTS.META_DESCRIPTION, h.metaDescription.present ? WEIGHTS.META_DESCRIPTION : 0,
    h.metaDescription.present ? `${h.metaDescription.length} chars` : 'missing meta description');
  add('CANONICAL', WEIGHTS.CANONICAL, h.canonical.present ? WEIGHTS.CANONICAL : 0, h.canonical.present ? 'canonical link present' : 'no canonical link');

  // Headers — html content-type and no blocking X-Robots-Tag.
  let headerScore = WEIGHTS.HEADERS;
  if (hdr.blocks) headerScore = 0;
  else if (hdr.contentType && !hdr.isHtml) headerScore = 1;
  add('HEADERS', WEIGHTS.HEADERS, headerScore,
    `content-type: ${hdr.contentType || 'unknown'}${hdr.xRobotsTag ? `; x-robots-tag: ${hdr.xRobotsTag}` : ''}`);

  const score = clamp(Math.round(breakdown.reduce((s, b) => s + b.earned, 0)), 0, MAX_SCORE);
  const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';

  return {
    url,
    score,
    grade,
    maxScore: MAX_SCORE,
    breakdown,
    signals: h,
    robots,
    llms,
    headers: hdr,
    noindexed, // non-indexable for ALL agents, by header OR meta-robots
    noindexVia,
    recommendations: recommend(breakdown, { h, robots, llms, hdr, noindexed, noindexVia }),
  };
}

/** Highest-impact fixes first: rank the unearned points per signal, then attach a
 *  concrete, low-cost instruction for each real gap. */
function recommend(breakdown, ctx) {
  const fixes = {
    AI_CRAWLER_ACCESS: () => {
      const blocked = Object.entries(ctx.robots.agents).filter(([, v]) => v.blocked).map(([k]) => k);
      if (ctx.hdr.blocks) return `Remove the blocking X-Robots-Tag ("${ctx.hdr.xRobotsTag}") so agents may index this page.`;
      if (ctx.h.metaRobots?.noindex) return `Remove the <meta name="robots" content="${ctx.h.metaRobots.content}"> tag so agents may index this page.`;
      return `Unblock AI crawlers in robots.txt (currently blocked: ${blocked.join(', ')}).`;
    },
    JSON_LD: () => ctx.h.jsonLd.invalid > 0
      ? `Fix ${ctx.h.jsonLd.invalid} malformed JSON-LD block(s) and add Organization + Article/Product schema.`
      : 'Add JSON-LD structured data (start with Organization + Article/Product, include sameAs) — highest-leverage signal for agents.',
    CONTENT_DENSITY: () => 'Server-render meaningful text — the page reads like a JS shell; agents mostly cannot execute JS.',
    SEMANTICS: () => `Use <main>/<article> landmarks and exactly one <h1> (found ${ctx.h.semantics.h1Count}).`,
    SOCIAL: () => 'Add Open Graph and Twitter Card meta tags (og:title, og:description, og:image, twitter:card).',
    LLMS_TXT: () => ctx.llms.present
      ? `Fix /llms.txt format: ${ctx.llms.reason} (start with an H1, add sections of markdown links).`
      : 'Publish an /llms.txt describing your site and key links for models.',
    TITLE: () => 'Add a descriptive, non-empty <title>.',
    META_DESCRIPTION: () => 'Add a <meta name="description"> summarizing the page.',
    CANONICAL: () => 'Add a <link rel="canonical"> to dedupe what agents index.',
    HEADERS: () => 'Serve a text/html content-type and drop any blocking X-Robots-Tag.',
  };
  return breakdown
    .map((b) => ({ signal: b.signal, gain: Math.round(b.weight - b.earned) }))
    .filter((r) => r.gain >= 1)
    .sort((a, b) => b.gain - a.gain || a.signal.localeCompare(b.signal))
    .map((r) => ({
      signal: r.signal,
      gain: r.gain,
      priority: r.gain >= 10 ? 'high' : r.gain >= 4 ? 'medium' : 'low',
      fix: fixes[r.signal](),
    }));
}

// ── fetch (side-effecting; kept out of analyze so tests need no network) ────────

/** Gather the inputs `analyze` needs for a live URL. Best-effort: a missing
 *  robots.txt / llms.txt is simply an empty string, never a throw. */
export async function fetchSite(url, { fetchImpl = fetch } = {}) {
  const origin = new URL(url).origin;
  const grab = async (u) => {
    try {
      const res = await fetchImpl(u, { redirect: 'follow', headers: { 'user-agent': 'FleetDeck-AgentReady/0.1' } });
      return { ok: res.ok, status: res.status, body: await res.text(), headers: res.headers };
    } catch { return { ok: false, status: 0, body: '', headers: null }; }
  };
  const [page, robots, llms] = await Promise.all([grab(url), grab(`${origin}/robots.txt`), grab(`${origin}/llms.txt`)]);
  return {
    url,
    html: page.body,
    headers: page.headers,
    robotsTxt: robots.ok ? robots.body : '',
    llmsTxt: llms.ok ? llms.body : '',
  };
}
