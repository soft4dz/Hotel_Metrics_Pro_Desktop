import { randomUUID } from 'node:crypto';
import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { getActorContext, isGlobalAdminRole } from './actorContext';
import { assertPermission, userHasPermission } from './permissions.service';

import { validateSyncApiUrl } from '../utils/syncUrl';

const DEFAULT_API = 'http://127.0.0.1:3847';

function resolveSyncApiKey(): string {
  return process.env.HMP_SYNC_API_KEY?.trim() || 'dev-sync-key-change-me';
}

function syncHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-HMP-API-Key': resolveSyncApiKey(),
  };
}

export interface SyncConfigDto {
  apiBaseUrl: string;
  deviceId: string;
  lastSyncAt: string | null;
  autoSync: boolean;
}

export interface SyncStatusDto {
  online: boolean;
  pendingCount: number;
  failedCount: number;
  lastSyncAt: string | null;
  apiBaseUrl: string;
}

export interface SyncQueueItem {
  id: number;
  entityType: string;
  action: string;
  status: string;
  attempts: number;
  errorMessage: string | null;
  createdAt: string;
}

export interface SyncRunResult {
  pushed: number;
  pulled: number;
  failed: number;
  message: string;
}

function assertSync(actorUserId: number) {
  const actor = getActorContext(actorUserId);
  if (userHasPermission(actorUserId, 'sync.full') || isGlobalAdminRole(actor.roleCode)) {
    return actor;
  }
  assertPermission(actorUserId, 'sync.full');
  return actor;
}

function ensureConfig(): SyncConfigDto {
  const db = getDatabase();
  let row = db.prepare(`SELECT * FROM sync_config WHERE id = 1`).get() as
    | {
        api_base_url: string;
        device_id: string;
        last_sync_at: string | null;
        auto_sync: number;
      }
    | undefined;

  if (!row) {
    const deviceId = randomUUID();
    db.prepare(
      `INSERT INTO sync_config (id, api_base_url, device_id, auto_sync) VALUES (1, ?, ?, 0)`,
    ).run(DEFAULT_API, deviceId);
    row = db.prepare(`SELECT * FROM sync_config WHERE id = 1`).get() as typeof row;
  }

  return {
    apiBaseUrl: row!.api_base_url,
    deviceId: row!.device_id,
    lastSyncAt: row!.last_sync_at,
    autoSync: Boolean(row!.auto_sync),
  };
}

export function getSyncConfig(actorUserId: number): SyncConfigDto {
  assertSync(actorUserId);
  return ensureConfig();
}

export function updateSyncConfig(
  actorUserId: number,
  input: { apiBaseUrl?: string; autoSync?: boolean },
): SyncConfigDto {
  const actor = assertSync(actorUserId);
  ensureConfig();
  const db = getDatabase();
  if (input.apiBaseUrl !== undefined) {
    const url = validateSyncApiUrl(input.apiBaseUrl, !process.env.NODE_ENV || process.env.NODE_ENV === 'development');
    db.prepare(
      `UPDATE sync_config SET api_base_url = ?, updated_at = datetime('now') WHERE id = 1`,
    ).run(url);
  }
  if (input.autoSync !== undefined) {
    db.prepare(
      `UPDATE sync_config SET auto_sync = ?, updated_at = datetime('now') WHERE id = 1`,
    ).run(input.autoSync ? 1 : 0);
  }
  writeAuditLog({
    userId: actor.userId,
    userEmail: actor.email,
    roleCode: actor.roleCode,
    action: 'UPDATE',
    module: 'sync',
    page: 'SyncPage',
    description: 'Configuration synchronisation',
  });
  return ensureConfig();
}

export function getSyncStatus(actorUserId: number): SyncStatusDto {
  assertSync(actorUserId);
  const cfg = ensureConfig();
  const db = getDatabase();
  const pending = db
    .prepare(`SELECT COUNT(*) AS c FROM sync_queue WHERE status = 'pending'`)
    .get() as { c: number };
  const failed = db
    .prepare(`SELECT COUNT(*) AS c FROM sync_queue WHERE status = 'failed'`)
    .get() as { c: number };

  return {
    online: false,
    pendingCount: pending.c,
    failedCount: failed.c,
    lastSyncAt: cfg.lastSyncAt,
    apiBaseUrl: cfg.apiBaseUrl,
  };
}

export function listSyncQueue(actorUserId: number, limit = 50): SyncQueueItem[] {
  assertSync(actorUserId);
  const rows = getDatabase()
    .prepare(
      `
    SELECT id, entity_type, action, status, attempts, error_message, created_at
    FROM sync_queue
    ORDER BY id DESC
    LIMIT ?
  `,
    )
    .all(limit) as Array<{
      id: number;
      entity_type: string;
      action: string;
      status: string;
      attempts: number;
      error_message: string | null;
      created_at: string;
    }>;

  return rows.map((r) => ({
    id: r.id,
    entityType: r.entity_type,
    action: r.action,
    status: r.status,
    attempts: r.attempts,
    errorMessage: r.error_message,
    createdAt: r.created_at,
  }));
}

