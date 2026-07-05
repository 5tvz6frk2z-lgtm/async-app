// Agent Runtime — the tool-use loop that executes one agent of one blueprint.
//
// Design decisions (see ADR.md):
// - Model access is a pluggable adapter. AnthropicAdapter speaks the Messages
//   API over fetch (zero deps); MockAdapter drives tests and the demo.
// - Approval-gated actions PARK the run: the loop awaits the human verdict
//   promise from the GateEngine, then continues with the (possibly edited)
//   input, or records a rejection result and lets the model react to it.
// - Kill switch is an AbortController checked at every step boundary and
//   passed to fetch, so a kill lands mid-request too.
// - Budgets are hard: exceeding maxSteps or maxTokens ends the run as 'error'
//   with the reason ledgered. Agents don't get to run away quietly.
import { newId } from './ledger.js';

export class AgentRun {
  constructor({ blueprint, agentName, ledger, gates, adapter, tools, maxSteps = 24, maxTokens = 200_000 }) {
    this.bp = blueprint;
    this.agent = blueprint.agents.find((a) => a.name === agentName);
    if (!this.agent) throw new Error(`agent ${agentName} not in blueprint ${blueprint.blueprint}`);
    this.ledger = ledger;
    this.gates = gates;
    this.adapter = adapter;
    this.tools = tools;                       // ToolRegistry
    this.maxSteps = maxSteps;
    this.maxTokens = maxTokens;
    this.id = newId('run');
    this.abort = new AbortController();
    this.tokensIn = 0; this.tokensOut = 0;
  }

  kill(by = 'operator') {
    this.ledger.append({ type: 'kill', run: this.id, by });
    this.abort.abort();
  }

  systemPrompt() {
    return [
      `You are ${this.agent.callsign} (${this.agent.name}), an agent in the "${this.bp.title}" corridor operated by Delta Fleet.`,
      `Role: ${this.agent.role}`,
      `Corridor: ${this.bp.summary}`,
      `Operating rules: act only through your tools; one workflow instance per run; when the task is complete, reply with a one-sentence completion note and stop calling tools.`,
      `Some actions require human approval. A rejected action is a final decision — do not retry it; adapt or finish with a note.`,
    ].join('\n');
  }

  async run(triggerInput) {
    const { id } = this;
    this.ledger.append({ type: 'run.start', run: id, blueprint: this.bp.blueprint, agent: this.agent.name, callsign: this.agent.callsign, trigger: triggerInput });
    const toolDefs = this.tools.defsFor(this.agent.tools);
    const messages = [{ role: 'user', content: `Trigger: ${JSON.stringify(triggerInput)}` }];
    let status = 'done';
    try {
      for (let step = 0; ; step++) {
        if (this.abort.signal.aborted) { status = 'killed'; break; }
        if (step >= this.maxSteps) throw new Error(`step budget exceeded (${this.maxSteps})`);
        if (this.tokensIn + this.tokensOut > this.maxTokens) throw new Error(`token budget exceeded (${this.maxTokens})`);

        const res = await this.adapter.complete({
          model: this.agent.model, system: this.systemPrompt(), messages, tools: toolDefs, signal: this.abort.signal,
        });
        this.tokensIn += res.usage?.in || 0;
        this.tokensOut += res.usage?.out || 0;
        if (res.text) this.ledger.append({ type: 'note', run: id, text: res.text });

        if (!res.toolCalls?.length) break; // agent is done

        messages.push({ role: 'assistant', content: res.raw ?? res.text ?? '', toolCalls: res.toolCalls });
        const results = [];
        for (const call of res.toolCalls) {
          if (this.abort.signal.aborted) { status = 'killed'; break; }
          results.push(await this.#executeGated(call));
        }
        if (status === 'killed') break;
        messages.push({ role: 'tool_results', content: results });
      }
    } catch (err) {
      if (this.abort.signal.aborted) status = 'killed';
      else {
        status = 'error';
        this.ledger.append({ type: 'note', run: id, text: `RUN ERROR: ${err.message}` });
      }
    }
    this.ledger.append({ type: 'run.end', run: id, status, tokensIn: this.tokensIn, tokensOut: this.tokensOut });
    return { run: id, status, tokensIn: this.tokensIn, tokensOut: this.tokensOut };
  }

  async #executeGated(call) {
    const { action, gate, promise } = this.gates.request(this.id, this.bp.blueprint, call.tool, call.input);
    let input = call.input;
    if (gate === 'approve') {
      const verdictEvent = await Promise.race([
        promise,
        new Promise((_, rej) => this.abort.signal.addEventListener('abort', () => rej(new Error('killed')), { once: true })),
      ]);
      if (verdictEvent.verdict === 'rejected') {
        this.ledger.append({ type: 'action.result', action, ok: false, error: `rejected by ${verdictEvent.by}${verdictEvent.reason ? ': ' + verdictEvent.reason : ''}` });
        return { callId: call.id, tool: call.tool, ok: false, output: `Action rejected by operator${verdictEvent.reason ? ': ' + verdictEvent.reason : ''}. Do not retry.` };
      }
      if (verdictEvent.verdict === 'edited') input = verdictEvent.editedInput;
    }
    try {
      const output = await this.tools.execute(call.tool, input, { blueprint: this.bp.blueprint, run: this.id });
      this.ledger.append({ type: 'action.result', action, ok: true, output });
      return { callId: call.id, tool: call.tool, ok: true, output };
    } catch (err) {
      this.ledger.append({ type: 'action.result', action, ok: false, error: err.message });
      return { callId: call.id, tool: call.tool, ok: false, output: `Tool error: ${err.message}` };
    }
  }
}

