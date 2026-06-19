import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { assertRhManage, assertRhView, assertRhTeam } from './rh-helpers';
import type {
  RhAffectation,
  RhOrganisationLigne,
  RhOrganisationSynthese,
  CreateAffectationInput,
  UpsertOrganisationInput,
  StatutAffectation,
  StatutEffectif,
  TypeAffectation,
} from '../../src/shared/types/rh';

// ── Affectations ──────────────────────────────────────────────────────────────

const affectationSql = `
  SELECT a.*,
         e.prenom || ' ' || e.nom AS employe_nom,
         h.name AS hotel_name,
         p.nom AS poste_nom,
         d.nom AS departement_nom
  FROM rh_affectations a
  INNER JOIN rh_employes e ON e.id = a.employe_id AND e.deleted_at IS NULL
  INNER JOIN hotels h ON h.id = a.hotel_id
  INNER JOIN rh_postes p ON p.id = a.poste_id
  LEFT JOIN rh_departements d ON d.id = p.departement_id
`;

function mapAffectation(row: Record<string, unknown>): RhAffectation {
  return {
    id: row.id as number,
    employeId: row.employe_id as number,
    employeNom: row.employe_nom as string,
    hotelId: row.hotel_id as number,
    hotelName: row.hotel_name as string,
    posteId: row.poste_id as number,
    posteNom: row.poste_nom as string,
    departementNom: (row.departement_nom as string | null) ?? null,
    type: row.type as TypeAffectation,
    dateDebut: row.date_debut as string,
    dateFin: (row.date_fin as string | null) ?? null,
    statut: row.statut as StatutAffectation,
    notes: (row.notes as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

function syncEmployeFromAffectation(db: ReturnType<typeof getDatabase>, employeId: number): void {
  const active = db
    .prepare(`
      SELECT hotel_id, poste_id FROM rh_affectations
      WHERE employe_id = ? AND statut = 'active'
      ORDER BY date_debut DESC LIMIT 1
    `)
    .get(employeId) as { hotel_id: number; poste_id: number } | undefined;
  if (active) {
    db.prepare(`
      UPDATE rh_employes SET hotel_id = ?, poste_actuel_id = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(active.hotel_id, active.poste_id, employeId);
  }
}

export function listAffectations(
  actorUserId: number,
  opts?: { employeId?: number; hotelId?: number; statut?: StatutAffectation },
): RhAffectation[] {
  assertRhView(actorUserId);
  const conditions = ['1=1'];
  const params: unknown[] = [];
  if (opts?.employeId) { conditions.push('a.employe_id = ?'); params.push(opts.employeId); }
  if (opts?.hotelId) { conditions.push('a.hotel_id = ?'); params.push(opts.hotelId); }
  if (opts?.statut) { conditions.push('a.statut = ?'); params.push(opts.statut); }
  return getDatabase()
    .prepare(`${affectationSql} WHERE ${conditions.join(' AND ')} ORDER BY a.date_debut DESC, a.id DESC`)
    .all(...params)
    .map((r) => mapAffectation(r as Record<string, unknown>));
}

export function getAffectationActive(actorUserId: number, employeId: number): RhAffectation | null {
  assertRhView(actorUserId);
  const row = getDatabase()
    .prepare(`${affectationSql} WHERE a.employe_id = ? AND a.statut = 'active' ORDER BY a.date_debut DESC LIMIT 1`)
    .get(employeId) as Record<string, unknown> | undefined;
  return row ? mapAffectation(row) : null;
}

export function createAffectation(actorUserId: number, input: CreateAffectationInput): RhAffectation {
  assertRhManage(actorUserId);
  const db = getDatabase();

  const emp = db.prepare(`SELECT id FROM rh_employes WHERE id = ? AND deleted_at IS NULL`).get(input.employeId);
  if (!emp) throw new Error('Employé introuvable.');

  const type = input.type ?? 'principale';
  const dateFin = input.dateFin ?? null;
  const isActive = !dateFin || dateFin >= new Date().toISOString().slice(0, 10);

  if (isActive) {
    db.prepare(`
      UPDATE rh_affectations
      SET statut = 'terminee',
          date_fin = COALESCE(date_fin, date(?)),
          updated_at = datetime('now')
      WHERE employe_id = ? AND statut = 'active'
    `).run(input.dateDebut, input.employeId);
  }

  const result = db.prepare(`
    INSERT INTO rh_affectations (employe_id, hotel_id, poste_id, type, date_debut, date_fin, statut, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.employeId,
    input.hotelId,
    input.posteId,
    type,
    input.dateDebut,
    dateFin,
    isActive ? 'active' : 'terminee',
    input.notes?.trim() ?? null,
    actorUserId,
  );

  if (isActive) syncEmployeFromAffectation(db, input.employeId);

  writeAuditLog({
    userId: actorUserId,
    action: 'CREATE',
    module: 'rh',
    description: `Affectation employé #${input.employeId} → hôtel #${input.hotelId}`,
  });

  const id = Number(result.lastInsertRowid);
  const row = db.prepare(`${affectationSql} WHERE a.id = ?`).get(id) as Record<string, unknown>;
  return mapAffectation(row);
}

export function terminerAffectation(actorUserId: number, affectationId: number, dateFin?: string): RhAffectation {
  assertRhManage(actorUserId);
  const db = getDatabase();
  const fin = dateFin ?? new Date().toISOString().slice(0, 10);

  const aff = db.prepare(`SELECT employe_id, statut FROM rh_affectations WHERE id = ?`).get(affectationId) as
    | { employe_id: number; statut: string }
    | undefined;
  if (!aff) throw new Error('Affectation introuvable.');
  if (aff.statut !== 'active') throw new Error('Cette affectation est déjà terminée.');

  db.prepare(`
    UPDATE rh_affectations SET statut = 'terminee', date_fin = ?, updated_at = datetime('now') WHERE id = ?
  `).run(fin, affectationId);

  syncEmployeFromAffectation(db, aff.employe_id);

  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'rh', description: `Fin affectation #${affectationId}` });

  const row = db.prepare(`${affectationSql} WHERE a.id = ?`).get(affectationId) as Record<string, unknown>;
  return mapAffectation(row);
}

// ── Organisation ──────────────────────────────────────────────────────────────

const effectifActuelSubquery = `
  (
    SELECT COUNT(DISTINCT e.id)
    FROM rh_employes e
    WHERE e.statut_rh = 'actif' AND e.deleted_at IS NULL
    AND (
      EXISTS (
        SELECT 1 FROM rh_affectations a
        WHERE a.employe_id = e.id AND a.statut = 'active'
        AND a.hotel_id = o.hotel_id AND a.poste_id = o.poste_id
      )
      OR (
        NOT EXISTS (SELECT 1 FROM rh_affectations a2 WHERE a2.employe_id = e.id AND a2.statut = 'active')
        AND e.hotel_id = o.hotel_id AND e.poste_actuel_id = o.poste_id
      )
    )
  )
`;

function mapStatutEffectif(ecart: number): StatutEffectif {
  if (ecart > 0) return 'surplus';
  if (ecart < 0) return 'manque';
  return 'ok';
}

function mapOrganisationLigne(row: Record<string, unknown>): RhOrganisationLigne {
  const effectifCible = row.effectif_cible as number;
  const effectifActuel = row.effectif_actuel as number;
  const ecart = effectifActuel - effectifCible;
  return {
    id: row.id as number,
    hotelId: row.hotel_id as number,
    hotelName: row.hotel_name as string,
    posteId: row.poste_id as number,
    posteNom: row.poste_nom as string,
    departementNom: (row.departement_nom as string | null) ?? null,
    effectifCible,
    effectifActuel,
    ecart,
    statut: mapStatutEffectif(ecart),
    responsableEmployeId: (row.responsable_employe_id as number | null) ?? null,
    responsableNom: (row.responsable_nom as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
  };
}

export function listOrganisation(actorUserId: number, hotelId?: number): RhOrganisationSynthese {
  assertRhTeam(actorUserId);
  const conditions = ['1=1'];
  const params: unknown[] = [];
  if (hotelId) { conditions.push('o.hotel_id = ?'); params.push(hotelId); }

  const rows = getDatabase()
    .prepare(`
      SELECT o.*,
             h.name AS hotel_name,
             p.nom AS poste_nom,
             d.nom AS departement_nom,
             resp.prenom || ' ' || resp.nom AS responsable_nom,
             ${effectifActuelSubquery} AS effectif_actuel
      FROM rh_organisation o
      INNER JOIN hotels h ON h.id = o.hotel_id
      INNER JOIN rh_postes p ON p.id = o.poste_id
      LEFT JOIN rh_departements d ON d.id = p.departement_id
      LEFT JOIN rh_employes resp ON resp.id = o.responsable_employe_id AND resp.deleted_at IS NULL
      WHERE ${conditions.join(' AND ')}
      ORDER BY h.name, d.nom, p.nom
    `)
    .all(...params)
    .map((r) => mapOrganisationLigne(r as Record<string, unknown>));

  let totalManque = 0, totalSurplus = 0, postesEnManque = 0, postesEnSurplus = 0, postesEquilibres = 0;
  for (const ligne of rows) {
    if (ligne.ecart < 0) { totalManque += Math.abs(ligne.ecart); postesEnManque += 1; }
    else if (ligne.ecart > 0) { totalSurplus += ligne.ecart; postesEnSurplus += 1; }
    else { postesEquilibres += 1; }
  }

  return { lignes: rows, totalManque, totalSurplus, postesEnManque, postesEnSurplus, postesEquilibres };
}

export function upsertOrganisation(actorUserId: number, input: UpsertOrganisationInput): RhOrganisationLigne {
  assertRhManage(actorUserId);
  const db = getDatabase();
  if (input.effectifCible < 0) throw new Error("L'effectif cible ne peut pas être négatif.");
  const hotel = db.prepare(`SELECT id FROM hotels WHERE id = ?`).get(input.hotelId);
  if (!hotel) throw new Error('Unité introuvable.');
  const poste = db.prepare(`SELECT id FROM rh_postes WHERE id = ? AND actif = 1`).get(input.posteId);
  if (!poste) throw new Error('Poste introuvable ou inactif.');
  if (input.responsableEmployeId) {
    const resp = db
      .prepare(`SELECT id FROM rh_employes WHERE id = ? AND deleted_at IS NULL AND statut_rh = 'actif'`)
      .get(input.responsableEmployeId);
    if (!resp) throw new Error('Responsable introuvable ou inactif.');
  }
  db.prepare(`
    INSERT INTO rh_organisation (hotel_id, poste_id, effectif_cible, responsable_employe_id, notes)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(hotel_id, poste_id) DO UPDATE SET
      effectif_cible = excluded.effectif_cible,
      responsable_employe_id = excluded.responsable_employe_id,
      notes = excluded.notes,
      updated_at = datetime('now')
  `).run(
    input.hotelId,
    input.posteId,
    input.effectifCible,
    input.responsableEmployeId ?? null,
    input.notes?.trim() ?? null,
  );
  writeAuditLog({
    userId: actorUserId,
    action: 'UPDATE',
    module: 'rh',
    description: `Organisation poste #${input.posteId} — unité #${input.hotelId} (cible ${input.effectifCible})`,
  });
  const row = db
    .prepare(`
      SELECT o.*,
             h.name AS hotel_name,
             p.nom AS poste_nom,
             d.nom AS departement_nom,
             resp.prenom || ' ' || resp.nom AS responsable_nom,
             ${effectifActuelSubquery} AS effectif_actuel
      FROM rh_organisation o
      INNER JOIN hotels h ON h.id = o.hotel_id
      INNER JOIN rh_postes p ON p.id = o.poste_id
      LEFT JOIN rh_departements d ON d.id = p.departement_id
      LEFT JOIN rh_employes resp ON resp.id = o.responsable_employe_id AND resp.deleted_at IS NULL
      WHERE o.hotel_id = ? AND o.poste_id = ?
    `)
    .get(input.hotelId, input.posteId) as Record<string, unknown>;
  return mapOrganisationLigne(row);
}

export function deleteOrganisation(actorUserId: number, id: number): void {
  assertRhManage(actorUserId);
  const db = getDatabase();
  const row = db.prepare(`SELECT id FROM rh_organisation WHERE id = ?`).get(id);
  if (!row) throw new Error('Ligne organisation introuvable.');
  db.prepare(`DELETE FROM rh_organisation WHERE id = ?`).run(id);
  writeAuditLog({ userId: actorUserId, action: 'DELETE', module: 'rh', description: `Suppression organisation #${id}` });
}
