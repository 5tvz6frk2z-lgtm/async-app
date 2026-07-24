// Benchmark Ledger — the data moat (PIVOT-PLAN Phase 3, step 15).
//
// Each client runs an isolated deployment with its own ledger, so no single
// process sees cross-client data. The benchmark is built by having each
// deployment emit an ANONYMIZED export (per-corridor metric deltas, zero
// client identifiers), then aggregating those exports centrally. After enough
// installs, this lets us make claims no competitor can copy without our client
// base — "median 34% cycle-time reduction across 25 speed-to-lead installs" —
// and it feeds honest, evidence-based targets back into new Recon quotes.
//
// Privacy by construction: an export carries only {blueprint, metric, deltaPct,
// improved} rows plus an opaque install token (a caller-supplied hash, never a
// name). No baselines/currents in absolute terms, no brand, no free text.
import { proofFor } from './metrics.js';

/** Anonymized per-corridor export for one client deployment.
 *  `installId` must be an opaque, stable token the caller controls (e.g. a
 *  salted hash of the client id) — never a name. Absolute values are omitted;
 *  only direction-aware percentage deltas leave the deployment. */
export function benchmarkExport(blueprints, ledgerState, { installId }) {
  if (!installId) throw new Error('benchmarkExport requires an opaque installId');
  const rows = [];
  for (const bp of blueprints.values()) {
    for (const p of proofFor(bp, ledgerState)) {
      if (p.deltaPct == null || p.improved == null) continue; // needs baseline + a sample
      rows.push({
        blueprint: bp.blueprint,
        metric: p.key,
        direction: p.direction,
        deltaPct: +p.deltaPct.toFixed(1),
        improved: p.improved,
      });
    }
  }
  return { installId, at: null, rows }; // `at` stamped by the caller (scripts can't call Date)
}

const median = (xs) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const quantile = (xs, q) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const pos = (s.length - 1) * q, base = Math.floor(pos), rest = pos - base;
  return s[base + 1] !== undefined ? s[base] + rest * (s[base + 1] - s[base]) : s[base];
};

/** Aggregate many client exports into cross-install benchmark stats.
 *  Dedupes by installId (latest wins by array order) so re-exports don't
 *  double-count. Returns per-blueprint/metric: install count, improved rate,
 *  and the median / p25 / p75 improvement magnitude among improved installs. */
export function aggregate(exports) {
  const byInstall = new Map();
  for (const e of exports) if (e && e.installId) byInstall.set(e.installId, e); // last wins
  const cells = new Map(); // `${blueprint}|${metric}` -> {direction, deltas:[], improved:[]}
  for (const e of byInstall.values()) {
    for (const r of e.rows || []) {
      const key = `${r.blueprint}|${r.metric}`;
      if (!cells.has(key)) cells.set(key, { blueprint: r.blueprint, metric: r.metric, direction: r.direction, deltas: [], improved: [] });
      const c = cells.get(key);
      c.deltas.push(r.deltaPct);
      c.improved.push(!!r.improved);
    }
  }
  const out = [];
  for (const c of cells.values()) {
    const n = c.deltas.length;
    const improvedCount = c.improved.filter(Boolean).length;
    // magnitude among installs that improved, expressed as a positive % gain
    const gains = c.deltas.filter((_, i) => c.improved[i]).map((d) => Math.abs(d));
    out.push({
      blueprint: c.blueprint,
      metric: c.metric,
      direction: c.direction,
      installs: n,
      improvedRate: n ? improvedCount / n : null,
      medianGainPct: median(gains),
      p25GainPct: quantile(gains, 0.25),
      p75GainPct: quantile(gains, 0.75),
    });
  }
  return out.sort((a, b) => (a.blueprint < b.blueprint ? -1 : a.blueprint > b.blueprint ? 1 : a.metric < b.metric ? -1 : 1));
}

/** A publishable claim string for a benchmark cell, gated on a minimum sample.
 *  Returns null below minInstalls — we never publish a benchmark from too few
 *  installs (honesty gate; mirrors the site's "illustrative until real" rule). */
export function claimFor(cell, { minInstalls = 5 } = {}) {
  if (!cell || cell.installs < minInstalls || cell.medianGainPct == null) return null;
  const dir = cell.direction === 'down' ? 'reduction' : 'improvement';
  return `Median ${Math.round(cell.medianGainPct)}% ${dir} in ${cell.metric.replace(/_/g, ' ')} across ${cell.installs} ${cell.blueprint.replace(/-/g, ' ')} installs.`;
}
