// Delta Proof — the monthly client report. This is the deliverable the
// retainer pays for: baseline vs current per corridor, the period's activity,
// the trust curve (how much autonomy the fleet has earned), and what the
// fleet learned. Every figure is derived from ledger events — a number in
// this report can be traced to an append-only record, and the footer says so.
import { proofFor } from './metrics.js';

const fmt = (n) => n == null ? '—' : (typeof n === 'number' ? (Math.abs(n) >= 1000 ? Math.round(n).toLocaleString('en-US') : (Number.isInteger(n) ? String(n) : n.toFixed(1))) : String(n));
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
const pct = (n) => n == null ? '—' : Math.round(n * 100) + '%';

/** Assemble the report model. `since` (ISO string) scopes ACTIVITY;
 *  proof metrics are always baseline vs latest (the whole point is the delta). */
export function reportData({ blueprints, ledgerState, trust, memories, profile = {}, pack = null, since, until = null }) {
  if (!since) throw new Error('reportData requires since (ISO date)');
  const inPeriod = (t) => t && t >= since && (!until || t < until);

  const runs = [...ledgerState.runs.values()].filter((r) => inPeriod(r.start));
  const actions = [...ledgerState.actions.values()];
  const verdicts = actions.filter((a) => a.vt && inPeriod(a.vt));

  const corridors = [...blueprints.values()].map((bp) => {
    const bpRuns = runs.filter((r) => r.blueprint === bp.blueprint);
    const bpTrust = (trust || []).filter((t) => t.blueprint === bp.blueprint);
    const changes = (ledgerState.gateChanges || []).filter((g) => g.blueprint === bp.blueprint && inPeriod(g.t));
    return {
      id: bp.blueprint, title: bp.title, summary: bp.summary, tier: bp.tier || null,
      runs: bpRuns.length,
      done: bpRuns.filter((r) => r.status === 'done').length,
      exceptions: bpRuns.filter((r) => r.status === 'error' || r.status === 'killed').length,
      proof: proofFor(bp, ledgerState),
      trust: bpTrust,
      gateChanges: changes,
    };
  }).filter((c) => c.runs > 0 || c.proof.some((p) => p.baseline !== undefined || p.current !== undefined));

  const byVerdict = { approved: 0, edited: 0, rejected: 0 };
  for (const a of verdicts) if (byVerdict[a.verdict] !== undefined) byVerdict[a.verdict]++;
  const totalVerdicts = verdicts.length;

  const learned = (memories || []).filter((m) => inPeriod(m.created));

  return {
    brand: profile.brand || 'Client',
    pack: pack ? pack.title : null,
    since, until,
    generatedAt: new Date().toISOString(),
    ops: {
      runs: runs.length,
      done: runs.filter((r) => r.status === 'done').length,
      exceptions: runs.filter((r) => r.status === 'error' || r.status === 'killed').length,
      tokensIn: runs.reduce((s, r) => s + (r.tokensIn || 0), 0),
      tokensOut: runs.reduce((s, r) => s + (r.tokensOut || 0), 0),
      verdicts: totalVerdicts,
      byVerdict,
      cleanRate: totalVerdicts ? byVerdict.approved / totalVerdicts : null,
    },
    corridors,
    learned,
  };
}

