import { randomUUID } from 'node:crypto';
import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import {
  getActorContext,
  applyActorHotelFilter,
  isGlobalAdminRole,
  resolveHotelId,
  assertRecettesSaisie,
  assertRecettesValidate,
  assertRecettesValidation,
  type ActorContext,
} from './actorContext';
import { syncEncaissementRecetteJour } from './encaissement-sync.service';
import { isDateJournalLocked } from './daily-closure.service';
import { syncAllRecettesFromErp } from './recettes-auto-sync.service';

export type RecetteStatut = 'brouillon' | 'soumis' | 'valide' | 'refuse';

function normalizeStatut(statut: string): RecetteStatut {
  if (statut === 'validated') return 'valide';
  if (['brouillon', 'soumis', 'valide', 'refuse'].includes(statut)) {
    return statut as RecetteStatut;
  }
  return 'brouillon';
}

export interface RubriqueOption {
  id: number;
  code: string;
  label: string;
  sortOrder: number;
  parentId: number | null;
  parentLabel: string | null;
}

export interface RecetteLigne {
  id: number | null;
  rubriqueId: number;
  rubriqueCode: string;
  rubriqueLabel: string;
  montant: number;
  observation: string | null;
}

export interface SaisieJournaliereDto {
  hotelId: number;
  hotelName: string;
  dateJournal: string;
  statut: RecetteStatut;
  lignes: RecetteLigne[];
  encaissementHt: number;
  chambres: number;
  nuitees: number;
  couverts: number;
  totalMontant: number;
  canEdit: boolean;
}

export interface SaveSaisieInput {
  hotelId: number;
  dateJournal: string;
  statut: 'brouillon' | 'soumis';
  lignes: Array<{ rubriqueId: number; montant: number; observation?: string }>;
  encaissementHt: number;
  chambres: number;
  nuitees: number;
  couverts: number;
}

export interface HistoriqueItem {
  id: number;
  hotelId: number;
  hotelName: string;
  dateJournal: string;
  rubriqueLabel: string;
  montant: number;
  statut: RecetteStatut;
  observation: string | null;
  updatedAt: string;
}

export interface HistoriqueFilters {
  hotelId?: number;
  dateFrom?: string;
  dateTo?: string;
  statut?: RecetteStatut;
  search?: string;
}

export interface ValidationJourItem {
  hotelId: number;
  hotelName: string;
  dateJournal: string;
  totalMontant: number;
  statut: RecetteStatut;
  ligneCount: number;
}

export interface MensuelleLigne {
  rubriqueId: number;
  rubriqueLabel: string;
  montantJournalier: number;
  montantMensuel: number;
  ecart: number;
  justification: string | null;
}

export interface RecetteMensuelleDto {
  hotelId: number;
  hotelName: string;
  annee: number;
  mois: number;
  lignes: MensuelleLigne[];
  totalJournalier: number;
  totalMensuel: number;
  ecart: number;
  justificationEcart: string | null;
  statut: string;
  verrouille: boolean;
}

function isMonthLocked(db: ReturnType<typeof getDatabase>, hotelId: number, date: string): boolean {
  const [y, m] = date.split('-').map(Number);
  const row = db
    .prepare(
      `
    SELECT verrouille FROM recettes_mensuelles
    WHERE hotel_id = ? AND annee = ? AND mois = ? AND deleted_at IS NULL
  `,
    )
    .get(hotelId, y, m) as { verrouille: number } | undefined;
  return row?.verrouille === 1;
}

function dayStatut(db: ReturnType<typeof getDatabase>, hotelId: number, date: string): RecetteStatut {
  const rows = db
    .prepare(
      `
    SELECT DISTINCT statut FROM recettes_journalieres
    WHERE hotel_id = ? AND date_journal = ? AND deleted_at IS NULL
  `,
    )
    .all(hotelId, date) as Array<{ statut: string }>;

  if (rows.length === 0) return 'brouillon';
  const statuts = rows.map((r) => normalizeStatut(r.statut));
  if (statuts.some((s) => s === 'refuse')) return 'refuse';
  if (statuts.every((s) => s === 'valide')) return 'valide';
  if (statuts.some((s) => s === 'soumis')) return 'soumis';
  return statuts[0] ?? 'brouillon';
}

