// Agent Skills — reusable, progressively-disclosed capability modules
// (FRONTIER-PLAN Bet 5).
//
// A Skill is a named capability pack: { name, description, guidance, examples,
// triggers/match, validator }. It is the REUSE layer that complements per-client
// memory (which is bespoke): the same brand-voice-email or invoice-reconciliation
// skill serves install #1 and install #15, so capability compounds across the
// whole book, not just within one client.
//
// Progressive disclosure keeps prompts lean and reliable: an agent sees only a
// one-line DESCRIPTION of each available skill by default; the full GUIDANCE is
// loaded into the prompt only when a task actually matches the skill (by keyword
// triggers or a match() predicate). Cheaper tokens, less distraction, fewer
// errors — you carry the manual for the job in front of you, not every manual.
//
// The deterministic VALIDATOR is the teeth: a skill can check its own output
// (no exclamation marks, a variance was computed, ≥2 slots were proposed) and a
// failing output is rejected and retried — the same "code checks the model"
// doctrine as scripts and gates, packaged for reuse.

export class Skill {
  constructor({ name, description, guidance = '', examples = [], triggers = [], match = null, validator = null }) {
    if (!name || !/^[a-z0-9-]+$/.test(name)) throw new Error('skill name must be kebab-case');
    if (!description) throw new Error(`skill ${name} needs a one-line description`);
    this.name = name; this.description = description; this.guidance = guidance;
    this.examples = examples; this.triggers = triggers; this.match = match; this.validator = validator;
  }

  /** Does this skill apply to the task at hand? Explicit match() wins; otherwise
   *  keyword triggers are matched against the stringified task context. */
  matches(taskContext) {
    if (typeof this.match === 'function') return !!this.match(taskContext);
    if (!this.triggers.length) return false;
    const hay = (typeof taskContext === 'string' ? taskContext : JSON.stringify(taskContext || '')).toLowerCase();
    return this.triggers.some((t) => hay.includes(String(t).toLowerCase()));
  }

  /** Deterministic output check. Returns {ok} or {ok:false, error}. A missing
   *  validator passes (a skill can be guidance-only). Fail-closed on a throw. */
  validate(output) {
    if (!this.validator) return { ok: true };
    try {
      const r = this.validator(output);
      if (r === true || r === undefined) return { ok: true };
      if (r === false) return { ok: false, error: `output failed the ${this.name} check` };
      return r.ok ? { ok: true } : { ok: false, error: r.error || `output failed the ${this.name} check` };
    } catch (e) {
      return { ok: false, error: `${this.name} validator threw: ${e.message}` };
    }
  }
}

export class SkillRegistry {
  constructor() { this.skills = new Map(); }
  register(skill) { const s = skill instanceof Skill ? skill : new Skill(skill); this.skills.set(s.name, s); return this; }
  has(name) { return this.skills.has(name); }
  get(name) { return this.skills.get(name); }
  list() { return [...this.skills.values()]; }

  #available(names) { return names ? names.map((n) => this.skills.get(n)).filter(Boolean) : this.list(); }

