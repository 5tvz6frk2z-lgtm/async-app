import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { tokenize, stem, keywords, matches } from '../lib/tokenize.js';
import { splitSections, inlinePointers } from '../lib/sections.js';
import { BrainIndex } from '../lib/index.js';
import { retrieve, rankCandidates, bestSection } from '../lib/retrieve.js';
import { save, remove, reindex, parseFrontmatter, slug } from '../lib/store.js';

function tmpBrain() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cortex-'));
  fs.mkdirSync(path.join(dir, 'memories'), { recursive: true });
  return dir;
}
const NOW = '2026-07-08T00:00:00.000Z';

test('tokenize: stopwords dropped, light stemming, identifiers preserved', () => {
  assert.deepEqual(tokenize('How do I integrate the email.send tool?'), ['email.send', 'integrate', 'email', 'send', 'tool']);
  assert.equal(stem('policies'), 'policy');
  assert.equal(stem('integrations'), 'integration');
  assert.equal(stem('running'), 'runn');
  assert.deepEqual(keywords('the the memory memory'), ['memory']);
  // fuzzy recall: forms that light-stemming leaves different still match by prefix
  assert.ok(matches('integrate', 'integration'));
  assert.ok(matches('relax', 'relaxation'));
  assert.ok(matches('approval', 'approve'));
  assert.ok(!matches('trust', 'truth'));
});

test('splitSections and inline pointers', () => {
  const secs = splitSections('intro text\n# A\nalpha\n## B\nbeta [[other-mem]] more');
  assert.equal(secs.length, 3);
  assert.equal(secs[1].heading, 'A');
  assert.deepEqual(inlinePointers('see [[gate-doctrine]] and [[trust-curve]]'), ['gate-doctrine', 'trust-curve']);
});

function seed(dir) {
  const idx = new BrainIndex(dir);
  save(idx, { name: 'Gate doctrine', id: 'gate-doctrine', summary: 'Every tool action is gated auto/log/verify/approve; brand-visible actions need approval.', tags: ['gates', 'approval', 'trust'], pointers: ['trust-curve'], content: '# Gate doctrine\nActions are classified auto, log, verify, approve.\n## Relaxation\nGates relax only on evidence; see [[trust-curve]].', now: NOW });
  save(idx, { name: 'Trust curve', id: 'trust-curve', summary: 'Gates relax after 20 verdicts under 5% intervention; two never relax.', tags: ['trust', 'relaxation', 'verdicts'], content: '# Trust curve\n## Relaxation policy\nA gate becomes a candidate after 20 verdicts with intervention under 5 percent.\n## Never relax\nCRM merges and negative-review responses never auto-relax.', now: NOW });
  save(idx, { name: 'Memory taxonomy', id: 'memory-taxonomy', summary: 'Typed memory: rule, preference, fact, pattern. Ledger-derived.', tags: ['memory', 'taxonomy', 'ledger'], content: '# Memory taxonomy\nFour kinds: rule, preference, fact, pattern.', now: NOW });
  return idx;
}

