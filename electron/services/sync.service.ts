import { randomUUID } from 'node:crypto';
import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { getActorContext, isGlobalAdminRole } from './actorContext';
import { assertPermission, userHasPermission } from './permissions.service';

import { validateSyncApiUrl } from '../utils/syncUrl';
import { parseRemoteSyncChange, remoteWins, type RemoteSyncChange } from './sync-contract';

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
  conflicts: number;
  quarantined: number;
  message: string;
}

type Db = ReturnType<typeof getDatabase>;

function idByUuid(db: Db, table: 'port_bateaux' | 'port_emplacements' | 'port_clients' | 'port_factures' | 'port_contrats', uuid: unknown): number | null {
  if (uuid == null) return null;
  const row = db.prepare(`SELECT id FROM ${table} WHERE uuid = ? AND deleted_at IS NULL`).get(uuid) as { id: number } | undefined;
  return row?.id ?? null;
}

function recordConflict(db: Db, change: RemoteSyncChange, localUpdatedAt: string | null, resolution: 'local_wins' | 'remote_wins' | 'quarantined', reason: string, localPayload: unknown = null): void {
  db.prepare(`INSERT OR IGNORE INTO sync_conflicts
    (change_uuid, entity_type, entity_uuid, local_updated_at, remote_updated_at, local_payload_json, remote_payload_json, resolution, reason)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(change.changeUuid, change.entityType, change.entityUuid, localUpdatedAt, change.updatedAt, localPayload ? JSON.stringify(localPayload) : null, JSON.stringify(change.payload), resolution, reason);
}

function applyRemoteChange(db: Db, change: RemoteSyncChange): 'applied' | 'conflict' | 'quarantined' {
  if (change.action === 'delete') {
    recordConflict(db, change, null, 'quarantined', 'Remote deletes require manual approval');
    return 'quarantined';
  }
  const p = change.payload;
  if (change.entityType === 'port_mouvement') {
    const bateauId = idByUuid(db, 'port_bateaux', p.bateauUuid);
    const fromId = idByUuid(db, 'port_emplacements', p.emplacementFromUuid);
    const toId = idByUuid(db, 'port_emplacements', p.emplacementToUuid);
    if (!bateauId || (p.emplacementFromUuid && !fromId) || (p.emplacementToUuid && !toId)) {
      recordConflict(db, change, null, 'quarantined', 'Missing parent UUID');
      return 'quarantined';
    }
    const local = db.prepare(`SELECT id, updated_at, created_at FROM port_mouvements WHERE uuid = ?`).get(change.entityUuid) as { id: number; updated_at: string | null; created_at: string } | undefined;
    const localAt = local?.updated_at ?? local?.created_at ?? null;
    if (local && !remoteWins(localAt, change.updatedAt)) {
      recordConflict(db, change, localAt, 'local_wins', 'Local record is newer or equal');
      return 'conflict';
    }
    db.prepare(`INSERT INTO port_mouvements (uuid, bateau_id, type_mouvement, emplacement_from_id, emplacement_to_id, date_mouvement, motif, statut, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(uuid) DO UPDATE SET bateau_id=excluded.bateau_id, type_mouvement=excluded.type_mouvement,
      emplacement_from_id=excluded.emplacement_from_id, emplacement_to_id=excluded.emplacement_to_id,
      date_mouvement=excluded.date_mouvement, motif=excluded.motif, statut=excluded.statut, updated_at=excluded.updated_at`)
      .run(change.entityUuid, bateauId, p.typeMouvement, fromId, toId, p.dateMouvement, p.motif ?? null, p.statut ?? 'valide', change.updatedAt);
  } else {
    const clientId = idByUuid(db, 'port_clients', p.clientUuid);
    const factureId = idByUuid(db, 'port_factures', p.factureUuid);
    const contratId = idByUuid(db, 'port_contrats', p.contratUuid);
    if ((p.clientUuid && !clientId) || (p.factureUuid && !factureId) || (p.contratUuid && !contratId)) {
      recordConflict(db, change, null, 'quarantined', 'Missing parent UUID');
      return 'quarantined';
    }
    const local = db.prepare(`SELECT id, updated_at, created_at FROM port_relances WHERE uuid = ?`).get(change.entityUuid) as { id: number; updated_at: string | null; created_at: string } | undefined;
    const localAt = local?.updated_at ?? local?.created_at ?? null;
    if (local && !remoteWins(localAt, change.updatedAt)) {
      recordConflict(db, change, localAt, 'local_wins', 'Local record is newer or equal');
      return 'conflict';
    }
    db.prepare(`INSERT INTO port_relances (uuid, client_id, facture_id, contrat_id, type_relance, niveau, date_relance, commentaire, statut, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(uuid) DO UPDATE SET client_id=excluded.client_id, facture_id=excluded.facture_id,
      contrat_id=excluded.contrat_id, type_relance=excluded.type_relance, niveau=excluded.niveau,
      date_relance=excluded.date_relance, commentaire=excluded.commentaire, statut=excluded.statut, updated_at=excluded.updated_at`)
      .run(change.entityUuid, clientId, factureId, contratId, p.typeRelance, p.niveau, p.dateRelance, p.commentaire ?? null, p.statut ?? 'planifiee', change.updatedAt);
  }
  if (change.action === 'update') recordConflict(db, change, null, 'remote_wins', 'Remote record is newer');
  return 'applied';
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
      conflicts: 0,
      quarantined: 0,
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
      const body = (await res.json()) as { accepted?: number; acceptedUuids?: string[] };
      const acceptedSet = Array.isArray(body.acceptedUuids) ? new Set(body.acceptedUuids) : null;
      for (let i = 0; i < pending.length; i++) {
        const p = pending[i]!;
        const accepted = acceptedSet ? acceptedSet.has(p.uuid) : i < Math.min(body.accepted ?? pending.length, pending.length);
        if (!accepted) {
          db.prepare(`UPDATE sync_queue SET status = 'failed', error_message = 'Rejected by sync API', attempts = attempts + 1 WHERE id = ?`).run(p.id);
          failed++;
          continue;
        }
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

  let pulled = 0;
  let conflicts = 0;
  let quarantined = 0;
  try {
    const cursorRow = db.prepare(`SELECT last_pull_cursor FROM sync_config WHERE id = 1`).get() as { last_pull_cursor: number };
    const res = await fetch(
      `${cfg.apiBaseUrl}/api/sync/pull?deviceId=${encodeURIComponent(cfg.deviceId)}&cursor=${cursorRow.last_pull_cursor}`,
      { headers: syncHeaders(), signal: AbortSignal.timeout(15000) },
    );
    if (res.ok) {
      const body = (await res.json()) as { changes?: unknown[]; nextCursor?: number };
      const incoming = Array.isArray(body.changes) ? body.changes.slice(0, 100) : [];
      db.transaction(() => {
        for (const raw of incoming) {
          const change = parseRemoteSyncChange(raw);
          if (!change || change.sourceDeviceId === cfg.deviceId) continue;
          const inserted = db.prepare(`INSERT OR IGNORE INTO sync_inbox
            (change_uuid, source_device_id, entity_type, entity_uuid, action, remote_updated_at, payload_json)
            VALUES (?, ?, ?, ?, ?, ?, ?)`)
            .run(change.changeUuid, change.sourceDeviceId, change.entityType, change.entityUuid, change.action, change.updatedAt, JSON.stringify(change.payload));
          if (!inserted.changes) continue;
          const outcome = applyRemoteChange(db, change);
          db.prepare(`UPDATE sync_inbox SET status = ?, processed_at = datetime('now') WHERE change_uuid = ?`).run(outcome, change.changeUuid);
          if (outcome === 'applied') pulled++;
          else if (outcome === 'conflict') conflicts++;
          else quarantined++;
        }
        if (Number.isSafeInteger(body.nextCursor) && body.nextCursor! >= cursorRow.last_pull_cursor) {
          db.prepare(`UPDATE sync_config SET last_pull_cursor = ? WHERE id = 1`).run(body.nextCursor);
        }
      })();
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
    `Push ${pushed}, pull ${pulled}, conflits ${conflicts}, quarantaine ${quarantined}`,
    pushed + pulled + conflicts + quarantined,
  );

  writeAuditLog({
    userId: actor.userId,
    userEmail: actor.email,
    roleCode: actor.roleCode,
    action: 'SYNC',
    module: 'sync',
    page: 'SyncPage',
    description: `Synchronisation : ${pushed} envoyé(s), ${pulled} appliqué(s), ${conflicts} conflit(s), ${quarantined} en quarantaine`,
  });

  return {
    pushed,
    pulled,
    failed,
    conflicts,
    quarantined,
    message: `Synchronisation terminée : ${pushed} envoyé(s), ${pulled} appliqué(s), ${conflicts} conflit(s), ${quarantined} en quarantaine.`,
  };
}