const LEAF_ONLY = `
  AND NOT EXISTS (
    SELECT 1 FROM rubriques c
    WHERE c.parent_id = r.id AND c.deleted_at IS NULL AND c.is_active = 1
  )`;

export function listRubriquesActives(_actorUserId: number, hotelId?: number): RubriqueOption[] {
  const db = getDatabase();

  if (!hotelId) {
    return db
      .prepare(
        `SELECT r.id, r.code, r.label, r.sort_order AS sortOrder,
                r.parent_id AS parentId, p.label AS parentLabel
         FROM rubriques r
         LEFT JOIN rubriques p ON p.id = r.parent_id
         WHERE r.deleted_at IS NULL AND r.is_active = 1 ${LEAF_ONLY}
         ORDER BY COALESCE(p.sort_order, r.sort_order), r.sort_order, r.label`,
      )
      .all() as RubriqueOption[];
  }

  // If hotel has specific rubrique assignments → show only those; else show all active leaves
  return db
    .prepare(
      `SELECT r.id, r.code, r.label,
              COALESCE(hr.sort_order, r.sort_order) AS sortOrder,
              r.parent_id AS parentId, p.label AS parentLabel
       FROM rubriques r
       LEFT JOIN rubriques p ON p.id = r.parent_id
       LEFT JOIN hotel_rubriques hr ON hr.hotel_id = ? AND hr.rubrique_id = r.id
       WHERE r.deleted_at IS NULL AND r.is_active = 1 ${LEAF_ONLY}
         AND (
           NOT EXISTS (SELECT 1 FROM hotel_rubriques WHERE hotel_id = ?)
           OR hr.rubrique_id IS NOT NULL
         )
       ORDER BY COALESCE(p.sort_order, r.sort_order), r.sort_order, r.label`,
    )
    .all(hotelId, hotelId) as RubriqueOption[];
}

export function getSaisieJournaliere(
  actorUserId: number,
  hotelId: number,
  dateJournal: string,
): SaisieJournaliereDto {
  const actor = getActorContext(actorUserId);
  assertRecettesValidate(actor);
  const hid = resolveHotelId(actor, hotelId);

  if (!isDateJournalLocked(hid, dateJournal)) {
    syncAllRecettesFromErp(actorUserId, hid, dateJournal);
  }

  const db = getDatabase();
  const hotel = db.prepare(`SELECT name FROM hotels WHERE id = ?`).get(hid) as { name: string };

  const rubriques = listRubriquesActives(actorUserId, hid);
  const existing = db
    .prepare(
      `
    SELECT id, rubrique_id, montant, observation, encaissement_ht, chambres, nuitees, couverts, statut
    FROM recettes_journalieres
    WHERE hotel_id = ? AND date_journal = ? AND deleted_at IS NULL
  `,
    )
    .all(hid, dateJournal) as Array<{
    id: number;
    rubrique_id: number;
    montant: number;
    observation: string | null;
    encaissement_ht: number | null;
    chambres: number | null;
    nuitees: number | null;
    couverts: number | null;
    statut: string;
  }>;

  const byRub = new Map(existing.map((e) => [e.rubrique_id, e]));
  const statut = dayStatut(db, hid, dateJournal);
  let enc = 0;
  let ch = 0;
  let nu = 0;
  let co = 0;

  const lignes: RecetteLigne[] = rubriques.map((r) => {
    const ex = byRub.get(r.id);
    if (ex) {
      enc = ex.encaissement_ht ?? enc;
      ch = ex.chambres ?? ch;
      nu = ex.nuitees ?? nu;
      co = ex.couverts ?? co;
    }
    return {
      id: ex?.id ?? null,
      rubriqueId: r.id,
      rubriqueCode: r.code,
      rubriqueLabel: r.label,
      parentLabel: r.parentLabel ?? null,
      montant: ex?.montant ?? 0,
      observation: ex?.observation ?? null,
    };
  });

  const totalMontant = lignes.reduce((s, l) => s + l.montant, 0);

  return {
    hotelId: hid,
    hotelName: hotel.name,
    dateJournal,
    statut,
    lignes,
    encaissementHt: enc,
    chambres: ch,
    nuitees: nu,
    couverts: co,
    totalMontant,
    canEdit: false,
  };
}

