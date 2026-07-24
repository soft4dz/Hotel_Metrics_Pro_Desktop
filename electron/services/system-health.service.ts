import Electron from '../lib/electronApi';
import { existsSync, statSync } from 'node:fs';
import { getDatabase, getDatabasePath, getDataDirectory } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { assertPermission } from './permissions.service';
import { listBackups } from './backup.service';
import { verifierIntegriteArchive } from './ged-archivage.service';
import { getLicenseStatus } from './license.service';

export type HealthStatus = 'ok' | 'warning' | 'critical';

export interface SystemHealthCheck {
  code: string;
  libelle: string;
  statut: HealthStatus;
  message: string;
  detail?: string;
}

export interface SystemHealthReport {
  overall: HealthStatus;
  checks: SystemHealthCheck[];
  generatedAt: string;
  appVersion: string;
}

function worst(a: HealthStatus, b: HealthStatus): HealthStatus {
  const rank = { ok: 0, warning: 1, critical: 2 };
  return rank[a] >= rank[b] ? a : b;
}

function assertHealthAccess(actorUserId: number): void {
  assertPermission(actorUserId, 'users.manage');
}

export function getSystemHealth(actorUserId: number): SystemHealthReport {
  assertHealthAccess(actorUserId);
  const db = getDatabase();
  const checks: SystemHealthCheck[] = [];
  const dbPath = getDatabasePath();

  if (!existsSync(dbPath)) {
    checks.push({ code: 'db_file', libelle: 'Fichier base de données', statut: 'critical', message: 'Fichier SQLite introuvable.' });
  } else {
    const size = statSync(dbPath).size;
    checks.push({
      code: 'db_file', libelle: 'Fichier base de données', statut: size > 0 ? 'ok' : 'critical',
      message: size > 0 ? `${Math.round(size / 1024)} Ko` : 'Base vide ou corrompue.',
      detail: dbPath,
    });
  }

  const walPath = `${dbPath}-wal`;
  if (existsSync(walPath)) {
    const walSize = statSync(walPath).size;
    checks.push({
      code: 'db_wal', libelle: 'Journal WAL', statut: walSize > 50_000_000 ? 'warning' : 'ok',
      message: walSize > 50_000_000 ? 'WAL volumineux — checkpoint recommandé' : `${Math.round(walSize / 1024)} Ko`,
    });
  }

  const migrations = db.prepare(`SELECT name FROM schema_migrations ORDER BY id DESC LIMIT 1`).get() as { name: string } | undefined;
  const lastMigration = migrations?.name ?? '—';
  const migrationOk = /^06[1-9]_/.test(lastMigration) || lastMigration.startsWith('061_');
  checks.push({
    code: 'migrations', libelle: 'Dernière migration', statut: migrationOk ? 'ok' : 'warning',
    message: lastMigration,
  });

  const license = getLicenseStatus();
  checks.push({
    code: 'license',
    libelle: 'Licence Raqmi System',
    statut: license.state === 'expired' ? 'critical' : license.state === 'trial' ? 'warning' : 'ok',
    message: license.message,
    detail: license.edition ? `${license.edition}${license.expiresAt ? ` — ${license.expiresAt}` : ''}` : undefined,
  });

  const backups = listBackups(actorUserId);
  if (backups.length === 0) {
    checks.push({ code: 'backup', libelle: 'Sauvegarde', statut: 'warning', message: 'Aucune sauvegarde locale trouvée.' });
  } else {
    const latest = backups[0];
    const ageDays = Math.floor((Date.now() - new Date(latest.createdAt).getTime()) / 86_400_000);
    checks.push({
      code: 'backup', libelle: 'Dernière sauvegarde', statut: ageDays > 7 ? 'warning' : 'ok',
      message: `${latest.filename} (${ageDays} j)`,
      detail: latest.filePath,
    });
  }

  const syncConflicts = (db.prepare(`SELECT COUNT(*) as c FROM sync_conflict_log WHERE statut='ouvert'`).get() as { c: number }).c;
  checks.push({
    code: 'sync', libelle: 'Conflits synchronisation', statut: syncConflicts > 0 ? 'warning' : 'ok',
    message: syncConflicts > 0 ? `${syncConflicts} conflit(s) ouvert(s)` : 'Aucun conflit ouvert',
  });

  const pendingWf = (db.prepare(`
    SELECT COUNT(*) as c FROM workflow_instances WHERE statut IN ('soumis','en_validation','valide_unite')
  `).get() as { c: number }).c;
  checks.push({
    code: 'workflows', libelle: 'Workflows en attente', statut: pendingWf > 20 ? 'warning' : 'ok',
    message: `${pendingWf} en attente`,
  });

  const legalArchives = (db.prepare(`SELECT COUNT(*) as c FROM ged_legal_archives WHERE statut='actif'`).get() as { c: number }).c;
  checks.push({
    code: 'ged_legal', libelle: 'Archives légales GED', statut: 'ok',
    message: `${legalArchives} archive(s) active(s)`,
  });

  const dataDir = getDataDirectory();
  checks.push({
    code: 'data_dir', libelle: 'Répertoire données', statut: existsSync(dataDir) ? 'ok' : 'critical',
    message: existsSync(dataDir) ? 'Accessible' : 'Répertoire introuvable',
    detail: dataDir,
  });

  let overall: HealthStatus = 'ok';
  for (const c of checks) overall = worst(overall, c.statut);

  writeAuditLog({ userId: actorUserId, action: 'READ', module: 'system_health', description: `Consultation santé système — ${overall}` });

  return {
    overall,
    checks,
    generatedAt: new Date().toISOString(),
    appVersion: Electron.app.getVersion(),
  };
}

export function runGedIntegrityBatch(actorUserId: number, limit = 20): { total: number; ok: number; failed: number; details: string[] } {
  assertHealthAccess(actorUserId);
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT id FROM ged_legal_archives WHERE statut='actif' ORDER BY id DESC LIMIT ?
  `).all(limit) as { id: number }[];

  let ok = 0;
  let failed = 0;
  const details: string[] = [];
  for (const r of rows) {
    try {
      const res = verifierIntegriteArchive(r.id);
      if (res.ok) ok += 1;
      else {
        failed += 1;
        details.push(`Archive #${r.id} : hash invalide`);
      }
    } catch {
      failed += 1;
      details.push(`Archive #${r.id} : fichier inaccessible`);
    }
  }

  writeAuditLog({
    userId: actorUserId, action: 'READ', module: 'system_health',
    description: `Contrôle intégrité GED — ${ok}/${rows.length} OK`,
  });

  return { total: rows.length, ok, failed, details };
}
