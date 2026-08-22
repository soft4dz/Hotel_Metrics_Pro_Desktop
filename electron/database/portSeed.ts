import { bcrypt } from '../utils/bcrypt';
import { randomBytes, randomUUID } from 'node:crypto';
import { getDatabase } from './sqlite';
import { logger } from '../utils/logger';

const PORT_DEMO_EMAIL = 'port@raqmi.local';

function generateDemoPassword(): string {
  return `Port-${randomBytes(8).toString('base64url')}!1`;
}

export function runPortSeedIfNeeded(): void {
  const db = getDatabase();

  const disabled = db
    .prepare(`SELECT value FROM app_settings WHERE key = 'demo_seeds_disabled'`)
    .get() as { value: string } | undefined;
  if (disabled?.value === '1') {
    logger.debug('Seed PortMaster ignoré : données démo désactivées.');
    return;
  }

  const row = db.prepare(`SELECT COUNT(*) AS c FROM port_bateaux`).get() as { c: number };
  if (row.c > 0) {
    logger.debug('Seed PortMaster ignoré : données déjà présentes.');
    return;
  }

  logger.info('Seed PortMaster (données de démonstration)...');

  const insertEmp = db.prepare(`
    INSERT INTO port_emplacements (uuid, code, label, zone, longueur_max_m, statut)
    VALUES (@uuid, @code, @label, @zone, @longueur_max_m, @statut)
  `);

  const emplacements = [
    { code: 'Q-A01', label: 'Quai A — Poste 01', zone: 'Quai A', longueur_max_m: 18, statut: 'occupe' },
    { code: 'Q-A02', label: 'Quai A — Poste 02', zone: 'Quai A', longueur_max_m: 22, statut: 'libre' },
    { code: 'Q-B01', label: 'Quai B — Poste 01', zone: 'Quai B', longueur_max_m: 15, statut: 'occupe' },
    { code: 'Q-B02', label: 'Quai B — Poste 02', zone: 'Quai B', longueur_max_m: 12, statut: 'maintenance' },
    { code: 'Q-C01', label: 'Quai C — Poste 01', zone: 'Quai C', longueur_max_m: 25, statut: 'occupe' },
    { code: 'Q-C02', label: 'Quai C — Poste 02', zone: 'Quai C', longueur_max_m: 30, statut: 'libre' },
  ];

  const empIds: number[] = [];
  for (const e of emplacements) {
    const r = insertEmp.run({ uuid: randomUUID(), ...e });
    empIds.push(Number(r.lastInsertRowid));
  }

  const insertBateau = db.prepare(`
    INSERT INTO port_bateaux (
      uuid, nom, immatriculation, type_navire, proprietaire,
      contact_email, contact_tel, longueur_m, statut
    ) VALUES (
      @uuid, @nom, @immatriculation, @type_navire, @proprietaire,
      @contact_email, @contact_tel, @longueur_m, 'actif'
    )
  `);

  const bateaux = [
    {
      nom: 'Azur Explorer',
      immatriculation: 'DZ-PM-2401',
      type_navire: 'Yacht',
      proprietaire: 'SARL Méditerranée',
      contact_email: 'contact@mediterranee.dz',
      contact_tel: '+213 555 12 34 56',
      longueur_m: 16,
    },
    {
      nom: 'Sidra Star',
      immatriculation: 'DZ-PM-1988',
      type_navire: 'Pêche côtière',
      proprietaire: 'Coopérative Sidra',
      contact_email: 'coop.sidra@mail.dz',
      contact_tel: '+213 555 98 76 54',
      longueur_m: 12,
    },
    {
      nom: 'Oued El Harrach',
      immatriculation: 'DZ-PM-3102',
      type_navire: 'Bateau de plaisance',
      proprietaire: 'M. Benali K.',
      contact_email: null,
      contact_tel: '+213 555 11 22 33',
      longueur_m: 8,
    },
    {
      nom: 'PortMaster One',
      immatriculation: 'DZ-PM-0001',
      type_navire: 'Navire de service',
      proprietaire: 'EGT Sid Fredj',
      contact_email: 'port@egt-sidifredj.dz',
      contact_tel: '+213 21 00 00 00',
      longueur_m: 20,
    },
  ];

  const bateauIds: number[] = [];
  for (const b of bateaux) {
    const r = insertBateau.run({ uuid: randomUUID(), ...b });
    bateauIds.push(Number(r.lastInsertRowid));
  }

  const insertContrat = db.prepare(`
    INSERT INTO port_contrats (
      uuid, numero, bateau_id, emplacement_id, date_debut, date_fin,
      montant_mensuel, montant_total, statut, observation
    ) VALUES (
      @uuid, @numero, @bateau_id, @emplacement_id, @date_debut, @date_fin,
      @montant_mensuel, @montant_total, @statut, @observation
    )
  `);

  const contrats = [
    {
      numero: 'CTR-2026-001',
      bateau_id: bateauIds[0],
      emplacement_id: empIds[0],
      date_debut: '2026-01-01',
      date_fin: '2026-12-31',
      montant_mensuel: 85000,
      montant_total: 1020000,
      statut: 'actif',
      observation: 'Contrat annuel — yacht',
    },
    {
      numero: 'CTR-2026-002',
      bateau_id: bateauIds[1],
      emplacement_id: empIds[2],
      date_debut: '2026-02-01',
      date_fin: '2026-08-31',
      montant_mensuel: 45000,
      montant_total: 315000,
      statut: 'actif',
      observation: 'Saison pêche',
    },
    {
      numero: 'CTR-2025-099',
      bateau_id: bateauIds[3],
      emplacement_id: empIds[4],
      date_debut: '2025-06-01',
      date_fin: '2026-05-31',
      montant_mensuel: 120000,
      montant_total: 1440000,
      statut: 'actif',
      observation: 'Navire de service portuaire',
    },
  ];

  const contratIds: number[] = [];
  for (const c of contrats) {
    const r = insertContrat.run({ uuid: randomUUID(), ...c });
    contratIds.push(Number(r.lastInsertRowid));
  }

  const insertEnc = db.prepare(`
    INSERT INTO port_encaissements (uuid, contrat_id, date_encaissement, montant, mode_paiement, reference)
    VALUES (@uuid, @contrat_id, @date_encaissement, @montant, @mode_paiement, @reference)
  `);

  insertEnc.run({
    uuid: randomUUID(),
    contrat_id: contratIds[0],
    date_encaissement: '2026-01-15',
    montant: 255000,
    mode_paiement: 'Virement',
    reference: 'VIR-2026-001',
  });
  insertEnc.run({
    uuid: randomUUID(),
    contrat_id: contratIds[0],
    date_encaissement: '2026-03-10',
    montant: 170000,
    mode_paiement: 'Chèque',
    reference: 'CHQ-8842',
  });
  insertEnc.run({
    uuid: randomUUID(),
    contrat_id: contratIds[1],
    date_encaissement: '2026-02-05',
    montant: 90000,
    mode_paiement: 'Espèces',
    reference: 'ESP-2026-02',
  });
  insertEnc.run({
    uuid: randomUUID(),
    contrat_id: contratIds[2],
    date_encaissement: '2025-07-01',
    montant: 720000,
    mode_paiement: 'Virement',
    reference: 'VIR-2025-PORT',
  });

  const rolePort = db.prepare(`SELECT id FROM roles WHERE code = 'RESPONSABLE_PORT'`).get() as
    | { id: number }
    | undefined;
  const hasPortUser = db
    .prepare(`SELECT 1 FROM users WHERE email = 'port@raqmi.local' COLLATE NOCASE`)
    .get();
  if (rolePort && !hasPortUser) {
    const demoPassword = generateDemoPassword();
    db.prepare(
      `
      INSERT INTO users (uuid, email, password_hash, full_name, role_id, is_active, must_change_password)
      VALUES (@uuid, @email, @password_hash, @full_name, @role_id, 1, 1)
    `,
    ).run({
      uuid: randomUUID(),
      email: PORT_DEMO_EMAIL,
      password_hash: bcrypt.hashSync(demoPassword, 12),
      full_name: 'Responsable port (démo)',
      role_id: rolePort.id,
    });
    logger.info(`Compte port créé : ${PORT_DEMO_EMAIL} — mot de passe dans les logs serveur (usage unique).`);
  }

  db.prepare(
    `INSERT OR REPLACE INTO app_settings (key, value) VALUES ('port_seed_completed', '1')`,
  ).run();

  logger.info('Seed PortMaster terminé (6 emplacements, 4 bateaux, 3 contrats).');
}