export function saveSaisieJournaliere(_actorUserId: number, _input: SaveSaisieInput): SaisieJournaliereDto {
  throw new Error(
    'La saisie manuelle du chiffre d\'affaires est désactivée. Le CA est consolidé automatiquement depuis l\'ERP (hébergement, POS, facturation).',
  );
}

export interface HistoriqueJourItem {
  dateJournal: string;
  hotelId: number;
  hotelName: string;
  statut: string;
  montantHebergement: number;
  montantDenrees: number;
  montantBoissons: number;
  montantAutres: number;
  totalMontant: number;
  encaissementHt: number;
  chambres: number;
  nuitees: number;
  couverts: number;
}

export function listHistoriqueGrouped(
  actorUserId: number,
  filters: HistoriqueFilters,
): HistoriqueJourItem[] {
  const actor = getActorContext(actorUserId);
  assertRecettesValidate(actor);

  const db = getDatabase();
  const conditions = ['rj.deleted_at IS NULL'];
  const params: unknown[] = [];

  if (filters.dateFrom) { conditions.push('rj.date_journal >= ?'); params.push(filters.dateFrom); }
  if (filters.dateTo)   { conditions.push('rj.date_journal <= ?'); params.push(filters.dateTo); }
  if (filters.statut)   { conditions.push('rj.statut = ?');        params.push(filters.statut); }
  if (filters.search?.trim()) {
    conditions.push('h.name LIKE ?');
    params.push(`%${filters.search.trim()}%`);
  }

  applyActorHotelFilter(actor, conditions, params, {
    alias: 'rj',
    filterHotelId: filters.hotelId,
  });

  params.push(1000);

  const rows = db.prepare(`
    SELECT
      rj.date_journal                       AS dateJournal,
      rj.hotel_id                           AS hotelId,
      h.name                                AS hotelName,

      CASE
        WHEN SUM(CASE WHEN rj.statut = 'refuse'  THEN 1 ELSE 0 END) > 0 THEN 'refuse'
        WHEN SUM(CASE WHEN rj.statut != 'valide' THEN 1 ELSE 0 END) = 0 THEN 'valide'
        WHEN SUM(CASE WHEN rj.statut = 'soumis'  THEN 1 ELSE 0 END) > 0 THEN 'soumis'
        ELSE 'brouillon'
      END AS statut,

      COALESCE(SUM(CASE
        WHEN LOWER(COALESCE(p.label, rub.label)) LIKE '%heberg%'
          OR LOWER(rub.label) LIKE '%heberg%'
        THEN rj.montant ELSE 0 END), 0)     AS montantHebergement,

      COALESCE(SUM(CASE
        WHEN LOWER(COALESCE(p.label, rub.label)) LIKE '%denree%'
          OR LOWER(rub.label) LIKE '%denree%'
          OR LOWER(rub.label) LIKE '%nourriture%'
          OR LOWER(rub.label) LIKE '%restaur%'
        THEN rj.montant ELSE 0 END), 0)     AS montantDenrees,

      COALESCE(SUM(CASE
        WHEN LOWER(COALESCE(p.label, rub.label)) LIKE '%boisson%'
          OR LOWER(rub.label) LIKE '%boisson%'
          OR LOWER(rub.label) LIKE '%bar%'
          OR LOWER(rub.label) LIKE '%beverage%'
        THEN rj.montant ELSE 0 END), 0)     AS montantBoissons,

      COALESCE(SUM(rj.montant), 0)          AS totalMontant,
      MAX(COALESCE(rj.encaissement_ht, 0))  AS encaissementHt,
      MAX(COALESCE(rj.chambres, 0))         AS chambres,
      MAX(COALESCE(rj.nuitees, 0))          AS nuitees,
      MAX(COALESCE(rj.couverts, 0))         AS couverts

    FROM recettes_journalieres rj
    INNER JOIN hotels h   ON h.id   = rj.hotel_id
    INNER JOIN rubriques rub ON rub.id = rj.rubrique_id
    LEFT  JOIN rubriques p   ON p.id   = rub.parent_id
    WHERE ${conditions.join(' AND ')}
    GROUP BY rj.hotel_id, rj.date_journal
    ORDER BY rj.date_journal DESC, h.name
    LIMIT ?
  `).all(...params) as Array<HistoriqueJourItem & { montantHebergement: number; montantDenrees: number; montantBoissons: number; totalMontant: number }>;

  return rows.map((r) => ({
    ...r,
    statut: normalizeStatut(r.statut as string),
    montantAutres: Math.max(
      0,
      r.totalMontant - r.montantHebergement - r.montantDenrees - r.montantBoissons,
    ),
  }));
}