test('retrieval scores the index (no files opened) then delivers the answer in a small evidence slice', () => {
  const dir = tmpBrain();
  const idx = seed(dir);
  const r = retrieve(idx, 'how many verdicts before a gate relaxes?');
  // candidates are ranked purely from the one-line index, descending
  assert.ok(r.candidates.length >= 2 && r.candidates[0].score >= r.candidates[1].score);
  assert.equal(r.chosen.id, 'trust-curve', 'the discriminating term "verdicts" pins the right memory');
  assert.match(r.evidence, /20 verdicts/);
  assert.ok(r.tokens > 0 && r.tokens < 400, 'evidence is a small slice, not the whole store');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('retrieval pulls only the answering section, not the whole file', () => {
  const dir = tmpBrain();
  const idx = seed(dir);
  const r = retrieve(idx, 'which actions never auto-relax?');
  assert.equal(r.chosen.id, 'trust-curve');
  assert.equal(r.section.heading, 'Never relax');
  assert.match(r.section.text, /CRM merges/);
  assert.doesNotMatch(r.section.text, /20 verdicts/, 'other sections are excluded');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('retrieval follows exactly one pointer to a related memory', () => {
  const dir = tmpBrain();
  const idx = seed(dir);
  const r = retrieve(idx, 'gate doctrine and how relaxation is earned');
  assert.equal(r.chosen.id, 'gate-doctrine');
  assert.ok(r.pointer, 'a pointer was followed');
  assert.equal(r.pointer.id, 'trust-curve');
  assert.equal(r.filesOpened, 2, 'exactly two files: best + one pointer');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('save writes an atomic file + index line; catalogue matches disk', () => {
  const dir = tmpBrain();
  const idx = new BrainIndex(dir);
  const e = save(idx, { name: 'Speed to Lead', summary: 'Respond to inbound leads in minutes.', tags: ['leads', 'speed'], content: '# Speed to Lead\nRespond fast.', now: NOW });
  assert.equal(e.id, 'speed-to-lead');
  assert.ok(fs.existsSync(path.join(dir, 'memories', 'speed-to-lead.md')));
  // index line present and reloadable
  const reloaded = new BrainIndex(dir);
  assert.equal(reloaded.get('speed-to-lead').summary, 'Respond to inbound leads in minutes.');
  // frontmatter round-trips
  const { meta } = parseFrontmatter(fs.readFileSync(path.join(dir, 'memories', 'speed-to-lead.md'), 'utf8'));
  assert.deepEqual(meta.tags, ['leads', 'speed']);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('reindex rebuilds the catalogue from files (self-heal after index loss)', () => {
  const dir = tmpBrain();
  const idx = seed(dir);
  fs.rmSync(path.join(dir, 'index.jsonl')); // simulate a lost/corrupt index
  const fresh = new BrainIndex(dir);
  assert.equal(fresh.all().length, 0);
  const n = reindex(fresh);
  assert.equal(n, 3);
  assert.ok(fresh.has('trust-curve'));
  assert.deepEqual(fresh.get('gate-doctrine').pointers, ['trust-curve'], 'pointers recovered from frontmatter');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('remove deletes the file and the index line together', () => {
  const dir = tmpBrain();
  const idx = seed(dir);
  assert.equal(remove(idx, 'memory-taxonomy'), true);
  assert.ok(!fs.existsSync(path.join(dir, 'memories', 'memory-taxonomy.md')));
  assert.ok(!new BrainIndex(dir).has('memory-taxonomy'));
  fs.rmSync(dir, { recursive: true, force: true });
});

test('slug is filesystem-safe and stable', () => {
  assert.equal(slug('Delta Proof: baseline vs current!'), 'delta-proof-baseline-vs-current');
});

test('evidence excludes frontmatter and is clipped to a small slice', () => {
  const dir = tmpBrain();
  const idx = new BrainIndex(dir);
  const big = '# Budgets\n' + 'Runaways die loudly. '.repeat(400); // a long section
  save(idx, { name: 'Budgets are hard', id: 'budgets', summary: 'maxSteps and maxTokens per run.', tags: ['budget', 'limits'], content: big, now: NOW });
  const r = retrieve(idx, 'what happens when an agent exceeds its budget?');
  assert.equal(r.chosen.id, 'budgets');
  assert.doesNotMatch(r.evidence, /^---|\nsummary:|\ntags:/, 'frontmatter never leaks into evidence');
  assert.match(r.evidence, /Runaways die loudly/, 'the body answer is present');
  assert.ok(r.evidence.endsWith('…') || r.tokens < 500, 'a long section is clipped, not dumped whole');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('body-aware re-rank: the body breaks a tie the one-line index cannot', () => {
  const dir = tmpBrain();
  const idx = new BrainIndex(dir);
  // Two memories with near-identical index lines; the ANSWER term lives only in
  // one body. Index scoring alone can't tell them apart; the re-rank must.
  save(idx, { name: 'Ledger notes A', id: 'led-a', summary: 'The ledger and its runs and actions.', tags: ['ledger', 'runs'], content: '# A\nGeneral notes about the ledger and runs and actions.', now: NOW });
  save(idx, { name: 'Ledger notes B', id: 'led-b', summary: 'The ledger and its runs and actions.', tags: ['ledger', 'runs'], content: '# B\nOn a crash mid-write the loader will truncate the torn final record.', now: NOW });
  const r = retrieve(idx, 'how does the ledger truncate a torn record on crash?');
  assert.equal(r.chosen.id, 'led-b', 'the body containing "truncate" wins despite equal index lines');
  fs.rmSync(dir, { recursive: true, force: true });
});
