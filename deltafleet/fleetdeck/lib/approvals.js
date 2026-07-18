// Approvals Inbox — the cross-agent human-in-the-loop, read off the shared spine.
//
// When Tollgate decides a tool call needs review (decision === 'review'), that
// tool.call event IS the approval request — its event id is the reference. This
// module derives the open inbox from those events and lets a human resolve each
// one by appending an `approval.verdict` event. Because request and verdict are
// both on the append-only timeline, the inbox doubles as compliance evidence: who
// approved what, when, and why, in a record that can't be edited after the fact.
//
// Unlike Meter/Recorder (pure observers), the Inbox is an ACTOR — approve()/reject()
// legitimately write to the spine. That's the whole point: it turns a human
// decision into a durable event other views (Recorder, an AI Register) can read.

const VERDICTS = new Set(['approved', 'rejected']);

export class Approvals {
  /** @param {object} opts { spine } */
  constructor({ spine }) {
    this.spine = spine;
    this.state = spine.project('approvals', {
      init: () => ({ open: new Map(), resolved: [] }),
      apply: (st, e) => {
        if (e.kind === 'tool.call' && e.decision === 'review') {
          st.open.set(e.id, { ref: e.id, seq: e.seq, agent: e.agent ?? null, server: e.server ?? null, tool: e.tool ?? null, input: e.input, reason: e.reason ?? null, requestedAt: e.ts });
        } else if (e.kind === 'approval.verdict') {
          const req = st.open.get(e.ref);
          if (req) {
            st.open.delete(e.ref);
            st.resolved.push({ ...req, verdict: e.verdict, by: e.by ?? null, note: e.note ?? null, resolvedAt: e.ts });
          }
        }
      },
    });
  }

  /** Open review items, oldest first (FIFO — the order a human should work them). */
  pending() {
    return [...this.state.open.values()].sort((a, b) => a.seq - b.seq);
  }

  /** Resolved history, newest first. */
  history() {
    return [...this.state.resolved].reverse();
  }

  has(ref) { return this.state.open.has(ref); }

  /** Approve an open item. Records an approval.verdict and returns the event. */
  approve(ref, by, note) { return this.#resolve(ref, 'approved', by, note); }

  /** Reject an open item. `reason` is stored as the note. */
  reject(ref, by, reason) { return this.#resolve(ref, 'rejected', by, reason); }

  #resolve(ref, verdict, by, note) {
    if (!VERDICTS.has(verdict)) throw new Error(`verdict must be one of ${[...VERDICTS].join(', ')}`);
    if (!this.state.open.has(ref)) {
      // Idempotency / audit safety: never silently double-resolve or invent a ref.
      const already = this.state.resolved.find((r) => r.ref === ref);
      throw new Error(already ? `approval ${ref} already ${already.verdict} by ${already.by}` : `no open approval with ref "${ref}"`);
    }
    return this.spine.append('approval.verdict', { ref, verdict, by: by ?? null, note: note ?? null });
  }

  /** Convenience: was a given tool.call ref approved? (for a gate to consult) */
  isApproved(ref) {
    const r = this.state.resolved.find((x) => x.ref === ref);
    return r ? r.verdict === 'approved' : false;
  }
}