/** Standalone printable HTML — print-first (white), zero external requests. */
export function renderReportHTML(d) {
  const period = `${d.since.slice(0, 10)} → ${d.until ? d.until.slice(0, 10) : 'today'}`;
  const proofRows = (c) => c.proof.map((p) => {
    const delta = p.deltaPct == null ? '—' : `<span class="${p.improved ? 'up' : 'down'}">${p.deltaPct > 0 ? '+' : ''}${p.deltaPct.toFixed(0)}%</span>`;
    return `<tr><td>${esc(p.label)}</td><td class="r">${fmt(p.baseline)}</td><td class="r">${fmt(p.current)} ${esc(p.unit)}</td><td class="r">${delta}</td><td class="r muted">${esc(p.target ?? '—')}</td></tr>`;
  }).join('');
  const trustRows = (c) => c.trust.map((t) =>
    `<tr><td class="mono">${esc(t.tool)}</td><td>${esc(t.current.toUpperCase())}</td><td class="r">${t.verdicts}</td><td class="r">${pct(t.interventionRate)}</td><td>${t.propose ? 'Relaxation earned — pending your sign-off' : ''}</td></tr>`).join('');
  const changeRows = (c) => c.gateChanges.map((g) =>
    `<li><span class="mono">${esc(g.tool)}</span>: ${esc(g.from)} → <b>${esc(g.to)}</b> (${esc(g.by)}${g.reason ? ' — ' + esc(g.reason) : ''})</li>`).join('');

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Delta Proof — ${esc(d.brand)}</title>
<style>
:root{color-scheme:light}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Avenir Next','Segoe UI',system-ui,sans-serif;color:#16202e;background:#fff;font-size:14px;line-height:1.55;padding:40px 48px;max-width:960px;margin:0 auto}
.mono{font-family:ui-monospace,'Cascadia Mono',Consolas,monospace;font-size:.85em}
h1{font-size:1.7rem;letter-spacing:-.01em}
h2{font-size:1.15rem;margin:30px 0 10px;border-bottom:2px solid #16202e;padding-bottom:5px}
h3{font-size:1rem;margin:18px 0 6px}
.kicker{font-family:ui-monospace,monospace;font-size:.66rem;letter-spacing:.22em;color:#7a2e12;text-transform:uppercase}
.meta{color:#5a6a7e;font-size:.85rem;margin-top:4px}
table{width:100%;border-collapse:collapse;font-size:.85rem;margin:8px 0 4px}
th{font-family:ui-monospace,monospace;font-size:.6rem;letter-spacing:.12em;text-transform:uppercase;text-align:left;color:#40506a;border-bottom:1.5px solid #16202e;padding:5px 8px}
td{padding:5px 8px;border-bottom:1px solid #d7dee8}
td.r,th.r{text-align:right;font-variant-numeric:tabular-nums}
.up{color:#0a7a4a;font-weight:600}.down{color:#b3223f;font-weight:600}.muted{color:#7a879a}
.tiles{display:flex;gap:12px;flex-wrap:wrap;margin:14px 0}
.tile{border:1px solid #c6d0dd;border-radius:8px;padding:10px 14px;min-width:118px}
.tile b{display:block;font-size:1.25rem}
.tile span{font-size:.68rem;color:#5a6a7e;text-transform:uppercase;letter-spacing:.08em}
.corridor{page-break-inside:avoid;margin-bottom:8px}
ul{margin:6px 0 6px 20px}li{margin-bottom:3px}
.learn{border-left:3px solid #7a2e12;padding:6px 12px;margin:6px 0;background:#faf7f4}
.learn .k{font-family:ui-monospace,monospace;font-size:.62rem;letter-spacing:.1em;color:#7a2e12}
.foot{margin-top:34px;padding-top:12px;border-top:1px solid #c6d0dd;font-size:.75rem;color:#5a6a7e}
.noprint{position:fixed;top:14px;right:14px}
.noprint button{font:inherit;padding:8px 14px;border:1px solid #16202e;background:#16202e;color:#fff;border-radius:7px;cursor:pointer}
@media print{.noprint{display:none}body{padding:0}}
</style></head><body>
<div class="noprint"><button onclick="print()">Print / Save PDF</button></div>
<div class="kicker">Delta Fleet · Delta Proof · Confidential</div>
<h1>${esc(d.brand)} — Fleet Report</h1>
<p class="meta">Period ${esc(period)}${d.pack ? ` · Industry pack: ${esc(d.pack)}` : ''} · Generated ${esc(d.generatedAt.slice(0, 10))}</p>

<h2>Operations</h2>
<div class="tiles">
 <div class="tile"><b>${fmt(d.ops.runs)}</b><span>Runs</span></div>
 <div class="tile"><b>${fmt(d.ops.done)}</b><span>Completed</span></div>
 <div class="tile"><b>${fmt(d.ops.exceptions)}</b><span>Exceptions</span></div>
 <div class="tile"><b>${fmt(d.ops.verdicts)}</b><span>Human verdicts</span></div>
 <div class="tile"><b>${pct(d.ops.cleanRate)}</b><span>Approved clean</span></div>
 <div class="tile"><b>${fmt(d.ops.tokensIn + d.ops.tokensOut)}</b><span>Tokens</span></div>
</div>
<p class="muted" style="font-size:.8rem">Verdicts this period: ${d.ops.byVerdict.approved} approved · ${d.ops.byVerdict.edited} edited · ${d.ops.byVerdict.rejected} rejected. Every edit and rejection was captured into fleet memory.</p>

${d.corridors.map((c) => `
<div class="corridor">
<h2>${esc(c.title)}${c.tier ? ` <span class="mono muted">(${esc(c.tier)})</span>` : ''}</h2>
<p class="muted" style="font-size:.82rem">${esc(c.summary)} — ${c.runs} run${c.runs === 1 ? '' : 's'} this period, ${c.done} completed, ${c.exceptions} exception${c.exceptions === 1 ? '' : 's'}.</p>
${c.proof.length ? `<h3>Proof vs baseline</h3><table><thead><tr><th>Metric</th><th class="r">Baseline</th><th class="r">Current</th><th class="r">Δ</th><th class="r">Target</th></tr></thead><tbody>${proofRows(c)}</tbody></table>` : ''}
${c.trust.length ? `<h3>Trust curve</h3><table><thead><tr><th>Gated action</th><th>Gate</th><th class="r">Verdicts</th><th class="r">Intervention</th><th></th></tr></thead><tbody>${trustRows(c)}</tbody></table>` : ''}
${c.gateChanges.length ? `<h3>Gate changes this period</h3><ul>${changeRows(c)}</ul>` : ''}
</div>`).join('')}

<h2>What the fleet learned this period</h2>
${d.learned.length ? d.learned.map((m) => `<div class="learn"><span class="k">${esc(m.kind.toUpperCase())}${m.scope !== 'client' ? ' · ' + esc(m.scope) : ''} · ${esc(m.source?.type || '')}</span><div>${esc(m.text)}</div></div>`).join('')
    : '<p class="muted">No new memories this period.</p>'}

<div class="foot">Every figure in this report derives from the append-only run ledger — each number is traceable to a logged event, and none are generated by a language model. Delta Proof is produced by the same platform it reports on.</div>
</body></html>`;
}