/* ------------------------------------------------------------------ */

export class ToolRegistry {
  constructor() { this.tools = new Map(); }
  register(name, { description = '', schema = { type: 'object' }, handler }) {
    this.tools.set(name, { name, description, schema, handler });
    return this;
  }
  defsFor(names) {
    return names.map((n) => {
      const t = this.tools.get(n);
      if (!t) throw new Error(`tool ${n} not registered`);
      return { name: t.name, description: t.description, input_schema: t.schema };
    });
  }
  async execute(name, input, ctx) {
    const t = this.tools.get(name);
    if (!t) throw new Error(`tool ${name} not registered`);
    return t.handler(input, ctx);
  }
}

/* ------------------------------------------------------------------ */

/** Real model adapter — Anthropic Messages API over fetch, zero dependencies.
 *  Used in production deployments; tests and the demo use MockAdapter. */
export class AnthropicAdapter {
  constructor({ apiKey = process.env.ANTHROPIC_API_KEY, defaultModel = 'claude-opus-4-8', baseUrl = 'https://api.anthropic.com' } = {}) {
    if (!apiKey) throw new Error('AnthropicAdapter requires an API key');
    this.apiKey = apiKey; this.defaultModel = defaultModel; this.baseUrl = baseUrl;
  }

  #wire(messages) {
    // Convert runtime-neutral history to Messages API shape.
    const out = [];
    for (const m of messages) {
      if (m.role === 'user') out.push({ role: 'user', content: m.content });
      else if (m.role === 'assistant') {
        const content = [];
        if (typeof m.content === 'string' && m.content) content.push({ type: 'text', text: m.content });
        for (const c of m.toolCalls || []) content.push({ type: 'tool_use', id: c.id, name: c.tool, input: c.input });
        out.push({ role: 'assistant', content });
      } else if (m.role === 'tool_results') {
        out.push({ role: 'user', content: m.content.map((r) => ({
          type: 'tool_result', tool_use_id: r.callId, is_error: !r.ok,
          content: typeof r.output === 'string' ? r.output : JSON.stringify(r.output),
        })) });
      }
    }
    return out;
  }

  async complete({ model, system, messages, tools, signal }) {
    const res = await fetch(`${this.baseUrl}/v1/messages`, {
      method: 'POST', signal,
      headers: { 'x-api-key': this.apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: model || this.defaultModel,
        max_tokens: 16000,
        system,
        thinking: { type: 'adaptive' },
        messages: this.#wire(messages),
        tools: tools.map((t) => ({ name: t.name.replace(/\./g, '__'), description: t.description, input_schema: t.input_schema })),
      }),
    });
    if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const body = await res.json();
    if (body.stop_reason === 'refusal') throw new Error('model refused the request');
    const text = body.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
    const toolCalls = body.content.filter((b) => b.type === 'tool_use')
      .map((b) => ({ id: b.id, tool: b.name.replace(/__/g, '.'), input: b.input }));
    return { text, toolCalls, usage: { in: body.usage?.input_tokens || 0, out: body.usage?.output_tokens || 0 } };
  }
}

/** Deterministic scripted adapter for tests and the demo console. */
export class MockAdapter {
  constructor(script) { this.script = [...script]; }  // array of {text?, toolCalls?, usage?}
  async complete({ signal } = {}) {
    if (signal?.aborted) throw new Error('aborted');
    const step = this.script.shift();
    if (!step) return { text: 'Done.', toolCalls: [], usage: { in: 10, out: 5 } };
    return {
      text: step.text || '',
      toolCalls: (step.toolCalls || []).map((c, i) => ({ id: c.id || `mock_${i}_${Math.random().toString(36).slice(2, 6)}`, ...c })),
      usage: step.usage || { in: 100, out: 60 },
    };
  }
}