export function listHistorique(
  actorUserId: number,
  filters: HistoriqueFilters,
): HistoriqueItem[] {
  const actor = getActorContext(actorUserId);
  assertRecettesValidate(actor);

  const db = getDatabase();
  const conditions = ['rj.deleted_at IS NULL'];
  const params: unknown[] = [];

  if (filters.dateFrom) {
    conditions.push('rj.date_journal >= ?');
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    conditions.push('rj.date_journal <= ?');
    params.push(filters.dateTo);
  }
  if (filters.statut) {
    conditions.push('rj.statut = ?');
    params.push(filters.statut);
  }
  if (filters.search?.trim()) {
    conditions.push('(h.name LIKE ? OR rub.label LIKE ? OR rj.observation LIKE ?)');
    const q = `%${filters.search.trim()}%`;
    params.push(q, q, q);
  }

  applyActorHotelFilter(actor, conditions, params, {
    alias: 'rj',
    filterHotelId: filters.hotelId,
  });

  params.push(500);

  const rows = db
    .prepare(
      `
    SELECT
      rj.id, rj.hotel_id AS hotelId, h.name AS hotelName, rj.date_journal AS dateJournal,
      rub.label AS rubriqueLabel, rj.montant, rj.statut, rj.observation, rj.updated_at AS updatedAt
    FROM recettes_journalieres rj
    INNER JOIN hotels h ON h.id = rj.hotel_id
    INNER JOIN rubriques rub ON rub.id = rj.rubrique_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY rj.date_journal DESC, h.name, rub.sort_order
    LIMIT ?
  `,
    )
    .all(...params) as HistoriqueItem[];

  return rows.map((r) => ({
    ...r,
    statut: normalizeStatut(r.statut as string),
  }));
}

function assertRecettesHistoriqueEdit(actor: ActorContext): void {
  if (isGlobalAdminRole(actor.roleCode)) return;
  assertRecettesSaisie(actor);
}

