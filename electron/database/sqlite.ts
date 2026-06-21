import Electron from '../lib/electronApi';

import Database, { type SqliteDatabase } from './betterSqlite';

import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';

import path from '../lib/nodePath';

import { logger } from '../utils/logger';

import { resolveMigrationsDirectory } from '../utils/paths';

import { ensureAdminRolesHaveAllPermissions } from './adminPermissions';



const DB_FILE_NAME = 'hotel_metrics_local.db';

/** Anciens noms de fichiers migrés (évite une double exécution après renommage). */
const MIGRATION_LEGACY_NAMES: Record<string, string[]> = {
  '049_rh_etat_civil.sql': ['036_rh_etat_civil.sql'],
  '050_rh_etat_civil_suite.sql': ['037_rh_etat_civil_suite.sql'],
};

let db: SqliteDatabase | null = null;



function resolveDataDirectory(): string {

  return path.join(Electron.app.getPath('userData'), 'data');

}



function migrateLegacyDataDirectory(dataDir: string, dbPath: string): void {
  if (process.platform !== 'win32') return;
  const legacyDir = 'C:\\ProgramData\\HotelMetricsPro\\data';
  const legacyDb = path.join(legacyDir, DB_FILE_NAME);
  if (!existsSync(legacyDb)) return;

  mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  copyFileSync(legacyDb, dbPath);
  for (const suffix of ['-wal', '-shm']) {
    const legacySide = `${legacyDb}${suffix}`;
    if (existsSync(legacySide)) {
      copyFileSync(legacySide, `${dbPath}${suffix}`);
    }
  }
  logger.info(`Migration données : ${legacyDir} → ${dataDir}`);
}

function hardenDataDirectory(dataDir: string): void {

  if (!existsSync(dataDir)) return;

  try {

    if (process.platform !== 'win32') {

      chmodSync(dataDir, 0o700);

    }

  } catch {

    logger.warn(`Impossible de restreindre les permissions du dossier : ${dataDir}`);

  }

}



function runMigrations(database: SqliteDatabase): void {

  const migrationsDir = resolveMigrationsDirectory();

  const files = readdirSync(migrationsDir)

    .filter((f) => f.endsWith('.sql'))

    .sort();



  database.exec(`

    CREATE TABLE IF NOT EXISTS schema_migrations (

      id INTEGER PRIMARY KEY AUTOINCREMENT,

      name TEXT NOT NULL UNIQUE,

      applied_at TEXT NOT NULL DEFAULT (datetime('now'))

    );

  `);



  const insertMigration = database.prepare(

    `INSERT INTO schema_migrations (name) VALUES (?)`,

  );

  const hasMigration = database.prepare(

    `SELECT 1 FROM schema_migrations WHERE name = ?`,

  );



  const migrationAlreadyApplied = (name: string): boolean => {
    if (hasMigration.get(name)) return true;
    for (const legacy of MIGRATION_LEGACY_NAMES[name] ?? []) {
      if (hasMigration.get(legacy)) return true;
    }
    return false;
  };

  for (const file of files) {

    if (migrationAlreadyApplied(file)) continue;



    const sql = readFileSync(path.join(migrationsDir, file), 'utf-8');

    logger.info(`Migration : ${file}`);



    const run = database.transaction(() => {

      database.exec(sql);

      insertMigration.run(file);

    });

    run();

  }

}



export function getDatabase(): SqliteDatabase {

  if (!db) {

    throw new Error('Base de données non initialisée. Appelez initDatabase() au démarrage.');

  }

  return db;

}



export function initDatabase(): void {
  const dataDir = resolveDataDirectory();
  const dbPath = path.join(dataDir, DB_FILE_NAME);

  if (!existsSync(dbPath)) {
    migrateLegacyDataDirectory(dataDir, dbPath);
  }

  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true, mode: 0o700 });
    logger.info(`Dossier données créé : ${dataDir}`);
  }

  hardenDataDirectory(dataDir);

  db = new Database(dbPath);



  db.pragma('journal_mode = WAL');

  db.pragma('foreign_keys = ON');



  runMigrations(db);

  ensureAdminRolesHaveAllPermissions();

  try {

    if (process.platform !== 'win32') {

      chmodSync(dbPath, 0o600);

    }

  } catch {

    /* permissions best-effort */

  }



  logger.info(`SQLite prête : ${dbPath}`);

}



export function closeDatabase(): void {

  if (db) {

    db.close();

    db = null;

    logger.info('Connexion SQLite fermée.');

  }

}



export function getDataDirectory(): string {

  return resolveDataDirectory();

}



export function getDatabasePath(): string {

  return path.join(resolveDataDirectory(), DB_FILE_NAME);

}


