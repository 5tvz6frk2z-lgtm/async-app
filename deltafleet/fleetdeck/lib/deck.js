// Deck — the facade that wires every Fleet Deck view over ONE spine, and hands
// the CLI and HTTP server a single dashboard snapshot. This is where the "one
// shared spine, many views" architecture pays off: Tollgate, Meter, Flight
// Recorder and the Approvals Inbox are constructed against the same event log, so
// a snapshot is internally consistent by construction — no cross-store reconcile.
import { Spine } from './spine.js';
import { Tollgate } from './tollgate.js';
import { Meter } from './meter.js';
import { Recorder } from './recorder.js';
import { Approvals } from './approvals.js';
import { Register } from './register.js';
import { Contextsmith } from './contextsmith.js';

// Illustrative list prices (USD per 1e6 tokens) — operators should override with
// their real contract pricing. Meter falls back to these only when an event
// carries token counts but no explicit costUsd.
export const DEFAULT_PRICING = {
  'claude-fable-5': { in: 5, out: 25 },
  'claude-opus-4-8': { in: 5, out: 25 },
  'claude-sonnet-5': { in: 3, out: 15 },
  'claude-haiku-4-5': { in: 1, out: 5 },
};

// A deny-by-default firewall with nothing scoped: every call needs review until an
// operator writes real rules. Safe, visible, and useless-until-configured on purpose.
export const DEFAULT_MANIFEST = { default: 'review', agents: {} };

export class Deck {
  constructor(file, { manifest = DEFAULT_MANIFEST, pricing = DEFAULT_PRICING, budgets = [], pack = 'governance' } = {}) {
    this.spine = new Spine(file, { indexBy: ['agent', 'server'] });
    this.gate = new Tollgate({ spine: this.spine, manifest });
    this.meter = new Meter({ spine: this.spine, pricing, budgets });
    this.recorder = new Recorder({ spine: this.spine, pricing });
    this.inbox = new Approvals({ spine: this.spine });
    this.register = new Register({ spine: this.spine, pack });
    this.contextsmith = new Contextsmith({ spine: this.spine });
    this._snap = null; // memoized snapshot, invalidated by spine.version
    this._snapAt = -1;
  }

  /** One internally-consistent dashboard object for the whole deck. Memoized by
   *  spine.version so repeated reads on the server hot path are free. */
  snapshot({ limit = 200 } = {}) {
    if (this._snap && this._snapAt === this.spine.version) return this._snap;
    const alerts = this.gate.alerts();
    const meter = this.meter.report();
    const pending = this.inbox.pending();
    const register = this.register.register();
    this._snap = {
      version: this.spine.version,
      events: this.spine.length,
      counts: {
        toolCalls: this.spine.query({ kind: 'tool.call' }).length,
        drift: alerts.length,
        criticalDrift: alerts.filter((a) => a.severity === 'critical').length,
        pendingApprovals: pending.length,
        budgetAlarms: meter.alarms.length,
        complianceGaps: register.summary.gap + register.summary.attention,
      },
      timeline: this.recorder.timeline({ reverse: true, limit }),
      alerts,
      meter,
      inbox: { pending, history: this.inbox.history().slice(0, 50) },
      register,
    };
    this._snapAt = this.spine.version;
    return this._snap;
  }
}
