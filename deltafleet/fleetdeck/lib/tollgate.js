// Tollgate — a local MCP firewall and tool-poisoning detector.
//
// Two jobs, both riding the same spine:
//
//   1. PERMISSION ENFORCEMENT. Every tool call an agent wants to make is checked
//      against a permission manifest before it is allowed through. The default is
//      deny — an agent can only call what a human explicitly scoped to it. Every
//      decision is logged as a spine event, so the audit trail and the firewall
//      are the same record.
//
//   2. TOOL-POISONING / RUG-PULL DETECTION. An MCP server advertises its tools
//      (name + description + inputSchema) when a client connects. A malicious or
//      compromised server can *change* those descriptions AFTER you approved it —
//      smuggling hidden instructions into a description the model will read, or
//      widening an inputSchema to exfiltrate more data. Tollgate pins a fingerprint
//      of the tool set at approval time and, on every later refresh, diffs against
//      the pin. A changed description or schema on an already-approved tool is the
//      classic attack signature and is raised as CRITICAL drift.
//
// The server-asserted `readOnlyHint`/`destructiveHint` annotations are treated as
// ADVISORY ONLY — they are set by the same server we're guarding against, so they
// inform the operator but never auto-grant a permission.
import crypto from 'node:crypto';

// ---- permission manifest -----------------------------------------------------

const DECISIONS = new Set(['allow', 'deny', 'review']);

/** Validate a manifest; returns an array of problem strings (empty = valid). */
export function validateManifest(m) {
  const errs = [];
  if (!m || typeof m !== 'object') return ['manifest must be an object'];
  if (m.default !== undefined && !DECISIONS.has(m.default)) {
    errs.push(`default must be one of ${[...DECISIONS].join(', ')}`);
  }
  const agents = m.agents || {};
  if (typeof agents !== 'object') return ['manifest.agents must be an object'];
  // Agent/server KEYS are matched exact-or-literal-'*' (they are not globbed). A
  // partial-glob key like 'git*' would silently match nothing, so a deny/review scoped
  // to it gives no protection — reject it loudly rather than let it fail open.
  const badKey = (k) => k !== '*' && k.includes('*');
  for (const [agent, servers] of Object.entries(agents)) {
    if (badKey(agent)) errs.push(`agent key "${agent}" cannot contain '*' except as the whole key (keys are not globbed)`);
    if (typeof servers !== 'object' || servers === null) { errs.push(`agent "${agent}" must map servers to rules`); continue; }
    for (const [server, rule] of Object.entries(servers)) {
      if (badKey(server)) errs.push(`${agent}: server key "${server}" cannot contain '*' except as the whole key (keys are not globbed)`);
      if (typeof rule !== 'object' || rule === null) { errs.push(`${agent}/${server} rule must be an object`); continue; }
      for (const key of Object.keys(rule)) {
        if (!['allow', 'review', 'deny'].includes(key)) errs.push(`${agent}/${server}: unknown rule key "${key}" (allow|review|deny)`);
        else if (!Array.isArray(rule[key])) errs.push(`${agent}/${server}.${key} must be an array of tool patterns`);
      }
    }
  }
  return errs;
}

// Glob with a single '*' wildcard (matches any run of chars). Anchored full-match.
function globMatch(pattern, str) {
  if (pattern === '*') return true;
  const rx = new RegExp('^' + pattern.split('*').map(escapeRegex).join('.*') + '$');
  return rx.test(str);
}
function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// All rules that apply to (agent, server), most specific first: exact agent+server,
// then exact agent + '*' server, then '*' agent + exact server, then '*'/'*'.
function applicableRules(manifest, agent, server) {
  const agents = manifest.agents || {};
  return [
    agents[agent]?.[server],
    agents[agent]?.['*'],
    agents['*']?.[server],
    agents['*']?.['*'],
  ].filter(Boolean);
}

/**
 * Decide whether `agent` may call `tool` on `server`, purely from the manifest.
 *
 * DENY AND REVIEW ARE HARD FLOORS: a deny (or, failing that, a review) at ANY
 * applicable scope (agent, server, or global) governs the call, so a narrow per-agent
 * allow can never widen past a broad deny OR silently bypass a broad "this needs human
 * review". Precedence deny > review > allow is enforced ACROSS scopes, not just within
 * the most-specific rule. `allow` is granted only by the most-specific matching rule
 * (so a narrow rule stays free to be MORE restrictive by not listing the tool). No
 * match at all -> the manifest default (default: 'deny'). Returns { decision, reason, matched }.
 */
