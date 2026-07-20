// Preflight — CI for your agent policy. Before you ship a change to the Tollgate
// manifest or accept an MCP server update, replay it against the real history on
// the spine and see exactly what would change. No guessing, no production surprise.
//
// Two checks, both read-only (Preflight never writes to the spine):
//
//   previewManifest(spine, candidate)  Re-decide every historical tool.call under a
//     candidate manifest and diff against the decision recorded at the time. Answers
//     "if I ship this policy, which calls that used to go through are now blocked,
//     and which that were blocked would now be allowed?"
//
//   previewPin(spine, server, freshTools)  Dry-run a server's advertised tools
//     against its pin WITHOUT recording anything — preview whether an MCP update is
//     safe to accept before it touches the ledger.
import { decide, validateManifest, fingerprintServer, diffSnapshots } from './tollgate.js';

/**
 * Replay historical tool.call decisions under a candidate manifest.
 * @returns {{ ok:boolean, errors?:string[], total:number, summary:object, changes:object[] }}
 */
export function previewManifest(spine, candidate) {
  const errors = validateManifest(candidate);
  if (errors.length) return { ok: false, errors, total: 0, summary: {}, changes: [] };

  const calls = spine.query({ kind: 'tool.call' });
  const changes = [];
  // Restriction rank: allow (0) < review (1) < deny (2). A drop in rank is a
  // LOOSENING (less oversight), a rise is a TIGHTENING — the risk-relevant direction.
  const rank = { allow: 0, review: 1, deny: 2 };
  const summary = { unchanged: 0, newlyDenied: 0, newlyAllowed: 0, newlyReview: 0, otherChange: 0, loosened: 0, tightened: 0 };

  for (const c of calls) {
    const was = c.decision; // the decision recorded when the call happened
    const now = decide(candidate, c.agent, c.server, c.tool).decision;
    if (was === now) { summary.unchanged++; continue; }
    if (now === 'deny') summary.newlyDenied++;
    else if (now === 'allow') summary.newlyAllowed++;
    else if (now === 'review') summary.newlyReview++;
    else summary.otherChange++;
    const dir = rank[now] - rank[was];
    if (dir < 0) summary.loosened++; else if (dir > 0) summary.tightened++;
    changes.push({ ref: c.id, agent: c.agent, server: c.server, tool: c.tool, was, now, direction: dir < 0 ? 'looser' : dir > 0 ? 'tighter' : 'lateral', at: c.ts });
  }

  return { ok: true, total: calls.length, summary, changes };
}

/**
 * Dry-run a fresh tool set against a server's pin. Read-only: unlike Tollgate.inspect
 * this records nothing, so you can vet an MCP update before accepting it.
 * @returns the same drift report shape as diffSnapshots, plus { pinned:boolean }.
 */
export function previewPin(spine, server, freshTools) {
  const pins = spine.query({ kind: 'mcp.pin' }).filter((e) => e.server === server);
  if (!pins.length) return { pinned: false, drifted: false, severity: 'none', changes: [], note: `${server} is not pinned yet` };
  const last = pins[pins.length - 1];
  const report = diffSnapshots({ setHash: last.setHash, tools: last.snapshot }, fingerprintServer(freshTools));
  return { pinned: true, ...report };
}

/** A one-line verdict for a manifest preview: is it safe to ship as-is?
 *  UNSAFE if ANY historical call would become less restricted (deny→review,
 *  deny→allow, or review→allow) — any reduction in oversight deserves review,
 *  not just a jump straight to allow. */
export function verdict(preview) {
  if (!preview.ok) return { safe: false, reason: `invalid manifest: ${preview.errors.join('; ')}` };
  const s = preview.summary;
  if (s.loosened > 0) return { safe: false, reason: `${s.loosened} call(s) become LESS restricted (${s.newlyAllowed} newly ALLOWED, deny→review included) — review before shipping` };
  if (s.tightened > 0) return { safe: true, reason: `tightens policy: ${s.newlyDenied} newly denied, ${s.newlyReview} newly held for review, none loosened` };
  return { safe: true, reason: 'no change to any historical decision' };
}
