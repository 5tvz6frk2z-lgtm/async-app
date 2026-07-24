// Dynamic Model Routing — spend model capability where it's needed
// (FRONTIER-PLAN reach idea).
//
// A static per-agent model is either wastefully expensive on easy work or
// under-powered on hard work. This picks the model TIER per step from a cheap,
// DETERMINISTIC difficulty classifier (plain code — the deterministic spine, no
// tokens, reproducible). Routine extraction/lookup runs on the fast tier;
// open-ended judgment or ambiguous input escalates to the deep tier.
//
// Safety floor — the non-negotiable: a high-stakes task (legal, refund, press,
// compliance, a negative review) NEVER routes to the cheapest tier, no matter
// how short the input. Cost optimization must not quietly downgrade the work
// that most needs judgment. Routing is opt-in per step (`route: true`); an
// un-routed step uses its pinned model exactly as before.
export const MODEL_TIERS = { fast: 'claude-haiku-4-5', mid: 'claude-sonnet-5', deep: 'claude-opus-4-8' };
const TIER_ORDER = ['fast', 'mid', 'deep'];
const maxTier = (a, b) => TIER_ORDER[Math.max(TIER_ORDER.indexOf(a), TIER_ORDER.indexOf(b))];

/** Cheap, explainable difficulty score → tier. Pure function of its input. */
export function classifyDifficulty(taskContext = {}, { task = '' } = {}) {
  const text = `${task} ${typeof taskContext === 'string' ? taskContext : JSON.stringify(taskContext ?? '')}`.toLowerCase();
  const len = text.length;
  const has = (re) => re.test(text);
  const judgment = has(/\b(draft|write|compos|negotiat|persuad|decide|recommend|summar|analy|reconcil|prioriti|assess|evaluat|judge)/);
  const routine = has(/\b(extract|classif|label|lookup|fetch|count|format|route|tag|parse|validate|dedupe)/);
  const stakes = has(/\b(legal|contract|refund|press|lawsuit|complianc|hipaa|phi|negative review|escalat|terminat|dispute|churn)/);
  const ambiguity = has(/\b(unclear|ambiguous|conflict|exception|edge case|nuance|sensitive|contradict)/);
  const fields = (taskContext && typeof taskContext === 'object' && !Array.isArray(taskContext)) ? Object.keys(taskContext).length : 0;

  let score = Math.min(0.3, len / 4000);
  if (judgment) score += 0.3;
  if (ambiguity) score += 0.2;
  if (stakes) score += 0.25;
  if (routine && !judgment) score -= 0.25;
  score += Math.min(0.15, fields * 0.02);
  score = Math.max(0, Math.min(1, score));

  let tier = score < 0.34 ? 'fast' : score < 0.67 ? 'mid' : 'deep';
  if (stakes) tier = maxTier(tier, judgment ? 'deep' : 'mid'); // safety floor
  return { tier, model: MODEL_TIERS[tier], score: +score.toFixed(3), signals: { judgment, routine, stakes, ambiguity, fields, len } };
}

/** Choose a model. `enabled=false` (or no routing) returns the pinned model
 *  unchanged, so an un-routed step behaves exactly as before. */
export function routeModel({ taskContext, task, pinned, enabled = true, tiers = MODEL_TIERS } = {}) {
  if (!enabled) return { model: pinned, routed: false };
  const c = classifyDifficulty(taskContext, { task });
  return { model: tiers[c.tier] || c.model, routed: true, ...c };
}
