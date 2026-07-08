// Tokenizer — the deterministic front of the retrieval path. Same text, same
// tokens, zero model calls. Accuracy hinges on this: a question and the memory
// that answers it must reduce to overlapping tokens.
//
// Conservative stemming (fold plurals / common verb endings) so "integrations",
// "integrate", "integrating" all match, without an aggressive stemmer that
// over-merges ("universe" → "univers"). English stopwords are dropped so scoring
// weights content words, not glue.
const STOPWORDS = new Set(('a an and are as at be but by for from has have how i if in into is it its of on or '
  + 'that the their then there these they this to was what when where which who will with you your we our us my me '
  + 'do does did done can could should would may might must not no yes so than too very just about over under out up '
  + 'down more most some any all each other new use used using via per vs get got make made want need').split(/\s+/));

/** Light stemming — fold only the safe, high-frequency inflections (plurals and
 *  a couple of verb endings). We deliberately DON'T aggressively normalize
 *  "-ate/-ation/-ating", because those forms diverge unpredictably in English
 *  ("integrate"→"integrat" but "relaxation"→"relax"); fuzzy recall is handled by
 *  common-prefix matching (see `matches`) instead, which is both simpler and
 *  more consistent. */
export function stem(w) {
  if (w.length <= 3) return w;
  if (w.endsWith('ies') && w.length > 4) return w.slice(0, -3) + 'y'; // policies → policy
  if (w.endsWith('ing') && w.length > 5) return w.slice(0, -3);       // integrating → integrat
  if (w.endsWith('ed') && w.length > 4) return w.slice(0, -2);        // integrated → integrat
  if (w.endsWith('es') && w.length > 4) return w.slice(0, -2);        // gates → gat? no — see below
  if (w.endsWith('s') && !w.endsWith('ss') && w.length > 3) return w.slice(0, -1); // gates → gate
  return w;
}

/** Length of the shared leading substring. */
export function commonPrefix(a, b) {
  const n = Math.min(a.length, b.length);
  let i = 0;
  while (i < n && a[i] === b[i]) i++;
  return i;
}

/** Fuzzy token match: exact, or a long shared prefix that covers almost all of
 *  the shorter token. This is what makes "integrate" match "integration",
 *  "relax" match "relaxation", "approval" match "approve" — recall without an
 *  aggressive stemmer, and it stays deterministic. */
export function matches(a, b) {
  if (a === b) return true;
  const cp = commonPrefix(a, b);
  // Require a 4+ char shared prefix that covers all but the last char of the
  // shorter token. Catches pricing~price, integrate~integration, relax~
  // relaxation, approval~approve, without merging trust~truth or test~text.
  return cp >= 4 && cp >= Math.min(a.length, b.length) - 1;
}

/** Lowercase, split on non-alphanumerics, drop stopwords/tiny tokens, stem.
 *  Keeps dotted identifiers together first (email.send, claude-opus-4-8). */
export function tokenize(text) {
  const out = [];
  const raw = String(text || '').toLowerCase();
  // preserve DOTTED tool identifiers (email.send, crm.read) as single tokens;
  // hyphenated words are just split into parts below (so "auto-relax" doesn't
  // become a noise token that matches nothing and dilutes coverage scoring).
  for (const m of raw.matchAll(/[a-z0-9]+(?:\.[a-z0-9]+)+/g)) out.push(m[0]);
  for (const w of raw.split(/[^a-z0-9]+/)) {
    if (!w || w.length < 2 || STOPWORDS.has(w)) continue;
    out.push(stem(w));
  }
  return out;
}

/** term -> count */
export function termFreq(tokens) {
  const tf = new Map();
  for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
  return tf;
}

/** Unique query terms, stopwords already removed. */
export function keywords(question) {
  return [...new Set(tokenize(question))];
}

export { STOPWORDS };
