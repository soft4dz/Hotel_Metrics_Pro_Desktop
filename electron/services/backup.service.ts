import Electron from '../lib/electronApi';
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  unlinkSync,
} from 'node:fs';
import path from '../lib/nodePath';
import {
  closeDatabase,
  getDataDirectory,
  getDatabase,
  getDatabasePath,
  initDatabase,
} from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { getAppLogosDirectory } from './logo.service';
import { assertPermission } from './permissions.service';

export interface BackupListItem {
  filename: string;
  filePath: string;
  sizeBytes: number;
  createdAt: string;
}

export interface BackupCreateResult {
  filename: string;
  filePath: string;
  sizeBytes: number;
  createdAt: string;
}

export interface BackupRestoreResult {
  requiresReload: boolean;
  message: string;
}

function assertBackupAdmin(actorUserId: number): void {
  assertPermission(actorUserId, 'users.manage');
}

export function getBackupsDirectory(): string {
  return path.join(getDataDirectory(), 'backups');
}

function ensureBackupsDir(): string {
  const dir = getBackupsDirectory();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function sanitizeBackupFilename(filename: string): string {
  const base = path.basename(filename);
  if (!base.endsWith('.db') || base.includes('..')) {
    throw new Error('Nom de sauvegarde invalide.');
  }
  return base;
}

const MIN_BACKUP_BYTES = 50_000;

function assertValidBackupFile(filePath: string): void {
  if (!existsSync(filePath)) {
    throw new Error('Sauvegarde introuvable.');
  }
  const size = statSync(filePath).size;
  if (size < MIN_BACKUP_BYTES) {
    throw new Error(
      `Sauvegarde invalide ou vide (${size} octets). Choisissez une autre sauvegarde.`,
    );
  }
}

function timestampFilename(): string {
  const now = new Date();
  const y = now.getFullYear();
  const mo = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  return `hotel_metrics_local_${y}-${mo}-${d}_${h}${mi}${s}.db`;
}

function backupLogosCompanionPath(dbBackupPath: string): string {
  return dbBackupPath.replace(/\.db$/, '_logos');
}

function copyLogosToBackup(dbBackupPath: string): void {
  const logosDir = getAppLogosDirectory();
  if (!existsSync(logosDir)) return;
  cpSync(logosDir, backupLogosCompanionPath(dbBackupPath), { recursive: true });
}

function restoreLogosFromBackup(dbBackupPath: string): void {
  const logosBackup = backupLogosCompanionPath(dbBackupPath);
  if (!existsSync(logosBackup)) return;
  cpSync(logosBackup, getAppLogosDirectory(), { recursive: true, force: true });
}

function deleteLogosCompanion(dbBackupPath: string): void {
  const logosBackup = backupLogosCompanionPath(dbBackupPath);
  if (existsSync(logosBackup)) {
    rmSync(logosBackup, { recursive: true, force: true });
  }
}

export async function createBackup(actorUserId: number): Promise<BackupCreateResult> {
  assertBackupAdmin(actorUserId);

  const dir = ensureBackupsDir();
  const filename = timestampFilename();
  const dest = path.join(dir, filename);
  const db = getDatabase();

  db.pragma('wal_checkpoint(FULL)');
  await db.backup(dest);
  copyLogosToBackup(dest);

  const createdAt = new Date().toISOString();
  const sizeBytes = statSync(dest).size;

  writeAuditLog({
    userId: actorUserId,
    action: 'BACKUP',
    module: 'system',
    page: 'BackupPage',
    description: `Sauvegarde créée : ${filename}`,
    newValue: JSON.stringify({ sizeBytes, filePath: dest }),
  });

  return { filename, filePath: dest, sizeBytes, createdAt };
}

export function listBackups(actorUserId: number): BackupListItem[] {
  assertBackupAdmin(actorUserId);

  const dir = ensureBackupsDir();
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.db') && !f.startsWith('_verify_'))
    .map((filename) => {
      const filePath = path.join(dir, filename);
      const stat = statSync(filePath);
      return {
        filename,
        filePath,
        sizeBytes: stat.size,
        createdAt: stat.mtime.toISOString(),
      };
    })
    .filter((b) => b.sizeBytes >= MIN_BACKUP_BYTES)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return files;
}

export async function restoreBackup(
  actorUserId: number,
  filename: string,
): Promise<BackupRestoreResult> {
  assertBackupAdmin(actorUserId);

  const safeName = sanitizeBackupFilename(filename);
  const backupPath = path.join(getBackupsDirectory(), safeName);
  assertValidBackupFile(backupPath);

  // Sauvegarde automatique avant restauration
  const preRestoreName = `pre_restore_${timestampFilename()}`;
  const preRestorePath = path.join(getBackupsDirectory(), preRestoreName);
  const db = getDatabase();
  db.pragma('wal_checkpoint(FULL)');
  await db.backup(preRestorePath);
  copyLogosToBackup(preRestorePath);

  const dbPath = getDatabasePath();
  closeDatabase();
  copyFileSync(backupPath, dbPath);
  restoreLogosFromBackup(backupPath);
  initDatabase();

  writeAuditLog({
    userId: actorUserId,
    action: 'RESTORE',
    module: 'system',
    page: 'BackupPage',
    description: `Restauration depuis ${safeName}`,
    newValue: JSON.stringify({ backupPath }),
  });

  setImmediate(() => {
    Electron.app.relaunch();
    Electron.app.exit(0);
  });

  return {
    requiresReload: true,
    message: 'Restauration terminée. L’application va redémarrer.',
  };
}

export function deleteBackup(actorUserId: number, filename: string): boolean {
  assertBackupAdmin(actorUserId);

  const safeName = sanitizeBackupFilename(filename);
  const filePath = path.join(getBackupsDirectory(), safeName);
  if (!existsSync(filePath)) {
    throw new Error('Sauvegarde introuvable.');
  }

  unlinkSync(filePath);
  deleteLogosCompanion(filePath);

  writeAuditLog({
    userId: actorUserId,
    action: 'DELETE',
    module: 'system',
    page: 'BackupPage',
    description: `Suppression sauvegarde ${safeName}`,
  });

  return true;
}
