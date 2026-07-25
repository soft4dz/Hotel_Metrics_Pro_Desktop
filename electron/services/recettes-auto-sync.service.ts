import { randomUUID } from 'node:crypto';
import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { syncPosCaToRecettesJournalieres } from './pos-recettes-sync.service';

export const ERP_RECETTE_OBS_PREFIX = '[ERP auto]';

/** @deprecated Utiliser ERP_RECETTE_OBS_PREFIX — conservé pour compatibilité POS. */
export const POS_RECETTE_OBS_PREFIX = '[POS auto]';

export function isErpAutoRecetteLine(observation: string | null | undefined): boolean {
  return Boolean(
    observation?.startsWith(ERP_RECETTE_OBS_PREFIX) || observation?.startsWith(POS_RECETTE_OBS_PREFIX),
  );
}

/** @deprecated Utiliser isErpAutoRecetteLine */
export const isPosAutoRecetteLine = isErpAutoRecetteLine;

export interface ErpRecettesSyncResult {
  hebergement: number;
  restauration: number;
  autres: number;
  chambres: number;
  nuitees: number;
  couverts: number;
  encaissementHt: number;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function getRubriqueId(code: string): number {
  const row = getDatabase().prepare(`
    SELECT id FROM rubriques WHERE code = ? AND deleted_at IS NULL ORDER BY id LIMIT 1
  `).get(code) as { id: number } | undefined;
  if (!row) throw new Error(`Rubrique ${code} introuvable.`);
  return row.id;
}

interface UpsertExtras {
  encaissementHt?: number;
  chambres?: number;
  nuitees?: number;
  couverts?: number;
}

function upsertAutoRecetteLine(
  actorUserId: number,
  hotelId: number,
  dateJournal: string,
  rubriqueId: number,
  montant: number,
  observation: string,
  extras?: UpsertExtras,
): void {
  const db = getDatabase();
  const amount = round2(montant);
  const existing = db.prepare(`
    SELECT id FROM recettes_journalieres
    WHERE hotel_id = ? AND date_journal = ? AND rubrique_id = ? AND deleted_at IS NULL
  `).get(hotelId, dateJournal, rubriqueId) as { id: number } | undefined;

  const encHt = extras?.encaissementHt;
  const chambres = extras?.chambres;
  const nuitees = extras?.nuitees;
  const couverts = extras?.couverts;

  if (existing) {
    db.prepare(`
      UPDATE recettes_journalieres SET
        montant = ?, observation = ?, statut = 'valide',
        encaissement_ht = COALESCE(?, encaissement_ht),
        chambres = COALESCE(?, chambres),
        nuitees = COALESCE(?, nuitees),
        couverts = COALESCE(?, couverts),
        updated_by = ?, updated_at = datetime('now'), sync_status = 'pending_update'
      WHERE id = ?
    `).run(amount, observation, encHt ?? null, chambres ?? null, nuitees ?? null, couverts ?? null, actorUserId, existing.id);
    return;
  }

  if (amount <= 0 && encHt == null && chambres == null && nuitees == null && couverts == null) {
    return;
  }

  db.prepare(`
    INSERT INTO recettes_journalieres (
      uuid, hotel_id, rubrique_id, date_journal, montant, observation, statut,
      encaissement_ht, chambres, nuitees, couverts, created_by, updated_by, sync_status
    ) VALUES (?, ?, ?, ?, ?, ?, 'valide', ?, ?, ?, ?, ?, ?, 'pending_update')
  `).run(
    randomUUID(),
    hotelId,
    rubriqueId,
    dateJournal,
    amount,
    observation,
    encHt ?? null,
    chambres ?? null,
    nuitees ?? null,
    couverts ?? null,
    actorUserId,
    actorUserId,
  );
}

function loadOperationalKpis(hotelId: number, dateJournal: string): {
  chambres: number;
  nuitees: number;
  couverts: number;
  encaissementHt: number;
} {
  const db = getDatabase();

  const occ = db.prepare(`
    SELECT COUNT(*) AS chambres
    FROM reservations r
    WHERE r.hotel_id = ? AND r.deleted_at IS NULL
      AND r.statut IN ('arrivee', 'depart')
      AND r.date_arrivee <= ? AND r.date_depart > ?
  `).get(hotelId, dateJournal, dateJournal) as { chambres: number };

  const couvertsRow = db.prepare(`
    SELECT COALESCE(SUM(c.nb_tickets), 0) AS couverts
    FROM pos_clotures_journalieres c
    INNER JOIN pos_points_vente pv ON pv.id = c.point_vente_id
    WHERE pv.hotel_id = ? AND c.date_journal = ? AND c.statut = 'cloturee'
  `).get(hotelId, dateJournal) as { couverts: number };

  const encRow = db.prepare(`
    SELECT COALESCE(SUM(montant), 0) AS total
    FROM encaissements
    WHERE hotel_id = ? AND date_encaissement = ? AND statut = 'confirme' AND deleted_at IS NULL
  `).get(hotelId, dateJournal) as { total: number };

  const chambres = occ.chambres ?? 0;
  return {
    chambres,
    nuitees: chambres,
    couverts: couvertsRow.couverts ?? 0,
    encaissementHt: round2(encRow.total ?? 0),
  };
}

/** CA hébergement : nuitées consommées + extras folio au départ. */
export function syncHebergementCaFromErp(actorUserId: number, hotelId: number, dateJournal: string): number {
  const db = getDatabase();

  const nuiteesRow = db.prepare(`
    SELECT COALESCE(SUM(
      CASE WHEN r.nb_nuits > 0 THEN r.montant_total / r.nb_nuits ELSE r.montant_total END
    ), 0) AS total
    FROM reservations r
    WHERE r.hotel_id = ? AND r.deleted_at IS NULL
      AND r.statut IN ('arrivee', 'depart')
      AND r.date_arrivee <= ? AND r.date_depart > ?
  `).get(hotelId, dateJournal, dateJournal) as { total: number };

  const extrasRow = db.prepare(`
    SELECT COALESCE(SUM(fl.montant_ttc), 0) AS total
    FROM hebergement_folio_lignes fl
    INNER JOIN hebergement_folios f ON f.id = fl.folio_id
    INNER JOIN reservations r ON r.id = f.reservation_id
    WHERE f.hotel_id = ? AND r.date_depart = ? AND r.statut = 'depart'
      AND fl.categorie <> 'hebergement'
  `).get(hotelId, dateJournal) as { total: number };

  const montant = round2((nuiteesRow.total ?? 0) + (extrasRow.total ?? 0));
  const kpis = loadOperationalKpis(hotelId, dateJournal);
  const rubriqueId = getRubriqueId('HEBERGEMENT');

  upsertAutoRecetteLine(
    actorUserId,
    hotelId,
    dateJournal,
    rubriqueId,
    montant,
    `${ERP_RECETTE_OBS_PREFIX} CA hébergement (nuitees + extras folio)`,
    kpis,
  );

  return montant;
}

/** CA autres prestations : facturation hors réservation hébergement. */
export function syncAutresCaFromErp(actorUserId: number, hotelId: number, dateJournal: string): number {
  const db = getDatabase();

  const facturesRow = db.prepare(`
    SELECT COALESCE(SUM(montant_ttc), 0) AS total
    FROM factures
    WHERE hotel_id = ? AND date_emission = ? AND deleted_at IS NULL
      AND statut IN ('validee', 'payee')
      AND reservation_id IS NULL
  `).get(hotelId, dateJournal) as { total: number };

  const montant = round2(facturesRow.total ?? 0);
  const rubriqueId = getRubriqueId('AUTRES');

  upsertAutoRecetteLine(
    actorUserId,
    hotelId,
    dateJournal,
    rubriqueId,
    montant,
    `${ERP_RECETTE_OBS_PREFIX} CA facturation (hors hébergement)`,
  );

  return montant;
}

/** Consolidation ERP complète pour une journée hôtel. */
export function syncAllRecettesFromErp(
  actorUserId: number,
  hotelId: number,
  dateJournal: string,
): ErpRecettesSyncResult {
  const hebergement = syncHebergementCaFromErp(actorUserId, hotelId, dateJournal);
  const restauration = syncPosCaToRecettesJournalieres(actorUserId, hotelId, dateJournal);
  const autres = syncAutresCaFromErp(actorUserId, hotelId, dateJournal);
  const kpis = loadOperationalKpis(hotelId, dateJournal);

  writeAuditLog({
    userId: actorUserId,
    action: 'UPDATE',
    module: 'recettes',
    description: `Sync CA ERP ${dateJournal} — H:${hebergement} R:${restauration} A:${autres} DA`,
  });

  return {
    hebergement,
    restauration,
    autres,
    ...kpis,
  };
}
