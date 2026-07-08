// The Index — a single catalogue file, one line per memory. This is the whole
// point of the second brain: the retrieval path scores against these one-line
// entries and NEVER opens a memory file until it has picked the single best one.
//
// Source of truth is `index.jsonl` (one JSON object per line): the smallest
// thing that is both machine-scored and human-diffable. Saving a memory appends
// its line here in the same step (see store.js), so the catalogue can never
// drift from the files on disk; `reindex()` rebuilds it from the files if it
// ever does.
import fs from 'node:fs';
import path from 'node:path';
import { tokenize } from './tokenize.js';

export class BrainIndex {
  constructor(dir) {
    this.dir = dir;
    this.indexPath = path.join(dir, 'index.jsonl');
    this.memDir = path.join(dir, 'memories');
    this.entries = [];
    this.byId = new Map();
    this.load();
  }

  load() {
    this.entries = [];
    this.byId = new Map();
    if (fs.existsSync(this.indexPath)) {
      const lines = fs.readFileSync(this.indexPath, 'utf8').split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;
        let e;
        try { e = JSON.parse(line); }
        catch (err) {
          if (lines.slice(i + 1).every((l) => !l.trim())) break; // torn final line
          throw new Error(`index.jsonl corrupt at line ${i + 1}: ${err.message}`);
        }
        this.#hydrate(e);
        this.entries.push(e);
        this.byId.set(e.id, e);
      }
    }
    this.#buildIdf();
    return this;
  }

  /** Precompute per-field tokens once so scoring never re-tokenizes the index. */
  #hydrate(e) {
    e.tags = e.tags || [];
    e.pointers = e.pointers || [];
    e._name = tokenize(e.name || '');
    e._tags = tokenize((e.tags || []).join(' '));
    e._sum = tokenize(e.summary || '');
    e._all = new Set([...e._name, ...e._tags, ...e._sum]);
    return e;
  }

  #buildIdf() {
    const N = this.entries.length || 1;
    const df = new Map();
    for (const e of this.entries) for (const t of e._all) df.set(t, (df.get(t) || 0) + 1);
    this.N = N;
    this.df = df;
  }

  /** Rarer terms carry more signal. Smoothed so a term absent from the index
   *  (common in real questions) still gets a sane positive weight. */
  idf(term) {
    return Math.log(1 + this.N / (1 + (this.df.get(term) || 0)));
  }

  all() { return this.entries; }
  get(id) { return this.byId.get(id); }
  has(id) { return this.byId.has(id); }

  /** Add or replace an entry (in memory + on disk) and refresh IDF. */
  upsert(entry) {
    if (!entry.id || !entry.file) throw new Error('index entry needs id and file');
    const e = this.#hydrate({ ...entry });
    if (this.byId.has(e.id)) {
      const i = this.entries.findIndex((x) => x.id === e.id);
      this.entries[i] = e;
    } else {
      this.entries.push(e);
    }
    this.byId.set(e.id, e);
    this.#buildIdf();
    this.#persist();
    return e;
  }

  remove(id) {
    if (!this.byId.has(id)) return false;
    this.entries = this.entries.filter((e) => e.id !== id);
    this.byId.delete(id);
    this.#buildIdf();
    this.#persist();
    return true;
  }

  /** Rewrite the whole index file from current entries (canonical serialization). */
  #persist() {
    fs.mkdirSync(this.dir, { recursive: true });
    const body = this.entries.map((e) => JSON.stringify(serialize(e))).join('\n') + (this.entries.length ? '\n' : '');
    fs.writeFileSync(this.indexPath, body);
  }

  /** Append a single line without rewriting the file (the atomic-save fast path). */
  appendLine(entry) {
    const e = this.#hydrate({ ...entry });
    fs.mkdirSync(this.dir, { recursive: true });
    fs.appendFileSync(this.indexPath, JSON.stringify(serialize(e)) + '\n');
    this.entries.push(e);
    this.byId.set(e.id, e);
    this.#buildIdf();
    return e;
  }
}

/** Strip the derived `_`-prefixed token caches before writing to disk. */
export function serialize(e) {
  const { id, name, file, tags = [], summary = '', pointers = [], updated } = e;
  const out = { id, name, file, tags, summary, pointers };
  if (updated) out.updated = updated;
  return out;
}
