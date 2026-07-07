// Delta Proof math — baseline vs current per corridor metric, plus the gate
// stats that make up the trust curve section of the monthly report.
export function proofFor(blueprint, ledgerState) {
  const m = ledgerState.metrics.get(blueprint.blueprint) || new Map();
  const rows = [];
  for (const def of blueprint.metrics.baseline) {
    const rec = m.get(def.key);
    const baseline = rec?.baseline;
    const samples = rec?.samples || [];
    const current = samples.length ? samples[samples.length - 1].value : undefined;
    let deltaPct = null, improved = null;
    if (baseline !== undefined && current !== undefined && baseline !== 0) {
      deltaPct = ((current - baseline) / Math.abs(baseline)) * 100;
      improved = def.direction === 'down' ? current < baseline : current > baseline;
    }
    rows.push({ key: def.key, label: def.label, unit: def.unit, direction: def.direction,
      target: blueprint.metrics.targets?.[def.key] ?? null,
      baseline, current, deltaPct, improved, samples: rec?.count ?? samples.length });
  }
  return rows;
}

/** Roll-up for the console tiles: runs, exception rate, approval throughput, tokens. */
export function opsSummary(ledgerState) {
  const runs = [...ledgerState.runs.values()];
  const actions = [...ledgerState.actions.values()];
  const done = runs.filter((r) => r.status === 'done').length;
  const failed = runs.filter((r) => r.status === 'error').length;
  const killed = runs.filter((r) => r.status === 'killed').length;
  const gated = actions.filter((a) => a.gate === 'approve');
  const decided = gated.filter((a) => a.verdict);
  const approvedClean = decided.filter((a) => a.verdict === 'approved').length;
  return {
    runsTotal: runs.length, done, failed, killed,
    running: runs.filter((r) => r.status === 'running').length,
    awaiting: runs.filter((r) => r.status === 'awaiting-approval').length,
    actionsTotal: actions.length,
    pendingApprovals: ledgerState.pendingApprovals.length,
    approvalCleanRate: decided.length ? approvedClean / decided.length : null,
    tokensIn: runs.reduce((s, r) => s + (r.tokensIn || 0), 0),
    tokensOut: runs.reduce((s, r) => s + (r.tokensOut || 0), 0),
  };
}
