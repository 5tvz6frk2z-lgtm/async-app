// Workspace scan — turn the docs already in this workspace into a seeded second
// brain, deterministically (no model). It chunks markdown into focused memories
// (one per H1/H2 section; dense decision-list docs like ADR.md explode per
// numbered item), derives a one-line summary + tags, and proposes index entries.
// Run `brain scan <dir>` to preview, `--commit` to write.
import fs from 'node:fs';
import path from 'node:path';
import { tokenize } from './tokenize.js';
import { splitSections } from './sections.js';
import { slug } from './store.js';

const SKIP = new Set(['node_modules', '.git', 'memories', 'test', 'data', '.tmp', 'coverage']);

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

// A descriptive summary: the first PROSE sentence — skip headings, table rows,
// list bullets, and mostly-markup lines, so the one-line index carries real
// query vocabulary instead of "| Stage | Price |".
function descriptiveSummary(body) {
  for (const line of body.split('\n')) {
    const l = line.trim();
    if (!l || l.startsWith('#') || l.startsWith('|') || l.startsWith('-') || l.startsWith('*') || l.startsWith('>') || l.startsWith('_source')) continue;
    const clean = l.replace(/`[^`]*`/g, '').replace(/\*\*|\*|\[|\]|\(#[^)]*\)/g, '').replace(/\s+/g, ' ').trim();
    if (clean.length < 25) continue;
    const m = /^(.{25,180}?[.!?])(\s|$)/.exec(clean);
    return (m ? m[1] : clean.slice(0, 170)).trim();
  }
  const flat = body.replace(/^#+.*$/gm, '').replace(/`[^`]*`/g, '').replace(/\s+/g, ' ').trim();
  return flat.slice(0, 160).trim();
}

// Filler words that survive stopword-stripping and pollute frequency-based tags.
const FILLER = new Set(['always', 'alway', 'every', 'across', 'within', 'also', 'without', 'because', 'before', 'after', 'again', 'still', 'even', 'much', 'many', 'like', 'well', 'both', 'either', 'neither', 'rather', 'quite', 'thing', 'things', 'stuff', 'etc', 'e.g', 'i.e', 'onto', 'unto', 'await', 'automatic']);

// Tags rank by frequency IN THIS memory (a memory about gates SHOULD be tagged
// "gate", even though gates recur across the corpus — IDF is the wrong signal
// for tag selection here, it suppresses the core recurring concepts). Ties broken
// by rarity. Filler words are dropped.
function topTerms(text, n, idf) {
  const tf = new Map();
  for (const t of tokenize(text)) if (!FILLER.has(t) && t.length >= 4) tf.set(t, (tf.get(t) || 0) + 1);
  return [...tf.entries()]
    .sort((a, b) => b[1] - a[1] || (idf ? idf(b[0]) - idf(a[0]) : 0) || (a[0] < b[0] ? -1 : 1))
    .slice(0, n).map(([t]) => t);
}

/** Split a markdown doc into focused chunks: group by H1/H2, and explode a
 *  large decision-list body ("**12. Title.** …") into one chunk per item. */
export function chunkDoc(md) {
  const secs = splitSections(md);
  const chunks = [];
  let cur = null;
  for (const s of secs) {
    if (s.level > 0 && s.level <= 2) {
      if (cur) chunks.push(cur);
      cur = { name: s.heading, body: s.text };
    } else if (cur) {
      cur.body += (s.heading !== '(intro)' ? `\n\n${'#'.repeat(Math.max(3, s.level))} ${s.heading}\n` : '\n') + s.text;
    } else {
      cur = { name: '(intro)', body: (s.heading !== '(intro)' ? s.heading + '\n' : '') + s.text };
    }
  }
  if (cur) chunks.push(cur);

  const out = [];
  for (const c of chunks) {
    const items = [...c.body.matchAll(/\*\*(\d+)\.\s+([^*\n]+?)[.:]?\*\*/g)];
    if (c.body.length > 1500 && items.length >= 3) {
      for (let i = 0; i < items.length; i++) {
        const start = items[i].index;
        const end = i + 1 < items.length ? items[i + 1].index : c.body.length;
        out.push({ name: items[i][2].trim(), body: c.body.slice(start, end).trim() });
      }
    } else {
      out.push(c);
    }
  }
  return out.filter((c) => c.name !== '(intro)' ? (c.body || '').trim().length > 40 : (c.body || '').trim().length > 120);
}

export function scanWorkspace(dir, { root = dir } = {}) {
  const files = walk(dir).filter((f) => /\.(md|txt)$/.test(f));
  // Pass 1: collect every chunk + its token set, to compute corpus IDF.
  const items = [];
  for (const f of files.sort()) {
    const md = fs.readFileSync(f, 'utf8');
    const base = path.basename(f).replace(/\.[^.]+$/, '');
    const chunks = chunkDoc(md);
    for (const c of chunks) items.push({ f, rel: path.relative(root, f), base, c, multi: chunks.length > 1, tokens: new Set(tokenize(`${c.name} ${c.body}`)) });
  }
  const dfMap = new Map();
  for (const it of items) for (const t of it.tokens) dfMap.set(t, (dfMap.get(t) || 0) + 1);
  const N = items.length || 1;
  const idf = (t) => Math.log(1 + N / (1 + (dfMap.get(t) || 0)));

  // Pass 2: build proposals with distinctive (IDF-weighted) tags + prose summaries.
  const proposals = [];
  const used = new Set();
  for (const it of items) {
    let id = slug(it.multi ? `${it.base}-${it.c.name}` : it.base);
    while (used.has(id)) id = `${id}-${used.size}`;
    used.add(id);
    const nameSlugTerms = it.base.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    proposals.push({
      id,
      name: it.c.name === '(intro)' ? it.base : it.c.name,
      summary: descriptiveSummary(it.c.body),
      // name terms weighted higher (repeated) so the memory's own title concepts rank as tags
      tags: [...new Set([nameSlugTerms, ...topTerms(`${it.c.name} ${it.c.name} ${it.c.body}`, 5, idf)])].slice(0, 6),
      content: `# ${it.c.name === '(intro)' ? it.base : it.c.name}\n\n${it.c.body.trim()}\n\n_source: ${it.rel}_`,
      pointers: [],
      updated: '2026-07-08T00:00:00.000Z',
    });
  }
  return proposals;
}
