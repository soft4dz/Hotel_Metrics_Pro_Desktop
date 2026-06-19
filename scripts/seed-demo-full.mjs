/**
 * Remplit la base SQLite avec des données de démonstration pour tous les modules.
 * Usage : npm run seed:demo
 *         npm run seed:demo -- --force   (réinitialise les données démo)
 */
import Database from 'better-sqlite3';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const DB_CANDIDATES = [
  path.join(process.env.APPDATA ?? '', 'hotel-metrics-pro-desktop', 'data', 'hotel_metrics_local.db'),
  'C:\\ProgramData\\HotelMetricsPro\\data\\hotel_metrics_local.db',
];

const ALL_MODULES = [
  'administration-utilisateurs', 'parametrage-global', 'unites-hotelieres',
  'recettes-journalieres', 'encaissements-tresorerie', 'budget-previsions',
  'hebergement-occupation', 'facturation', 'creances-recouvrement', 'contrats-conventions',
  'stocks-consommations', 'achats-approvisionnements', 'maintenance-interventions',
  'rh-productivite', 'tarifs-conventions', 'audit-controle-interne', 'journal-anomalies',
  'decisions-instructions', 'qualite-reclamations', 'plage-piscine', 'parking', 'portmaster',
  'clients', 'commercial-partenariats', 'tableaux-bord-directionnels', 'rapports-automatiques',
  'alertes-notifications', 'comparatif-inter-unites', 'gestion-documentaire',
  'sauvegarde-restauration', 'synchronisation-multi-postes', 'journalisation-tracabilite',
];

const force = process.argv.includes('--force');

function findDb() {
  for (const p of DB_CANDIDATES) {
    if (existsSync(p)) return p;
  }
  return null;
}

function applyMigrations(db) {
  const dir = path.join(root, 'electron', 'database', 'migrations');
  const pending = readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .filter((f) => !db.prepare('SELECT 1 FROM schema_migrations WHERE name = ?').get(f));
  for (const file of pending) {
    const sql = readFileSync(path.join(dir, file), 'utf-8');
    db.transaction(() => {
      db.exec(sql);
      db.prepare('INSERT INTO schema_migrations (name) VALUES (?)').run(file);
    })();
    console.log('Migration:', file);
  }
}

function count(db, table) {
  try {
    return db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get().c;
  } catch {
    return 0;
  }
}

