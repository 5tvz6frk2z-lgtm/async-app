// Contextsmith — a versioned registry for the context artifacts that steer your
// agents: CLAUDE.md files, system prompts, skill guidance. Every version is
// content-addressed and recorded on the spine, and so is every activation — so
// the one thing teams never have is now on the timeline: WHICH version of the
// instructions was live when. Correlate a cost spike (Meter) or a behavior change
// (Flight Recorder) with the exact context change that caused it, because they're
// events on the same log.
//
// Like the Approvals Inbox, Contextsmith is an ACTOR: put()/activate() write
// events. Reads are served from an incremental projection.
import crypto from 'node:crypto';

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 12);

export class Contextsmith {
  /** @param {object} opts { spine } */
  constructor({ spine }) {
    this.spine = spine;
    this.state = spine.project('context', {
      init: () => ({ artifacts: new Map() }), // name -> { versions:[{version,sha,content,at}], active }
      apply: (st, e) => {
        if (e.kind === 'context.version') {
          const a = st.artifacts.get(e.name) || { versions: [], active: null };
          a.versions.push({ version: e.version, sha: e.sha, content: e.content, at: e.ts });
          st.artifacts.set(e.name, a);
        } else if (e.kind === 'context.activate') {
          const a = st.artifacts.get(e.name);
          if (a) a.active = e.version;
        }
      },
    });
  }

  #artifact(name) { return this.state.artifacts.get(name) || null; }

  /**
   * Register `content` as a new version of the named artifact. If it is identical
   * to the artifact's latest version, no new version is created (content-addressed
   * dedup) — returns the existing one. The first version of an artifact is
   * activated automatically.
   */
  put(name, content) {
    const digest = sha(content);
    const a = this.#artifact(name);
    if (a) {
      const latest = a.versions[a.versions.length - 1];
      if (latest.sha === digest) return { name, version: latest.version, sha: digest, deduped: true };
    }
    const version = a ? a.versions.length + 1 : 1;
    this.spine.append('context.version', { name, version, sha: digest, content });
    if (!a) this.spine.append('context.activate', { name, version }); // auto-activate v1
    return { name, version, sha: digest, deduped: false };
  }

  /** Make `version` the active one (a rollback is just activating an older version). */
  activate(name, version) {
    const a = this.#artifact(name);
    if (!a) throw new Error(`no context artifact named "${name}"`);
    if (!a.versions.some((v) => v.version === version)) throw new Error(`${name} has no version ${version}`);
    return this.spine.append('context.activate', { name, version });
  }

  /** The active version record for an artifact, or null. */
  active(name) {
    const a = this.#artifact(name);
    if (!a || a.active == null) return null;
    return a.versions.find((v) => v.version === a.active) || null;
  }

  get(name, version) {
    const a = this.#artifact(name);
    return a ? a.versions.find((v) => v.version === version) || null : null;
  }

  history(name) {
    const a = this.#artifact(name);
    return a ? a.versions.map((v) => ({ version: v.version, sha: v.sha, at: v.at, active: v.version === a.active })) : [];
  }

  /** Every artifact with its active version and version count. */
  list() {
    return [...this.state.artifacts.entries()].map(([name, a]) => ({ name, active: a.active, versions: a.versions.length }));
  }

  /** A minimal line diff between two versions (added/removed lines). */
  diff(name, versionA, versionB) {
    const a = this.get(name, versionA), b = this.get(name, versionB);
    if (!a || !b) throw new Error(`${name}: unknown version(s) ${versionA}/${versionB}`);
    return lineDiff(a.content, b.content);
  }
}

// Line-level diff via LCS — zero-dep, deterministic. Returns { added, removed, hunks }.
// The LCS table is (m+1)x(n+1); guard against a pathological diff (context artifacts
// are prose files, not megabyte blobs) rather than letting it exhaust memory.
const MAX_DIFF_CELLS = 4_000_000; // ~2000 x 2000 lines
export function lineDiff(before, after) {
  const A = String(before).split('\n'), B = String(after).split('\n');
  const m = A.length, n = B.length;
  if ((m + 1) * (n + 1) > MAX_DIFF_CELLS) {
    throw new Error(`lineDiff: inputs too large to diff (${m}x${n} lines); context artifacts should be prose, not bulk data`);
  }
  const lcs = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      lcs[i][j] = A[i] === B[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const hunks = [];
  let i = 0, j = 0, added = 0, removed = 0;
  while (i < m && j < n) {
    if (A[i] === B[j]) { hunks.push({ op: ' ', line: A[i] }); i++; j++; }
    else if (lcs[i + 1][j] >= lcs[i][j + 1]) { hunks.push({ op: '-', line: A[i] }); i++; removed++; }
    else { hunks.push({ op: '+', line: B[j] }); j++; added++; }
  }
  while (i < m) { hunks.push({ op: '-', line: A[i++] }); removed++; }
  while (j < n) { hunks.push({ op: '+', line: B[j++] }); added++; }
  return { added, removed, hunks };
}
