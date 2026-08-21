import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { emitErpEvent } from './event-bus.service';
import { getActorContext, actorCanAccessHotel } from './actorContext';

import type {
  PosClotureJournaliere,
  PosRapportSession,
  CloturerSessionInput,
  CloturerJourneeInput,
} from '../../src/shared/types/pos';
import { syncPosCaToRecettesJournalieres } from './pos-recettes-sync.service';

export { getPosClosureStatusForHotel, assertAllPosClosedForHotel } from './pos-recettes-sync.service';
export type { PosHotelClosureStatus, PosPointVenteClosureStatus } from './pos-recettes-sync.service';

function assertHotel(actorUserId: number, hotelId: number): void {
  const actor = getActorContext(actorUserId);
  if (!actorCanAccessHotel(actor, hotelId)) throw new Error('Accès hôtel refusé.');
}

function mapCloture(r: Record<string, unknown>): PosClotureJournaliere {
  return {
    id: r.id as number,
    uuid: r.uuid as string,
    pointVenteId: r.point_vente_id as number,
    pointVenteNom: (r.point_vente_nom as string | undefined) ?? undefined,
    hotelId: r.hotel_id as number,
    dateJournal: r.date_journal as string,
    statut: r.statut as PosClotureJournaliere['statut'],
    totalVentes: r.total_ventes as number,
    totalEspeces: r.total_especes as number,
    totalCarte: r.total_carte as number,
    nbTickets: r.nb_tickets as number,
    nbSessions: r.nb_sessions as number,
    ecartCaisse: r.ecart_caisse as number,
    observations: (r.observations as string | null) ?? null,
    clotureAt: (r.cloture_at as string | null) ?? null,
  };
}

export function isPosJourneeLocked(pointVenteId: number, dateJournal: string): boolean {
  const row = getDatabase().prepare(`
    SELECT id FROM pos_clotures_journalieres WHERE point_vente_id = ? AND date_journal = ? AND statut = 'cloturee'
  `).get(pointVenteId, dateJournal);
  return Boolean(row);
}

