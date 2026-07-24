import { createRequire } from 'node:module';
import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { emitErpEvent } from './event-bus.service';
import { importPunches, listPointeuses, type ImportPunchRow } from './rh-pointeuse.service';
import { logger } from '../utils/logger';

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ZKLib = require('node-zklib') as new (ip: string, port: number, timeout: number, inport: number) => {
  createSocket(): Promise<void>;
  getAttendances(): Promise<{ data: Array<{ deviceUserId?: string; userId?: number; recordTime?: string | Date }> }>;
  disconnect(): Promise<void>;
};

function formatPunchTime(raw: string | Date): string {
  const d = raw instanceof Date ? raw : new Date(raw);
  if (Number.isNaN(d.getTime())) return String(raw).slice(0, 16).replace('T', ' ');
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function mapZkLogs(logs: Array<{ deviceUserId?: string; userId?: number; recordTime?: string | Date }>): ImportPunchRow[] {
  return logs.map((log) => ({
    badgeId: String(log.deviceUserId ?? log.userId ?? ''),
    punchAt: log.recordTime ? formatPunchTime(log.recordTime) : new Date().toISOString().slice(0, 16).replace('T', ' '),
    typePunch: 'autre' as const,
  })).filter((r) => r.badgeId.length > 0);
}

export async function syncPointeuseNow(actorUserId: number, pointeuseId: number): Promise<{ imported: number; duplicates: number; ok: boolean; message: string }> {
  const db = getDatabase();
  const p = db.prepare(`SELECT * FROM rh_pointeuses WHERE id = ? AND actif = 1`).get(pointeuseId) as Record<string, unknown> | undefined;
  if (!p) throw new Error('Pointeuse introuvable ou inactive.');
  const ip = p.adresse_ip as string | null;
  if (!ip) throw new Error('Adresse IP requise pour sync temps réel.');

  const hotelId = p.hotel_id as number;
  const port = (p.port as number) ?? 4370;
  let zk: InstanceType<typeof ZKLib> | null = null;

  try {
    zk = new ZKLib(ip, port, 10000, 5200);
    await zk.createSocket();
    const result = await zk.getAttendances();
    const rows = mapZkLogs(result?.data ?? []);
    const imported = importPunches(actorUserId, hotelId, rows, pointeuseId);
    db.prepare(`
      UPDATE rh_pointeuses SET derniere_sync = datetime('now'), dernier_sync_statut = 'ok',
        dernier_sync_message = ? WHERE id = ?
    `).run(`${imported.imported} importé(s)`, pointeuseId);
    emitErpEvent({
      type: 'POINTEUSE_SYNCED',
      entiteType: 'rh_pointeuse',
      entiteId: pointeuseId,
      data: { ...imported, ip },
    });
    writeAuditLog({ userId: actorUserId, action: 'SYNC', module: 'rh', description: `Sync pointeuse ${p.nom} : ${imported.imported} pointage(s)` });
    return { ...imported, ok: true, message: `${imported.imported} pointage(s) synchronisé(s)` };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    db.prepare(`
      UPDATE rh_pointeuses SET dernier_sync = datetime('now'), dernier_sync_statut = 'erreur',
        dernier_sync_message = ? WHERE id = ?
    `).run(message.slice(0, 200), pointeuseId);
    logger.error(`Sync pointeuse ${pointeuseId} failed`, err);
    return { imported: 0, duplicates: 0, ok: false, message };
  } finally {
    try {
      await zk?.disconnect();
    } catch {
      /* ignore */
    }
  }
}

export function setPointeuseSyncAuto(actorUserId: number, pointeuseId: number, syncAuto: boolean, intervalMin?: number): void {
  getDatabase().prepare(`
    UPDATE rh_pointeuses SET sync_auto = ?, sync_interval_min = COALESCE(?, sync_interval_min) WHERE id = ?
  `).run(syncAuto ? 1 : 0, intervalMin ?? null, pointeuseId);
  writeAuditLog({
    userId: actorUserId,
    action: 'UPDATE',
    module: 'rh',
    description: `Sync auto pointeuse #${pointeuseId} : ${syncAuto ? 'ON' : 'OFF'}`,
  });
}

export async function runPointeuseSyncCycle(actorUserId = 1): Promise<void> {
  const db = getDatabase();
  const devices = db.prepare(`
    SELECT id FROM rh_pointeuses WHERE actif = 1 AND sync_auto = 1 AND adresse_ip IS NOT NULL AND adresse_ip != ''
  `).all() as { id: number }[];
  for (const d of devices) {
    try {
      await syncPointeuseNow(actorUserId, d.id);
    } catch (err) {
      logger.error(`Pointeuse sync cycle #${d.id}`, err);
    }
  }
}

export function listPointeusesWithSync(hotelId: number) {
  return listPointeuses(hotelId).map((p) => {
    const row = getDatabase().prepare(`SELECT sync_auto, sync_interval_min, dernier_sync_statut, dernier_sync_message FROM rh_pointeuses WHERE id = ?`).get(p.id) as Record<string, unknown>;
    return {
      ...p,
      syncAuto: Boolean(row?.sync_auto),
      syncIntervalMin: (row?.sync_interval_min as number) ?? 5,
      dernierSyncStatut: (row?.dernier_sync_statut as string | null) ?? null,
      dernierSyncMessage: (row?.dernier_sync_message as string | null) ?? null,
    };
  });
}
