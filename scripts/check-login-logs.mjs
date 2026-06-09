import Database from 'better-sqlite3';

const db = new Database('C:\\ProgramData\\HotelMetricsPro\\data\\hotel_metrics_local.db', { readonly: true });
const logs = db
  .prepare(
    `SELECT email, success, failure_reason, created_at FROM logs_connexions ORDER BY id DESC LIMIT 15`,
  )
  .all();
console.log('Dernières tentatives de connexion:');
for (const l of logs) {
  console.log(`  ${l.created_at} | ${l.email} | ${l.success ? 'OK' : 'FAIL'} | ${l.failure_reason ?? '-'}`);
}
db.close();
