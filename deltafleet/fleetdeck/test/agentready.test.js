import test from 'node:test';
import assert from 'node:assert/strict';
import { analyze, WEIGHTS, MAX_SCORE, AI_AGENTS } from '../lib/agentready.js';

// A rich, well-marked-up page: title, meta desc, valid JSON-LD (Organization +
// Article + BreadcrumbList + sameAs), semantic landmarks, OG/Twitter, canonical,
// and lots of real prose.
const RICH_HTML = `<!doctype html><html><head>
  <title>How Answer Engines Read the Web — FleetDeck</title>
  <meta name="description" content="A field guide to making your pages legible to AI agents and answer engines.">
  <link rel="canonical" href="https://example.com/guide">
  <meta property="og:title" content="How Answer Engines Read the Web">
  <meta property="og:description" content="Field guide">
  <meta property="og:image" content="https://example.com/og.png">
  <meta name="twitter:card" content="summary_large_image">
  <script type="application/ld+json">
  {"@context":"https://schema.org","@graph":[
    {"@type":"Organization","name":"FleetDeck","sameAs":["https://twitter.com/x","https://linkedin.com/company/x"]},
    {"@type":"Article","headline":"How Answer Engines Read the Web","author":{"@type":"Person","name":"J. T."}},
    {"@type":"BreadcrumbList","itemListElement":[]}
  ]}
  </script>
</head><body>
  <main><article>
    <h1>How Answer Engines Read the Web</h1>
    <h2>Structured data</h2>
    <p>${'Agents prefer content-rich pages with clear structure and real text they can parse without executing JavaScript. '.repeat(30)}</p>
    <h2>Robots and access</h2>
    <p>${'Blocking a crawler in robots.txt removes you from that engine entirely, no matter how good the markup is. '.repeat(30)}</p>
  </article></main>
</body></html>`;

// A bare JS SPA shell: no structured data, no real text, no semantics.
const SHELL_HTML = `<!doctype html><html><head><title></title></head>
<body><div id="root"></div>
<script>${'window.__DATA__=1;for(let i=0;i<1000;i++){render(i);}'.repeat(40)}</script>
</body></html>`;

const OK_HEADERS = { 'content-type': 'text/html; charset=utf-8' };

test('rich, well-marked-up page scores A/B; bare JS shell scores D/F', () => {
  const rich = analyze({ url: 'https://example.com/guide', html: RICH_HTML, robotsTxt: '', llmsTxt: '', headers: OK_HEADERS });
  const shell = analyze({ url: 'https://example.com/app', html: SHELL_HTML, robotsTxt: '', llmsTxt: '', headers: OK_HEADERS });
  assert.ok(['A', 'B'].includes(rich.grade), `rich page graded ${rich.grade} (score ${rich.score})`);
  assert.ok(['D', 'F'].includes(shell.grade), `shell page graded ${shell.grade} (score ${shell.score})`);
  assert.ok(rich.score > shell.score + 30, 'rich clearly beats shell');
  // rich page's structured-data signals are all detected
  assert.deepEqual(rich.signals.jsonLd.has, { Organization: true, Article: true, FAQPage: false, Product: false, BreadcrumbList: true });
  assert.ok(rich.signals.jsonLd.sameAs);
  assert.equal(rich.signals.semantics.h1Count, 1);
  assert.ok(rich.signals.contentDensity.likelyShell === false);
  assert.ok(shell.signals.contentDensity.likelyShell === true, 'shell flagged as low density');
});

test('robots.txt blocking GPTBot & ClaudeBot is detected per-agent', () => {
  const robots = `User-agent: GPTBot
Disallow: /

User-agent: ClaudeBot
Disallow: /

User-agent: *
Disallow:`;
  const r = analyze({ html: RICH_HTML, robotsTxt: robots, headers: OK_HEADERS }).robots;
  assert.equal(r.agents.GPTBot.blocked, true);
  assert.equal(r.agents.ClaudeBot.blocked, true);
  assert.equal(r.agents.GPTBot.via, 'GPTBot');
  assert.equal(r.agents.PerplexityBot.blocked, false, 'unlisted agent falls through to * (allowed)');
  assert.equal(r.agents.PerplexityBot.via, '*');
  assert.equal(r.blockedCount, 2);
  assert.equal(r.summary, `blocks 2 of ${AI_AGENTS.length} known AI agents`);
});

