/**
 * Vérifications métier via SQLite (runtime Electron requis).
 * Usage: npx electron scripts/verify-services.mjs [--db "C:\\chemin\\base.db"]
 */
import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';
import { existsSync, statSync, unlinkSync } from 'node:fs';
import path from 'node:path';

const defaultPaths = [
  path.join(process.env.APPDATA ?? '', 'hotel-metrics-pro-desktop', 'data', 'hotel_metrics_local.db'),
  'C:\\ProgramData\\HotelMetricsPro\\data\\hotel_metrics_local.db',
];
const dbArgIndex = process.argv.indexOf('--db');
const requestedPath = dbArgIndex >= 0 ? process.argv[dbArgIndex + 1] : undefined;
const DB_PATH = requestedPath
  ? path.resolve(requestedPath)
  : defaultPaths.find((candidate) => existsSync(candidate));

if (!DB_PATH || !existsSync(DB_PATH)) {
  console.error('Base introuvable. Utilisez --db "C:\\chemin\\hotel_metrics_local.db".');
  process.exit(1);
}

const BACKUPS_DIR = path.join(path.dirname(DB_PATH), 'backups');
const results = [];
const ok = (name, detail = '') => results.push({ ok: true, name, detail });
const fail = (name, detail = '') => results.push({ ok: false, name, detail });

const db = new Database(DB_PATH);

// --- Authentification et sécurité ---
const admin = db
  .prepare(
    `
    SELECT u.id, u.email, u.password_hash, u.is_active, u.must_change_password,
           r.code AS role
    FROM users u
    JOIN roles r ON r.id = u.role_id
    WHERE u.email = ? AND u.deleted_at IS NULL
  `,
  )
  .get('admin@hotelmetrics.local');

if (admin && admin.is_active && admin.role === 'SUPERADMIN') {
  ok('auth.active_superadmin', admin.email);
} else {
  fail('auth.active_superadmin');
}

if (admin?.password_hash?.startsWith('$2')) {
  ok('auth.password_is_bcrypt');
} else {
  fail('auth.password_is_bcrypt');
}

const wrongPasswordAccepted = admin
  ? bcrypt.compareSync(`invalid-${Date.now()}-${Math.random()}`, admin.password_hash)
  : true;
(!wrongPasswordAccepted ? ok : fail)('auth.reject_random_password');

const legacyPasswordAccepted = admin
  ? bcrypt.compareSync('Admin@2026!', admin.password_hash)
  : false;
(!legacyPasswordAccepted ? ok : fail)('auth.reject_legacy_universal_password');

// --- Permissions admin ---
const permission = db
  .prepare(
    `
    SELECT 1 FROM role_permissions rp
    JOIN permissions p ON p.id = rp.permission_id
    JOIN roles r ON r.id = rp.role_id
    JOIN users u ON u.role_id = r.id
    WHERE u.email = ? AND p.code = 'users.manage'
  `,
  )
  .get('admin@hotelmetrics.local');
(permission ? ok : fail)('permissions.admin_users_manage');

// --- Rubriques hiérarchie ---
const rubriques = db
  .prepare(`SELECT id, parent_id FROM rubriques WHERE deleted_at IS NULL`)
  .all();
const leaves = rubriques.filter(
  (rubrique) => !rubriques.some((candidate) => candidate.parent_id === rubrique.id),
);
const rootsWithChildren = rubriques.filter(
  (rubrique) =>
    rubrique.parent_id === null &&
    rubriques.some((candidate) => candidate.parent_id === rubrique.id),
);
(leaves.length > 0 ? ok : fail)('rubriques.leaves', `${leaves.length} feuilles`);
(rootsWithChildren.length > 0 ? ok : fail)(
  'rubriques.roots_with_children',
  `${rootsWithChildren.length}`,
);

const leafForRecettes = db
  .prepare(
    `
    SELECT COUNT(*) AS c FROM rubriques r
    WHERE r.deleted_at IS NULL AND r.is_active = 1
      AND NOT EXISTS (
        SELECT 1 FROM rubriques c
        WHERE c.parent_id = r.id AND c.deleted_at IS NULL AND c.is_active = 1
      )
  `,
  )
  .get().c;
(leafForRecettes > 0 ? ok : fail)(
  'recettes.leaf_rubriques',
  `${leafForRecettes} feuilles actives`,
);

// --- Schéma ---
for (const table of [
  'hotel_rubriques',
  'port_bateaux',
  'port_contrats',
  'port_factures',
  'sync_queue',
  'facture_sequences',
]) {
  const exists = db
    .prepare(`SELECT COUNT(*) AS c FROM sqlite_master WHERE type = 'table' AND name = ?`)
    .get(table).c;
  (exists ? ok : fail)(`schema.${table}`);
}

// --- Sauvegarde ---
if (!existsSync(BACKUPS_DIR)) {
  fail('backup.dir_exists');
} else {
  ok('backup.dir_exists', BACKUPS_DIR);
  const testPath = path.join(BACKUPS_DIR, `_verify_test_${Date.now()}.db`);
  try {
    db.pragma('wal_checkpoint(FULL)');
    await db.backup(testPath);
    const size = statSync(testPath).size;
    (size > 1_000 ? ok : fail)('backup.create_api', `${size} octets`);
    unlinkSync(testPath);
    ok('backup.cleanup_test');
  } catch (error) {
    fail('backup.create_api', error instanceof Error ? error.message : String(error));
  }
}

const auditCount = db.prepare(`SELECT COUNT(*) AS c FROM audit_log`).get().c;
ok('audit_log.count', String(auditCount));

db.close();

console.log('\n--- Tests métier ---');
let failed = 0;
for (const result of results) {
  console.log(
    `${result.ok ? 'OK' : 'FAIL'}  ${result.name}${result.detail ? ` — ${result.detail}` : ''}`,
  );
  if (!result.ok) failed++;
}
console.log(`\n${results.length - failed}/${results.length} tests réussis`);
process.exit(failed > 0 ? 1 : 0);
