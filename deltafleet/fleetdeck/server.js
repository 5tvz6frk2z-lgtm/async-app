// Fleet Deck HTTP server — the operator UI and JSON API over one spine file.
// Zero dependencies (node:http). The Deck is rebuilt when the spine file changes
// on disk, so a live agent appending events through Tollgate shows up in the deck
// without a restart.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Deck } from './lib/deck.js';
import { analyze, fetchSite } from './lib/agentready.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function startServer({ file, port = 7420, config }) {
  let deck = new Deck(file, config);
  let lastMtime = mtime(file);

  // Reflect external appends (a running agent writing the same spine) by rebuilding
  // the Deck when the file's mtime moves. Our own API writes update lastMtime so
  // they don't trigger a needless rebuild that would just reload what we hold.
  function ensureFresh() {
    const m = mtime(file);
    if (m !== lastMtime) { deck = new Deck(file, config); lastMtime = m; }
  }
  function markWritten() { lastMtime = mtime(file); }

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const route = url.pathname;

      if (req.method === 'GET' && (route === '/' || route === '/index.html')) {
        return sendFile(res, path.join(__dirname, 'ui', 'index.html'), 'text/html');
      }
      if (req.method === 'GET' && route === '/api/snapshot') {
        ensureFresh();
        return json(res, deck.snapshot({ limit: Number(url.searchParams.get('limit')) || 200 }));
      }
      if (req.method === 'GET' && route === '/api/timeline') {
        ensureFresh();
        const f = {};
        for (const k of ['agent', 'server', 'tool', 'kind']) if (url.searchParams.get(k)) f[k] = url.searchParams.get(k);
        if (url.searchParams.get('limit')) f.limit = Number(url.searchParams.get('limit'));
        f.reverse = true;
        return json(res, deck.recorder.timeline(f));
      }
      if (req.method === 'GET' && route === '/api/otel') {
        ensureFresh();
        return json(res, { semconv: (await import('./lib/recorder.js')).OTEL_SEMCONV, spans: deck.recorder.toOtelSpans() });
      }
      if (req.method === 'GET' && route === '/api/register') {
        ensureFresh();
        if (url.searchParams.get('pack')) deck.register.setPack(url.searchParams.get('pack'));
        if (url.searchParams.get('format') === 'csv') {
          const csv = deck.register.toCsv();
          res.writeHead(200, { 'content-type': 'text/csv', 'content-disposition': 'attachment; filename="ai-register.csv"' });
          return res.end(csv);
        }
        return json(res, deck.register.register());
      }
      if (req.method === 'GET' && route === '/api/monitor') {
        ensureFresh();
        const out = [];
        for (const mo of ['agent-ready', 'ai-register']) {
          const targets = [...new Set(deck.monitor.history(mo).map((c) => c.target))];
          for (const tgt of targets) {
            out.push({
              monitor: mo, target: tgt,
              latest: deck.monitor.latest(mo, tgt),
              worst: deck.monitor.worstSeverity(mo, tgt),
              trend: deck.monitor.trend(mo, tgt, mo === 'agent-ready' ? 'score' : 'gap'),
              alerts: deck.monitor.alerts(mo, tgt).slice(0, 8),
            });
          }
        }
        return json(res, out);
      }
      if (req.method === 'GET' && route === '/api/check') {
        const target = url.searchParams.get('url');
        if (!target) return json(res, { error: 'url query param required' }, 400);
        try { return json(res, analyze(await fetchSite(target))); }
        catch (err) { return json(res, { error: `could not fetch ${target}: ${err.message}` }, 502); }
      }
      if (req.method === 'POST' && (route === '/api/approve' || route === '/api/reject')) {
        ensureFresh();
        const body = await readJson(req);
        if (!body.ref || !body.by) return json(res, { error: 'ref and by are required' }, 400);
        try {
          const ev = deck.inbox[route === '/api/approve' ? 'approve' : 'reject'](body.ref, body.by, body.note);
          markWritten();
          return json(res, { ok: true, event: ev });
        } catch (err) { return json(res, { error: err.message }, 409); }
      }
      return json(res, { error: 'not found' }, 404);
    } catch (err) {
      return json(res, { error: err.message }, 500);
    }
  });

  server.listen(port, () => {
    console.log(`Fleet Deck → http://localhost:${port}  (spine: ${file})`);
  });
  return server;
}

function mtime(file) { try { return fs.statSync(file).mtimeMs; } catch { return 0; } }

function json(res, obj, status = 200) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) });
  res.end(body);
}

function sendFile(res, file, type) {
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'content-type': type });
    res.end(buf);
  });
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}