test('User-agent:* + Disallow:/ blocks all AI agents; a specific Allow overrides', () => {
  const blockAll = `User-agent: *
Disallow: /`;
  const r1 = analyze({ html: RICH_HTML, robotsTxt: blockAll, headers: OK_HEADERS }).robots;
  assert.equal(r1.blockedCount, AI_AGENTS.length, 'every known agent blocked by the wildcard group');
  for (const a of AI_AGENTS) assert.equal(r1.agents[a].blocked, true);

  // A specific Allow for one agent overrides the wildcard block for that agent only.
  const allowOne = `User-agent: *
Disallow: /

User-agent: PerplexityBot
Allow: /`;
  const r2 = analyze({ html: RICH_HTML, robotsTxt: allowOne, headers: OK_HEADERS }).robots;
  assert.equal(r2.agents.PerplexityBot.blocked, false, 'specific group Allow: / wins');
  assert.equal(r2.agents.GPTBot.blocked, true, 'others still blocked by *');
  assert.equal(r2.blockedCount, AI_AGENTS.length - 1);

  // Allow beats Disallow of equal specificity within the same group.
  const tie = `User-agent: GPTBot
Disallow: /
Allow: /`;
  const r3 = analyze({ html: RICH_HTML, robotsTxt: tie, headers: OK_HEADERS }).robots;
  assert.equal(r3.agents.GPTBot.blocked, false, 'equal-length Allow overrides Disallow');
});

test('empty / missing robots.txt = everyone allowed', () => {
  const r = analyze({ html: RICH_HTML, robotsTxt: '', headers: OK_HEADERS }).robots;
  assert.equal(r.present, false);
  assert.equal(r.blockedCount, 0);
  assert.equal(r.allowedCount, AI_AGENTS.length);
});

test('malformed JSON-LD is caught, reported invalid, and not counted as valid', () => {
  const html = `<html><head><title>T</title>
    <script type="application/ld+json">{ "@type": "Organization", }</script>
    <script type="application/ld+json">{"@type":"FAQPage","mainEntity":[]}</script>
  </head><body><main><h1>H</h1><p>${'text '.repeat(200)}</p></main></body></html>`;
  const rep = analyze({ html, headers: OK_HEADERS });
  assert.doesNotThrow(() => analyze({ html }));
  assert.equal(rep.signals.jsonLd.blocks, 2);
  assert.equal(rep.signals.jsonLd.valid, 1);
  assert.equal(rep.signals.jsonLd.invalid, 1);
  assert.equal(rep.signals.jsonLd.has.FAQPage, true);
  assert.equal(rep.signals.jsonLd.has.Organization, false, 'the malformed Organization block does not count');
});

test('JSON-LD @type as an array and top-level array are both collected', () => {
  const html = `<html><head><title>T</title>
    <script type="application/ld+json">[{"@type":["Product","Thing"]},{"@type":"BreadcrumbList"}]</script>
  </head><body></body></html>`;
  const j = analyze({ html }).signals.jsonLd;
  assert.equal(j.valid, 1);
  assert.equal(j.has.Product, true);
  assert.equal(j.has.BreadcrumbList, true);
  assert.deepEqual(j.types, ['BreadcrumbList', 'Product', 'Thing']);
});

test('llms.txt: missing vs present-and-valid vs present-but-malformed', () => {
  const valid = `# FleetDeck

> Zero-dependency local-first tooling.

## Docs
- [Guide](https://example.com/guide): the field guide
- [API](https://example.com/api)`;
  const malformed = `Just some text with no heading and no links.`;

  const absent = analyze({ html: RICH_HTML, llmsTxt: '' }).llms;
  assert.equal(absent.present, false);
  assert.equal(absent.valid, false);

  const good = analyze({ html: RICH_HTML, llmsTxt: valid }).llms;
  assert.equal(good.present, true);
  assert.equal(good.valid, true);

  const bad = analyze({ html: RICH_HTML, llmsTxt: malformed }).llms;
  assert.equal(bad.present, true);
  assert.equal(bad.valid, false);
  assert.match(bad.reason, /H1/);

  // present-but-malformed earns partial credit; valid earns full; absent earns 0
  const w = (rep) => rep.breakdown.find((b) => b.signal === 'LLMS_TXT').earned;
  assert.equal(w(analyze({ html: RICH_HTML, llmsTxt: valid })), WEIGHTS.LLMS_TXT);
  assert.ok(w(analyze({ html: RICH_HTML, llmsTxt: malformed })) > 0);
  assert.ok(w(analyze({ html: RICH_HTML, llmsTxt: malformed })) < WEIGHTS.LLMS_TXT);
  assert.equal(w(analyze({ html: RICH_HTML, llmsTxt: '' })), 0);
});