export function enqueueSync(
  entityType: string,
  action: string,
  entityId: number | null,
  payload: Record<string, unknown>,
): void {
  const db = getDatabase();
  db.prepare(
    `
    INSERT INTO sync_queue (uuid, entity_type, entity_id, action, payload_json, status)
    VALUES (?, ?, ?, ?, ?, 'pending')
  `,
  ).run(randomUUID(), entityType, entityId, action, JSON.stringify(payload));
}

async function pingApi(baseUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl}/api/health`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return false;
    const body = (await res.json()) as { ok?: boolean };
    return Boolean(body.ok);
  } catch {
    return false;
  }
}

export async function checkSyncOnline(actorUserId: number): Promise<boolean> {
  const cfg = ensureConfig();
  assertSync(actorUserId);
  return pingApi(cfg.apiBaseUrl);
}

export async function runSync(actorUserId: number): Promise<SyncRunResult> {
  const actor = assertSync(actorUserId);
  const cfg = ensureConfig();
  const db = getDatabase();

  const online = await pingApi(cfg.apiBaseUrl);
  if (!online) {
    db.prepare(
      `INSERT INTO sync_log (direction, status, message, items_count) VALUES ('push', 'error', ?, 0)`,
    ).run('API centrale injoignable');
    return {
      pushed: 0,
      pulled: 0,
      failed: 0,
      message: 'API centrale injoignable. Vérifiez l\'URL et démarrez le serveur (npm run server:dev).',
    };
  }

  const pending = db
    .prepare(
      `SELECT id, uuid, entity_type, entity_id, action, payload_json, attempts
       FROM sync_queue WHERE status IN ('pending', 'failed') AND attempts < 5
       ORDER BY id ASC LIMIT 100`,
    )
    .all() as Array<{
      id: number;
      uuid: string;
      entity_type: string;
      entity_id: number | null;
      action: string;
      payload_json: string;
      attempts: number;
    }>;

  let pushed = 0;
  let failed = 0;

  if (pending.length > 0) {
    try {
      const res = await fetch(`${cfg.apiBaseUrl}/api/sync/push`, {
        method: 'POST',
        headers: syncHeaders(),
        body: JSON.stringify({
          deviceId: cfg.deviceId,
          items: pending.map((p) => ({
            uuid: p.uuid,
            entityType: p.entity_type,
            entityId: p.entity_id,
            action: p.action,
            payload: JSON.parse(p.payload_json),
          })),
        }),
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as { accepted?: number };
      const accepted = body.accepted ?? pending.length;
      for (let i = 0; i < Math.min(accepted, pending.length); i++) {
        const p = pending[i]!;
        db.prepare(
          `UPDATE sync_queue SET status = 'synced', processed_at = datetime('now'), attempts = attempts + 1 WHERE id = ?`,
        ).run(p.id);
        pushed++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur push';
      for (const p of pending) {
        db.prepare(
          `UPDATE sync_queue SET status = 'failed', error_message = ?, attempts = attempts + 1 WHERE id = ?`,
        ).run(msg, p.id);
        failed++;
      }
    }
  }

  // Le pull récupère les changements distants mais ne les applique PAS encore à la base
  // locale : les entités référencées (bateaux, clients, factures, contrats...) ne sont pas
  // elles-mêmes synchronisées par uuid, donc appliquer port_mouvements/port_relances distants
  // en réutilisant leurs ids numériques risquerait de rattacher un enregistrement au mauvais
  // bateau/client local. Tant que cette synchronisation des entités parentes n'existe pas,
  // `pulled` ne doit être présenté que comme "détecté côté serveur", jamais "appliqué".
  let pulled = 0;
  try {
    const res = await fetch(
      `${cfg.apiBaseUrl}/api/sync/pull?deviceId=${encodeURIComponent(cfg.deviceId)}`,
      { headers: syncHeaders(), signal: AbortSignal.timeout(15000) },
    );
    if (res.ok) {
      const body = (await res.json()) as { changes?: unknown[] };
      pulled = body.changes?.length ?? 0;
    }
  } catch {
    /* pull best-effort : une erreur réseau ici n'empêche pas le push d'avoir réussi */
  }

  db.prepare(
    `UPDATE sync_config SET last_sync_at = datetime('now'), updated_at = datetime('now') WHERE id = 1`,
  ).run();

  db.prepare(
    `INSERT INTO sync_log (direction, status, message, items_count) VALUES ('full', 'ok', ?, ?)`,
  ).run(
    `Push ${pushed}, pull ${pulled} détecté(s) (non appliqué)`,
    pushed + pulled,
  );

  writeAuditLog({
    userId: actor.userId,
    userEmail: actor.email,
    roleCode: actor.roleCode,
    action: 'SYNC',
    module: 'sync',
    page: 'SyncPage',
    description: `Synchronisation : ${pushed} envoyé(s), ${pulled} détecté(s) côté serveur (non appliqué localement)`,
  });

  return {
    pushed,
    pulled,
    failed,
    message:
      pulled > 0
        ? `${pushed} élément(s) envoyé(s). ${pulled} changement(s) distant(s) détecté(s) mais non appliqué(s) localement — la synchronisation descendante n'est pas encore disponible.`
        : pushed > 0
          ? `Synchronisation terminée (${pushed} envoyé(s)).`
          : 'Aucun élément en attente — connexion API OK.',
  };
}