  /** One-liners for the skills an agent may use (the always-on catalog). */
  descriptions(names) { return this.#available(names).map((s) => ({ name: s.name, description: s.description })); }

  /** Skills whose triggers/match fire for this task (the ones to fully load). */
  select(taskContext, { available } = {}) { return this.#available(available).filter((s) => s.matches(taskContext)); }

  /** Progressive-disclosure context: the catalog (descriptions only) plus full
   *  guidance for the skills that matched the task. */
  contextLines(taskContext, { available } = {}) {
    const avail = this.#available(available);
    if (!avail.length) return [];
    const matched = avail.filter((s) => s.matches(taskContext));
    const lines = ['Available skills (guidance loads only when a task matches):', ...avail.map((s) => `- ${s.name}: ${s.description}`)];
    for (const s of matched) {
      lines.push(`Skill loaded — ${s.name}: ${s.guidance}`);
      if (s.examples.length) lines.push(`  examples: ${s.examples.join(' | ')}`);
    }
    return lines;
  }
}

/* ------------------------------------------------------------------ */
/* Starter skill library — reusable across corridors and clients. Guidance is
   generic; a client's specific brand voice still comes from the profile + memory
   cascade. Validators are deterministic and conservative. */

const hasTimeSlots = (s, n) => (String(s).match(/\b\d{1,2}:\d{2}\b/g) || []).length >= n;

export function starterSkillRegistry() {
  return new SkillRegistry()
    .register({
      name: 'brand-voice-email',
      description: 'Write a customer email in the client\'s brand voice.',
      triggers: ['email', 'reply', 'follow-up', 'outreach'],
      guidance: 'Lead with the recipient\'s concern, not your ask. Plain sentences. No exclamation marks, no all-caps, no hype words ("guaranteed", "100%"). Close with a single clear next step.',
      examples: ['Hi Dana — following up on Tuesday\'s question about lead times. Two options below; tell me which fits.'],
      validator: (out) => {
        const t = String(out || '');
        if (!t.trim()) return { ok: false, error: 'empty email' };
        if (t.includes('!')) return { ok: false, error: 'exclamation marks are off-brand' };
        if (/\b(GUARANTEED|100%|ACT NOW|URGENT)\b/i.test(t)) return { ok: false, error: 'hype/overpromising language' };
        if ((t.match(/\b[A-Z]{4,}\b/g) || []).length) return { ok: false, error: 'all-caps words read as shouting' };
        return { ok: true };
      },
    })
    .register({
      name: 'invoice-reconciliation',
      description: 'Reconcile an invoice against its PO and surface the variance.',
      triggers: ['invoice', 'reconcile', 'po', 'accounts payable', 'ap'],
      guidance: 'Match on PO number and vendor. Compute variance as a number (invoice − PO). Flag for human review when the variance exceeds tolerance; never auto-post a mismatch. State the computed figure, never estimate it.',
      validator: (out) => {
        if (out && typeof out === 'object' && typeof out.variance === 'number') return { ok: true };
        return { ok: false, error: 'reconciliation output must include a numeric computed variance' };
      },
    })
    .register({
      name: 'meeting-scheduling',
      description: 'Propose meeting times from available calendar slots.',
      triggers: ['schedule', 'meeting', 'calendar', 'book', 'availability'],
      guidance: 'Offer at least two concrete time options with the timezone stated. Never propose a slot outside the provided free blocks. Keep it to one short message.',
      examples: ['Two options that work on my side: Tue 10:00 or Wed 09:00 (ET). Which suits you?'],
      validator: (out) => (hasTimeSlots(out, 2) ? { ok: true } : { ok: false, error: 'propose at least two concrete HH:MM time slots' }),
    })
    .register({
      name: 'review-response-tone',
      description: 'Draft a public response to a negative review — accountable, specific, no template smell.',
      triggers: ['review', 'rating', 'reputation', 'complaint'],
      guidance: 'Acknowledge the specific issue in the reviewer\'s words. Take accountability without over-apologizing. Offer a concrete next step and move the detailed resolution to a private channel. No exclamation marks, no canned "we value your feedback" filler.',
      validator: (out) => {
        const t = String(out || '');
        if (!t.trim()) return { ok: false, error: 'empty response' };
        if (t.includes('!')) return { ok: false, error: 'exclamation marks read as defensive/inauthentic' };
        if (/we value your feedback|your business is important/i.test(t)) return { ok: false, error: 'template-filler phrasing detected' };
        return { ok: true };
      },
    })
    .register({
      name: 'exec-summary',
      description: 'Write a tight executive summary that leads with the number.',
      triggers: ['summary', 'report', 'weekly', 'brief', 'exec'],
      guidance: 'Lead with the single most important number and its direction. One headline, then at most three supporting lines. Every figure must come from the input data, never estimated. Under 80 words.',
      validator: (out) => {
        const t = String(out || '');
        if (!/\d/.test(t)) return { ok: false, error: 'an exec summary must lead with a number' };
        if (t.split(/\s+/).filter(Boolean).length > 80) return { ok: false, error: 'over the 80-word limit' };
        return { ok: true };
      },
    });
}
