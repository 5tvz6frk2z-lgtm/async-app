import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Ledger } from '../lib/ledger.js';
import { MemoryEngine } from '../lib/memory.js';
import { validateSource, loadSourceDir, syncSource, syncSources, staleFacts, retireStale } from '../lib/sources.js';

const here = path.dirname(fileURLToPath(import.meta.url));

const baseSource = () => ({
  id: 'acme', version: 1, updated: '2026-07-01', ttlDays: 180, scope: 'client', kind: 'fact',
  facts: [
    { key: 'hq', text: 'Acme HQ is in Toledo.' },
    { key: 'approver', kind: 'rule', text: 'Priya approves anything involving money.' },
  ],
});
const mem = () => new MemoryEngine(new Ledger(null));

test('validateSource enforces the schema', () => {
  assert.deepEqual(validateSource(baseSource()), []);
  assert.ok(validateSource({ ...baseSource(), id: 'Bad Id' }).some((e) => /kebab-case/.test(e)));
  assert.ok(validateSource({ ...baseSource(), updated: 'nope' }).some((e) => /ISO date/.test(e)));
  assert.ok(validateSource({ ...baseSource(), facts: [] }).some((e) => /non-empty/.test(e)));
  assert.ok(validateSource({ ...baseSource(), ttlDays: -1 }).some((e) => /positive/.test(e)));
});

test('sync projects facts into memory with source provenance and per-fact kind', () => {
  const m = mem();
  const r = syncSource(baseSource(), m);
  assert.deepEqual([r.added, r.updated, r.unchanged, r.retired], [2, 0, 0, 0]);
  const hq = m.findByKey('src:acme:hq');
  assert.equal(hq.text, 'Acme HQ is in Toledo.');
  assert.equal(hq.kind, 'fact');
  assert.equal(hq.source.type, 'source');
  assert.equal(hq.source.version, 1);
  assert.equal(m.findByKey('src:acme:approver').kind, 'rule'); // per-fact kind override
});

test('re-syncing an unchanged source is a no-op (no duplication)', () => {
  const m = mem();
  syncSource(baseSource(), m);
  const r2 = syncSource(baseSource(), m);
  assert.deepEqual([r2.added, r2.updated, r2.unchanged], [0, 0, 2]);
  assert.equal(m.active().length, 2, 'still exactly two memories — nothing bloated');
});

test('bumping the version updates in place and carries the new version', () => {
  const m = mem();
  syncSource(baseSource(), m);
  const v2 = { ...baseSource(), version: 2, updated: '2026-07-05', facts: [
    { key: 'hq', text: 'Acme HQ moved to Columbus.' }, // changed text
    { key: 'approver', kind: 'rule', text: 'Priya approves anything involving money.' }, // unchanged
  ] };
  const r = syncSource(v2, m);
  assert.deepEqual([r.added, r.updated, r.restamped, r.unchanged], [0, 1, 1, 0]);
  const hq = m.findByKey('src:acme:hq');
  assert.equal(hq.text, 'Acme HQ moved to Columbus.');
  assert.equal(hq.source.version, 2);
  assert.equal(m.active().length, 2, 'update in place, not a new row');
});

test('removing a fact from the file retires its memory on next sync', () => {
  const m = mem();
  syncSource(baseSource(), m);
  const trimmed = { ...baseSource(), version: 2, facts: [{ key: 'hq', text: 'Acme HQ is in Toledo.' }] };
  const r = syncSource(trimmed, m);
  assert.equal(r.retired, 1);
  assert.equal(m.findByKey('src:acme:approver'), undefined);
  assert.equal(m.active().length, 1);
});

test('freshness: a source past its ttl is flagged stale and can be retired', () => {
  const m = mem();
  const old = { ...baseSource(), updated: '2025-01-01' }; // well past 180 days by mid-2026
  syncSource(old, m);
  const sources = new Map([[old.id, old]]);
  const now = new Date('2026-07-07T00:00:00Z');
  const stale = staleFacts(m, sources, { now });
  assert.equal(stale.length, 2);
  assert.equal(retireStale(m, sources, { now }), 2);
  assert.equal(m.active().length, 0, 'stale source facts are gone — no out-of-date quotes reach a prompt');
});

test('a fresh source within its ttl is not stale', () => {
  const m = mem();
  syncSource(baseSource(), m); // updated 2026-07-01, ttl 180
  assert.equal(staleFacts(m, [baseSource()], { now: new Date('2026-07-07T00:00:00Z') }).length, 0);
});

test('memory.stats surfaces counts by kind/scope/provenance for scale observability', () => {
  const m = mem();
  syncSource(baseSource(), m);
  m.add({ kind: 'preference', text: 'A hand-typed operator note.' });
  const s = m.stats();
  assert.equal(s.active, 3);
  assert.equal(s.byKind.fact, 1);
  assert.equal(s.byKind.rule, 1);
  assert.equal(s.bySource.source, 2);
  assert.equal(s.bySource.operator, 1);
});

test('the shipped example source loads, validates, and syncs cleanly', () => {
  const sources = loadSourceDir(path.join(here, '..', 'sources'));
  assert.ok(sources.has('ironvale-company'));
  const m = mem();
  const results = syncSources(sources, m);
  assert.ok(results[0].added >= 4);
  assert.ok(m.active().some((x) => x.kind === 'rule')); // the approver rule came through
});
