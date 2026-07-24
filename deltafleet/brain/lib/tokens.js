// Token estimation for the fair test. We don't call a tokenizer model (that
// would violate the zero-model retrieval doctrine and cost the very tokens we're
// measuring); the ~4-characters-per-token heuristic is the standard proxy and is
// more than accurate enough for a RELATIVE comparison (brain path vs naive
// full-context), which is all the benchmark claims.
export function estTokens(text) {
  return Math.ceil(String(text || '').length / 4);
}