export function decide(manifest, agent, server, tool) {
  const fallback = manifest.default || 'deny';
  // FAIL CLOSED on a tool name that isn't a clean string: a control character
  // (newline/CR/etc.) lets a decorated name like "drop_table\nHIDDEN" slip past an
  // anchored deny pattern while a broad allow:['*'] still matches it — a deny bypass.
  // Real MCP tool names are simple identifiers, so any control char is denied outright.
  if (typeof tool !== 'string' || /[\x00-\x1f\x7f]/.test(tool)) {
    return { decision: 'deny', reason: `${agent}/${server}: tool name is not a clean identifier (control characters)`, matched: 'deny' };
  }
  const rules = applicableRules(manifest, agent, server);
  const anyScope = (list) => rules.some((r) => (r[list] || []).some((p) => globMatch(p, tool)));
  // deny floor, then review floor — both union across every applicable scope.
  if (anyScope('deny')) return { decision: 'deny', reason: `${agent}/${server}: "${tool}" matches a deny pattern`, matched: 'deny' };
  if (anyScope('review')) return { decision: 'review', reason: `${agent}/${server}: "${tool}" matches a review pattern`, matched: 'review' };
  const rule = rules[0] || null;
  if (!rule) return { decision: fallback, reason: `no rule for ${agent}/${server}; default ${fallback}`, matched: null };
  if ((rule.allow || []).some((p) => globMatch(p, tool))) return { decision: 'allow', reason: `${agent}/${server}: "${tool}" matches an allow pattern`, matched: 'allow' };
  return { decision: fallback, reason: `${agent}/${server}: "${tool}" matches no pattern; default ${fallback}`, matched: null };
}

// ---- tool-set fingerprinting -------------------------------------------------

/** Canonical JSON with sorted keys — so equal objects always hash equal. Crucially
 *  INJECTIVE for the null-family: undefined / NaN / ±Infinity each get a distinct
 *  unquoted token (which JSON.stringify of a real string can never produce), so an
 *  approval bound to one payload can't be consumed by a payload that differs only by
 *  one of those values — JSON.stringify collapses all of them to 'null'. */
export function canonical(value) {
  if (value === undefined) return '@undef';
  if (typeof value === 'number' && !Number.isFinite(value)) return value !== value ? '@nan' : (value > 0 ? '@inf' : '@ninf');
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? '@undef';
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  const keys = Object.keys(value).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
}

function sha(s) { return crypto.createHash('sha256').update(s).digest('hex').slice(0, 16); }

// JSON-Schema `required` and `enum` are SETS (order carries no meaning), so a server
// merely re-serializing them in a different order must not read as a rug-pull. Sort
// exactly those two arrays before fingerprinting; every other array stays order-
// sensitive (a positional tuple/`prefixItems`/`examples` reorder IS a real change).
function normSchema(v) {
  if (Array.isArray(v)) return v.map(normSchema);
  if (v && typeof v === 'object') {
    const out = {};
    for (const k of Object.keys(v)) {
      const nv = normSchema(v[k]);
      out[k] = (k === 'required' || k === 'enum') && Array.isArray(nv) ? [...nv].sort() : nv;
    }
    return out;
  }
  return v;
}

/**
 * Fingerprint one tool descriptor. We hash the three fields an attacker would
 * tamper with — name, description, inputSchema — SEPARATELY, so the diff can say
 * *which* part of an already-approved tool changed (a description edit is the
 * poisoning signature; a schema edit is the exfiltration signature).
 */
export function fingerprintTool(tool) {
  const name = tool.name || '';
  const title = tool.title || '';
  const description = tool.description || '';
  const schema = normSchema(tool.inputSchema || tool.input_schema || {});
  const annotations = tool.annotations || {};
  return {
    name,
    titleHash: sha(title),
    descHash: sha(description),
    schemaHash: sha(canonical(schema)),
    annotationsHash: sha(canonical(annotations)),
    // advisory only — recorded so the operator can see it, never trusted for a grant
    readOnlyHint: tool.annotations?.readOnlyHint ?? tool.readOnlyHint ?? null,
    full: sha([name, title, description, canonical(schema), canonical(annotations)].join(String.fromCharCode(31))),
  };
}

/** Fingerprint a whole tools/list response into a stable per-server snapshot. */
export function fingerprintServer(toolsList) {
  const tools = {};
  for (const t of toolsList) tools[t.name] = fingerprintTool(t);
  const setHash = sha(Object.keys(tools).sort().map((n) => n + ':' + tools[n].full).join('|'));
  return { setHash, tools, count: Object.keys(tools).length };
}

/**
 * Diff a fresh snapshot against a pinned one. Returns a structured drift report.
 * Severity ladder:
 *   critical — a still-present tool's description or inputSchema changed
 *              (tool-poisoning / rug-pull: the exact attack this tool exists for)
 *   warn     — a new tool appeared (approve it before use)
 *   info     — a tool was removed
 */
