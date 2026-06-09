import Database from 'better-sqlite3';
import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const DATA_DIR = 'C:\\ProgramData\\HotelMetricsPro\\data';
const DB_PATH = path.join(DATA_DIR, 'hotel_metrics_local.db');

function inspectDb(dbPath, label) {
  if (!existsSync(dbPath)) {
    console.log(`\n=== ${label} : FICHIER ABSENT ===`);
    return;
  }
  const db = new Database(dbPath, { readonly: true });
  const stat = statSync(dbPath);
  console.log(`\n=== ${label} ===`);
  console.log('Fichier:', dbPath);
  console.log('Taille:', stat.size, 'octets | Modifié:', stat.mtime.toISOString());

  const tables = ['hotels', 'rubriques', 'users', 'recettes_journalieres', 'objectifs', 'hotel_rubriques', 'audit_log'];
  for (const t of tables) {
    try {
      const c = db.prepare(`SELECT COUNT(*) AS c FROM ${t}`).get().c;
      console.log(`  ${t}: ${c}`);
    } catch {
      console.log(`  ${t}: (absent)`);
    }
  }

  console.log('  Hôtels:');
  try {
    for (const h of db.prepare(`SELECT id, code, name FROM hotels WHERE deleted_at IS NULL ORDER BY id`).all()) {
      console.log(`    - [${h.id}] ${h.code} — ${h.name}`);
    }
  } catch {}

  console.log('  Rubriques:');
  try {
    for (const r of db
      .prepare(`SELECT id, code, label, parent_id FROM rubriques WHERE deleted_at IS NULL ORDER BY id`)
      .all()) {
      console.log(`    - [${r.id}] ${r.code} — ${r.label}${r.parent_id ? ` (parent ${r.parent_id})` : ''}`);
    }
  } catch {}

  console.log('  Derniers audit (10):');
  try {
    for (const a of db
      .prepare(
        `SELECT created_at, action, module, description FROM audit_log ORDER BY id DESC LIMIT 10`,
      )
      .all()) {
      console.log(`    ${a.created_at} | ${a.action} | ${a.module} | ${a.description}`);
    }
  } catch {}

  db.close();
}

inspectDb(DB_PATH, 'BASE ACTUELLE');

const backupsDir = path.join(DATA_DIR, 'backups');
if (existsSync(backupsDir)) {
  for (const f of readdirSync(backupsDir).filter((x) => x.endsWith('.db')).sort()) {
    inspectDb(path.join(backupsDir, f), `SAUVEGARDE ${f}`);
  }
}
