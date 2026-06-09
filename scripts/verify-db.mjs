/**
 * Vérification hors Electron de la base SQLite locale.
 * Usage: node scripts/verify-db.mjs
 */
import Database from 'better-sqlite3';
import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const DB_PATHS = [
  'C:\\ProgramData\\HotelMetricsPro\\data\\hotel_metrics_local.db',
  path.join(process.env.APPDATA ?? '', 'hotel-metrics-pro-desktop', 'data', 'hotel_metrics_local.db'),
];

function findDb() {
  for (const p of DB_PATHS) {
    if (existsSync(p)) return p;
  }
  return null;
}

const dbPath = findDb();
if (!dbPath) {
  console.error('FAIL: Aucune base trouvée. Lancez npm run dev au moins une fois.');
  process.exit(1);
}

console.log('DB:', dbPath);
console.log('Taille:', statSync(dbPath).size, 'octets');

const db = new Database(dbPath, { readonly: true });

const checks = [];

function pass(name, detail = '') {
  checks.push({ ok: true, name, detail });
}

function fail(name, detail = '') {
  checks.push({ ok: false, name, detail });
}

// Integrity
const integrity = db.pragma('integrity_check');
const okIntegrity = integrity.length === 1 && integrity[0].integrity_check === 'ok';
(okIntegrity ? pass : fail)('integrity_check', integrity.map((r) => r.integrity_check).join(', '));

// Journal mode
const journalMode = db.pragma('journal_mode', { simple: true });
pass('journal_mode', String(journalMode));

// Migrations
const migrations = db
  .prepare('SELECT name FROM schema_migrations ORDER BY id')
  .all()
  .map((r) => r.name);
const required = ['012_rubrique_hierarchy.sql', '011_hotel_rubriques.sql'];
for (const m of required) {
  (migrations.includes(m) ? pass : fail)(`migration ${m}`);
}
pass('migrations_total', `${migrations.length} appliquées`);

// Rubriques hierarchy
const hasParentId = db
  .prepare(`SELECT COUNT(*) AS c FROM pragma_table_info('rubriques') WHERE name = 'parent_id'`)
  .get().c;
(hasParentId ? pass : fail)('rubriques.parent_id column');

const rubriques = db
  .prepare(`SELECT id, code, label, parent_id FROM rubriques WHERE deleted_at IS NULL ORDER BY id`)
  .all();
const roots = rubriques.filter((r) => r.parent_id === null);
const leaves = rubriques.filter((r) => r.parent_id !== null);
pass('rubriques_count', `${rubriques.length} total (${roots.length} racines, ${leaves.length} sous-rubriques)`);

// Deep hierarchy (should be max 2 levels)
const deep = db
  .prepare(
    `
    SELECT c.id, c.code
    FROM rubriques c
    JOIN rubriques p ON p.id = c.parent_id
    WHERE c.deleted_at IS NULL AND p.parent_id IS NOT NULL
  `,
  )
  .all();
(deep.length === 0 ? pass : fail)('rubriques_max_2_levels', deep.map((r) => r.code).join(', '));

// Admin user
const admin = db
  .prepare(
    `SELECT u.id, u.email, r.code AS role FROM users u JOIN roles r ON r.id = u.role_id WHERE u.deleted_at IS NULL LIMIT 5`,
  )
  .all();
pass('users_sample', admin.map((u) => `${u.email} (${u.role})`).join('; '));

// Table counts
const tables = ['hotels', 'users', 'rubriques', 'recettes_journalieres', 'objectifs', 'audit_log'];
for (const t of tables) {
  try {
    const c = db.prepare(`SELECT COUNT(*) AS c FROM ${t}`).get().c;
    pass(`count_${t}`, String(c));
  } catch (e) {
    fail(`count_${t}`, e.message);
  }
}

// Backups dir
const backupsDir = path.join(path.dirname(dbPath), 'backups');
if (existsSync(backupsDir)) {
  const backups = readdirSync(backupsDir).filter((f) => f.endsWith('.db'));
  pass('backups_dir', `${backups.length} fichier(s) dans ${backupsDir}`);
} else {
  pass('backups_dir', 'dossier absent (normal si aucune sauvegarde créée)');
}

db.close();

console.log('\n--- Résultats ---');
let failed = 0;
for (const c of checks) {
  const icon = c.ok ? 'OK' : 'FAIL';
  console.log(`${icon}  ${c.name}${c.detail ? ` — ${c.detail}` : ''}`);
  if (!c.ok) failed++;
}

console.log(`\n${checks.length - failed}/${checks.length} vérifications réussies`);
process.exit(failed > 0 ? 1 : 0);
