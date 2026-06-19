/**
 * Données démo PMS (chambres, tarifs, clients) — npx electron scripts/seed-pms-demo.mjs
 */
import Database from 'better-sqlite3';
import { existsSync } from 'node:fs';
import path from 'node:path';

const DB_CANDIDATES = [
  path.join(process.env.APPDATA ?? '', 'hotel-metrics-pro-desktop', 'data', 'hotel_metrics_local.db'),
  'C:\\ProgramData\\HotelMetricsPro\\data\\hotel_metrics_local.db',
];

const dbPath = DB_CANDIDATES.find((p) => existsSync(p));
if (!dbPath) {
  console.error('Base introuvable.');
  process.exit(1);
}

const db = new Database(dbPath);
const existing = db.prepare('SELECT COUNT(*) AS c FROM chambres').get().c;
if (existing > 0) {
  console.log(`Déjà ${existing} chambre(s) — seed ignoré.`);
  db.close();
  process.exit(0);
}

const hotels = db.prepare(`SELECT id, name FROM hotels WHERE is_active = 1 ORDER BY id LIMIT 3`).all();
if (!hotels.length) {
  console.error('Aucun hôtel actif.');
  db.close();
  process.exit(1);
}

const today = new Date();
const fmt = (d) => d.toISOString().slice(0, 10);

const insertType = db.prepare(`
  INSERT INTO types_chambres (hotel_id, code, label, capacite, tarif_base, description, actif)
  VALUES (?, ?, ?, ?, ?, ?, 1)
`);
const insertChambre = db.prepare(`
  INSERT INTO chambres (hotel_id, type_chambre_id, numero, etage, statut, actif)
  VALUES (?, ?, ?, ?, 'libre', 1)
`);
const insertPlan = db.prepare(`
  INSERT INTO plans_tarifaires (hotel_id, code, label, type_plan, priorite, actif)
  VALUES (?, ?, ?, 'BASIQUE', 10, 1)
`);
const insertTarif = db.prepare(`
  INSERT INTO tarifs_journaliers (hotel_id, type_chambre_id, plan_id, formule_id, date_application, prix_base, prix_personne_supp)
  VALUES (?, ?, ?, NULL, ?, ?, 1500)
`);
const insertClient = db.prepare(`
  INSERT INTO clients_facturation (type, nom, raison_sociale, email, telephone, nif)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const seed = db.transaction(() => {
  for (const hotel of hotels) {
    const typeId = insertType.run(hotel.id, 'DBL', 'Double standard', 2, 12000, 'Chambre double vue mer').lastInsertRowid;
    const typeId2 = insertType.run(hotel.id, 'SGL', 'Simple', 1, 8500, 'Chambre simple').lastInsertRowid;
    for (let i = 1; i <= 5; i++) {
      insertChambre.run(hotel.id, typeId, `10${i}`, 1);
    }
    for (let i = 1; i <= 3; i++) {
      insertChambre.run(hotel.id, typeId2, `20${i}`, 2);
    }
    const planId = insertPlan.run(hotel.id, 'BAR', 'Meilleur tarif disponible').lastInsertRowid;
    insertPlan.run(hotel.id, 'NR', 'Non remboursable');
    for (let d = 0; d < 60; d++) {
      const date = new Date(today);
      date.setDate(date.getDate() + d);
      const ds = fmt(date);
      insertTarif.run(hotel.id, typeId, planId, ds, 12000);
      insertTarif.run(hotel.id, typeId2, planId, ds, 8500);
    }
    console.log(`Hôtel #${hotel.id} ${hotel.name}: 8 chambres, 2 plans, tarifs 60j`);
  }

  insertClient.run('particulier', 'Benali Ahmed', null, 'benali@example.dz', '0555123456', null);
  insertClient.run('particulier', 'Khelifi Fatima', null, 'khelifi@example.dz', '0666789012', null);
  insertClient.run('entreprise', 'SARL Atlas Voyages', 'SARL Atlas Voyages', 'contact@atlas-voyages.dz', '021987654', '1234567890123');
  console.log('3 clients facturation créés.');
});

seed();

const summary = {
  chambres: db.prepare('SELECT COUNT(*) c FROM chambres').get().c,
  types: db.prepare('SELECT COUNT(*) c FROM types_chambres').get().c,
  plans: db.prepare('SELECT COUNT(*) c FROM plans_tarifaires').get().c,
  tarifs: db.prepare('SELECT COUNT(*) c FROM tarifs_journaliers').get().c,
  clients: db.prepare('SELECT COUNT(*) c FROM clients_facturation WHERE deleted_at IS NULL').get().c,
};
console.log('Résumé:', summary);
db.close();
