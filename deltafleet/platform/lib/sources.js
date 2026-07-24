// Sources — version-controlled files of client/industry truth that seed the
// semantic memory layer, kept up to date without bloat.
//
// The problem this solves: a client's durable facts (their locations, their
// vendors, their policies, their product catalog) should live in a reviewable,
// diffable, VERSION-CONTROLLED file — not be typed into a console once and
// forgotten. A source file is the source of truth; memory is its live
// projection. The sync is idempotent and clean:
//
//   - each fact is upserted into memory under a stable key (src:<id>:<factKey>),
//     so re-syncing the same file changes NOTHING (no duplication, no drift);
//   - bump the file's version (or edit a fact's text) and re-sync → the memory
//     entry is UPDATED in place, carrying the new version + timestamp;
//   - delete a fact from the file and re-sync → its memory entry is RETIRED;
//   - a source with a `ttlDays` freshness window whose `updated` date has aged
//     out is STALE → its facts are flagged and can be retired automatically.
//
// Net effect: the memory that reaches a prompt is always a faithful, current
// projection of files you can review in a PR. Nothing accumulates twice, and
// nothing goes silently out of date. This is the "version-controlled files for
// up-to-date sources, nothing built to bloat" contract.
import fs from 'node:fs';
import path from 'node:path';

const KINDS = ['rule', 'preference', 'fact', 'pattern'];
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);

export function validateSource(src) {
  const errs = [];
  const err = (m) => errs.push(m);
  if (typeof src !== 'object' || src === null) return ['source must be an object'];
  if (!src.id || !/^[a-z0-9][a-z0-9-]*$/.test(src.id)) err('source.id must be kebab-case');
  if (src.version === undefined || (typeof src.version !== 'number' && typeof src.version !== 'string')) err('source.version is required (number or string)');
  if (!src.updated || Number.isNaN(Date.parse(src.updated))) err('source.updated must be an ISO date');
  if (src.ttlDays !== undefined && (typeof src.ttlDays !== 'number' || src.ttlDays <= 0)) err('source.ttlDays must be a positive number');
  if (src.kind !== undefined && !KINDS.includes(src.kind)) err(`source.kind must be one of ${KINDS.join('/')}`);
  if (!Array.isArray(src.facts) || src.facts.length === 0) err('source.facts must be a non-empty array');
  else src.facts.forEach((f, i) => {
    if (!f || typeof f.text !== 'string' || !f.text.trim()) err(`facts[${i}].text is required`);
    if (f.kind !== undefined && !KINDS.includes(f.kind)) err(`facts[${i}].kind must be one of ${KINDS.join('/')}`);
    if (f.key !== undefined && !/^[a-z0-9-]+$/.test(f.key)) err(`facts[${i}].key must be kebab-case`);
  });
  return errs;
}

export function loadSource(file) {
  const src = JSON.parse(fs.readFileSync(file, 'utf8'));
  const errs = validateSource(src);
  if (errs.length) throw new Error(`invalid source ${path.basename(file)}:\n  - ${errs.join('\n  - ')}`);
  return src;
}

export function loadSourceDir(dir) {
  const out = new Map();
  if (!fs.existsSync(dir)) return out;
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
    const s = loadSource(path.join(dir, f));
    if (out.has(s.id)) throw new Error(`duplicate source id "${s.id}"`);
    out.set(s.id, s);
  }
  return out;
}

const factKey = (sourceId, fact) => `src:${sourceId}:${fact.key || slug(fact.text)}`;

/** Project one source file into memory. Idempotent: unchanged facts do nothing,
 *  changed/versioned facts update in place, removed facts retire. */
export function syncSource(source, memory, { retireRemoved = true } = {}) {
  const errs = validateSource(source);
  if (errs.length) throw new Error(`cannot sync invalid source ${source.id}: ${errs.join('; ')}`);
  const provenance = { type: 'source', id: source.id, version: source.version, updated: source.updated };
  const seen = new Set();
  let added = 0, updated = 0, restamped = 0, unchanged = 0, retired = 0;

  for (const fact of source.facts) {
    const key = factKey(source.id, fact);
    seen.add(key);
    const existing = memory.findByKey(key);
    if (!existing) {
      memory.add({ kind: fact.kind || source.kind || 'fact', scope: fact.scope || source.scope || 'client', key, text: fact.text, source: provenance, confidence: 0.9 });
      added++;
    } else if (existing.text !== fact.text) {
      // content changed → real update
      memory.update(existing.id, { text: fact.text, source: provenance, confidence: 0.9 });
      updated++;
    } else if (existing.source?.version !== source.version || existing.source?.updated !== source.updated) {
      // same text, newer file → re-stamp provenance so freshness tracks the file
      memory.update(existing.id, { source: provenance });
      restamped++;
    } else unchanged++;
  }

  if (retireRemoved) {
    for (const m of memory.active()) {
      if (m.source?.type === 'source' && m.source.id === source.id && !seen.has(m.key)) {
        memory.retire(m.id, { by: 'source-sync', reason: 'removed from source file' });
        retired++;
      }
    }
  }
  return { source: source.id, version: source.version, added, updated, restamped, unchanged, retired };
}

export function syncSources(sources, memory, opts) {
  const list = sources instanceof Map ? [...sources.values()] : sources;
  return list.map((s) => syncSource(s, memory, opts));
}

/** Facts whose source has aged past its freshness window. */
export function staleFacts(memory, sources, { now = new Date() } = {}) {
  const byId = sources instanceof Map ? sources : new Map((sources || []).map((s) => [s.id, s]));
  return memory.active().filter((m) => {
    if (m.source?.type !== 'source') return false;
    const s = byId.get(m.source.id);
    if (!s || !s.ttlDays) return false;
    return new Date(m.source.updated).getTime() + s.ttlDays * 86400_000 < now.getTime();
  });
}

/** Retire stale source facts so a prompt never quotes an out-of-date source. */
export function retireStale(memory, sources, opts) {
  const stale = staleFacts(memory, sources, opts);
  for (const m of stale) memory.retire(m.id, { by: 'freshness', reason: 'source past its freshness window' });
  return stale.length;
}
