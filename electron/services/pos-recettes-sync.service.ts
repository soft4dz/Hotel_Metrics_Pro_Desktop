import { randomUUID } from 'node:crypto';
import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { POS_FOOD_SERVICE_TYPES } from '../../src/shared/constants/posPointVenteTypes';
import { isAnnexPosType } from '../../src/shared/constants/posPointVenteTypes';
import type { PosPointVenteType } from '../../src/shared/types/pos';
import { computeAnnexCaTotals } from './pos-annex.service';

const ERP_RECETTE_OBS_PREFIX = '[ERP auto]';

export const POS_RECETTE_OBS_PREFIX = ERP_RECETTE_OBS_PREFIX;

export function isPosAutoRecetteLine(observation: string | null | undefined): boolean {
  return Boolean(observation?.startsWith(ERP_RECETTE_OBS_PREFIX));
}

export interface PosPointVenteClosureStatus {
  pointVenteId: number;
  nom: string;
  closed: boolean;
  openSessions: number;
  totalVentes: number;
}

export interface PosHotelClosureStatus {
  required: boolean;
  allClosed: boolean;
  points: PosPointVenteClosureStatus[];
}

function getRubriqueIdByCode(code: string): number {
  const row = getDatabase().prepare(`
    SELECT id FROM rubriques WHERE code = ? AND deleted_at IS NULL ORDER BY id LIMIT 1
  `).get(code) as { id: number } | undefined;
  if (!row) throw new Error(`Rubrique ${code} introuvable.`);
  return row.id;
}

function upsertAutoRecetteLine(
  actorUserId: number,
  hotelId: number,
  dateJournal: string,
  rubriqueCode: string,
  montant: number,
  observationSuffix: string,
): number {
  const db = getDatabase();
  const montantRounded = Math.round(montant * 100) / 100;
  const rubriqueId = getRubriqueIdByCode(rubriqueCode);
  const observation = `${ERP_RECETTE_OBS_PREFIX} ${observationSuffix}`;

  const existing = db.prepare(`
    SELECT id FROM recettes_journalieres
    WHERE hotel_id = ? AND date_journal = ? AND rubrique_id = ? AND deleted_at IS NULL
      AND observation LIKE ?
  `).get(hotelId, dateJournal, rubriqueId, `${ERP_RECETTE_OBS_PREFIX}%${observationSuffix}%`) as { id: number } | undefined;

  if (existing) {
    db.prepare(`
      UPDATE recettes_journalieres SET montant = ?, observation = ?, statut = 'valide',
        updated_by = ?, updated_at = datetime('now'), sync_status = 'pending_update'
      WHERE id = ?
    `).run(montantRounded, observation, actorUserId, existing.id);
  } else if (montantRounded > 0) {
    db.prepare(`
      INSERT INTO recettes_journalieres (
        uuid, hotel_id, rubrique_id, date_journal, montant, observation, statut, created_by, updated_by, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, 'valide', ?, ?, 'pending_update')
    `).run(randomUUID(), hotelId, rubriqueId, dateJournal, montantRounded, observation, actorUserId, actorUserId);
  }

  return montantRounded;
}

/** Statut clôture POS par hôtel et date (Night Audit). */
export function getPosClosureStatusForHotel(hotelId: number, dateJournal: string): PosHotelClosureStatus {
  const db = getDatabase();
  const points = db.prepare(`
    SELECT id, nom, type FROM pos_points_vente WHERE hotel_id = ? AND actif = 1 ORDER BY nom
  `).all(hotelId) as { id: number; nom: string; type: string }[];

  if (points.length === 0) {
    return { required: false, allClosed: true, points: [] };
  }

  const statusList: PosPointVenteClosureStatus[] = points.map((pv) => {
    const closed = Boolean(db.prepare(`
      SELECT id FROM pos_clotures_journalieres
      WHERE point_vente_id = ? AND date_journal = ? AND statut = 'cloturee'
    `).get(pv.id, dateJournal));
    const openSessions = db.prepare(`
      SELECT COUNT(*) as c FROM pos_sessions
      WHERE point_vente_id = ? AND date_service = ? AND statut = 'ouverte'
    `).get(pv.id, dateJournal) as { c: number };
    const totalRow = closed
      ? db.prepare(`
          SELECT COALESCE(total_ventes, 0) as t FROM pos_clotures_journalieres
          WHERE point_vente_id = ? AND date_journal = ? AND statut = 'cloturee'
        `).get(pv.id, dateJournal) as { t: number } | undefined
      : null;
    let totalVentes = totalRow?.t ?? 0;
    if (!closed && isAnnexPosType(pv.type as PosPointVenteType)) {
      totalVentes = computeAnnexCaTotals(pv.type as PosPointVenteType, hotelId, dateJournal).totalVentes;
    }
    return {
      pointVenteId: pv.id,
      nom: pv.nom,
      closed,
      openSessions: openSessions.c ?? 0,
      totalVentes,
    };
  });

  const allClosed = statusList.every((p) => p.closed && p.openSessions === 0);
  return { required: true, allClosed, points: statusList };
}

export function assertAllPosClosedForHotel(hotelId: number, dateJournal: string): void {
  const status = getPosClosureStatusForHotel(hotelId, dateJournal);
  if (!status.required) return;
  if (status.allClosed) return;
  const pending = status.points
    .filter((p) => !p.closed || p.openSessions > 0)
    .map((p) => `${p.nom}${p.openSessions > 0 ? ' (session ouverte)' : ''}`)
    .join(', ');
  throw new Error(`Clôture POS requise avant clôture hôtel — PDV en attente : ${pending}`);
}

/** Alimente recettes_journalieres depuis clôtures POS du jour (restauration + annexes). */
export function syncPosCaToRecettesJournalieres(actorUserId: number, hotelId: number, dateJournal: string): number {
  const db = getDatabase();
  const foodTypes = POS_FOOD_SERVICE_TYPES.map((t) => `'${t}'`).join(', ');

  const restaurationRow = db.prepare(`
    SELECT COALESCE(SUM(c.total_ventes), 0) as total
    FROM pos_clotures_journalieres c
    INNER JOIN pos_points_vente pv ON pv.id = c.point_vente_id
    WHERE pv.hotel_id = ? AND c.date_journal = ? AND c.statut = 'cloturee'
      AND pv.type IN (${foodTypes})
  `).get(hotelId, dateJournal) as { total: number };

  const annexRow = db.prepare(`
    SELECT COALESCE(SUM(c.total_ventes), 0) as total
    FROM pos_clotures_journalieres c
    INNER JOIN pos_points_vente pv ON pv.id = c.point_vente_id
    WHERE pv.hotel_id = ? AND c.date_journal = ? AND c.statut = 'cloturee'
      AND pv.type IN ('plage', 'piscine', 'parking')
  `).get(hotelId, dateJournal) as { total: number };

  const restauration = upsertAutoRecetteLine(
    actorUserId,
    hotelId,
    dateJournal,
    'RESTAURATION',
    restaurationRow.total ?? 0,
    'CA restauration consolidé POS',
  );

  const annexes = upsertAutoRecetteLine(
    actorUserId,
    hotelId,
    dateJournal,
    'AUTRES',
    annexRow.total ?? 0,
    'CA plage, piscine et parking (POS)',
  );

  writeAuditLog({
    userId: actorUserId,
    action: 'UPDATE',
    module: 'pos',
    description: `Sync recettes POS ${dateJournal} — restauration ${restauration} DA, annexes ${annexes} DA`,
  });

  return restauration + annexes;
}