function today(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function monthYear() {
  const d = new Date();
  return { mois: d.getMonth() + 1, annee: d.getFullYear() };
}

function seedHotels(db) {
  const insert = db.prepare(`
    INSERT INTO hotels (uuid, code, name, city, is_active, created_by, updated_by)
    VALUES (?, ?, ?, ?, 1, NULL, NULL)
  `);
  const hotels = [
    ['AZUR', 'Hôtel Azur Palace', 'Alger'],
    ['OASIS', 'Hôtel Oasis', 'Oran'],
    ['CORAL', 'Résidence Le Corail', 'Béjaïa'],
  ];
  let added = 0;
  for (const [code, name, city] of hotels) {
    const exists = db.prepare(`SELECT id FROM hotels WHERE code = ?`).get(code);
    if (!exists) {
      insert.run(randomUUID(), code, name, city);
      added++;
    }
  }
  console.log(`Hôtels: +${added} (total ${count(db, 'hotels')})`);
  return db.prepare(`SELECT id, code, name FROM hotels WHERE is_active = 1 AND code != 'SIEGE' ORDER BY id`).all();
}

function seedPms(db, hotels) {
  if (count(db, 'chambres') > 0 && !force) {
    console.log(`PMS: déjà ${count(db, 'chambres')} chambres — ignoré`);
    return;
  }
  if (force) {
    db.exec(`DELETE FROM reservations; DELETE FROM tarifs_journaliers; DELETE FROM chambres; DELETE FROM types_chambres; DELETE FROM plans_tarifaires`);
  }

  const insType = db.prepare(`INSERT INTO types_chambres (hotel_id, code, label, capacite, tarif_base, description, actif) VALUES (?, ?, ?, ?, ?, ?, 1)`);
  const insCh = db.prepare(`INSERT INTO chambres (hotel_id, type_chambre_id, numero, etage, statut, actif) VALUES (?, ?, ?, ?, ?, 1)`);
  const insPlan = db.prepare(`INSERT INTO plans_tarifaires (hotel_id, code, label, type_plan, priorite, actif) VALUES (?, ?, ?, 'BASIQUE', 10, 1)`);
  const insTarif = db.prepare(`INSERT INTO tarifs_journaliers (hotel_id, type_chambre_id, plan_id, formule_id, date_application, prix_base, prix_personne_supp) VALUES (?, ?, ?, NULL, ?, ?, 1500)`);

  for (const hotel of hotels) {
    const dbl = insType.run(hotel.id, 'DBL', 'Double standard', 2, 14000, 'Vue mer').lastInsertRowid;
    const sgl = insType.run(hotel.id, 'SGL', 'Simple', 1, 9500, 'Standard').lastInsertRowid;
    const ste = insType.run(hotel.id, 'STE', 'Suite', 4, 28000, 'Suite junior').lastInsertRowid;
    for (let i = 1; i <= 8; i++) insCh.run(hotel.id, dbl, `1${String(i).padStart(2, '0')}`, 1, i <= 3 ? 'occupee' : 'libre');
    for (let i = 1; i <= 4; i++) insCh.run(hotel.id, sgl, `2${String(i).padStart(2, '0')}`, 2, 'libre');
    for (let i = 1; i <= 2; i++) insCh.run(hotel.id, ste, `3${String(i).padStart(2, '0')}`, 3, 'libre');
    const planId = insPlan.run(hotel.id, 'BAR', 'Meilleur tarif').lastInsertRowid;
    insPlan.run(hotel.id, 'CORP', 'Tarif entreprise');
    for (let d = -15; d < 45; d++) {
      const ds = today(d);
      insTarif.run(hotel.id, dbl, planId, ds, 14000);
      insTarif.run(hotel.id, sgl, planId, ds, 9500);
      insTarif.run(hotel.id, ste, planId, ds, 28000);
    }
  }
  console.log(`PMS: ${count(db, 'chambres')} chambres, ${count(db, 'tarifs_journaliers')} tarifs`);
}

function seedClients(db) {
  const rows = [
    ['particulier', 'Benali Ahmed', null, 'benali@example.dz', '0555123456', null],
    ['particulier', 'Khelifi Fatima', null, 'khelifi@example.dz', '0666789012', null],
    ['entreprise', 'SARL Atlas Voyages', 'SARL Atlas Voyages', 'contact@atlas-voyages.dz', '021987654', '1234567890123'],
    ['entreprise', 'SONATRACH Division Hôtelière', 'SONATRACH', 'hotels@sonatrach.dz', '021445566', '9876543210987'],
    ['particulier', 'Meziane Karim', null, 'k.meziane@mail.dz', '0771234567', null],
  ];
  const ins = db.prepare(`INSERT INTO clients_facturation (type, nom, raison_sociale, email, telephone, nif) VALUES (?, ?, ?, ?, ?, ?)`);
  let added = 0;
  for (const r of rows) {
    const exists = db.prepare(`SELECT id FROM clients_facturation WHERE email = ? AND deleted_at IS NULL`).get(r[3]);
    if (!exists) { ins.run(...r); added++; }
  }
  console.log(`Clients: +${added} (total ${count(db, 'clients_facturation')})`);
  return db.prepare(`SELECT id, nom FROM clients_facturation WHERE deleted_at IS NULL`).all();
}

function seedReservations(db, hotels, clients) {
  if (count(db, 'reservations') >= 5 && !force) {
    console.log(`Réservations: déjà ${count(db, 'reservations')} — ignoré`);
    return;
  }
  if (force) db.exec(`DELETE FROM reservations`);

  const ins = db.prepare(`
    INSERT INTO reservations (hotel_id, chambre_id, client_id, date_arrivee, date_depart, nb_nuits, nb_adultes,
      client_nom, client_email, client_telephone, montant_total, montant_paye, statut, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const stats = ['confirmee', 'arrivee', 'provisoire', 'depart'];
  let n = 0;
  for (const hotel of hotels.slice(0, 2)) {
    const chambres = db.prepare(`SELECT id FROM chambres WHERE hotel_id = ? LIMIT 4`).all(hotel.id);
    const client = clients[n % clients.length];
    for (let i = 0; i < chambres.length; i++) {
      const arrivee = today(-2 + i);
      const depart = today(2 + i);
      const mt = 14000 * (4 + i);
      ins.run(hotel.id, chambres[i].id, client.id, arrivee, depart, 4 + i, 2,
        client.nom, 'guest@example.dz', '0555000000', mt, i % 2 === 0 ? mt : mt * 0.5, stats[i % stats.length], 'direct');
      n++;
    }
  }
  console.log(`Réservations: ${count(db, 'reservations')}`);
}

function seedRecettes(db, hotels) {
  if (count(db, 'recettes_journalieres') > 50 && !force) {
    console.log(`Recettes: déjà ${count(db, 'recettes_journalieres')} lignes — ignoré`);
    return;
  }
  if (force) db.exec(`DELETE FROM recettes_journalieres WHERE observation = 'DEMO_SEED'`);

  const rubriques = db.prepare(`SELECT id, code FROM rubriques ORDER BY sort_order`).all();
  const ins = db.prepare(`
    INSERT INTO recettes_journalieres (uuid, hotel_id, rubrique_id, date_journal, montant, observation, statut, encaissement_ht, chambres, nuitees, couverts, sync_status)
    VALUES (?, ?, ?, ?, ?, 'DEMO_SEED', 'validated', ?, ?, ?, ?, 'synced')
  `);

  for (const hotel of hotels) {
    for (let d = -30; d < 0; d++) {
      const date = today(d);
      for (const rub of rubriques) {
        const base = rub.code === 'HEBERGEMENT' ? 180000 : rub.code === 'RESTAURATION' ? 85000 : 25000;
        const montant = base + (hotel.id * 1000) + Math.abs(d) * 500;
        ins.run(randomUUID(), hotel.id, rub.id, date, montant, montant * 0.92,
          rub.code === 'HEBERGEMENT' ? 45 : 0,
          rub.code === 'HEBERGEMENT' ? 38 : 0,
          rub.code === 'RESTAURATION' ? 120 : 0);
      }
    }
  }
  console.log(`Recettes: ${count(db, 'recettes_journalieres')} lignes`);
}

function seedObjectifs(db, hotels) {
  const { mois, annee } = monthYear();
  const ins = db.prepare(`
    INSERT OR IGNORE INTO objectifs (uuid, hotel_id, mois, annee, objectif_hebergement, objectif_restauration, objectif_boissons, objectif_autres, capacite_chambres, prix_moyen_chambre)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const hotel of hotels) {
    ins.run(randomUUID(), hotel.id, mois, annee, 4500000, 2200000, 800000, 400000, 14, 13500);
    ins.run(randomUUID(), hotel.id, mois, annee - 1, 4200000, 2000000, 750000, 350000, 14, 12800);
  }
  console.log(`Objectifs: ${count(db, 'objectifs')}`);
}

function seedTresorerie(db, hotels, adminId) {
  if (count(db, 'encaissements') >= 10 && !force) {
    console.log(`Trésorerie: déjà ${count(db, 'encaissements')} encaissements — ignoré`);
    return;
  }
  if (force) db.exec(`DELETE FROM encaissements WHERE description = 'DEMO_SEED'; DELETE FROM journal_caisse WHERE libelle = 'DEMO_SEED'`);

  const insCompte = db.prepare(`INSERT INTO comptes_bancaires (hotel_id, intitule, banque, numero_compte, solde_initial) VALUES (?, ?, ?, ?, ?)`);
  const insEnc = db.prepare(`
    INSERT INTO encaissements (hotel_id, date_encaissement, montant, mode, reference, description, statut, created_by)
    VALUES (?, ?, ?, ?, ?, 'DEMO_SEED', ?, ?)
  `);
  const insJournal = db.prepare(`INSERT INTO journal_caisse (hotel_id, date_operation, libelle, entree, sortie, created_by) VALUES (?, ?, 'DEMO_SEED', ?, ?, ?)`);

  const modes = ['especes', 'cheque', 'virement', 'carte'];
  const stats = ['valide', 'valide', 'en_attente'];
  for (const hotel of hotels) {
    let compteId = db.prepare(`SELECT id FROM comptes_bancaires WHERE hotel_id = ?`).get(hotel.id)?.id;
    if (!compteId) {
      compteId = insCompte.run(hotel.id, 'Compte principal', 'BNA', `00${hotel.id}0012345678`, 500000).lastInsertRowid;
    }
    for (let i = 0; i < 12; i++) {
      insEnc.run(hotel.id, today(-i * 2), 45000 + i * 3200, modes[i % modes.length], `ENC-${hotel.id}-${i}`, stats[i % stats.length], adminId);
      insJournal.run(hotel.id, today(-i), 45000 + i * 1000, i % 4 === 0 ? 5000 : 0, adminId);
    }
  }
  console.log(`Trésorerie: ${count(db, 'encaissements')} encaissements, ${count(db, 'comptes_bancaires')} comptes`);
}

function seedFacturation(db, hotels, clients, adminId) {
  if (count(db, 'factures') >= 5 && !force) {
    console.log(`Facturation: déjà ${count(db, 'factures')} factures — ignoré`);
    return;
  }
  if (force) db.exec(`DELETE FROM lignes_facture; DELETE FROM paiements_facture; DELETE FROM factures WHERE notes = 'DEMO_SEED'`);

  const insFact = db.prepare(`
    INSERT INTO factures (uuid, hotel_id, client_id, client_nom, numero, date_emission, date_echeance, statut, montant_ht, montant_tva, montant_ttc, montant_paye, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DEMO_SEED', ?)
  `);
  const insLigne = db.prepare(`
    INSERT INTO lignes_facture (facture_id, designation, quantite, prix_unitaire, taux_tva, montant_ht, montant_tva, montant_ttc, ordre)
    VALUES (?, ?, ?, ?, 19, ?, ?, ?, ?)
  `);
  const insPaiement = db.prepare(`INSERT INTO paiements_facture (facture_id, date_paiement, montant, mode, created_by) VALUES (?, ?, ?, ?, ?)`);

  const statuts = ['brouillon', 'soumise', 'validee', 'payee'];
  let seq = count(db, 'factures') + 1;
  for (const hotel of hotels) {
    for (let i = 0; i < 4; i++) {
      const client = clients[i % clients.length];
      const ht = 120000 + i * 15000;
      const tva = Math.round(ht * 0.19);
      const ttc = ht + tva;
      const statut = statuts[i % statuts.length];
      const numero = `FAC-2026-${String(seq++).padStart(4, '0')}`;
      const factId = insFact.run(randomUUID(), hotel.id, client.id, client.nom, numero, today(-i * 5), today(30 - i * 5),
        statut, ht, tva, ttc, statut === 'payee' ? ttc : statut === 'validee' ? ttc * 0.5 : 0, adminId).lastInsertRowid;
      insLigne.run(factId, 'Hébergement chambre double', 3, 40000, 120000, 22800, 142800, 1);
      if (statut === 'payee') insPaiement.run(factId, today(-i), ttc, 'virement', adminId);
    }
  }
  console.log(`Facturation: ${count(db, 'factures')} factures`);
}

function seedStocks(db, hotels, adminId) {
  if (count(db, 'stock_produits') >= 5 && !force) {
    console.log(`Stocks: déjà ${count(db, 'stock_produits')} produits — ignoré`);
    return;
  }
  if (force) db.exec(`DELETE FROM stock_mouvements; DELETE FROM stock_niveaux; DELETE FROM stock_produits; DELETE FROM stock_categories`);

  let catId = db.prepare(`SELECT id FROM stock_categories WHERE code = 'GENERAL'`).get()?.id;
  if (!catId) catId = db.prepare(`INSERT INTO stock_categories (code, label) VALUES ('GENERAL', 'Général')`).run().lastInsertRowid;

  const produits = [
    ['LINGE-001', 'Drap housse 160', 'pièce', 2500, 50],
    ['LINGE-002', 'Serviette bain', 'pièce', 1200, 100],
    ['BAR-001', 'Eau minérale 1L', 'carton', 800, 30],
    ['BAR-002', 'Café moulu 1kg', 'kg', 3500, 20],
    ['MEN-001', 'Produit entretien sol', 'litre', 1800, 15],
    ['PISC-001', 'Chlore piscine', 'kg', 4200, 10],
  ];
  const insProd = db.prepare(`INSERT INTO stock_produits (code, designation, categorie_id, unite, prix_unitaire, seuil_alerte) VALUES (?, ?, ?, ?, ?, ?)`);
  const insNiv = db.prepare(`INSERT INTO stock_niveaux (hotel_id, produit_id, quantite) VALUES (?, ?, ?)`);
  const insMvt = db.prepare(`INSERT INTO stock_mouvements (hotel_id, produit_id, type_mouvement, quantite, prix_unitaire, montant, motif, saisi_par) VALUES (?, ?, 'entree', ?, ?, ?, 'DEMO_SEED', ?)`);

  for (const [code, des, unite, prix, seuil] of produits) {
    let prodId = db.prepare(`SELECT id FROM stock_produits WHERE code = ?`).get(code)?.id;
    if (!prodId) prodId = insProd.run(code, des, catId, unite, prix, seuil).lastInsertRowid;
    for (const hotel of hotels) {
      const qte = 40 + hotel.id * 5;
      db.prepare(`INSERT OR REPLACE INTO stock_niveaux (hotel_id, produit_id, quantite) VALUES (?, ?, ?)`).run(hotel.id, prodId, qte);
      insMvt.run(hotel.id, prodId, qte, prix, qte * prix, adminId);
    }
  }
  console.log(`Stocks: ${count(db, 'stock_produits')} produits`);
}

function seedAchats(db, hotels, adminId) {
  if (count(db, 'bons_commande') >= 3 && !force) {
    console.log(`Achats: déjà ${count(db, 'bons_commande')} bons — ignoré`);
    return;
  }

  const fournisseurs = [
    ['FOUR-001', 'Distributeur Hôtel Pro', 'M. Boudiaf', 'contact@hotelpro.dz'],
    ['FOUR-002', 'Alimentaire Méditerranée', 'Mme Saadi', 'achats@medfood.dz'],
  ];
  const insFour = db.prepare(`INSERT OR IGNORE INTO fournisseurs (code, raison_sociale, contact_nom, email) VALUES (?, ?, ?, ?)`);
  for (const f of fournisseurs) insFour.run(...f);
  const fournisseurId = db.prepare(`SELECT id FROM fournisseurs WHERE code = 'FOUR-001'`).get().id;

  const insBc = db.prepare(`
    INSERT INTO bons_commande (numero, hotel_id, fournisseur_id, statut, date_commande, montant_ht, montant_tva, montant_ttc, notes, cree_par)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'DEMO_SEED', ?)
  `);
  const stats = ['brouillon', 'valide', 'envoye', 'recu'];
  for (let i = 0; i < hotels.length; i++) {
    const ht = 85000 + i * 12000;
    const tva = Math.round(ht * 0.19);
    insBc.run(`BC-2026-${String(i + 1).padStart(3, '0')}`, hotels[i].id, fournisseurId, stats[i % stats.length], today(-i * 3), ht, tva, ht + tva, adminId);
  }
  console.log(`Achats: ${count(db, 'bons_commande')} bons, ${count(db, 'fournisseurs')} fournisseurs`);
}

function seedMaintenance(db, hotels, adminId) {
  if (count(db, 'equipements') >= 3 && !force) return;

  const insEq = db.prepare(`INSERT INTO equipements (hotel_id, code, designation, categorie, localisation, statut) VALUES (?, ?, ?, ?, ?, 'operationnel')`);
  const insInt = db.prepare(`
    INSERT INTO interventions (hotel_id, equipement_id, type_intervention, titre, description, priorite, statut, technicien_id, cree_par)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const hotel of hotels) {
    const eq1 = insEq.run(hotel.id, `CLIM-${hotel.id}`, 'Climatisation hall', 'climatisation', 'Hall principal').lastInsertRowid;
    const eq2 = insEq.run(hotel.id, `PISC-${hotel.id}`, 'Pompe piscine', 'piscine', 'Espace piscine').lastInsertRowid;
    insInt.run(hotel.id, eq1, 'preventive', 'Entretien clim annuel', 'Revision compresseur', 'normale', 'planifiee', adminId, adminId);
    insInt.run(hotel.id, eq2, 'corrective', 'Fuite pompe piscine', 'Joint à remplacer', 'haute', 'en_cours', adminId, adminId);
  }
  console.log(`Maintenance: ${count(db, 'equipements')} équipements, ${count(db, 'interventions')} interventions`);
}

function seedCommercial(db, hotels, adminId) {
  if (count(db, 'partenaires') >= 2 && !force) return;

  const insP = db.prepare(`INSERT OR IGNORE INTO partenaires (code, raison_sociale, type, contact_nom, email, remise_pct) VALUES (?, ?, ?, ?, ?, ?)`);
  insP.run('AG-ATLAS', 'Atlas Voyages DZ', 'agence', 'Directeur commercial', 'b2b@atlas.dz', 12);
  insP.run('OP-SONATR', 'SONATRACH Séjours', 'entreprise', 'M. Larbi', 'sejours@sonatrach.dz', 8);
  const partId = db.prepare(`SELECT id FROM partenaires WHERE code = 'AG-ATLAS'`).get().id;

  const insOpp = db.prepare(`
    INSERT INTO opportunites (hotel_id, partenaire_id, titre, type, statut, montant_estime, probabilite, commercial_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const types = ['groupe', 'evenement', 'contrat_annuel'];
  const stats = ['prospect', 'en_negociation', 'gagne'];
  for (let i = 0; i < hotels.length; i++) {
    insOpp.run(hotels[i].id, partId, `Groupe ${i + 1} — 40 pax`, types[i % types.length], stats[i % stats.length], 2500000 + i * 500000, 40 + i * 20, adminId);
  }
  console.log(`Commercial: ${count(db, 'partenaires')} partenaires, ${count(db, 'opportunites')} opportunités`);
}

function seedParkingPlage(db, hotels, adminId) {
  for (const hotel of hotels) {
    db.prepare(`INSERT OR IGNORE INTO parking_config (hotel_id, capacite, tarif_heure, tarif_jour, tarif_nuit) VALUES (?, 80, 200, 1500, 2500)`).run(hotel.id);
    db.prepare(`INSERT OR IGNORE INTO plage_config (hotel_id, capacite_plage, capacite_piscine, tarif_adulte, tarif_enfant, tarif_resident) VALUES (?, 120, 60, 800, 400, 500)`).run(hotel.id);

    if (count(db, 'parking_tickets') < hotels.length * 3) {
      db.prepare(`INSERT INTO parking_tickets (hotel_id, immatriculation, type_vehicule, entree_at, sortie_at, duree_minutes, montant, statut) VALUES (?, ?, 'voiture', datetime('now', ?), ?, ?, ?, ?)`)
        .run(hotel.id, `16${hotel.id}-123-AB-${hotel.id}`, `-${2 + hotel.id} hours`, hotel.id % 2 === 0 ? null : `datetime('now')`, hotel.id % 2 === 0 ? null : 120, hotel.id % 2 === 0 ? null : 1500, hotel.id % 2 === 0 ? 'en_cours' : 'termine');
    }
    if (count(db, 'plage_entrees') < hotels.length * 3) {
      db.prepare(`INSERT INTO plage_entrees (hotel_id, zone, date_entree, nb_adultes, nb_enfants, nb_residents, montant, saisi_par) VALUES (?, 'les_deux', ?, ?, ?, ?, ?, ?)`)
        .run(hotel.id, today(-hotel.id), 15 + hotel.id, 4, 2, 12000 + hotel.id * 500, adminId);
    }
  }
  console.log(`Parking: ${count(db, 'parking_tickets')} tickets | Plage: ${count(db, 'plage_entrees')} entrées`);
}

function seedQualiteControle(db, hotels, adminId) {
  if (count(db, 'anomalies') >= 3 && !force) return;

  const insA = db.prepare(`INSERT INTO anomalies (hotel_id, titre, description, categorie, severite, statut, signale_par) VALUES (?, ?, ?, ?, ?, ?, ?)`);
  insA.run(hotels[0].id, 'Écart caisse soir', 'Différence de 2 500 DZD', 'incident', 'mineure', 'ouverte', adminId);
  insA.run(hotels[0].id, 'Chambre 102 — clim HS', 'Client signalé panne', 'materiel', 'majeure', 'en_cours', adminId);
  insA.run(hotels[1]?.id ?? hotels[0].id, 'Température chambre froide', 'Chauffage défaillant', 'materiel', 'majeure', 'resolue', adminId);

  const insD = db.prepare(`INSERT INTO decisions (hotel_id, type, titre, contenu, priorite, statut, auteur_id) VALUES (?, ?, ?, ?, ?, 'active', ?)`);
  insD.run(null, 'circulaire', 'Consignes haute saison', 'Renforcer les contrôles de caisse et accueil.', 'haute', adminId);
  insD.run(hotels[0].id, 'instruction', 'Procédure check-in express', 'Valider identité et paiement avant remise clés.', 'normale', adminId);

  const insR = db.prepare(`
    INSERT INTO reclamations (hotel_id, reference, client_nom, client_email, canal, categorie, objet, description, priorite, statut, assigne_a)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const refs = ['REC-2026-001', 'REC-2026-002', 'REC-2026-003'];
  const cats = ['chambre', 'restauration', 'service'];
  for (let i = 0; i < 3; i++) {
    const exists = db.prepare(`SELECT id FROM reclamations WHERE reference = ?`).get(refs[i]);
    if (!exists) {
      insR.run(hotels[i % hotels.length].id, refs[i], `Client ${i + 1}`, `client${i}@mail.dz`, 'reception', cats[i],
        `Réclamation test ${i + 1}`, 'Description détaillée de la réclamation.', 'normale', i === 2 ? 'resolue' : 'ouverte', adminId);
    }
  }
  console.log(`Anomalies: ${count(db, 'anomalies')} | Décisions: ${count(db, 'decisions')} | Réclamations: ${count(db, 'reclamations')}`);
}

function seedGed(db, hotels, adminId) {
  if (count(db, 'ged_documents') >= 3 && !force) return;

  const catId = db.prepare(`SELECT id FROM ged_categories WHERE code = 'contrats'`).get()?.id ?? 1;
  const ins = db.prepare(`
    INSERT INTO ged_documents (hotel_id, categorie_id, titre, nom_fichier, chemin, taille_octets, mime_type, uploaded_by, date_document)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const docs = [
    ['Convention Atlas Voyages 2026', 'convention-atlas-2026.pdf'],
    ['Contrat maintenance clim', 'contrat-clim.pdf'],
    ['Règlement intérieur', 'reglement.pdf'],
  ];
  for (let i = 0; i < docs.length; i++) {
    const [titre, fichier] = docs[i];
    const exists = db.prepare(`SELECT id FROM ged_documents WHERE titre = ?`).get(titre);
    if (!exists) {
      ins.run(hotels[i % hotels.length].id, catId, titre, fichier, `ged/demo/${fichier}`, 125000, 'application/pdf', adminId, today(-i * 10));
    }
  }
  console.log(`GED: ${count(db, 'ged_documents')} documents`);
}

function seedPort(db) {
  if (count(db, 'port_bateaux') > 0 && !force) {
    console.log(`PortMaster: déjà ${count(db, 'port_bateaux')} bateaux — ignoré`);
    return;
  }
  // Données minimales si portSeed pas encore exécuté
  const insEmp = db.prepare(`INSERT INTO port_emplacements (uuid, code, label, zone, longueur_max_m, statut) VALUES (?, ?, ?, ?, ?, ?)`);
  const empId = insEmp.run(randomUUID(), 'Q-D01', 'Quai démo 01', 'Quai D', 20, 'libre').lastInsertRowid;
  const bateauId = db.prepare(`
    INSERT INTO port_bateaux (uuid, nom, immatriculation, type_navire, proprietaire, longueur_m, statut)
    VALUES (?, 'Bateau Démo', 'DZ-DEMO-01', 'Yacht', 'Demo Owner', 15, 'actif')
  `).run(randomUUID()).lastInsertRowid;
  db.prepare(`
    INSERT INTO port_contrats (uuid, numero, bateau_id, emplacement_id, date_debut, date_fin, montant_mensuel, montant_total, statut)
    VALUES (?, 'CTR-DEMO-001', ?, ?, date('now'), date('now', '+6 months'), 45000, 270000, 'actif')
  `).run(randomUUID(), bateauId, empId);
  console.log(`PortMaster: ${count(db, 'port_bateaux')} bateaux`);
}

function enableAllModules(db) {
  const ins = db.prepare(`INSERT INTO modules_config (module_id, is_enabled) VALUES (?, 1) ON CONFLICT(module_id) DO UPDATE SET is_enabled = 1`);
  for (const id of ALL_MODULES) ins.run(id);
  console.log(`Modules: ${ALL_MODULES.length} activés`);
}

// ─── Main ───────────────────────────────────────────────────────────────────

const dbPath = findDb();
if (!dbPath) {
  console.error('FAIL: base introuvable — lancez npm run dev une fois.');
  process.exit(1);
}

console.log('DB:', dbPath);
const db = new Database(dbPath);
applyMigrations(db);

const admin = db.prepare(`SELECT id FROM users WHERE email = 'admin@hotelmetrics.local' COLLATE NOCASE`).get();
const adminId = admin?.id ?? 1;

console.log('\n=== Seed démo complet ===\n');

const hotels = seedHotels(db);
if (!hotels.length) {
  console.error('Aucun hôtel opérationnel.');
  process.exit(1);
}

enableAllModules(db);
seedPms(db, hotels);
const clients = seedClients(db);
seedReservations(db, hotels, clients);
seedRecettes(db, hotels);
seedObjectifs(db, hotels);
seedTresorerie(db, hotels, adminId);
seedFacturation(db, hotels, clients, adminId);
seedStocks(db, hotels, adminId);
seedAchats(db, hotels, adminId);
seedMaintenance(db, hotels, adminId);
seedCommercial(db, hotels, adminId);
seedParkingPlage(db, hotels, adminId);
seedQualiteControle(db, hotels, adminId);
seedGed(db, hotels, adminId);
seedPort(db);

db.prepare(`INSERT OR REPLACE INTO app_settings (key, value) VALUES ('demo_full_seed_v1', datetime('now'))`).run();

console.log('\n=== Résumé final ===');
const summary = {
  hotels: count(db, 'hotels'),
  chambres: count(db, 'chambres'),
  reservations: count(db, 'reservations'),
  clients: count(db, 'clients_facturation'),
  factures: count(db, 'factures'),
  encaissements: count(db, 'encaissements'),
  recettes: count(db, 'recettes_journalieres'),
  rh_employes: count(db, 'rh_employes'),
  stock_produits: count(db, 'stock_produits'),
  anomalies: count(db, 'anomalies'),
  reclamations: count(db, 'reclamations'),
  port_bateaux: count(db, 'port_bateaux'),
};
console.log(summary);
console.log('\nSeed terminé — relancez l\'application pour tester.');

db.close();
