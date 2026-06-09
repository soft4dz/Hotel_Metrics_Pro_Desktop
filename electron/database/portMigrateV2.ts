import { randomUUID } from 'node:crypto';
import { getDatabase } from './sqlite';
import { logger } from '../utils/logger';

/** Migre les données Phase 6 vers le référentiel hiérarchique + clients. */
export function runPortMigrateV2(): void {
  const db = getDatabase();
  const done = db
    .prepare(`SELECT value FROM app_settings WHERE key = 'port_migrate_v2'`)
    .get() as { value: string } | undefined;
  if (done?.value === '1') return;

  const bassinCount = db.prepare(`SELECT COUNT(*) AS c FROM port_bassins`).get() as {
    c: number;
  };
  if (bassinCount.c === 0) {
    const bassinId = Number(
      db
        .prepare(
          `INSERT INTO port_bassins (uuid, code, label, description) VALUES (?, 'B1', 'Bassin principal', 'Port de plaisance')`,
        )
        .run(randomUUID()).lastInsertRowid,
    );

    const zones = db
      .prepare(
        `SELECT DISTINCT COALESCE(zone, 'Quai principal') AS zone FROM port_emplacements WHERE deleted_at IS NULL`,
      )
      .all() as Array<{ zone: string }>;

    const quaiMap = new Map<string, number>();
    for (const z of zones) {
      const code = z.zone.replace(/\s+/g, '-').slice(0, 12).toUpperCase();
      const qid = Number(
        db
          .prepare(
            `INSERT INTO port_quais (uuid, bassin_id, code, label) VALUES (?, ?, ?, ?)`,
          )
          .run(randomUUID(), bassinId, code, z.zone).lastInsertRowid,
      );
      quaiMap.set(z.zone, qid);
    }

    const emps = db
      .prepare(`SELECT id, zone FROM port_emplacements WHERE deleted_at IS NULL`)
      .all() as Array<{ id: number; zone: string | null }>;

    for (const e of emps) {
      const zone = e.zone ?? 'Quai principal';
      const quaiId = quaiMap.get(zone);
      db.prepare(`UPDATE port_emplacements SET quai_id = ? WHERE id = ?`).run(quaiId ?? null, e.id);
    }
  }

  db.prepare(`UPDATE port_emplacements SET statut = 'disponible' WHERE statut = 'libre'`).run();
  db.prepare(`UPDATE port_emplacements SET statut = 'maintenance' WHERE statut = 'maintenance'`).run();

  const bateaux = db
    .prepare(`SELECT id, proprietaire, contact_email, contact_tel FROM port_bateaux WHERE deleted_at IS NULL`)
    .all() as Array<{
    id: number;
    proprietaire: string;
    contact_email: string | null;
    contact_tel: string | null;
  }>;

  for (const b of bateaux) {
    const existing = db
      .prepare(
        `SELECT id FROM port_clients WHERE deleted_at IS NULL AND (
          (type_client = 'morale' AND raison_sociale = ?) OR
          (type_client = 'physique' AND nom = ?)
        ) LIMIT 1`,
      )
      .get(b.proprietaire, b.proprietaire) as { id: number } | undefined;

    let clientId = existing?.id;
    if (!clientId) {
      const isMorale = /SARL|SPA|EURL|Coop|Coopérative/i.test(b.proprietaire);
      clientId = Number(
        db
          .prepare(
            `
          INSERT INTO port_clients (
            uuid, type_client, raison_sociale, nom, prenom, telephone, email, statut_dossier
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'incomplet')
        `,
          )
          .run(
            randomUUID(),
            isMorale ? 'morale' : 'physique',
            isMorale ? b.proprietaire : null,
            isMorale ? null : b.proprietaire,
            null,
            b.contact_tel,
            b.contact_email,
          ).lastInsertRowid,
      );
    }

    db.prepare(`UPDATE port_bateaux SET client_id = ? WHERE id = ?`).run(clientId, b.id);

    const contrat = db
      .prepare(
        `SELECT id FROM port_contrats WHERE bateau_id = ? AND deleted_at IS NULL ORDER BY id DESC LIMIT 1`,
      )
      .get(b.id) as { id: number } | undefined;
    if (contrat) {
      db.prepare(`UPDATE port_contrats SET client_id = ? WHERE id = ?`).run(clientId, contrat.id);
    }
  }

  const tarifCount = db.prepare(`SELECT COUNT(*) AS c FROM port_tarifs`).get() as { c: number };
  if (tarifCount.c === 0) {
    const tarifId = Number(
      db
        .prepare(
          `
        INSERT INTO port_tarifs (uuid, code, label, type_prestation, date_effet)
        VALUES (?, 'AMARR-2026', 'Amarrage annuel 2026', 'amarrage', '2026-01-01')
      `,
        )
        .run(randomUUID()).lastInsertRowid,
    );
    const tranches = [
      { min: 0, max: 10, montant: 250000 },
      { min: 10, max: 18, montant: 450000 },
      { min: 18, max: 30, montant: 850000 },
    ];
    for (const t of tranches) {
      db.prepare(
        `INSERT INTO port_tarif_tranches (tarif_id, longueur_min_m, longueur_max_m, montant_periode) VALUES (?, ?, ?, ?)`,
      ).run(tarifId, t.min, t.max, t.montant);
    }
  }

  db.prepare(
    `INSERT OR REPLACE INTO app_settings (key, value) VALUES ('port_migrate_v2', '1')`,
  ).run();
  logger.info('Migration PortMaster v2 terminée.');
}
