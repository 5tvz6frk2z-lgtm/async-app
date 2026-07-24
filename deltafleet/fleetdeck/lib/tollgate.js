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
  // FAIL CLOSED on a tool name carrying any INVISIBLE / non-rendering character. Such a char
  // (newline, NBSP, ZWSP, RLO, BOM, U+2028, VS16 U+FE0F, Mongolian FVS, Hangul fillers
  // U+115F/1160/3164/FFA0, Braille-blank U+2800, …) can decorate a name so it looks identical
  // to a denied one yet dodges the anchored deny regex while a broad allow:['*'] still matches
  // it — a deny bypass. Blocklisting one Unicode category at a time is whack-a-mole (invisible
  // chars hide in C, Z, M, AND letter/symbol categories), so we reject the whole invisible
  // universe at once: C (control/format), Z (separator), M (marks/variation selectors),
  // Default_Ignorable_Code_Point (Hangul fillers & friends — Lo/So yet render as nothing),
  // plus U+2800 (Braille blank, a So char that isn't Default_Ignorable). Visible punctuation
  // (parens, dots) is none of these, so it stays allowed and matches literally.
  if (typeof tool !== 'string' || tool.length === 0 || /[\p{C}\p{Z}\p{M}\p{Default_Ignorable_Code_Point}\u2800]/u.test(tool)) {
    return { decision: 'deny', reason: `${agent}/${server}: tool name is not a clean identifier (invisible/control characters)`, matched: 'deny' };
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

// Canonicalize an inputSchema so two schemas fingerprint equal IFF they mean the same
// thing to a tool consumer. The JSON Schema spec makes some arrays UNORDERED sets —
// `required`, a union `type` (['string','null']), `enum`, the `anyOf`/`oneOf`/`allOf`
// applicators, and the non-normative `examples` annotation (a bag of sample instances) —
// so a server merely re-serializing them differently must NOT read as a rug-pull. But
// order carries meaning everywhere else: positional tuples (`items`/`prefixItems`) AND —
// critically — anything inside an instance-DATA VALUE (`default`/`const`, or an individual
// `examples` member), where an array that happens to be named `type` is just data.
//
// The old version decided purely by key NAME at any depth. That was wrong in BOTH
// directions: it sorted a `default.type`/`const.type` data array (hiding a real
// accepted-value change = a drift false-negative), and it left `anyOf` order-sensitive
// (crying CRITICAL wolf on a cosmetic reorder = a false-positive). We track POSITION
// instead — a keyword is only a keyword at a schema position, never inside a data value
// nor as a property NAME under `properties`. `examples` splits the difference: the array
// itself is an unordered set (sort it), but each member is instance data (preserve order
// within it) — so we sort by canonical after normalizing each member as data, like `enum`.
const _SCHEMA_SET_KEY = new Set(['anyOf', 'oneOf', 'allOf']); // arrays of subschemas = unordered sets
const _DATA_SET_KEY = new Set(['enum', 'examples']); // unordered array of DATA values (members are data)
const _SCHEMA_MAP_KEY = new Set(['properties', 'patternProperties', 'definitions', '$defs', 'dependentSchemas']); // name -> subschema
const _DATA_KEY = new Set(['default', 'const']); // value is a single instance value, order-sensitive
const _byCanonical = (a, b) => { const x = canonical(a), y = canonical(b); return x < y ? -1 : x > y ? 1 : 0; };

// Sort a per-key map of unordered NAME arrays (draft-07 `dependencies` array-form and
// `dependentRequired`); a schema-valued entry (dependencies' other form) recurses as schema.
function normDepMap(val) {
  const m = {};
  for (const name of Object.keys(val)) m[name] = Array.isArray(val[name]) ? [...val[name]].sort() : normNode(val[name], 'schema');
  return m;
}

function normNode(v, mode) {
  if (Array.isArray(v)) return v.map((x) => normNode(x, mode));
  if (!v || typeof v !== 'object') return v;
  const out = {};
  for (const k of Object.keys(v)) {
    const val = v[k];
    if (mode === 'data') { out[k] = normNode(val, 'data'); continue; } // in data: never sort, preserve order
    if ((k === 'required' || k === 'type') && Array.isArray(val)) out[k] = [...val].sort();
    else if ((k === 'dependentRequired' || k === 'dependencies') && val && typeof val === 'object' && !Array.isArray(val)) out[k] = normDepMap(val);
    else if (_DATA_SET_KEY.has(k) && Array.isArray(val)) out[k] = val.map((x) => normNode(x, 'data')).sort(_byCanonical);
    else if (_SCHEMA_SET_KEY.has(k) && Array.isArray(val)) out[k] = val.map((x) => normNode(x, 'schema')).sort(_byCanonical);
    else if (_SCHEMA_MAP_KEY.has(k) && val && typeof val === 'object' && !Array.isArray(val)) {
      const m = {}; for (const name of Object.keys(val)) m[name] = normNode(val[name], 'schema'); out[k] = m;
    } else if (_DATA_KEY.has(k)) out[k] = normNode(val, 'data');
    else out[k] = normNode(val, 'schema'); // tuples (items/prefixItems) recurse here — order preserved
  }
  return out;
}

function normSchema(v) { return normNode(v, 'schema'); }

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
    // Cover BOTH the nested annotations object AND any top-level advisory hints a server
    // may place beside it (fingerprintTool reads tool.readOnlyHint as a fallback), so a
    // flipped top-level hint can't change behavior invisibly to the pin.
    annotationsHash: sha(canonical(annotations) + '|' + canonical({ readOnlyHint: tool.readOnlyHint, destructiveHint: tool.destructiveHint, idempotentHint: tool.idempotentHint, openWorldHint: tool.openWorldHint })),
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
