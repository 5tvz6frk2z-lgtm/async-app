// Store — save a memory in one deterministic step: write the file AND its index
// line together, so the catalogue can never drift from reality. No model needed.
//
// A memory file is markdown with a small YAML-ish frontmatter block carrying the
// catalogue fields, so `reindex()` can rebuild the whole index from the files
// alone if the index is ever lost or corrupted — the files are the durable
// truth, the index is a derived accelerator.
import fs from 'node:fs';
import path from 'node:path';

export const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'memory';

function frontmatter(meta) {
  return ['---',
    `name: ${meta.name}`,
    `summary: ${meta.summary || ''}`,
    `tags: ${(meta.tags || []).join(', ')}`,
    `pointers: ${(meta.pointers || []).join(', ')}`,
    `updated: ${meta.updated}`,
    '---', ''].join('\n');
}

export function parseFrontmatter(md) {
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(md);
  if (!m) return { meta: {}, body: md };
  const meta = {};
  for (const line of m[1].split('\n')) {
    const kv = /^([a-z]+):\s*(.*)$/.exec(line.trim());
    if (!kv) continue;
    const [, k, v] = kv;
    if (k === 'tags' || k === 'pointers') meta[k] = v.split(',').map((x) => x.trim()).filter(Boolean);
    else meta[k] = v.trim();
  }
  return { meta, body: md.slice(m[0].length) };
}

/** Atomic-ish save: temp-write the file then rename (no torn file), then update
 *  the index line in the same call. Returns the index entry. `now` is injected
 *  (no Date.now() in libs that tests replay). */
export function save(index, { id, name, summary = '', tags = [], content = '', pointers = [], now }) {
  if (!name) throw new Error('a memory needs a name');
  id = id || slug(name);
  const file = `memories/${id}.md`;
  const meta = { name, summary, tags, pointers, updated: now || new Date().toISOString() };
  const full = path.join(index.dir, file);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  const tmp = full + '.tmp';
  fs.writeFileSync(tmp, frontmatter(meta) + content.trim() + '\n');
  fs.renameSync(tmp, full); // atomic on POSIX — a reader never sees a half-written memory

  const entry = { id, name, file, tags, summary, pointers, updated: meta.updated };
  if (index.has(id)) index.upsert(entry); else index.appendLine(entry);
  return entry;
}

export function remove(index, id) {
  const e = index.get(id);
  if (!e) return false;
  const full = path.join(index.dir, e.file);
  if (fs.existsSync(full)) fs.rmSync(full);
  index.remove(id);
  return true;
}

/** Rebuild the index from the memory files — the self-heal path. The files are
 *  the source of truth; this rewrites index.jsonl to match them exactly, then
 *  reloads. */
export function reindex(index) {
  const found = [];
  if (fs.existsSync(index.memDir)) {
    for (const f of fs.readdirSync(index.memDir).filter((f) => f.endsWith('.md')).sort()) {
      const id = f.replace(/\.md$/, '');
      const { meta, body } = parseFrontmatter(fs.readFileSync(path.join(index.memDir, f), 'utf8'));
      const firstHeading = (/^#{1,6}\s+(.*)$/m.exec(body) || [])[1];
      const firstPara = body.split('\n').map((l) => l.trim()).find((l) => l && !l.startsWith('#'));
      const e = { id, name: meta.name || firstHeading || id, file: `memories/${f}`,
        tags: meta.tags || [], summary: meta.summary || (firstPara ? firstPara.slice(0, 160) : ''),
        pointers: meta.pointers || [] };
      if (meta.updated) e.updated = meta.updated;
      found.push(e);
    }
  }
  fs.mkdirSync(index.dir, { recursive: true });
  fs.writeFileSync(index.indexPath, found.map((e) => JSON.stringify(e)).join('\n') + (found.length ? '\n' : ''));
  index.load();
  return found.length;
}
