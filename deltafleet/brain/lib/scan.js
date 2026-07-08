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

function firstSentence(body) {
  const clean = body.replace(/^#+.*$/gm, '').replace(/`[^`]*`/g, '').replace(/\s+/g, ' ').trim();
  const m = /^(.{20,180}?[.!?])(\s|$)/.exec(clean);
  return (m ? m[1] : clean.slice(0, 160)).trim();
}

function topTerms(text, n) {
  const tf = new Map();
  for (const t of tokenize(text)) tf.set(t, (tf.get(t) || 0) + 1);
  return [...tf.entries()].filter(([t]) => t.length >= 3).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, n).map(([t]) => t);
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
  const proposals = [];
  const used = new Set();
  for (const f of files.sort()) {
    const rel = path.relative(root, f);
    const base = path.basename(f).replace(/\.[^.]+$/, '');
    const md = fs.readFileSync(f, 'utf8');
    const chunks = chunkDoc(md);
    for (const c of chunks) {
      let id = slug(chunks.length > 1 ? `${base}-${c.name}` : base);
      while (used.has(id)) id = `${id}-${used.size}`;
      used.add(id);
      proposals.push({
        id,
        name: c.name === '(intro)' ? base : c.name,
        summary: firstSentence(c.body),
        tags: [...new Set([base.toLowerCase().replace(/[^a-z0-9]+/g, '-'), ...topTerms(`${c.name} ${c.body}`, 5)])].slice(0, 6),
        content: `# ${c.name === '(intro)' ? base : c.name}\n\n${c.body.trim()}\n\n_source: ${rel}_`,
        pointers: [],
        updated: '2026-07-08T00:00:00.000Z',
      });
    }
  }
  return proposals;
}
