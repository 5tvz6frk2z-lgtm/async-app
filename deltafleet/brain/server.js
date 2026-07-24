// Cortex server — the interactive UI + a tiny JSON API over the deterministic
// retrieval core. Zero dependencies (node:http). The index is loaded once and
// kept live across saves, so retrieval is sub-millisecond and the UI never waits.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BrainIndex } from './lib/index.js';
import { retrieve, rankCandidates } from './lib/retrieve.js';
import { save, remove, reindex } from './lib/store.js';
import { runBench, defaultScenarios } from './lib/bench.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const DIR = process.env.BRAIN_DIR || here;
const PORT = Number(process.env.PORT || 4700);
const index = new BrainIndex(DIR);

const json = (res, code, body) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
const readBody = (req) => new Promise((resolve, reject) => { let d = ''; req.on('data', (c) => { d += c; if (d.length > 4e6) req.destroy(); }); req.on('end', () => { try { resolve(d ? JSON.parse(d) : {}); } catch (e) { reject(new Error('bad JSON')); } }); });

function memoryBody(id) {
  const e = index.get(id);
  if (!e) return null;
  const full = path.join(DIR, e.file);
  return { ...e, _name: undefined, _tags: undefined, _sum: undefined, _all: undefined, content: fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : '' };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(fs.readFileSync(path.join(here, 'ui', 'index.html')));
      return;
    }
    if (req.method === 'GET' && url.pathname === '/api/ask') {
      const q = url.searchParams.get('q') || '';
      if (!q.trim()) return json(res, 200, { question: q, candidates: [], evidence: '', tokens: 0 });
      return json(res, 200, retrieve(index, q, { followPointer: url.searchParams.get('pointer') !== '0' }));
    }
    if (req.method === 'GET' && url.pathname === '/api/rank') {
      // instant, index-only candidate list for as-you-type search (no files opened)
      return json(res, 200, rankCandidates(index, url.searchParams.get('q') || '', { limit: 12 }));
    }
    if (req.method === 'GET' && url.pathname === '/api/index') {
      return json(res, 200, { count: index.all().length, entries: index.all().map((e) => ({ id: e.id, name: e.name, tags: e.tags, summary: e.summary, pointers: e.pointers, updated: e.updated })) });
    }
    if (req.method === 'GET' && url.pathname === '/api/memory') {
      const m = memoryBody(url.searchParams.get('id'));
      return m ? json(res, 200, m) : json(res, 404, { error: 'no such memory' });
    }
    if (req.method === 'POST' && url.pathname === '/api/save') {
      const b = await readBody(req);
      const e = save(index, { id: b.id, name: b.name, summary: b.summary || '', tags: b.tags || [], pointers: b.pointers || [], content: b.content || '' });
      return json(res, 200, { ok: true, entry: { id: e.id, name: e.name } });
    }
    if (req.method === 'POST' && url.pathname === '/api/rm') {
      const b = await readBody(req);
      return json(res, 200, { ok: remove(index, b.id) });
    }
    if (req.method === 'POST' && url.pathname === '/api/reindex') {
      return json(res, 200, { ok: true, count: reindex(index) });
    }
    if (req.method === 'GET' && url.pathname === '/api/bench') {
      const scenPath = path.join(DIR, 'bench.json');
      const scenarios = fs.existsSync(scenPath) ? JSON.parse(fs.readFileSync(scenPath, 'utf8')) : defaultScenarios(index);
      return json(res, 200, runBench(index, scenarios, { dir: DIR }));
    }
    res.writeHead(404); res.end('not found');
  } catch (err) {
    json(res, 500, { error: err.message });
  }
});

server.listen(PORT, () => console.log(`Cortex — second brain on http://localhost:${PORT}  (${index.all().length} memories, dir ${DIR})`));
