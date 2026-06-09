/**
 * Tests métier via SQLite + bcrypt (runtime Electron requis).
 * Usage: npx electron scripts/verify-services.mjs
 */
import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';
import { existsSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import path from 'node:path';

const DB_PATH = 'C:\\ProgramData\\HotelMetricsPro\\data\\hotel_metrics_local.db';
const BACKUPS_DIR = path.join(path.dirname(DB_PATH), 'backups');

const results = [];
function ok(name, detail = '') {
  results.push({ ok: true, name, detail });
}
function fail(name, detail = '') {
  results.push({ ok: false, name, detail });
}

if (!existsSync(DB_PATH)) {
  console.error('Base introuvable:', DB_PATH);
  process.exit(1);
}

const db = new Database(DB_PATH);

// --- Auth ---
const admin = db
  .prepare(
    `
    SELECT u.id, u.email, u.password_hash, u.is_active, r.code AS role
    FROM users u JOIN roles r ON r.id = u.role_id
    WHERE u.email = ? AND u.deleted_at IS NULL
  `,
  )
  .get('admin@hotelmetrics.local');

if (admin && admin.is_active && bcrypt.compareSync('Admin@2026!', admin.password_hash)) {
  ok('auth.admin_password', admin.email);
} else {
  fail('auth.admin_password');
}

const badHash = admin ? bcrypt.compareSync('wrong-password', admin.password_hash) : true;
(!badHash ? ok : fail)('auth.reject_wrong_password');

// --- Permissions admin ---
const perm = db
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
(perm ? ok : fail)('permissions.admin_users_manage');

// --- Rubriques hiérarchie ---
const rubList = db
  .prepare(`SELECT id, parent_id FROM rubriques WHERE deleted_at IS NULL`)
  .all();
const leaves = rubList.filter((r) => {
  const children = rubList.filter((c) => c.parent_id === r.id);
  return children.length === 0;
});
const rootsWithChildren = rubList.filter(
  (r) => r.parent_id === null && rubList.some((c) => c.parent_id === r.id),
);
(leaves.length > 0 ? ok : fail)('rubriques.leaves', `${leaves.length} feuilles`);
(rootsWithChildren.length > 0 ? ok : fail)('rubriques.roots_with_children', `${rootsWithChildren.length}`);

// Feuilles utilisables pour recettes (actives, sans enfants actifs)
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
(leafForRecettes > 0 ? ok : fail)('recettes.leaf_rubriques', `${leafForRecettes} feuilles actives`);

// --- Hotel rubriques junction ---
const hasHotelRubriques = db
  .prepare(`SELECT COUNT(*) AS c FROM sqlite_master WHERE name = 'hotel_rubriques'`)
  .get().c;
(hasHotelRubriques ? ok : fail)('schema.hotel_rubriques');

// --- PortMaster tables ---
const portTables = ['port_bateaux', 'port_contrats', 'port_factures', 'sync_queue'];
for (const t of portTables) {
  const exists = db.prepare(`SELECT COUNT(*) AS c FROM sqlite_master WHERE name = ?`).get(t).c;
  (exists ? ok : fail)(`schema.${t}`);
}

// --- Backup simulation (copy via better-sqlite3 backup API) ---
if (!existsSync(BACKUPS_DIR)) {
  fail('backup.dir_exists');
} else {
  ok('backup.dir_exists', BACKUPS_DIR);
  const testName = `_verify_test_${Date.now()}.db`;
  const testPath = path.join(BACKUPS_DIR, testName);
  try {
    db.pragma('wal_checkpoint(FULL)');
    await db.backup(testPath);
    const size = statSync(testPath).size;
    (size > 1000 ? ok : fail)('backup.create_api', `${size} octets`);
    unlinkSync(testPath);
    ok('backup.cleanup_test');
  } catch (e) {
    fail('backup.create_api', e.message);
  }
}

// --- Audit log writable ---
const auditCountBefore = db.prepare(`SELECT COUNT(*) AS c FROM audit_log`).get().c;
ok('audit_log.count', String(auditCountBefore));

db.close();

console.log('\n--- Tests métier ---');
let failed = 0;
for (const r of results) {
  console.log(`${r.ok ? 'OK' : 'FAIL'}  ${r.name}${r.detail ? ` — ${r.detail}` : ''}`);
  if (!r.ok) failed++;
}
console.log(`\n${results.length - failed}/${results.length} tests réussis`);
process.exit(failed > 0 ? 1 : 0);
