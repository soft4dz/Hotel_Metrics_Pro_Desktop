import { randomUUID } from 'node:crypto';
import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import type {
  CreateHousekeepingTacheInput,
  HousekeepingChecklistItem,
  HousekeepingStats,
  HousekeepingTache,
  StatutChecklistItem,
  StatutTacheHousekeeping,
  TypeTacheHousekeeping,
  UpdateChecklistItemInput,
  UpdateHousekeepingTacheInput,
} from '../../src/shared/types/housekeeping';

const CHECKLIST_TEMPLATES: Record<TypeTacheHousekeeping, string[]> = {
  checkout: ['Changement linge', 'Salle de bain', 'Sol & poussière', 'Minibar', 'Poubelles'],
  recouche: ['Linge partiel', 'Salle de bain', 'Rangement', 'Minibar'],
  grand_menage: ['Linge complet', 'Salle de bain', 'Sol', 'Fenêtres', 'Mobilier', 'Minibar'],
  controle: ['Contrôle qualité final', 'Équipements OK', 'Propreté validée'],
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function mapTache(r: Record<string, unknown>): HousekeepingTache {
  return {
    id: r.id as number,
    uuid: r.uuid as string,
    hotelId: r.hotel_id as number,
    chambreId: r.chambre_id as number,
    chambreNumero: r.chambre_numero as string,
    chambreEtage: r.chambre_etage as number,
    reservationId: r.reservation_id as number | null,
    typeTache: r.type_tache as TypeTacheHousekeeping,
    statut: r.statut as StatutTacheHousekeeping,
    assigneeId: r.assignee_id as number | null,
    assigneeNom: r.assignee_nom as string | null,
    datePrevue: r.date_prevue as string,
    dateDebut: r.date_debut as string | null,
    dateFin: r.date_fin as string | null,
    notes: r.notes as string | null,
    checklistProgress: {
      total: Number(r.checklist_total ?? 0),
      ok: Number(r.checklist_ok ?? 0),
    },
    createdAt: r.created_at as string,
  };
}

function mapChecklist(r: Record<string, unknown>): HousekeepingChecklistItem {
  return {
    id: r.id as number,
    tacheId: r.tache_id as number,
    libelle: r.libelle as string,
    ordre: r.ordre as number,
    statut: r.statut as StatutChecklistItem,
    commentaire: r.commentaire as string | null,
  };
}

const TACHE_SELECT = `
  SELECT t.*,
    c.numero AS chambre_numero,
    c.etage AS chambre_etage,
    u.full_name AS assignee_nom,
    (SELECT COUNT(*) FROM housekeeping_checklist_items ci WHERE ci.tache_id = t.id) AS checklist_total,
    (SELECT COUNT(*) FROM housekeeping_checklist_items ci WHERE ci.tache_id = t.id AND ci.statut = 'ok') AS checklist_ok
  FROM housekeeping_taches t
  INNER JOIN chambres c ON c.id = t.chambre_id
  LEFT JOIN users u ON u.id = t.assignee_id
`;

function insertChecklistItems(tacheId: number, typeTache: TypeTacheHousekeeping): void {
  const db = getDatabase();
  const ins = db.prepare(`
    INSERT INTO housekeeping_checklist_items (tache_id, libelle, ordre, statut)
    VALUES (?, ?, ?, 'pending')
  `);
  CHECKLIST_TEMPLATES[typeTache].forEach((libelle, idx) => ins.run(tacheId, libelle, idx + 1));
}

function getTacheById(id: number): HousekeepingTache {
  const row = getDatabase().prepare(`${TACHE_SELECT} WHERE t.id = ?`).get(id) as Record<string, unknown> | undefined;
  if (!row) throw new Error('Tâche housekeeping introuvable.');
  return mapTache(row);
}

function hasOpenTacheForChambre(chambreId: number): boolean {
  const row = getDatabase().prepare(`
    SELECT 1 FROM housekeeping_taches
    WHERE chambre_id = ? AND statut NOT IN ('terminee', 'annulee')
    LIMIT 1
  `).get(chambreId);
  return Boolean(row);
}

export function ensureTacheForChambreMenage(
  actorUserId: number,
  chambreId: number,
  notes?: string,
): HousekeepingTache | null {
  if (hasOpenTacheForChambre(chambreId)) return null;

  const db = getDatabase();
  const ch = db.prepare(`SELECT hotel_id, statut FROM chambres WHERE id = ? AND actif = 1`).get(chambreId) as
    | { hotel_id: number; statut: string }
    | undefined;
  if (!ch || ch.statut !== 'menage') return null;

  return createTache(actorUserId, {
    hotelId: ch.hotel_id,
    chambreId,
    typeTache: 'checkout',
    notes: notes ?? 'Demande ménage depuis le plan chambres',
  });
}

export function cancelOpenTachesForChambre(actorUserId: number, chambreId: number): void {
  const db = getDatabase();
  const open = db.prepare(`
    SELECT id FROM housekeeping_taches
    WHERE chambre_id = ? AND statut NOT IN ('terminee', 'annulee')
  `).all(chambreId) as Array<{ id: number }>;

  for (const t of open) {
    db.prepare(`
      UPDATE housekeeping_taches SET statut = 'annulee', updated_at = datetime('now') WHERE id = ?
    `).run(t.id);
    writeAuditLog({
      userId: actorUserId,
      action: 'UPDATE',
      module: 'housekeeping',
      description: `Tâche #${t.id} annulée (statut chambre modifié)`,
    });
  }
}

export function listChambresMenageSansTache(hotelId: number): Array<{ id: number; numero: string; etage: number }> {
  const db = getDatabase();
  return db.prepare(`
    SELECT c.id, c.numero, c.etage
    FROM chambres c
    WHERE c.hotel_id = ? AND c.actif = 1 AND c.statut = 'menage'
      AND NOT EXISTS (
        SELECT 1 FROM housekeeping_taches t
        WHERE t.chambre_id = c.id AND t.statut NOT IN ('terminee', 'annulee')
      )
    ORDER BY c.etage, c.numero
  `).all(hotelId) as Array<{ id: number; numero: string; etage: number }>;
}

export function listTaches(
  hotelId: number,
  statut?: StatutTacheHousekeeping,
  datePrevue?: string,
): HousekeepingTache[] {
  const db = getDatabase();
  const conditions = ['t.hotel_id = ?'];
  const params: unknown[] = [hotelId];
  if (statut) {
    conditions.push('t.statut = ?');
    params.push(statut);
  }
  if (datePrevue) {
    conditions.push('t.date_prevue = ?');
    params.push(datePrevue);
  }
  const rows = db.prepare(`
    ${TACHE_SELECT}
    WHERE ${conditions.join(' AND ')}
    ORDER BY
      CASE t.statut WHEN 'a_faire' THEN 1 WHEN 'en_cours' THEN 2 WHEN 'controle' THEN 3 ELSE 4 END,
      t.date_prevue DESC, c.numero
  `).all(...params) as Record<string, unknown>[];
  return rows.map(mapTache);
}

export function createTache(actorUserId: number, input: CreateHousekeepingTacheInput): HousekeepingTache {
  const db = getDatabase();
  if (hasOpenTacheForChambre(input.chambreId)) {
    throw new Error('Une tâche est déjà ouverte pour cette chambre.');
  }

  const typeTache = input.typeTache ?? 'checkout';
  const info = db.prepare(`
    INSERT INTO housekeeping_taches (
      uuid, hotel_id, chambre_id, reservation_id, type_tache, statut, assignee_id, date_prevue, notes, cree_par
    ) VALUES (?, ?, ?, ?, ?, 'a_faire', ?, ?, ?, ?)
  `).run(
    randomUUID(),
    input.hotelId,
    input.chambreId,
    input.reservationId ?? null,
    typeTache,
    input.assigneeId ?? null,
    input.datePrevue ?? todayIso(),
    input.notes ?? null,
    actorUserId,
  );

  const tacheId = Number(info.lastInsertRowid);
  insertChecklistItems(tacheId, typeTache);
  db.prepare(`UPDATE chambres SET statut = 'menage', updated_at = datetime('now') WHERE id = ? AND statut != 'occupee'`).run(input.chambreId);

  writeAuditLog({
    userId: actorUserId,
    action: 'CREATE',
    module: 'housekeeping',
    description: `Tâche ménage chambre #${input.chambreId} (${typeTache})`,
  });
  return getTacheById(tacheId);
}

export function createTacheFromDepart(
  actorUserId: number,
  hotelId: number,
  chambreId: number,
  reservationId: number,
): HousekeepingTache | null {
  if (hasOpenTacheForChambre(chambreId)) return null;
  return createTache(actorUserId, {
    hotelId,
    chambreId,
    reservationId,
    typeTache: 'checkout',
    notes: 'Généré automatiquement au départ client',
  });
}

/** Alias explicite pour la synchro plan chambres → housekeeping */
export { ensureTacheForChambreMenage as createTacheFromChambreMenage };

export function syncTachesFromChambresMenage(actorUserId: number, hotelId: number): number {
  const db = getDatabase();
  const chambres = db.prepare(`
    SELECT id FROM chambres WHERE hotel_id = ? AND statut = 'menage' AND actif = 1
  `).all(hotelId) as Array<{ id: number }>;

  let created = 0;
  for (const ch of chambres) {
    if (hasOpenTacheForChambre(ch.id)) continue;
    createTache(actorUserId, {
      hotelId,
      chambreId: ch.id,
      typeTache: 'checkout',
      notes: 'Synchronisé depuis plan chambres',
    });
    created += 1;
  }
  return created;
}

export function updateTache(actorUserId: number, id: number, input: UpdateHousekeepingTacheInput): HousekeepingTache {
  const db = getDatabase();
  const current = getTacheById(id);
  const sets: string[] = ['updated_at = datetime(\'now\')'];
  const params: unknown[] = [];

  if (input.assigneeId !== undefined) {
    sets.push('assignee_id = ?');
    params.push(input.assigneeId);
  }
  if (input.datePrevue !== undefined) {
    sets.push('date_prevue = ?');
    params.push(input.datePrevue);
  }
  if (input.notes !== undefined) {
    sets.push('notes = ?');
    params.push(input.notes);
  }
  if (input.statut !== undefined) {
    sets.push('statut = ?');
    params.push(input.statut);
    if (input.statut === 'en_cours' && !current.dateDebut) {
      sets.push('date_debut = ?');
      params.push(todayIso());
    }
    if (input.statut === 'terminee') {
      sets.push('date_fin = ?');
      params.push(todayIso());
      db.prepare(`UPDATE chambres SET statut = 'libre', updated_at = datetime('now') WHERE id = ?`).run(current.chambreId);
    }
    if (input.statut === 'annulee') {
      db.prepare(`UPDATE chambres SET statut = 'libre', updated_at = datetime('now') WHERE id = ? AND statut = 'menage'`).run(current.chambreId);
    }
  }

  params.push(id);
  db.prepare(`UPDATE housekeeping_taches SET ${sets.join(', ')} WHERE id = ?`).run(...params);

  writeAuditLog({
    userId: actorUserId,
    action: 'UPDATE',
    module: 'housekeeping',
    description: `Tâche #${id} → ${input.statut ?? 'modifiée'}`,
  });
  return getTacheById(id);
}

export function listChecklistItems(tacheId: number): HousekeepingChecklistItem[] {
  const rows = getDatabase().prepare(`
    SELECT * FROM housekeeping_checklist_items WHERE tache_id = ? ORDER BY ordre
  `).all(tacheId) as Record<string, unknown>[];
  return rows.map(mapChecklist);
}

export function updateChecklistItem(itemId: number, input: UpdateChecklistItemInput): HousekeepingChecklistItem {
  const db = getDatabase();
  const sets: string[] = [];
  const params: unknown[] = [];
  if (input.statut !== undefined) {
    sets.push('statut = ?');
    params.push(input.statut);
  }
  if (input.commentaire !== undefined) {
    sets.push('commentaire = ?');
    params.push(input.commentaire);
  }
  if (sets.length === 0) throw new Error('Aucune modification.');
  params.push(itemId);
  db.prepare(`UPDATE housekeeping_checklist_items SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  const row = db.prepare(`SELECT * FROM housekeeping_checklist_items WHERE id = ?`).get(itemId) as Record<string, unknown>;
  if (!row) throw new Error('Item checklist introuvable.');
  return mapChecklist(row);
}

export function getHousekeepingStats(hotelId: number): HousekeepingStats {
  const db = getDatabase();
  const today = todayIso();
  const r = db.prepare(`
    SELECT
      SUM(statut = 'a_faire') AS a_faire,
      SUM(statut = 'en_cours') AS en_cours,
      SUM(statut = 'controle') AS controle,
      SUM(statut = 'terminee' AND date_fin = ?) AS terminees_jour
    FROM housekeeping_taches
    WHERE hotel_id = ?
  `).get(today, hotelId) as Record<string, number>;
  const chambresMenage = db.prepare(`
    SELECT COUNT(*) AS c FROM chambres WHERE hotel_id = ? AND statut = 'menage' AND actif = 1
  `).get(hotelId) as { c: number };
  return {
    aFaire: r.a_faire ?? 0,
    enCours: r.en_cours ?? 0,
    controle: r.controle ?? 0,
    termineesJour: r.terminees_jour ?? 0,
    chambresMenage: chambresMenage.c,
  };
}
