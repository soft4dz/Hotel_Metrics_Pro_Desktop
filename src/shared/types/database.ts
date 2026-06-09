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

export interface IntegrityCheckResult {
  ok: boolean;
  details: string[];
}

export interface VacuumResult {
  sizeBefore: number;
  sizeAfter: number;
}

export interface LegacyImportResult {
  ok: boolean;
  message: string;
  stats: Record<string, number>;
}

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
