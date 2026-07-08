// Retrieval — the deterministic spine. No model calls anywhere in this file.
//
// The path, exactly as the second-brain principles prescribe:
//   1. strip the question to keywords
//   2. score EVERY candidate from the index WITHOUT opening any file
//   3. open only the single best file
//   4. pull only the section that answers
//   5. follow one pointer if that section points elsewhere
//   6. hand back an evidence block — the model only gets involved after this,
//      with the evidence already attached.
//
// Scoring is field-weighted IDF: a query term counts more when it's rare across
// the catalogue (idf) and when it hits a high-signal field (name/tags > summary).
// Term frequency is capped so one repeated word can't dominate.
import fs from 'node:fs';
import path from 'node:path';
import { keywords, tokenize, matches } from './tokenize.js';
import { splitSections, inlinePointers } from './sections.js';
import { estTokens } from './tokens.js';

const FIELD = { name: 3, tags: 3, summary: 1.5 };
const TF_CAP = { name: 2, tags: 2, summary: 3 };

// Fuzzy count: how many tokens in `arr` match query term `t` (exact or long
// shared prefix), so "integrate" scores against a memory tagged "integration".
const count = (arr, t) => { let n = 0; for (const x of arr) if (matches(x, t)) n++; return n; };

/** Score one index entry against the query terms. Reads only the cached tokens
 *  on the entry — never touches disk. */
export function scoreEntry(index, qterms, e) {
  let s = 0;
  for (const t of qterms) {
    const w = index.idf(t);
    if (!w) continue;
    s += w * (FIELD.name * Math.min(count(e._name, t), TF_CAP.name)
      + FIELD.tags * Math.min(count(e._tags, t), TF_CAP.tags)
      + FIELD.summary * Math.min(count(e._sum, t), TF_CAP.summary));
  }
  return s;
}

/** Rank the whole catalogue for a question — index-only, no files opened. */
export function rankCandidates(index, question, { limit = 8 } = {}) {
  const qterms = keywords(question);
  const scored = index.all()
    .map((e) => ({ id: e.id, name: e.name, file: e.file, tags: e.tags, summary: e.summary, pointers: e.pointers, score: +scoreEntry(index, qterms, e).toFixed(4) }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : 1)); // deterministic tiebreak
  return { qterms, candidates: scored.slice(0, limit) };
}

/** Pick the section of a file that best answers the query. */
export function bestSection(md, qterms, index) {
  const sections = splitSections(md);
  let best = null;
  for (const sec of sections) {
    const bodyTokens = tokenize(sec.text);
    const headTokens = tokenize(sec.heading);
    let score = 0;
    for (const t of qterms) {
      const w = index ? index.idf(t) : 1;
      score += w * (Math.min(count(bodyTokens, t), 4) + 3 * count(headTokens, t)); // heading hits weigh heavily
    }
    if (!best || score > best.score) best = { ...sec, score: +score.toFixed(4) };
  }
  // If nothing matched (rare), fall back to the first substantive section.
  if (!best || best.score === 0) {
    const s = sections.find((x) => x.text) || sections[0] || { heading: '(intro)', text: md.trim() };
    return { ...s, score: 0 };
  }
  return best;
}

function readMemory(dir, file) {
  const full = path.isAbsolute(file) ? file : path.join(dir, file);
  return fs.readFileSync(full, 'utf8');
}

/** Full retrieval for a question. Returns candidates (index-only), the chosen
 *  file+section, an optional single followed pointer, the assembled evidence
 *  block, and its estimated token cost + wall time. */
export function retrieve(index, question, { dir = index.dir, followPointer = true, limit = 8 } = {}) {
  const t0 = process.hrtime.bigint();
  const { qterms, candidates } = rankCandidates(index, question, { limit });
  const ms = () => Number(process.hrtime.bigint() - t0) / 1e6;

  if (!candidates.length) {
    return { question, keywords: qterms, candidates: [], chosen: null, section: null, pointer: null, evidence: '', tokens: 0, filesOpened: 0, ms: +ms().toFixed(3) };
  }

  const top = candidates[0];
  const entry = index.get(top.id);
  const md = readMemory(dir, entry.file);
  const section = bestSection(md, qterms, index);
  let filesOpened = 1;

  // Follow at most ONE pointer: whichever referenced memory best matches the
  // query (explicit entry.pointers ∪ inline [[id]] links in the chosen section).
  let pointer = null;
  if (followPointer) {
    const refIds = [...new Set([...(entry.pointers || []), ...inlinePointers(section.text)])].filter((id) => id !== entry.id && index.has(id));
    let bestRef = null;
    for (const id of refIds) {
      const sc = scoreEntry(index, qterms, index.get(id));
      if (sc > 0 && (!bestRef || sc > bestRef.score)) bestRef = { id, score: sc };
    }
    if (bestRef) {
      const pe = index.get(bestRef.id);
      const pmd = readMemory(dir, pe.file);
      const psec = bestSection(pmd, qterms, index);
      filesOpened++;
      pointer = { id: pe.id, name: pe.name, file: pe.file, heading: psec.heading, text: psec.text };
    }
  }

  const evidence = buildEvidence(entry, section, pointer);
  return {
    question, keywords: qterms, candidates,
    chosen: { id: entry.id, name: entry.name, file: entry.file, score: top.score },
    section: { heading: section.heading, text: section.text, score: section.score },
    pointer, evidence, tokens: estTokens(evidence), filesOpened, ms: +ms().toFixed(3),
  };
}

export function buildEvidence(entry, section, pointer) {
  const parts = [
    `### ${entry.name} — ${section.heading}`,
    section.text,
    `[source: ${entry.file}${section.heading !== '(intro)' ? ' › ' + section.heading : ''}]`,
  ];
  if (pointer) {
    parts.push('', `### ${pointer.name} — ${pointer.heading}  (followed pointer)`, pointer.text, `[source: ${pointer.file}${pointer.heading !== '(intro)' ? ' › ' + pointer.heading : ''}]`);
  }
  return parts.join('\n');
}
