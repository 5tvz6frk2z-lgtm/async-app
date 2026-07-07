// Adversarial Verification Layer — the self-checking fleet (FRONTIER-PLAN Bet 1).
//
// A new gate tier, `verify`, sits between `log` and `approve`. Before a
// verify-gated action executes, the engine spawns N independent VERIFIER agents
// with fresh context and an adversarial brief: "you did not write this; try to
// refute it; default to REFUTED when unsure." They vote. A strict majority must
// vote CLEAN for the action to proceed — ties and split decisions HOLD it
// (pessimistic). A held action is never executed; the refutation reasons are fed
// back to the acting agent so it can revise (a self-repair loop) before the
// action would ever reach a human. Every vote and outcome is ledgered.
//
// Why pessimistic: a wrongly-approved brand-visible action is worse than a
// wrongly-held one — the same asymmetry the whole gate doctrine is built on.
//
// Fail-safe everywhere: an unparseable verdict, a thrown verifier, or a missing
// verifier all resolve to REFUTED/held, never to a silent execute.
export const DEFAULT_K = 3;

/** System prompt for one verifier. `lens` (optional) focuses a
 *  perspective-diverse panel — e.g. correctness / brand / policy — so the panel
 *  catches failure modes a homogeneous panel would miss. `context` carries the
 *  same specialization-cascade lines the acting agent saw (brand, standing
 *  rules, memory) so a brand-lens verifier actually knows the brand. */
export function verifierSystem(lens, context = []) {
  return [
    'You are an independent verifier for Delta Fleet. You did NOT write the action under review and you have no stake in it being approved.',
    'Your job is to REFUTE: find any concrete reason this action is wrong, off-brand, unsafe, factually unsupported by its inputs, or not what the trigger warranted.',
    lens ? `Review specifically through this lens: ${lens}.` : '',
    ...context,
    'Default to "refuted" whenever you are uncertain — a wrongly-approved action is worse than a wrongly-held one.',
    'Reply with ONE JSON object and nothing else: {"verdict":"clean"|"refuted","confidence":0.0-1.0,"reason":"one concrete sentence"}.',
  ].filter(Boolean).join('\n');
}

/** Parse a verifier's reply. Anything we can't read as a clean verdict is
 *  treated as a refusal — the model doesn't get the benefit of the doubt. */
export function parseVote(text) {
  const fail = (reason) => ({ verdict: 'refuted', confidence: 0.5, reason });
  try {
    const m = String(text ?? '').match(/\{[\s\S]*\}/);
    if (!m) return fail('no parseable verdict (fail-safe refuse)');
    const o = JSON.parse(m[0]);
    const verdict = o.verdict === 'clean' ? 'clean' : 'refuted';
    const confidence = typeof o.confidence === 'number' ? Math.max(0, Math.min(1, o.confidence)) : 0.5;
    return { verdict, confidence, reason: typeof o.reason === 'string' ? o.reason : '' };
  } catch {
    return fail('unparseable verdict (fail-safe refuse)');
  }
}

/** Tally votes. A strict majority CLEAN is required to pass; anything else
 *  (tie, majority refute) holds. */
export function tally(votes) {
  const refuted = votes.filter((v) => v.verdict === 'refuted').length;
  const clean = votes.filter((v) => v.verdict === 'clean').length;
  return { outcome: clean > refuted ? 'clean' : 'refuted', refuted, clean, n: votes.length };
}

export class Verifier {
  /** @param lenses optional array of perspective lenses; if set, one verifier
   *  per lens (n = lenses.length). Otherwise `k` identical skeptics. */
  constructor({ adapter, k = DEFAULT_K, lenses = null, model } = {}) {
    if (!adapter) throw new Error('Verifier needs a model adapter');
    this.adapter = adapter; this.k = k; this.lenses = lenses; this.model = model;
  }

  n() { return this.lenses ? this.lenses.length : this.k; }

  async verify({ tool, input, context = [], trigger, signal } = {}) {
    const briefs = this.lenses ? this.lenses.map((l) => ({ lens: l })) : Array.from({ length: this.k }, () => ({ lens: null }));
    const user = [
      'Action under review:',
      `  tool: ${tool}`,
      `  input: ${JSON.stringify(input, null, 1)}`,
      trigger !== undefined ? `  trigger that led here: ${JSON.stringify(trigger)}` : '',
      '',
      'Is this action correct, on-brand, and safe to execute exactly as written? Refute if not.',
    ].filter(Boolean).join('\n');

    let tokensIn = 0, tokensOut = 0;
    const votes = await Promise.all(briefs.map(async (b) => {
      const res = await this.adapter.complete({
        model: this.model, system: verifierSystem(b.lens, context),
        messages: [{ role: 'user', content: user }], tools: [], signal,
      });
      tokensIn += res.usage?.in || 0; tokensOut += res.usage?.out || 0;
      return { ...parseVote(res.text), lens: b.lens };
    }));
    return { ...tally(votes), votes, tokensIn, tokensOut };
  }
}

/** Run a verification for one action, ledger every step, and return the
 *  outcome. Shared by the agent runtime and the pipeline runner so the ledger
 *  shape is identical no matter which executor is verifying. Fail-safe: a
 *  thrown verifier holds the action rather than letting it through. */
export async function runVerification({ verifier, ledger, action, tool, input, context, trigger, signal }) {
  ledger.append({ type: 'verification.start', action, tool, n: verifier.n() });
  let result;
  try {
    result = await verifier.verify({ tool, input, context, trigger, signal });
  } catch (err) {
    ledger.append({ type: 'verification.result', action, outcome: 'refuted', refuted: verifier.n(), clean: 0, error: `verifier error: ${err.message}` });
    return { outcome: 'refuted', reasons: `verification could not run (${err.message})`, tokensIn: 0, tokensOut: 0 };
  }
  for (const v of result.votes) {
    ledger.append({ type: 'verification.vote', action, verdict: v.verdict, confidence: v.confidence, reason: v.reason, lens: v.lens });
  }
  ledger.append({ type: 'verification.result', action, outcome: result.outcome, refuted: result.refuted, clean: result.clean });
  const reasons = result.votes.filter((v) => v.verdict === 'refuted').map((v) => v.reason).filter(Boolean).slice(0, 3).join('; ');
  return { outcome: result.outcome, reasons, tokensIn: result.tokensIn, tokensOut: result.tokensOut, votes: result.votes };
}