export function diffSnapshots(pinned, fresh) {
  const changes = [];
  const pinnedNames = new Set(Object.keys(pinned.tools));
  const freshNames = new Set(Object.keys(fresh.tools));

  for (const name of freshNames) {
    if (!pinnedNames.has(name)) { changes.push({ type: 'added', tool: name, severity: 'warn' }); continue; }
    const a = pinned.tools[name], b = fresh.tools[name];
    if (a.descHash !== b.descHash) {
      changes.push({ type: 'description-changed', tool: name, severity: 'critical', was: a.descHash, now: b.descHash });
    }
    if (a.schemaHash !== b.schemaHash) {
      changes.push({ type: 'schema-changed', tool: name, severity: 'critical', was: a.schemaHash, now: b.schemaHash });
    }
    // title is model-visible (an injection surface like the description), so a
    // change is critical. The `!== undefined` guard means a pin taken before
    // titles were fingerprinted won't spuriously drift after an upgrade.
    if (a.titleHash !== undefined && a.titleHash !== b.titleHash) {
      changes.push({ type: 'title-changed', tool: name, severity: 'critical', was: a.titleHash, now: b.titleHash });
    }
    // annotations are advisory metadata (destructiveHint, readOnlyHint, …); a change
    // is worth flagging but ranks below the instruction/schema surfaces.
    if (a.annotationsHash !== undefined && a.annotationsHash !== b.annotationsHash) {
      changes.push({ type: 'annotations-changed', tool: name, severity: 'warn', was: a.annotationsHash, now: b.annotationsHash });
    }
  }
  for (const name of pinnedNames) {
    if (!freshNames.has(name)) changes.push({ type: 'removed', tool: name, severity: 'info' });
  }

  const rank = { none: 0, info: 1, warn: 2, critical: 3 };
  const severity = changes.reduce((s, c) => (rank[c.severity] > rank[s] ? c.severity : s), 'none');
  return { drifted: changes.length > 0, severity, changes, setHashWas: pinned.setHash, setHashNow: fresh.setHash };
}

// ---- Tollgate: the firewall over the spine -----------------------------------

export class Tollgate {
  /** @param {object} opts  { spine, manifest } */
  constructor({ spine, manifest }) {
    const errs = validateManifest(manifest);
    if (errs.length) throw new Error('invalid manifest:\n  ' + errs.join('\n  '));
    this.spine = spine;
    this.manifest = manifest;
  }

  /**
   * Pin a server's advertised tool set as the trusted baseline (call at approval
   * time). Records an `mcp.pin` event. Returns the snapshot fingerprint.
   */
  pin(server, toolsList) {
    const snap = fingerprintServer(toolsList);
    this.spine.append('mcp.pin', { server, setHash: snap.setHash, count: snap.count, snapshot: snap.tools });
    return snap;
  }

  /** The current pinned baseline for a server (most recent pin), or null.
   *  Filters by server in JS rather than a where-index, so Tollgate works with
   *  any spine index configuration (kind is always indexed). */
  pinnedFor(server) {
    const pins = this.spine.query({ kind: 'mcp.pin' }).filter((e) => e.server === server);
    if (!pins.length) return null;
    const p = pins[pins.length - 1];
    return { setHash: p.setHash, tools: p.snapshot, count: p.count };
  }

  /**
   * Re-check a server's advertised tools against the pin. Records an
   * `mcp.snapshot` and, if anything drifted, an `mcp.drift` alert. If the server
   * was never pinned, this auto-pins it and returns { drifted:false, firstSeen:true }.
   * Returns the drift report.
   */
  inspect(server, toolsList) {
    const fresh = fingerprintServer(toolsList);
    const pinned = this.pinnedFor(server);
    if (!pinned) {
      this.spine.append('mcp.pin', { server, setHash: fresh.setHash, count: fresh.count, snapshot: fresh.tools });
      return { drifted: false, firstSeen: true, severity: 'none', changes: [] };
    }
    const report = diffSnapshots(pinned, fresh);
    this.spine.append('mcp.snapshot', { server, setHash: fresh.setHash, count: fresh.count, drifted: report.drifted });
    if (report.drifted) {
      this.spine.append('mcp.drift', { server, severity: report.severity, changes: report.changes, setHashWas: report.setHashWas, setHashNow: report.setHashNow });
    }
    return { firstSeen: false, ...report };
  }

  /**
   * The firewall enforcement point. An MCP client calls this before forwarding a
   * tool call. Logs a `tool.call` event with the decision and returns
   * { decision, reason, allowed }. On 'deny' the caller must not forward; on
   * 'review' it must hold for a human (feeds the Approvals Inbox).
   */
  guard(agent, server, tool, input) {
    const d = decide(this.manifest, agent, server, tool);
    this.spine.append('tool.call', { agent, server, tool, input, decision: d.decision, reason: d.reason });
    return { ...d, allowed: d.decision === 'allow' };
  }

  /**
   * Record the outcome of a call that was allowed through. Kept separate from
   * guard() so the timeline holds request→result as two events (Flight Recorder
   * and Meter both read these).
   */
  record(agent, server, tool, { ok, output, error, tokensIn, tokensOut, costUsd, model } = {}) {
    return this.spine.append('tool.result', { agent, server, tool, ok: !!ok, output, error, tokensIn, tokensOut, costUsd, model });
  }

  /** Drift alerts for a server (or all servers), newest first. */
  alerts(server) {
    const all = this.spine.query({ kind: 'mcp.drift', reverse: true });
    return server ? all.filter((e) => e.server === server) : all;
  }
}
