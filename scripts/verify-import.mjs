import Database from 'better-sqlite3';
import { existsSync } from 'node:fs';

const paths = [
  process.env.APPDATA + '\\hotel-metrics-pro-desktop\\data\\hotel_metrics_local.db',
  'C:\\ProgramData\\HotelMetricsPro\\data\\hotel_metrics_local.db',
];

for (const p of paths) {
  if (!existsSync(p)) {
    console.log('ABSENT:', p);
    continue;
  }
  const db = new Database(p, { readonly: true });
  console.log('\n===', p, '===');
  for (const t of ['hotels', 'rubriques', 'users', 'recettes_journalieres', 'objectifs']) {
    console.log(`  ${t}:`, db.prepare(`SELECT COUNT(*) AS c FROM ${t}`).get().c);
  }
  console.log('  Utilisateurs:');
  for (const u of db
    .prepare(`SELECT email, full_name FROM users WHERE deleted_at IS NULL ORDER BY email`)
    .all()) {
    console.log(`    - ${u.email} (${u.full_name})`);
  }
  db.close();
}