export function updateRecetteLigne(
  actorUserId: number,
  id: number,
  montant: number,
  observation: string | null,
  motif: string,
): void {
  const actor = getActorContext(actorUserId);
  assertRecettesHistoriqueEdit(actor);

  if (!motif.trim()) throw new Error('Motif obligatoire pour la modification.');

  const db = getDatabase();
  const row = db
    .prepare(`SELECT * FROM recettes_journalieres WHERE id = ? AND deleted_at IS NULL`)
    .get(id) as Record<string, unknown> | undefined;

  if (!row) throw new Error('Ligne introuvable.');
  resolveHotelId(actor, row.hotel_id as number);
  if (isDateJournalLocked(row.hotel_id as number, row.date_journal as string)) {
    throw new Error('Journée clôturée. Modification des recettes impossible.');
  }

  if (row.statut === 'valide' && !isGlobalAdminRole(actor.roleCode)) {
    throw new Error('Recette validée — modification interdite. Seul un administrateur peut modifier une ligne validée.');
  }
  if (isMonthLocked(db, row.hotel_id as number, row.date_journal as string) && !isGlobalAdminRole(actor.roleCode)) {
    throw new Error('Mois verrouillé.');
  }

  db.prepare(
    `
    UPDATE recettes_journalieres
    SET montant = ?, observation = ?, updated_by = ?, updated_at = datetime('now'),
        statut = 'brouillon', sync_status = 'pending_update'
    WHERE id = ?
  `,
  ).run(montant, observation, actor.userId, id);

  db.prepare(
    `
    INSERT INTO validations (uuid, entity_type, entity_id, hotel_id, date_ref, action, motif, user_id)
    VALUES (?, 'recette_journaliere', ?, ?, ?, 'MODIFICATION', ?, ?)
  `,
  ).run(
    randomUUID(),
    id,
    row.hotel_id,
    row.date_journal,
    motif.trim(),
    actor.userId,
  );

  writeAuditLog({
    userId: actor.userId,
    action: 'UPDATE',
    module: 'recettes',
    description: `Modification recette #${id} — ${motif}`,
    oldValue: JSON.stringify({ montant: row.montant }),
    newValue: JSON.stringify({ montant }),
  });
}

export function deleteRecetteLigne(actorUserId: number, id: number, motif: string): void {
  const actor = getActorContext(actorUserId);
  assertRecettesHistoriqueEdit(actor);
  if (!motif.trim()) throw new Error('Motif obligatoire pour la suppression.');

  const db = getDatabase();
  const row = db
    .prepare(`SELECT * FROM recettes_journalieres WHERE id = ? AND deleted_at IS NULL`)
    .get(id) as Record<string, unknown> | undefined;

  if (!row) throw new Error('Ligne introuvable.');
  resolveHotelId(actor, row.hotel_id as number);
  if (isDateJournalLocked(row.hotel_id as number, row.date_journal as string)) {
    throw new Error('Journée clôturée. Modification des recettes impossible.');
  }

  if (row.statut === 'valide' && !isGlobalAdminRole(actor.roleCode)) {
    throw new Error('Recette validée — suppression interdite. Seul un administrateur peut supprimer une ligne validée.');
  }

  db.prepare(
    `
    UPDATE recettes_journalieres
    SET deleted_at = datetime('now'), updated_by = ?, sync_status = 'pending_delete'
    WHERE id = ?
  `,
  ).run(actor.userId, id);

  writeAuditLog({
    userId: actor.userId,
    action: 'DELETE',
    module: 'recettes',
    description: `Suppression logique recette #${id} — ${motif}`,
  });
}

export function deleteJourneeRecettes(
  actorUserId: number,
  hotelId: number,
  dateJournal: string,
  motif: string,
): { deletedCount: number } {
  const actor = getActorContext(actorUserId);
  if (!isGlobalAdminRole(actor.roleCode)) {
    throw new Error('Seul un administrateur peut supprimer une journée complète.');
  }
  if (!motif.trim()) throw new Error('Motif obligatoire pour la suppression.');

  const hid = resolveHotelId(actor, hotelId);
  const db = getDatabase();
  if (isDateJournalLocked(hid, dateJournal)) {
    throw new Error('Journée clôturée. Suppression impossible.');
  }

  const lines = db
    .prepare(
      `
    SELECT id, statut, montant
    FROM recettes_journalieres
    WHERE hotel_id = ? AND date_journal = ? AND deleted_at IS NULL
  `,
    )
    .all(hid, dateJournal) as Array<{ id: number; statut: string; montant: number }>;

  if (lines.length === 0) {
    throw new Error('Aucune ligne pour cette journée.');
  }

  const run = db.transaction(() => {
    for (const line of lines) {
      db.prepare(
        `
        UPDATE recettes_journalieres
        SET deleted_at = datetime('now'), updated_by = ?, sync_status = 'pending_delete'
        WHERE id = ?
      `,
      ).run(actor.userId, line.id);
    }
  });
  run();

  writeAuditLog({
    userId: actor.userId,
    action: 'DELETE',
    module: 'recettes',
    description: `Suppression journée ${dateJournal} — ${lines.length} ligne(s) — ${motif.trim()}`,
    oldValue: JSON.stringify({ hotelId: hid, dateJournal, ligneCount: lines.length }),
  });

  return { deletedCount: lines.length };
}