test('x-robots-tag noindex caps crawler-access credit and is surfaced', () => {
  const blocked = analyze({ html: RICH_HTML, robotsTxt: '', headers: { 'content-type': 'text/html', 'x-robots-tag': 'noindex' } });
  const open = analyze({ html: RICH_HTML, robotsTxt: '', headers: OK_HEADERS });
  assert.equal(blocked.headers.blocks, true);
  const access = (rep) => rep.breakdown.find((b) => b.signal === 'AI_CRAWLER_ACCESS').earned;
  assert.ok(access(blocked) < access(open), 'noindex reduces access credit');
  assert.equal(blocked.breakdown.find((b) => b.signal === 'HEADERS').earned, 0);
});

test('score is deterministic and bounded 0-100; breakdown weights sum to max', () => {
  const a = analyze({ url: 'u', html: RICH_HTML, robotsTxt: '', llmsTxt: '', headers: OK_HEADERS });
  const b = analyze({ url: 'u', html: RICH_HTML, robotsTxt: '', llmsTxt: '', headers: OK_HEADERS });
  assert.deepEqual(a, b, 'same inputs → identical report');
  for (const rep of [a, analyze({ html: SHELL_HTML }), analyze({})]) {
    assert.ok(rep.score >= 0 && rep.score <= 100);
    assert.ok(rep.score <= rep.maxScore);
  }
  const sum = a.breakdown.reduce((s, x) => s + x.weight, 0);
  assert.equal(sum, MAX_SCORE);
  assert.equal(sum, 100);
  // every earned value stays within its own weight
  for (const x of a.breakdown) assert.ok(x.earned >= 0 && x.earned <= x.weight);
});

test('empty / garbage html does not throw and yields sane defaults', () => {
  for (const html of ['', '<<<>>>not html', '</title></title><script>{', null, undefined]) {
    assert.doesNotThrow(() => analyze({ html }));
    const rep = analyze({ html });
    assert.equal(rep.signals.title.present, false);
    assert.equal(rep.signals.jsonLd.valid, 0);
    assert.ok(rep.score >= 0 && rep.score <= 100);
  }
  // a totally empty input still produces a full breakdown and F grade
  const empty = analyze({});
  assert.equal(empty.breakdown.length, Object.keys(WEIGHTS).length);
  assert.equal(empty.grade, 'F');
});

test('recommendations are prioritized by impact, highest gain first', () => {
  const rep = analyze({ html: SHELL_HTML, robotsTxt: 'User-agent: *\nDisallow: /', headers: OK_HEADERS });
  const recs = rep.recommendations;
  assert.ok(recs.length > 0);
  for (let i = 1; i < recs.length; i++) assert.ok(recs[i - 1].gain >= recs[i].gain, 'sorted by gain desc');
  // the biggest lever for a blocked shell is crawler access (weight 20)
  assert.equal(recs[0].signal, 'AI_CRAWLER_ACCESS');
  assert.equal(recs[0].priority, 'high');
  assert.match(recs[0].fix, /robots\.txt/);
  // a near-perfect page has no (or only tiny) recommendations
  const good = analyze({
    url: 'u', html: RICH_HTML, robotsTxt: '',
    llmsTxt: '# X\n> s\n- [a](https://x.y)', headers: OK_HEADERS,
  });
  assert.ok(good.recommendations.every((r) => r.gain <= 5), 'high-scoring page has only minor suggestions');
});

test('meta description parses regardless of attribute order', () => {
  const a = analyze({ html: '<meta content="hello there world" name="description">' });
  assert.equal(a.signals.metaDescription.present, true);
  assert.equal(a.signals.metaDescription.length, 'hello there world'.length);
});

test('multiple or zero h1 flagged; single h1 gets full semantic h1 credit', () => {
  const two = analyze({ html: '<main><article><h1>a</h1><h1>b</h1></article></main>' }).signals.semantics;
  assert.equal(two.h1Count, 2);
  const zero = analyze({ html: '<main><p>no heading</p></main>' }).signals.semantics;
  assert.equal(zero.h1Count, 0);
  assert.equal(zero.headingOutlineOk, false);
});
