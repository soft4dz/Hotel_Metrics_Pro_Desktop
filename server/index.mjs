/**
 * API centrale minimale — Phase 8 (développement / tests sync)
 * Démarrage : HMP_SYNC_API_KEY=<secret> npm run server:dev
 * Auth : en-tête X-HMP-API-Key (variable HMP_SYNC_API_KEY obligatoire)
 */
import http from 'node:http';
import { timingSafeEqual } from 'node:crypto';

const PORT = Number(process.env.HMP_API_PORT || 3847);
const API_KEY = process.env.HMP_SYNC_API_KEY?.trim() ?? '';
const received = [];

if (API_KEY.length < 32 || API_KEY === 'dev-sync-key-change-me') {
  console.error(
    'HMP_SYNC_API_KEY est obligatoire et doit contenir au moins 32 caractères non publics.',
  );
  process.exit(1);
}

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function constantTimeEquals(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function isAuthorized(req) {
  const key = req.headers['x-hmp-api-key'];
  return typeof key === 'string' && constantTimeEquals(key, API_KEY);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://127.0.0.1:${PORT}`);

  if (req.method === 'GET' && url.pathname === '/api/health') {
    return json(res, 200, { ok: true, service: 'hotel-metrics-api-stub', version: '0.8.0' });
  }

  if (!isAuthorized(req)) {
    return json(res, 401, { error: 'Unauthorized' });
  }

  if (req.method === 'POST' && url.pathname === '/api/sync/push') {
    let body = '';
    let rejected = false;
    req.on('data', (chunk) => {
      if (rejected) return;
      body += chunk;
      if (body.length > 5_000_000) {
        rejected = true;
        json(res, 413, { error: 'Payload too large' });
        req.destroy();
      }
    });
    req.on('end', () => {
      if (rejected) return;
      try {
        const data = JSON.parse(body || '{}');
        const items = Array.isArray(data.items) ? data.items : [];
        received.push(...items);
        json(res, 200, { accepted: items.length, totalStored: received.length });
      } catch {
        json(res, 400, { error: 'Invalid JSON' });
      }
    });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/sync/pull') {
    return json(res, 200, { changes: [] });
  }

  json(res, 404, { error: 'Not found' });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Raqmi System API stub — http://127.0.0.1:${PORT}`);
  console.log('  GET  /api/health (public)');
  console.log('  POST /api/sync/push (auth required)');
  console.log('  GET  /api/sync/pull (auth required)');
});