export function listJoursAValider(actorUserId: number, hotelId?: number): ValidationJourItem[] {
  const actor = getActorContext(actorUserId);
  assertRecettesValidation(actor);

  const db = getDatabase();
  const conditions = [`rj.deleted_at IS NULL`, `rj.statut = 'soumis'`];
  const params: unknown[] = [];

  applyActorHotelFilter(actor, conditions, params, { alias: 'rj', filterHotelId: hotelId });

  return db
    .prepare(
      `
    SELECT
      rj.hotel_id AS hotelId, h.name AS hotelName, rj.date_journal AS dateJournal,
      SUM(rj.montant) AS totalMontant, COUNT(*) AS ligneCount, 'soumis' AS statut
    FROM recettes_journalieres rj
    INNER JOIN hotels h ON h.id = rj.hotel_id
    WHERE ${conditions.join(' AND ')}
    GROUP BY rj.hotel_id, rj.date_journal
    ORDER BY rj.date_journal DESC
  `,
    )
    .all(...params) as ValidationJourItem[];
}

export function validerJour(
  actorUserId: number,
  hotelId: number,
  dateJournal: string,
  motif?: string,
): void {
  const actor = getActorContext(actorUserId);
  assertRecettesValidation(actor);
  const hid = resolveHotelId(actor, hotelId);

  const db = getDatabase();
  const result = db
    .prepare(
      `
    UPDATE recettes_journalieres
    SET statut = 'valide', updated_by = ?, updated_at = datetime('now'), sync_status = 'pending_update'
    WHERE hotel_id = ? AND date_journal = ? AND statut = 'soumis' AND deleted_at IS NULL
  `,
    )
    .run(actor.userId, hid, dateJournal);

  if (result.changes === 0) throw new Error('Aucune recette soumise pour ce jour.');

  db.prepare(
    `
    INSERT INTO validations (uuid, entity_type, entity_id, hotel_id, date_ref, action, motif, user_id)
    VALUES (?, 'recette_jour', 0, ?, ?, 'VALIDATION', ?, ?)
  `,
  ).run(randomUUID(), hid, dateJournal, motif?.trim() || 'Validation journalière', actor.userId);

  writeAuditLog({
    userId: actor.userId,
    action: 'VALIDATE',
    module: 'recettes',
    description: `Validation journalière ${dateJournal} — hôtel ${hid}`,
  });

  syncEncaissementRecetteJour(actor.userId, hid, dateJournal);
}

export function refuserJour(
  actorUserId: number,
  hotelId: number,
  dateJournal: string,
  motif: string,
): void {
  const actor = getActorContext(actorUserId);
  assertRecettesValidation(actor);
  const hid = resolveHotelId(actor, hotelId);
  if (!motif.trim()) throw new Error('Motif de refus obligatoire.');

  const db = getDatabase();
  db.prepare(
    `
    UPDATE recettes_journalieres
    SET statut = 'refuse', updated_by = ?, updated_at = datetime('now'), sync_status = 'pending_update'
    WHERE hotel_id = ? AND date_journal = ? AND statut = 'soumis' AND deleted_at IS NULL
  `,
  ).run(actor.userId, hid, dateJournal);

  writeAuditLog({
    userId: actor.userId,
    action: 'REFUSE',
    module: 'recettes',
    description: `Refus journalière ${dateJournal} — ${motif}`,
  });
}

