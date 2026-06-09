import Electron from '../lib/electronApi';
import { existsSync, statSync } from 'node:fs';
import path from '../lib/nodePath';
import { importLegacyDatabase, type ImportResult } from '../database/importLegacyData';
import { getDataDirectory, getDatabase, getDatabasePath } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { assertPermission } from './permissions.service';
import { getAppLogosDirectory, getProjectLogosDirectory } from './logo.service';

export interface TableStatRow {
  table: string;
  label: string;
  count: number;
}

export interface MigrationRow {
  name: string;
  appliedAt: string;
}

export interface DatabaseInfoDto {
  databaseFile: string;
  dataDirectory: string;
  backupsDirectory: string;
  logosDirectory: string;
  projectLogosDirectory: string;
  sizeBytes: number;
  walSizeBytes: number;
  journalMode: string;
  sqliteVersion: string;
  appVersion: string;
  tableStats: TableStatRow[];
  migrations: MigrationRow[];
}

const TABLE_LABELS: Record<string, string> = {
  hotels: 'Hôtels / unités',
  users: 'Utilisateurs',
  rubriques: 'Rubriques',
  recettes_journalieres: 'Recettes journalières',
  objectifs: 'Objectifs',
  audit_log: 'Journal audit',
  roles: 'Rôles',
};

function assertDatabaseAdmin(actorUserId: number): void {
  assertPermission(actorUserId, 'users.manage');
}

function fileSize(filePath: string): number {
  if (!existsSync(filePath)) return 0;
  return statSync(filePath).size;
}

export function getDatabaseInfo(actorUserId: number): DatabaseInfoDto {
  assertDatabaseAdmin(actorUserId);

  const db = getDatabase();
  const dbPath = getDatabasePath();
  const dataDir = getDataDirectory();
  const backupsDir = path.join(dataDir, 'backups');

  const journalMode =
    (db.pragma('journal_mode', { simple: true }) as string) ?? 'unknown';
  const sqliteVersion =
    (db.prepare(`SELECT sqlite_version() AS v`).get() as { v: string }).v;

  const tableStats: TableStatRow[] = [];
  for (const [table, label] of Object.entries(TABLE_LABELS)) {
    try {
      const row = db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get() as { c: number };
      tableStats.push({ table, label, count: row.c });
    } catch {
      tableStats.push({ table, label, count: 0 });
    }
  }

  const migrations = db
    .prepare(`SELECT name, applied_at AS appliedAt FROM schema_migrations ORDER BY id`)
    .all() as MigrationRow[];

  return {
    databaseFile: dbPath,
    dataDirectory: dataDir,
    backupsDirectory: backupsDir,
    logosDirectory: getAppLogosDirectory(),
    projectLogosDirectory: getProjectLogosDirectory(),
    sizeBytes: fileSize(dbPath),
    walSizeBytes: fileSize(`${dbPath}-wal`),
    journalMode,
    sqliteVersion,
    appVersion: Electron.app.getVersion(),
    tableStats,
    migrations,
  };
}

export function runIntegrityCheck(actorUserId: number): { ok: boolean; details: string[] } {
  assertDatabaseAdmin(actorUserId);

  const db = getDatabase();
  const rows = db.pragma('integrity_check') as Array<{ integrity_check: string }>;
  const details = rows.map((r) => r.integrity_check);
  const ok = details.length === 1 && details[0] === 'ok';

  writeAuditLog({
    userId: actorUserId,
    action: 'CHECK',
    module: 'system',
    page: 'DatabasePage',
    description: ok ? 'Contrôle intégrité SQLite : OK' : 'Contrôle intégrité SQLite : anomalies',
    newValue: JSON.stringify(details),
  });

  return { ok, details };
}

export function runVacuum(actorUserId: number): { sizeBefore: number; sizeAfter: number } {
  assertDatabaseAdmin(actorUserId);

  const dbPath = getDatabasePath();
  const sizeBefore = fileSize(dbPath);

  getDatabase().exec('VACUUM');

  const sizeAfter = fileSize(dbPath);

  writeAuditLog({
    userId: actorUserId,
    action: 'MAINTENANCE',
    module: 'system',
    page: 'DatabasePage',
    description: 'VACUUM SQLite exécuté',
    oldValue: JSON.stringify({ sizeBefore }),
    newValue: JSON.stringify({ sizeAfter }),
  });

  return { sizeBefore, sizeAfter };
}

export async function pickLegacyImportFile(actorUserId: number): Promise<string | null> {
  assertDatabaseAdmin(actorUserId);
  const { canceled, filePaths } = await Electron.dialog.showOpenDialog({
    title: 'Importer un dump MySQL / phpMyAdmin',
    filters: [
      { name: 'Fichiers SQL', extensions: ['sql'] },
      { name: 'Tous les fichiers', extensions: ['*'] },
    ],
    properties: ['openFile'],
  });
  if (canceled || filePaths.length === 0) return null;
  return filePaths[0] ?? null;
}

export function importLegacyFromFile(actorUserId: number, filePath: string): ImportResult {
  assertDatabaseAdmin(actorUserId);

  if (!filePath?.trim()) throw new Error('Fichier requis.');
  if (!existsSync(filePath)) throw new Error('Fichier introuvable.');

  const result = importLegacyDatabase(filePath);

  writeAuditLog({
    userId: actorUserId,
    action: result.ok ? 'IMPORT' : 'ERROR',
    module: 'system',
    page: 'DatabasePage',
    description: result.ok
      ? `Import legacy depuis ${path.basename(filePath)}`
      : `Échec import legacy : ${result.message}`,
    newValue: JSON.stringify(result.stats),
  });

  if (!result.ok) throw new Error(result.message);
  return result;
}
