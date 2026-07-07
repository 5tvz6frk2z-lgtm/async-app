// Multi-Agent Orchestration — make the crew real (FRONTIER-PLAN Bet 3).
//
// The runtime runs ONE agent per run; a blueprint's "crew" was descriptive. The
// Coordinator executes a blueprint's agents as an actual graph. Four composable
// primitives, declared in the blueprint's `orchestration` block:
//
//   sequential — agents run in order; each sees the prior agents' returned
//                results (a handoff), nothing more.
//   parallel   — independent agents run concurrently; the coordinator gathers
//                their results. Wall-clock = the slowest branch, not the sum.
//   judge      — N attempt-agents draft in parallel; a judge agent picks the
//                best or synthesizes a better one from them (high-stakes steps).
//   delegate   — a parent agent scopes a sub-task; a child agent executes it in
//                isolation; the coordinator returns both.
//
// Context hygiene is the point: every sub-agent is a fresh AgentRun with its own
// adapter and its own context. It receives only the results explicitly handed to
// it — never the coordinator's or a sibling's full conversation. That isolation
// is what keeps a crew reliable where a single sprawling context degrades. Each
// sub-run is a first-class run in the ledger (gated, killable, budgeted, and —
// if the blueprint asks — adversarially verified), tagged with a shared thread.
import { AgentRun } from './runtime.js';
import { newId } from './ledger.js';

export class Coordinator {
  /** @param adapterFor (agentName) => adapter — each sub-agent gets its own,
   *  so no two crew members share a model conversation. */
  constructor({ blueprint, ledger, gates, adapterFor, tools, verifier = null, context = [], maxSteps, maxTokens }) {
    if (typeof adapterFor !== 'function') throw new Error('Coordinator needs adapterFor(agentName)');
    this.bp = blueprint;
    this.ledger = ledger;
    this.gates = gates;
    this.adapterFor = adapterFor;
    this.tools = tools;
    this.verifier = verifier;
    this.context = context;
    this.budget = {};
    if (maxSteps) this.budget.maxSteps = maxSteps;
    if (maxTokens) this.budget.maxTokens = maxTokens;
  }

  #spawn(agentName, extraContext, thread) {
    return new AgentRun({
      blueprint: this.bp, agentName, ledger: this.ledger, gates: this.gates,
      adapter: this.adapterFor(agentName), tools: this.tools, verifier: this.verifier,
      thread, context: [...this.context, ...extraContext], ...this.budget,
    });
  }

  async #node(agentName, triggerInput, extraContext, thread) {
    const run = this.#spawn(agentName, extraContext, thread);
    const res = await run.run(triggerInput);
    return { agent: agentName, run: res.run, status: res.status, output: res.output };
  }

  /** Spawn one scoped sub-agent and return its result (the delegate primitive). */
  async delegate(childName, task, thread) {
    return this.#node(childName, task, ['You are executing a scoped, delegated sub-task. Use only what is in this message; return only your result.'], thread);
  }

  async sequential(agentNames, trigger, thread) {
    const results = [];
    for (const name of agentNames) {
      const handoff = results.length
        ? ['Results handed to you by earlier agents in this workflow:', ...results.map((r) => `- ${r.agent}: ${r.output}`)]
        : [];
      const res = await this.#node(name, { trigger, prior: results.map((r) => ({ agent: r.agent, output: r.output })) }, handoff, thread);
      results.push(res);
    }
    return results;
  }

  async parallel(agentNames, trigger, thread) {
    return Promise.all(agentNames.map((name) => this.#node(name, trigger, [], thread)));
  }

  async judge({ attempts, judge }, trigger, thread) {
    const drafts = await this.parallel(attempts, trigger, thread);
    const judgeInput = { task: trigger, attempts: drafts.map((d) => ({ agent: d.agent, output: d.output })) };
    const ctx = [`You are the judge. ${attempts.length} independent attempts are provided. Pick the single best, or synthesize a stronger result from them. Return only the final chosen text.`];
    const verdict = await this.#node(judge, judgeInput, ctx, thread);
    return { attempts: drafts, judge: verdict };
  }

  /** Dispatch on the blueprint's orchestration block. */
  async run(trigger) {
    const o = this.bp.orchestration;
    if (!o) throw new Error(`blueprint ${this.bp.blueprint} has no orchestration block`);
    const thread = newId('thr');
    this.ledger.append({ type: 'orchestration.start', thread, otype: o.type, blueprint: this.bp.blueprint });
    let result;
    if (o.type === 'sequential') result = { type: 'sequential', steps: await this.sequential(o.agents, trigger, thread) };
    else if (o.type === 'parallel') result = { type: 'parallel', branches: await this.parallel(o.agents, trigger, thread) };
    else if (o.type === 'judge') result = { type: 'judge', ...(await this.judge(o, trigger, thread)) };
    else if (o.type === 'delegate') {
      const parent = await this.#node(o.parent, trigger, ['Scope the task and state, in one line, the sub-task to delegate to a specialist.'], thread);
      const child = await this.delegate(o.child, { task: parent.output, from: o.parent }, thread);
      result = { type: 'delegate', parent, child };
    } else throw new Error(`unknown orchestration type ${o.type}`);
    this.ledger.append({ type: 'orchestration.end', thread, otype: o.type });
    return { thread, ...result };
  }
}