export function getRapportSession(sessionId: number): PosRapportSession {
  const db = getDatabase();
  const s = db.prepare(`
    SELECT s.*, pv.nom AS point_vente_nom, f.nom AS faction_nom
    FROM pos_sessions s
    JOIN pos_points_vente pv ON pv.id = s.point_vente_id
    JOIN pos_factions f ON f.id = s.faction_id
    WHERE s.id = ?
  `).get(sessionId) as Record<string, unknown> | undefined;
  if (!s) throw new Error('Session introuvable.');

  const nbTickets = db.prepare(`
    SELECT COUNT(*) as c FROM pos_tickets WHERE session_id = ? AND statut = 'valide'
  `).get(sessionId) as { c: number };

  const fondTheorique = round2((s.fond_caisse as number) + (s.total_especes as number));

  return {
    sessionId,
    pointVenteNom: s.point_vente_nom as string,
    factionNom: s.faction_nom as string,
    dateService: s.date_service as string,
    fondCaisse: s.fond_caisse as number,
    totalVentes: s.total_ventes as number,
    totalEspeces: s.total_especes as number,
    totalCarte: s.total_carte as number,
    totalCheque: s.total_cheque as number,
    totalVirement: s.total_virement as number,
    nbTickets: nbTickets.c ?? 0,
    fondTheorique,
    fondCloture: (s.fond_cloture as number | null) ?? null,
    ecartCaisse: (s.ecart_caisse as number | null) ?? null,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Clôture fin de faction / service — rapport Z caisse. */
export function cloturerSessionFaction(actorUserId: number, input: CloturerSessionInput): PosRapportSession {
  const db = getDatabase();
  const session = db.prepare(`SELECT * FROM pos_sessions WHERE id = ?`).get(input.sessionId) as Record<string, unknown> | undefined;
  if (!session) throw new Error('Session introuvable.');
  if (session.statut === 'cloturee') throw new Error('Session déjà clôturée.');
  assertHotel(actorUserId, session.hotel_id as number);

  const brouillons = db.prepare(`
    SELECT COUNT(*) as c FROM pos_tickets WHERE session_id = ? AND statut = 'brouillon'
  `).get(input.sessionId) as { c: number };
  if ((brouillons.c ?? 0) > 0) throw new Error('Tickets brouillon en cours — validez ou annulez avant clôture faction.');

  const fondTheorique = round2((session.fond_caisse as number) + (session.total_especes as number));
  const ecart = round2(input.fondCloture - fondTheorique);

  db.prepare(`
    UPDATE pos_sessions SET statut = 'cloturee', fond_cloture = ?, ecart_caisse = ?,
      observations = ?, cloture_at = datetime('now'), cloture_par = ? WHERE id = ?
  `).run(input.fondCloture, ecart, input.observations ?? null, actorUserId, input.sessionId);

  writeAuditLog({
    userId: actorUserId,
    action: 'UPDATE',
    module: 'pos',
    description: `Clôture faction session #${input.sessionId} — écart ${ecart} DA`,
    newValue: String(input.sessionId),
  });
  emitErpEvent({
    type: 'POS_FACTION_CLOSED',
    entiteType: 'pos_session',
    entiteId: input.sessionId,
    data: { fondCloture: input.fondCloture, ecartCaisse: ecart },
  });

  return getRapportSession(input.sessionId);
}

/** Clôture quotidienne d'un point de vente. */
export function cloturerJourneePos(actorUserId: number, input: CloturerJourneeInput): PosClotureJournaliere {
  const db = getDatabase();
  const pv = db.prepare(`SELECT * FROM pos_points_vente WHERE id = ?`).get(input.pointVenteId) as Record<string, unknown> | undefined;
  if (!pv) throw new Error('Point de vente introuvable.');
  assertHotel(actorUserId, pv.hotel_id as number);

  if (isPosJourneeLocked(input.pointVenteId, input.dateJournal)) {
    throw new Error('Journée déjà clôturée pour ce point de vente.');
  }

  const sessionsOuvertes = db.prepare(`
    SELECT COUNT(*) as c FROM pos_sessions WHERE point_vente_id = ? AND date_service = ? AND statut = 'ouverte'
  `).get(input.pointVenteId, input.dateJournal) as { c: number };
  if ((sessionsOuvertes.c ?? 0) > 0) {
    throw new Error('Sessions encore ouvertes — clôturez toutes les factions avant la clôture journalière.');
  }

  const agg = db.prepare(`
    SELECT
      COALESCE(SUM(total_ventes), 0) as total_ventes,
      COALESCE(SUM(total_especes), 0) as total_especes,
      COALESCE(SUM(total_carte), 0) as total_carte,
      COALESCE(SUM(ecart_caisse), 0) as ecart_caisse,
      COUNT(*) as nb_sessions
    FROM pos_sessions WHERE point_vente_id = ? AND date_service = ?
  `).get(input.pointVenteId, input.dateJournal) as Record<string, number>;

  const nbTickets = db.prepare(`
    SELECT COUNT(*) as c FROM pos_tickets t
    JOIN pos_sessions s ON s.id = t.session_id
    WHERE s.point_vente_id = ? AND s.date_service = ? AND t.statut = 'valide'
  `).get(input.pointVenteId, input.dateJournal) as { c: number };

  const existing = db.prepare(`
    SELECT id FROM pos_clotures_journalieres WHERE point_vente_id = ? AND date_journal = ?
  `).get(input.pointVenteId, input.dateJournal) as { id: number } | undefined;

  let clotureId: number;
  if (existing) {
    clotureId = existing.id;
    db.prepare(`
      UPDATE pos_clotures_journalieres SET statut = 'cloturee', total_ventes = ?, total_especes = ?,
        total_carte = ?, nb_tickets = ?, nb_sessions = ?, ecart_caisse = ?, observations = ?,
        cloture_par = ?, cloture_at = datetime('now') WHERE id = ?
    `).run(
      agg.total_ventes ?? 0,
      agg.total_especes ?? 0,
      agg.total_carte ?? 0,
      nbTickets.c ?? 0,
      agg.nb_sessions ?? 0,
      agg.ecart_caisse ?? 0,
      input.observations ?? null,
      actorUserId,
      clotureId,
    );
  } else {
    const res = db.prepare(`
      INSERT INTO pos_clotures_journalieres
        (point_vente_id, hotel_id, date_journal, statut, total_ventes, total_especes, total_carte,
         nb_tickets, nb_sessions, ecart_caisse, observations, cloture_par, cloture_at)
      VALUES (?, ?, ?, 'cloturee', ?, ?, ?, ?, ?, ?, ?, ?, datetime('now')) RETURNING id
    `).get(
      input.pointVenteId,
      pv.hotel_id,
      input.dateJournal,
      agg.total_ventes ?? 0,
      agg.total_especes ?? 0,
      agg.total_carte ?? 0,
      nbTickets.c ?? 0,
      agg.nb_sessions ?? 0,
      agg.ecart_caisse ?? 0,
      input.observations ?? null,
      actorUserId,
    ) as { id: number };
    clotureId = res.id;
  }

  writeAuditLog({
    userId: actorUserId,
    action: 'UPDATE',
    module: 'pos',
    description: `Clôture journalière POS ${pv.nom} — ${input.dateJournal}`,
    newValue: String(clotureId),
  });
  emitErpEvent({
    type: 'POS_DAY_CLOSED',
    entiteType: 'pos_cloture_journaliere',
    entiteId: clotureId,
    data: { pointVenteId: input.pointVenteId, dateJournal: input.dateJournal },
  });

  syncPosCaToRecettesJournalieres(actorUserId, pv.hotel_id as number, input.dateJournal);

  const row = db.prepare(`
    SELECT c.*, pv.nom AS point_vente_nom FROM pos_clotures_journalieres c
    JOIN pos_points_vente pv ON pv.id = c.point_vente_id WHERE c.id = ?
  `).get(clotureId) as Record<string, unknown>;
  return mapCloture(row);
}

export function listCloturesJournalieres(pointVenteId: number, limit = 30): PosClotureJournaliere[] {
  const rows = getDatabase().prepare(`
    SELECT c.*, pv.nom AS point_vente_nom FROM pos_clotures_journalieres c
    JOIN pos_points_vente pv ON pv.id = c.point_vente_id
    WHERE c.point_vente_id = ? ORDER BY c.date_journal DESC LIMIT ?
  `).all(pointVenteId, limit) as Record<string, unknown>[];
  return rows.map(mapCloture);
}
