/** API centrale de développement pour la synchronisation multi-postes. */
import http from 'node:http';
import { timingSafeEqual } from 'node:crypto';

const PORT = Number(process.env.HMP_API_PORT || 3847);
const API_KEY = process.env.HMP_SYNC_API_KEY?.trim() || 'dev-sync-key-change-me';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const entities = new Set(['port_mouvement', 'port_relance']);
const actions = new Set(['create', 'update', 'delete']);
const changes = [];
const knownChanges = new Set();
let sequence = 0;

function json(res, status, body) {
  if (res.writableEnded) return;
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

function isAuthorized(req) {
  const supplied = req.headers['x-hmp-api-key'];
  if (typeof supplied !== 'string') return false;
  const a = Buffer.from(supplied);
  const b = Buffer.from(API_KEY);
  return a.length === b.length && timingSafeEqual(a, b);
}

function validItem(item) {
  return item && typeof item === 'object' && UUID_RE.test(item.uuid) &&
    entities.has(item.entityType) && actions.has(item.action) && item.payload &&
    typeof item.payload === 'object' && UUID_RE.test(item.payload.uuid) &&
    typeof item.payload.updatedAt === 'string' && !Number.isNaN(Date.parse(item.payload.updatedAt));
}

function readJson(req, res, handler) {
  let body = '';
  let tooLarge = false;
  req.on('data', (chunk) => {
    if (tooLarge) return;
    body += chunk;
    if (Buffer.byteLength(body) > 1_000_000) {
      tooLarge = true;
      json(res, 413, { error: 'Payload too large' });
    }
  });
  req.on('end', () => {
    if (tooLarge) return;
    try { handler(JSON.parse(body || '{}')); }
    catch { json(res, 400, { error: 'Invalid JSON' }); }
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://127.0.0.1:${PORT}`);
  if (req.method === 'GET' && url.pathname === '/api/health') {
    return json(res, 200, { ok: true, service: 'raqmi-system-sync-api', version: '0.9.0' });
  }
  if (!isAuthorized(req)) return json(res, 401, { error: 'Unauthorized' });

  if (req.method === 'POST' && url.pathname === '/api/sync/push') {
    return readJson(req, res, (data) => {
      if (!UUID_RE.test(data.deviceId) || !Array.isArray(data.items) || data.items.length > 100) {
        return json(res, 400, { error: 'Invalid sync envelope' });
      }
      const rejected = [];
      const acceptedUuids = [];
      let accepted = 0;
      for (const item of data.items) {
        if (!validItem(item)) { rejected.push(item?.uuid ?? null); continue; }
        if (knownChanges.has(item.uuid)) { accepted++; acceptedUuids.push(item.uuid); continue; }
        const change = {
          changeUuid: item.uuid,
          sourceDeviceId: data.deviceId,
          entityType: item.entityType,
          entityUuid: item.payload.uuid,
          action: item.action,
          updatedAt: item.payload.updatedAt,
          payload: item.payload,
          sequence: ++sequence,
        };
        knownChanges.add(item.uuid);
        changes.push(change);
        accepted++;
        acceptedUuids.push(item.uuid);
      }
      json(res, 200, { accepted, acceptedUuids, rejected, totalStored: changes.length });
    });
  }

  if (req.method === 'GET' && url.pathname === '/api/sync/pull') {
    const deviceId = url.searchParams.get('deviceId') || '';
    const cursor = Number(url.searchParams.get('cursor') || 0);
    if (!UUID_RE.test(deviceId) || !Number.isSafeInteger(cursor) || cursor < 0) return json(res, 400, { error: 'Invalid cursor' });
    const selected = changes.filter((c) => c.sequence > cursor && c.sourceDeviceId !== deviceId).slice(0, 100);
    const nextCursor = selected.length ? selected[selected.length - 1].sequence : sequence;
    return json(res, 200, { changes: selected, nextCursor, hasMore: changes.some((c) => c.sequence > nextCursor) });
  }
  json(res, 404, { error: 'Not found' });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Raqmi System Sync API — http://127.0.0.1:${PORT}`);
});
