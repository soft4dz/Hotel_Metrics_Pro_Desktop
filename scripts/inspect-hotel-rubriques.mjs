import Database from 'better-sqlite3';

const db = new Database('C:\\ProgramData\\HotelMetricsPro\\data\\hotel_metrics_local.db', { readonly: true });

console.log('=== hotel_rubriques ===');
try {
  const rows = db.prepare(`SELECT * FROM hotel_rubriques`).all();
  console.log('count:', rows.length, rows);
} catch (e) {
  console.log('error:', e.message);
}

console.log('\n=== hotels (all including deleted) ===');
for (const h of db.prepare(`SELECT id, code, name, deleted_at FROM hotels ORDER BY id`).all()) {
  console.log(h);
}

console.log('\n=== rubriques (all including deleted) ===');
for (const r of db.prepare(`SELECT id, code, label, parent_id, is_active, deleted_at FROM rubriques ORDER BY id`).all()) {
  console.log(r);
}

console.log('\n=== app_settings ===');
for (const s of db.prepare(`SELECT key, value FROM app_settings`).all()) {
  console.log(s);
}

db.close();