export function getRecetteMensuelle(
  actorUserId: number,
  hotelId: number,
  annee: number,
  mois: number,
): RecetteMensuelleDto {
  const actor = getActorContext(actorUserId);
  assertRecettesValidate(actor);
  const hid = resolveHotelId(actor, hotelId);

  const db = getDatabase();
  const hotel = db.prepare(`SELECT name FROM hotels WHERE id = ?`).get(hid) as { name: string };

  const journalier = db
    .prepare(
      `
    SELECT rub.id AS rubriqueId, rub.label AS rubriqueLabel, COALESCE(SUM(rj.montant), 0) AS montantJournalier
    FROM rubriques rub
    LEFT JOIN recettes_journalieres rj ON rj.rubrique_id = rub.id
      AND rj.hotel_id = ? AND rj.deleted_at IS NULL
      AND rj.statut IN ('soumis', 'valide', 'validated')
      AND strftime('%Y', rj.date_journal) = ?
      AND CAST(strftime('%m', rj.date_journal) AS INTEGER) = ?
    WHERE rub.deleted_at IS NULL AND rub.is_active = 1
    GROUP BY rub.id
    ORDER BY rub.sort_order
  `,
    )
    .all(hid, String(annee), String(mois).padStart(2, '0')) as Array<{
    rubriqueId: number;
    rubriqueLabel: string;
    montantJournalier: number;
  }>;

  const header = db
    .prepare(
      `
    SELECT * FROM recettes_mensuelles
    WHERE hotel_id = ? AND annee = ? AND mois = ? AND deleted_at IS NULL
  `,
    )
    .get(hid, annee, mois) as Record<string, unknown> | undefined;

  let lignesSaved: Map<number, { montantMensuel: number; justification: string | null }> = new Map();

  if (header) {
    const saved = db
      .prepare(
        `
      SELECT rubrique_id, montant_mensuel, justification
      FROM recettes_mensuelles_lignes WHERE recette_mensuelle_id = ?
    `,
      )
      .all(header.id as number) as Array<{
      rubrique_id: number;
      montant_mensuel: number;
      justification: string | null;
    }>;
    lignesSaved = new Map(
      saved.map((s) => [
        s.rubrique_id,
        { montantMensuel: s.montant_mensuel, justification: s.justification },
      ]),
    );
  }

  const lignes: MensuelleLigne[] = journalier.map((j) => {
    const s = lignesSaved.get(j.rubriqueId);
    const mensuel = s?.montantMensuel ?? j.montantJournalier;
    const ecart = mensuel - j.montantJournalier;
    return {
      rubriqueId: j.rubriqueId,
      rubriqueLabel: j.rubriqueLabel,
      montantJournalier: j.montantJournalier,
      montantMensuel: mensuel,
      ecart,
      justification: s?.justification ?? (Math.abs(ecart) > 0.01 ? null : ''),
    };
  });

  const totalJournalier = lignes.reduce((a, l) => a + l.montantJournalier, 0);
  const totalMensuel = lignes.reduce((a, l) => a + l.montantMensuel, 0);

  return {
    hotelId: hid,
    hotelName: hotel.name,
    annee,
    mois,
    lignes,
    totalJournalier,
    totalMensuel,
    ecart: totalMensuel - totalJournalier,
    justificationEcart: (header?.justification_ecart as string) ?? null,
    statut: (header?.statut as string) ?? 'brouillon',
    verrouille: header?.verrouille === 1,
  };
}

