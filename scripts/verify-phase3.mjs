/**
 * Vérifie migrations 046/047 et colonnes PMS — npx electron scripts/verify-phase3.mjs
 */
import Database from 'better-sqlite3';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const DB_CANDIDATES = [
  path.join(process.env.APPDATA ?? '', 'hotel-metrics-pro-desktop', 'data', 'hotel_metrics_local.db'),
  'C:\\ProgramData\\HotelMetricsPro\\data\\hotel_metrics_local.db',
];

function findDb() {
  for (const p of DB_CANDIDATES) {
    if (existsSync(p)) return p;
  }
  return null;
}

function hasColumn(db, table, col) {
  return db.prepare(`SELECT COUNT(*) AS c FROM pragma_table_info(?) WHERE name = ?`).get(table, col).c > 0;
}

const dbPath = findDb();
if (!dbPath) {
  console.error('FAIL: base introuvable — lancez npm run dev une fois.');
  process.exit(1);
}

console.log('DB:', dbPath);
const db = new Database(dbPath);

const migrationsDir = path.join(root, 'electron', 'database', 'migrations');
const pending = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort()
  .filter((f) => !db.prepare('SELECT 1 FROM schema_migrations WHERE name = ?').get(f));

if (pending.length) {
  console.log('Migrations en attente:', pending.join(', '));
  for (const file of pending) {
    const sql = readFileSync(path.join(migrationsDir, file), 'utf-8');
    const run = db.transaction(() => {
      db.exec(sql);
      db.prepare('INSERT INTO schema_migrations (name) VALUES (?)').run(file);
    });
    run();
    console.log('Appliquée:', file);
  }
} else {
  console.log('Aucune migration en attente.');
}

const checks = [
  ['migration 046', db.prepare(`SELECT 1 FROM schema_migrations WHERE name = '046_conventions_client_fk.sql'`).get()],
  ['migration 047', db.prepare(`SELECT 1 FROM schema_migrations WHERE name = '047_reservations_pms.sql'`).get()],
  ['reservations.client_id', hasColumn(db, 'reservations', 'client_id')],
  ['reservations.facture_id', hasColumn(db, 'reservations', 'facture_id')],
  ['factures.reservation_id', hasColumn(db, 'factures', 'reservation_id')],
];

let failed = 0;
for (const [name, ok] of checks) {
  if (ok) console.log('OK ', name);
  else { console.log('FAIL', name); failed++; }
}

const counts = {
  reservations: db.prepare('SELECT COUNT(*) AS c FROM reservations WHERE deleted_at IS NULL').get().c,
  clients_facturation: db.prepare('SELECT COUNT(*) AS c FROM clients_facturation WHERE deleted_at IS NULL').get().c,
  factures: db.prepare('SELECT COUNT(*) AS c FROM factures').get().c,
};
console.log('Données:', counts);

db.close();
process.exit(failed > 0 ? 1 : 0);
