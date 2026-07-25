import { randomUUID } from 'node:crypto';
import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';

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

function getRestaurationRubriqueId(): number {
  const row = getDatabase().prepare(`
    SELECT id FROM rubriques WHERE code = 'RESTAURATION' AND deleted_at IS NULL ORDER BY id LIMIT 1
  `).get() as { id: number } | undefined;
  if (!row) throw new Error('Rubrique RESTAURATION introuvable.');
  return row.id;
}

/** Statut clôture POS par hôtel et date (Night Audit). */
export function getPosClosureStatusForHotel(hotelId: number, dateJournal: string): PosHotelClosureStatus {
  const db = getDatabase();
  const points = db.prepare(`
    SELECT id, nom FROM pos_points_vente WHERE hotel_id = ? AND actif = 1 ORDER BY nom
  `).all(hotelId) as { id: number; nom: string }[];

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
    const totalRow = db.prepare(`
      SELECT COALESCE(total_ventes, 0) as t FROM pos_clotures_journalieres
      WHERE point_vente_id = ? AND date_journal = ? AND statut = 'cloturee'
    `).get(pv.id, dateJournal) as { t: number } | undefined;
    return {
      pointVenteId: pv.id,
      nom: pv.nom,
      closed,
      openSessions: openSessions.c ?? 0,
      totalVentes: totalRow?.t ?? 0,
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

/** Alimente recettes_journalieres (rubrique RESTAURATION) depuis clôtures POS du jour. */
export function syncPosCaToRecettesJournalieres(actorUserId: number, hotelId: number, dateJournal: string): number {
  const db = getDatabase();
  const totalRow = db.prepare(`
    SELECT COALESCE(SUM(c.total_ventes), 0) as total
    FROM pos_clotures_journalieres c
    INNER JOIN pos_points_vente pv ON pv.id = c.point_vente_id
    WHERE pv.hotel_id = ? AND c.date_journal = ? AND c.statut = 'cloturee'
  `).get(hotelId, dateJournal) as { total: number };

  const montant = Math.round((totalRow.total ?? 0) * 100) / 100;
  const rubriqueId = getRestaurationRubriqueId();
  const observation = `${ERP_RECETTE_OBS_PREFIX} CA restauration consolidé POS`;

  const existing = db.prepare(`
    SELECT id FROM recettes_journalieres
    WHERE hotel_id = ? AND date_journal = ? AND rubrique_id = ? AND deleted_at IS NULL
  `).get(hotelId, dateJournal, rubriqueId) as { id: number } | undefined;

  if (existing) {
    db.prepare(`
      UPDATE recettes_journalieres SET montant = ?, observation = ?, statut = 'valide',
        updated_by = ?, updated_at = datetime('now'), sync_status = 'pending_update'
      WHERE id = ?
    `).run(montant, observation, actorUserId, existing.id);
  } else if (montant > 0) {
    db.prepare(`
      INSERT INTO recettes_journalieres (
        uuid, hotel_id, rubrique_id, date_journal, montant, observation, statut, created_by, updated_by, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, 'valide', ?, ?, 'pending_update')
    `).run(randomUUID(), hotelId, rubriqueId, dateJournal, montant, observation, actorUserId, actorUserId);
  }

  writeAuditLog({
    userId: actorUserId,
    action: 'UPDATE',
    module: 'pos',
    description: `Sync recettes RESTAURATION ${dateJournal} — ${montant} DA`,
  });
  return montant;
}