export function saveRecetteMensuelle(
  actorUserId: number,
  hotelId: number,
  annee: number,
  mois: number,
  lignes: Array<{ rubriqueId: number; montantMensuel: number; justification?: string }>,
  justificationEcart?: string,
  verrouiller?: boolean,
): RecetteMensuelleDto {
  const actor = getActorContext(actorUserId);
  assertRecettesSaisie(actor);
  const hid = resolveHotelId(actor, hotelId);

  const db = getDatabase();
  const consolidated = getRecetteMensuelle(actorUserId, hid, annee, mois);

  for (const l of lignes) {
    const j = consolidated.lignes.find((x) => x.rubriqueId === l.rubriqueId);
    const ecart = l.montantMensuel - (j?.montantJournalier ?? 0);
    if (Math.abs(ecart) > 0.01 && !l.justification?.trim()) {
      throw new Error(
        `Justification obligatoire pour l'écart sur ${j?.rubriqueLabel ?? 'rubrique'}.`,
      );
    }
  }

  const totalJ = consolidated.totalJournalier;
  const totalM = lignes.reduce((a, l) => a + l.montantMensuel, 0);
  const ecartGlobal = totalM - totalJ;

  if (Math.abs(ecartGlobal) > 0.01 && !justificationEcart?.trim()) {
    throw new Error('Justification globale obligatoire pour l\'écart mensuel.');
  }

  const upsertHeader = db.prepare(`
    INSERT INTO recettes_mensuelles (
      uuid, hotel_id, annee, mois, total_journalier, total_mensuel, ecart,
      justification_ecart, statut, verrouille, created_by, updated_by
    ) VALUES (
      @uuid, @hotel_id, @annee, @mois, @total_journalier, @total_mensuel, @ecart,
      @justification_ecart, @statut, @verrouille, @created_by, @updated_by
    )
    ON CONFLICT(hotel_id, annee, mois) DO UPDATE SET
      total_journalier = excluded.total_journalier,
      total_mensuel = excluded.total_mensuel,
      ecart = excluded.ecart,
      justification_ecart = excluded.justification_ecart,
      statut = excluded.statut,
      verrouille = excluded.verrouille,
      updated_by = excluded.updated_by,
      updated_at = datetime('now')
  `);

  const run = db.transaction(() => {
    const result = upsertHeader.run({
      uuid: randomUUID(),
      hotel_id: hid,
      annee,
      mois,
      total_journalier: totalJ,
      total_mensuel: totalM,
      ecart: ecartGlobal,
      justification_ecart: justificationEcart?.trim() || null,
      statut: verrouiller ? 'valide' : 'soumis',
      verrouille: verrouiller ? 1 : 0,
      created_by: actor.userId,
      updated_by: actor.userId,
    });

    const rmId =
      (db
        .prepare(`SELECT id FROM recettes_mensuelles WHERE hotel_id = ? AND annee = ? AND mois = ?`)
        .get(hid, annee, mois) as { id: number }).id ?? Number(result.lastInsertRowid);

    db.prepare(`DELETE FROM recettes_mensuelles_lignes WHERE recette_mensuelle_id = ?`).run(rmId);

    const ins = db.prepare(`
      INSERT INTO recettes_mensuelles_lignes (
        uuid, recette_mensuelle_id, rubrique_id, montant_journalier, montant_mensuel, ecart, justification
      ) VALUES (@uuid, @rm_id, @rubrique_id, @mj, @mm, @ecart, @justification)
    `);

    for (const l of lignes) {
      const j = consolidated.lignes.find((x) => x.rubriqueId === l.rubriqueId);
      const mj = j?.montantJournalier ?? 0;
      const ecart = l.montantMensuel - mj;
      ins.run({
        uuid: randomUUID(),
        rm_id: rmId,
        rubrique_id: l.rubriqueId,
        mj,
        mm: l.montantMensuel,
        ecart,
        justification: l.justification?.trim() || null,
      });
    }
  });
  run();

  writeAuditLog({
    userId: actor.userId,
    action: verrouiller ? 'LOCK' : 'UPDATE',
    module: 'recettes',
    description: `Recette mensuelle ${mois}/${annee} hôtel ${hid}`,
  });

  return getRecetteMensuelle(actorUserId, hid, annee, mois);
}
