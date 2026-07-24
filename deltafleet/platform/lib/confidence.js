// Calibrated-Confidence Autonomy — uncertainty buys MORE oversight, never less
// (FRONTIER-PLAN reach idea; the riskiest, so built strictly one-directional).
//
// An agent may attach a self-reported confidence (0–1) to a gated action. Raw
// self-reported confidence is untrustworthy — models are systematically
// overconfident — so it is CALIBRATED against how well this agent's past
// confidence on this tool actually predicted human agreement. A chronically
// overconfident agent's numbers get discounted, so it escalates MORE.
//
// The one safe direction: confidence can only ESCALATE a gate (a low-confidence
// action on a light gate is bumped up to human approval). It can NEVER relax a
// gate — an `approve` gate stays `approve` no matter how confident the agent
// claims to be. Autonomy is still earned only through the human-applied trust
// curve; this just adds oversight where the agent itself is unsure. The two
// never-relax actions (CRM merges, negative-review responses) are therefore
// untouched — escalation is purely additive.
export const CONFIDENCE_POLICY = { ESCALATE_BELOW: 0.5, MIN_SAMPLES: 5 };

/** Discount a raw confidence by the agent's observed reliability on this tool.
 *  Below MIN_SAMPLES we lack evidence, so the raw value stands. */
export function calibrate(raw, stats) {
  if (typeof raw !== 'number') return undefined;
  if (!stats || stats.samples < CONFIDENCE_POLICY.MIN_SAMPLES) return raw;
  return +(raw * stats.agreementRate).toFixed(3);
}

/** Escalate to human approval when calibrated confidence is below the bar. Only
 *  ever raises oversight — an approve gate is already the strongest. */
export function shouldEscalate(gate, calibratedConfidence) {
  if (gate === 'approve') return false;
  if (typeof calibratedConfidence !== 'number') return false;
  return calibratedConfidence < CONFIDENCE_POLICY.ESCALATE_BELOW;
}

/** Calibration measurement for a set of decided, confidence-bearing actions.
 *  agreementRate = P(approved | acted), the empirical reliability; brier = mean
 *  squared error of confidence vs outcome (lower is better-calibrated); gap =
 *  meanConfidence − agreementRate (positive = overconfident). */
export function calibrationOf(actions) {
  const scored = actions.filter((a) => typeof a.confidence === 'number' && a.verdict);
  const n = scored.length;
  if (!n) return { samples: 0, agreementRate: 1, meanConfidence: 0, brier: 0, gap: 0 };
  let agree = 0, confSum = 0, brier = 0;
  for (const a of scored) {
    const ok = a.verdict === 'approved' ? 1 : 0; // edited/rejected = disagreement
    agree += ok; confSum += a.confidence; brier += (a.confidence - ok) ** 2;
  }
  const agreementRate = agree / n, meanConfidence = confSum / n;
  return { samples: n, agreementRate: +agreementRate.toFixed(3), meanConfidence: +meanConfidence.toFixed(3), brier: +(brier / n).toFixed(3), gap: +(meanConfidence - agreementRate).toFixed(3) };
}
