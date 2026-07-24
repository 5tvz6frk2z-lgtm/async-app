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

const FIELD = { name: 3, tags: 3, summary: 1.5, id: 2.5 };
const TF_CAP = { name: 2, tags: 2, summary: 3, id: 1 };

// Fuzzy count: how many tokens in `arr` match query term `t` (exact or long
// shared prefix), so "integrate" scores against a memory tagged "integration".
const count = (arr, t) => { let n = 0; for (const x of arr) if (matches(x, t)) n++; return n; };

/** Score one index entry against the query terms. Reads only the cached tokens
 *  on the entry — never touches disk. A coverage factor rewards matching more of
 *  the DISTINCT query terms, so a focused memory that answers the whole question
 *  beats a sprawling one that merely repeats a single term. */
export function scoreEntry(index, qterms, e) {
  let s = 0, hit = 0;
  for (const t of qterms) {
    const w = index.idf(t);
    if (!w) continue;
    const f = FIELD.name * Math.min(count(e._name, t), TF_CAP.name)
      + FIELD.tags * Math.min(count(e._tags, t), TF_CAP.tags)
      + FIELD.summary * Math.min(count(e._sum, t), TF_CAP.summary)
      + FIELD.id * Math.min(count(e._id, t), TF_CAP.id);
    if (f > 0) { s += w * f; hit++; }
  }
  if (!qterms.length) return 0;
  const coverage = hit / qterms.length; // 0..1 fraction of query terms this memory touches
  return s * (0.55 + 0.45 * coverage);
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
  const raw = fs.readFileSync(full, 'utf8');
  // Strip the frontmatter block — it repeats name/summary/tags, so leaving it in
  // lets bestSection pick the metadata as the "section" (and pollutes evidence).
  return raw.replace(/^---\n[\s\S]*?\n---\n?/, '');
}

/** Full retrieval for a question. Returns candidates (index-only), the chosen
 *  file+section, an optional single followed pointer, the assembled evidence
 *  block, and its estimated token cost + wall time. */
export function retrieve(index, question, { dir = index.dir, followPointer = true, limit = 8, rerankK = 3 } = {}) {
  const t0 = process.hrtime.bigint();
  const { qterms, candidates } = rankCandidates(index, question, { limit });
  const ms = () => Number(process.hrtime.bigint() - t0) / 1e6;

  if (!candidates.length) {
    return { question, keywords: qterms, candidates: [], chosen: null, section: null, pointer: null, evidence: '', tokens: 0, filesOpened: 0, ms: +ms().toFixed(3) };
  }

  // Body-aware re-rank. The one-line index picks the shortlist, but when the top
  // candidates are close the decisive vocabulary is usually in the body, not the
  // index line — so open the top few and let the best-section score break the
  // tie. A clear index winner skips this and opens exactly one file (fast path).
  const clearWinner = candidates.length === 1 || candidates[0].score >= 1.6 * candidates[1].score;
  const pool = clearWinner ? [candidates[0]] : candidates.slice(0, rerankK);
  let filesOpened = 0;
  const scored = pool.map((c) => {
    const e = index.get(c.id);
    const text = readMemory(dir, e.file);
    filesOpened++;
    const sec = bestSection(text, qterms, index);
    return { c, entry: e, md: text, sec, combined: c.score + 1.75 * sec.score };
  }).sort((a, b) => b.combined - a.combined || (a.c.id < b.c.id ? -1 : 1));

  const top = scored[0].c;
  const entry = scored[0].entry;
  const md = scored[0].md;
  const section = scored[0].sec;

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

// Keep the evidence a small slice: a very long section is clipped at a sentence
// boundary near the cap so the model gets the answer, not a whole chapter.
const CLIP = 1400;
function clip(text) {
  const t = String(text || '');
  if (t.length <= CLIP) return t;
  const cut = t.slice(0, CLIP);
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('\n'));
  return (end > CLIP * 0.6 ? cut.slice(0, end + 1) : cut) + ' …';
}

export function buildEvidence(entry, section, pointer) {
  const parts = [
    `### ${entry.name} — ${section.heading}`,
    clip(section.text),
    `[source: ${entry.file}${section.heading !== '(intro)' ? ' › ' + section.heading : ''}]`,
  ];
  if (pointer) {
    parts.push('', `### ${pointer.name} — ${pointer.heading}  (followed pointer)`, clip(pointer.text), `[source: ${pointer.file}${pointer.heading !== '(intro)' ? ' › ' + pointer.heading : ''}]`);
  }
  return parts.join('\n');
}
