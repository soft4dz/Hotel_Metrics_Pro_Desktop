import { randomUUID } from 'node:crypto';
import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { getActorContext, isGlobalAdminRole } from './actorContext';
import { assertPermission, userHasPermission } from './permissions.service';
import { logger } from '../utils/logger';

import { validateSyncApiUrl } from '../utils/syncUrl';
import { parseRemoteSyncChange, remoteWins, type RemoteSyncChange } from './sync-contract';

const DEFAULT_API = 'http://127.0.0.1:3847';

function resolveSyncApiKey(baseUrl: string): string {
  const configured = process.env.HMP_SYNC_API_KEY?.trim();
  if (configured) return configured;
  const host = new URL(baseUrl).hostname.toLowerCase();
  if (host === '127.0.0.1' || host === 'localhost' || host === '[::1]') {
    return 'dev-sync-key-change-me';
  }
  throw new Error('Clé HMP_SYNC_API_KEY obligatoire pour une synchronisation distante.');
}

function syncHeaders(baseUrl: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-HMP-API-Key': resolveSyncApiKey(baseUrl),
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
  openConflictCount: number;
  quarantinedCount: number;
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

export interface SyncConflictItem {
  id: number;
  entityType: string;
  entityUuid: string;
  remoteAction: string;
  resolution: string;
  reason: string;
  status: 'open' | 'resolved';
  createdAt: string;
  resolvedAt: string | null;
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
    (change_uuid, entity_type, entity_uuid, remote_action, local_updated_at, remote_updated_at, local_payload_json, remote_payload_json, resolution, reason)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(change.changeUuid, change.entityType, change.entityUuid, change.action, localUpdatedAt, change.updatedAt, localPayload ? JSON.stringify(localPayload) : null, JSON.stringify(change.payload), resolution, reason);
}

function applyRemoteChange(db: Db, change: RemoteSyncChange, forceRemote = false): 'applied' | 'conflict' | 'quarantined' {
  if (change.action === 'delete') {
    if (forceRemote) {
      const table = change.entityType === 'port_mouvement' ? 'port_mouvements' : 'port_relances';
      db.prepare(`DELETE FROM ${table} WHERE uuid=?`).run(change.entityUuid);
      return 'applied';
    }
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
    if (local && !forceRemote && !remoteWins(localAt, change.updatedAt)) {
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
    if (local && !forceRemote && !remoteWins(localAt, change.updatedAt)) {
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
  const openConflicts = db.prepare(`SELECT COUNT(*) AS c FROM sync_conflicts WHERE status='open'`).get() as { c: number };
  const quarantined = db.prepare(`SELECT COUNT(*) AS c FROM sync_inbox WHERE status='quarantined'`).get() as { c: number };

  return {
    online: false,
    pendingCount: pending.c,
    failedCount: failed.c,
    lastSyncAt: cfg.lastSyncAt,
    apiBaseUrl: cfg.apiBaseUrl,
    openConflictCount: openConflicts.c,
    quarantinedCount: quarantined.c,
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

export function retryFailedSync(actorUserId: number): number {
  const actor = assertSync(actorUserId);
  const result = getDatabase().prepare(`
    UPDATE sync_queue SET status='pending', attempts=0, error_message=NULL, processed_at=NULL
    WHERE status='failed'
  `).run();
  writeAuditLog({ userId: actor.userId, userEmail: actor.email, roleCode: actor.roleCode, action: 'UPDATE', module: 'sync', description: `Relance de ${result.changes} élément(s) en échec` });
  return result.changes;
}

export function listSyncConflicts(actorUserId: number): SyncConflictItem[] {
  assertSync(actorUserId);
  return (getDatabase().prepare(`
    SELECT id, entity_type, entity_uuid, remote_action, resolution, reason, status, created_at, resolved_at
    FROM sync_conflicts ORDER BY CASE status WHEN 'open' THEN 0 ELSE 1 END, id DESC LIMIT 200
  `).all() as Record<string, unknown>[]).map((row) => ({
    id: Number(row.id), entityType: String(row.entity_type), entityUuid: String(row.entity_uuid),
    remoteAction: String(row.remote_action), resolution: String(row.resolution), reason: String(row.reason),
    status: row.status as SyncConflictItem['status'], createdAt: String(row.created_at),
    resolvedAt: row.resolved_at ? String(row.resolved_at) : null,
  }));
}

function getSyncConflictById(db: Db, conflictId: number): SyncConflictItem {
  const row = db.prepare(`
    SELECT id, entity_type, entity_uuid, remote_action, resolution, reason, status, created_at, resolved_at
    FROM sync_conflicts WHERE id=?
  `).get(conflictId) as Record<string, unknown> | undefined;
  if (!row) throw new Error('Conflit introuvable après résolution.');
  return {
    id: Number(row.id), entityType: String(row.entity_type), entityUuid: String(row.entity_uuid),
    remoteAction: String(row.remote_action), resolution: String(row.resolution), reason: String(row.reason),
    status: row.status as SyncConflictItem['status'], createdAt: String(row.created_at),
    resolvedAt: row.resolved_at ? String(row.resolved_at) : null,
  };
}

export function resolveSyncConflict(actorUserId: number, conflictId: number, decision: 'keep_local' | 'apply_remote', note?: string): SyncConflictItem {
  const actor = assertSync(actorUserId);
  const db = getDatabase();
  const row = db.prepare(`SELECT * FROM sync_conflicts WHERE id=? AND status='open'`).get(conflictId) as Record<string, unknown> | undefined;
  if (!row) throw new Error('Conflit ouvert introuvable.');
  if (decision === 'apply_remote') {
    let payload: Record<string, unknown>;
    try { payload = JSON.parse(String(row.remote_payload_json)) as Record<string, unknown>; }
    catch { throw new Error('Payload distant invalide.'); }
    const change = parseRemoteSyncChange({
      changeUuid: String(row.change_uuid),
      sourceDeviceId: '00000000-0000-4000-8000-000000000000',
      entityType: String(row.entity_type), entityUuid: String(row.entity_uuid),
      action: String(row.remote_action), updatedAt: String(row.remote_updated_at), payload,
    });
    if (!change) throw new Error('Changement distant invalide ou non supporté.');
    db.transaction(() => {
      applyRemoteChange(db, change, true);
      db.prepare(`UPDATE sync_conflicts SET status='resolved', resolution='remote_wins', resolved_by=?, resolved_at=datetime('now'), resolution_note=? WHERE id=?`)
        .run(actorUserId, note?.trim() || null, conflictId);
    })();
  } else {
    db.prepare(`UPDATE sync_conflicts SET status='resolved', resolution='local_wins', resolved_by=?, resolved_at=datetime('now'), resolution_note=? WHERE id=?`)
      .run(actorUserId, note?.trim() || null, conflictId);
  }
  writeAuditLog({ userId: actor.userId, userEmail: actor.email, roleCode: actor.roleCode, action: 'UPDATE', module: 'sync', description: `Conflit sync #${conflictId} résolu : ${decision}` });
  return getSyncConflictById(db, conflictId);
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

async function runSyncInternal(actorUserId: number): Promise<SyncRunResult> {
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
        headers: syncHeaders(cfg.apiBaseUrl),
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
  let pullError: string | null = null;
  try {
    const cursorRow = db.prepare(`SELECT last_pull_cursor FROM sync_config WHERE id = 1`).get() as { last_pull_cursor: number };
    const res = await fetch(
      `${cfg.apiBaseUrl}/api/sync/pull?deviceId=${encodeURIComponent(cfg.deviceId)}&cursor=${cursorRow.last_pull_cursor}`,
      { headers: syncHeaders(cfg.apiBaseUrl), signal: AbortSignal.timeout(15000) },
    );
    if (!res.ok) throw new Error(`Pull HTTP ${res.status}`);
    {
      const body = (await res.json()) as { changes?: unknown[]; nextCursor?: number };
      const incoming = Array.isArray(body.changes) ? body.changes.slice(0, 100) : [];
      db.transaction(() => {
        for (const raw of incoming) {
          const change = parseRemoteSyncChange(raw);
          if (!change) {
            db.prepare(`INSERT INTO sync_inbox
              (change_uuid, source_device_id, entity_type, entity_uuid, action, remote_updated_at, payload_json, status, error_message, processed_at)
              VALUES (?, 'invalid', 'invalid', '', 'update', datetime('now'), ?, 'quarantined', 'Invalid remote sync contract', datetime('now'))`)
              .run(randomUUID(), JSON.stringify(raw));
            quarantined++;
            continue;
          }
          if (change.sourceDeviceId === cfg.deviceId) continue;
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
  } catch (err) {
    pullError = err instanceof Error ? err.message : 'Erreur pull';
    failed++;
  }

  if (!pullError) {
    db.prepare(`UPDATE sync_config SET last_sync_at = datetime('now'), updated_at = datetime('now') WHERE id = 1`).run();
  }

  db.prepare(
    `INSERT INTO sync_log (direction, status, message, items_count) VALUES ('full', ?, ?, ?)`,
  ).run(
    pullError ? 'error' : failed ? 'partial' : 'ok',
    `Push ${pushed}, pull ${pulled}, conflits ${conflicts}, quarantaine ${quarantined}${pullError ? `, erreur ${pullError}` : ''}`,
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
    message: pullError
      ? `Synchronisation partielle : ${pushed} envoyé(s), lecture distante échouée (${pullError}).`
      : `Synchronisation terminée : ${pushed} envoyé(s), ${pulled} appliqué(s), ${conflicts} conflit(s), ${quarantined} en quarantaine.`,
  };
}

let syncRunPromise: Promise<SyncRunResult> | null = null;

/** Sérialise les synchronisations manuelles et automatiques pour éviter les doubles envois. */
export function runSync(actorUserId: number): Promise<SyncRunResult> {
  if (syncRunPromise) return syncRunPromise;
  syncRunPromise = runSyncInternal(actorUserId).finally(() => {
    syncRunPromise = null;
  });
  return syncRunPromise;
}

let automaticSyncStarted = false;
let automaticSyncRunning = false;

export function startAutomaticSyncScheduler(): void {
  if (automaticSyncStarted) return;
  automaticSyncStarted = true;
  const cycle = async () => {
    if (automaticSyncRunning) return;
    const cfg = ensureConfig();
    if (!cfg.autoSync) return;
    const actor = getDatabase().prepare(`
      SELECT DISTINCT u.id FROM users u
      JOIN roles r ON r.id=u.role_id
      LEFT JOIN role_permissions rp ON rp.role_id=r.id
      LEFT JOIN permissions p ON p.id=rp.permission_id AND p.code='sync.full'
      WHERE u.is_active=1 AND u.deleted_at IS NULL
        AND (r.code IN ('SUPERADMIN','ADMIN_DEC') OR p.id IS NOT NULL)
      ORDER BY u.id LIMIT 1
    `).get() as { id: number } | undefined;
    if (!actor) return;
    automaticSyncRunning = true;
    try { await runSync(actor.id); }
    catch (err) { logger.error('Synchronisation automatique', err); }
    finally { automaticSyncRunning = false; }
  };
  setInterval(() => { void cycle(); }, 5 * 60 * 1000);
}
