// Pipeline Runner — hybrid execution: deterministic spine, agent joints.
//
// A pipeline blueprint declares ordered steps of two kinds:
//   { "script": "pull.email_stats", "input": {...}, "save": "email" }
//   { "infer":  "narrator", "task": "...", "input": {...}, "save": "narrative" }
//
// Script steps are plain code from the ScriptRegistry — gated and ledgered
// like any tool call, zero tokens. Infer steps are SINGLE model completions
// (no tool loop): classify / summarize / draft-in-brand-voice. A corridor
// that needs open-ended agentic behavior uses the AgentRun runtime instead;
// a corridor that can be a pipeline should be — it's cheaper and its results
// are reproducible.
//
// Inputs support $refs resolved against the run context:
//   "$trigger.x"  "$profile.brand"  "$results.email.needsReply"
//
// The per-client profile (brand, voice, industry, website, audience) is
// injected into every infer step's system prompt — this is the "configured
// to just their brand" layer.
import { newId } from './ledger.js';

export function resolveRefs(value, ctx) {
  if (typeof value === 'string' && value.startsWith('$')) {
    const path = value.slice(1).split('.');
    let cur = ctx;
    for (const p of path) {
      if (cur == null) return undefined;
      cur = cur[p];
    }
    return cur;
  }
  if (Array.isArray(value)) return value.map((v) => resolveRefs(v, ctx));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolveRefs(v, ctx)]));
  }
  return value;
}

export class PipelineRun {
  constructor({ blueprint, ledger, gates, scripts, adapter, profile = {}, maxTokens = 100_000 }) {
    if (!Array.isArray(blueprint.pipeline) || !blueprint.pipeline.length) {
      throw new Error(`blueprint ${blueprint.blueprint} has no pipeline`);
    }
    this.bp = blueprint;
    this.ledger = ledger;
    this.gates = gates;
    this.scripts = scripts;
    this.adapter = adapter;
    this.profile = profile;
    this.maxTokens = maxTokens;
    this.id = newId('run');
    this.abort = new AbortController();
    this.tokensIn = 0; this.tokensOut = 0;
  }

  kill(by = 'operator') {
    this.ledger.append({ type: 'kill', run: this.id, by });
    this.abort.abort();
  }

  #profileLines() {
    const p = this.profile;
    const lines = [];
    if (p.brand) lines.push(`Client brand: ${p.brand}`);
    if (p.industry) lines.push(`Industry: ${p.industry}`);
    if (p.website) lines.push(`Website: ${p.website}`);
    if (p.voice) lines.push(`Voice: ${p.voice}`);
    if (p.audience) lines.push(`Audience: ${p.audience}`);
    if (p.notes) lines.push(`Standing notes: ${p.notes}`);
    return lines;
  }

  #inferSystem(agent, task) {
    return [
      `You are ${agent.callsign} (${agent.name}), a specialist step inside the "${this.bp.title}" pipeline operated by Delta Fleet.`,
      `Role: ${agent.role}`,
      ...this.#profileLines(),
      `Task: ${task}`,
      `Rules: every number you state must come verbatim from the structured input — never invent or adjust figures. Output only the deliverable text: no preamble, no meta-commentary, no markdown fences.`,
    ].join('\n');
  }

  async run(triggerInput) {
    const { id, bp } = this;
    const callsign = bp.callsign || bp.agents[0]?.callsign || 'CONVOY';
    this.ledger.append({ type: 'run.start', run: id, blueprint: bp.blueprint, agent: 'pipeline', callsign, trigger: triggerInput });
    const ctx = { trigger: triggerInput, profile: this.profile, results: {} };
    let status = 'done';

    try {
      for (const [idx, step] of bp.pipeline.entries()) {
        if (this.abort.signal.aborted) { status = 'killed'; break; }
        if (this.tokensIn + this.tokensOut > this.maxTokens) throw new Error(`token budget exceeded (${this.maxTokens})`);

        if (step.script) {
          const input = resolveRefs(step.input || {}, ctx);
          const { action, gate, promise } = this.gates.request(id, bp.blueprint, step.script, input);
          let effective = input;
          if (gate === 'approve') {
            const verdict = await Promise.race([
              promise,
              new Promise((_, rej) => this.abort.signal.addEventListener('abort', () => rej(new Error('killed')), { once: true })),
            ]);
            if (verdict.verdict === 'rejected') {
              this.ledger.append({ type: 'action.result', action, ok: false, error: `rejected by ${verdict.by}${verdict.reason ? ': ' + verdict.reason : ''}` });
              if (step.optional) { this.ledger.append({ type: 'note', run: id, text: `Step ${idx + 1} (${step.script}) rejected — optional, continuing.` }); continue; }
              throw new Error(`required step ${step.script} rejected by operator`);
            }
            if (verdict.verdict === 'edited') effective = verdict.editedInput;
          }
          try {
            const out = await this.scripts.execute(step.script, effective, ctx);
            this.ledger.append({ type: 'action.result', action, ok: true, output: out });
            if (step.save) ctx.results[step.save] = out;
          } catch (err) {
            this.ledger.append({ type: 'action.result', action, ok: false, error: err.message });
            if (step.optional) { this.ledger.append({ type: 'note', run: id, text: `Step ${idx + 1} (${step.script}) failed — optional, continuing: ${err.message}` }); continue; }
            throw err;
          }
        } else if (step.infer) {
          const agent = bp.agents.find((a) => a.name === step.infer);
          if (!agent) throw new Error(`infer step references unknown agent ${step.infer}`);
          const input = resolveRefs(step.input || {}, ctx);
          const res = await this.adapter.complete({
            model: agent.model,
            system: this.#inferSystem(agent, step.task || agent.role),
            messages: [{ role: 'user', content: `Structured input:\n${JSON.stringify(input, null, 1)}` }],
            tools: [],
            signal: this.abort.signal,
          });
          this.tokensIn += res.usage?.in || 0;
          this.tokensOut += res.usage?.out || 0;
          const text = (res.text || '').trim();
          if (!text) throw new Error(`infer step ${step.infer} produced no output`);
          this.ledger.append({ type: 'note', run: id, text: `[${agent.callsign}] ${text.length > 400 ? text.slice(0, 400) + '…' : text}` });
          if (step.save) ctx.results[step.save] = text;
        } else {
          throw new Error(`pipeline step ${idx + 1} must have "script" or "infer"`);
        }
      }
    } catch (err) {
      if (this.abort.signal.aborted) status = 'killed';
      else {
        status = 'error';
        this.ledger.append({ type: 'note', run: id, text: `PIPELINE ERROR: ${err.message}` });
      }
    }
    this.ledger.append({ type: 'run.end', run: id, status, tokensIn: this.tokensIn, tokensOut: this.tokensOut });
    return { run: id, status, tokensIn: this.tokensIn, tokensOut: this.tokensOut, results: ctx.results };
  }
}
