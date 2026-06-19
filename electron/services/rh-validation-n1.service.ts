import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { assertPermission, userHasPermission } from './permissions.service';
import { getEmployeIdForUser } from './rh.service';
import type { RhValidationN1Item } from '../../src/shared/types/rh';

function getSubordonnesIds(chefEmployeId: number): number[] {
  const db = getDatabase();
  const ids = new Set<number>();
  const equipe = db
    .prepare(`SELECT membre_employe_id FROM rh_equipes WHERE chef_employe_id = ?`)
    .all(chefEmployeId) as { membre_employe_id: number }[];
  for (const m of equipe) ids.add(m.membre_employe_id);

  const resp = db
    .prepare(`SELECT id FROM rh_employes WHERE responsable_employe_id = ? AND statut_rh = 'actif' AND deleted_at IS NULL`)
    .all(chefEmployeId) as { id: number }[];
  for (const r of resp) ids.add(r.id);

  const org = db.prepare(`
    SELECT DISTINCT e.id FROM rh_employes e
    INNER JOIN rh_affectations a ON a.employe_id = e.id AND a.statut = 'active'
    INNER JOIN rh_organisation o ON o.hotel_id = a.hotel_id AND o.poste_id = a.poste_id
    WHERE o.responsable_employe_id = ? AND e.statut_rh = 'actif' AND e.deleted_at IS NULL
  `).all(chefEmployeId) as { id: number }[];
  for (const o of org) ids.add(o.id);

  return Array.from(ids);
}

function assertCanValidateN1(actorUserId: number, employeId: number): void {
  if (userHasPermission(actorUserId, 'rh.manage')) return;
  const chefId = getEmployeIdForUser(actorUserId);
  if (!chefId) throw new Error('Aucune fiche employé liée à votre compte.');
  const subs = getSubordonnesIds(chefId);
  if (!subs.includes(employeId)) {
    throw new Error('Vous n\'êtes pas le N+1 de cet employé.');
  }
}

export function listValidationsN1(actorUserId: number): RhValidationN1Item[] {
  const canManage = userHasPermission(actorUserId, 'rh.manage');
  const canTeam = userHasPermission(actorUserId, 'rh.team');
  if (!canManage && !canTeam) {
    assertPermission(actorUserId, 'rh.self');
    return [];
  }

  const db = getDatabase();
  let employeIds: number[] | null = null;
  if (!canManage) {
    const chefId = getEmployeIdForUser(actorUserId);
    if (!chefId) return [];
    employeIds = getSubordonnesIds(chefId);
    if (employeIds.length === 0) return [];
  }

  const filter = employeIds ? `AND a.employe_id IN (${employeIds.map(() => '?').join(',')})` : '';
  const params = employeIds ?? [];

  const absences = db.prepare(`
    SELECT a.id, a.employe_id, e.prenom || ' ' || e.nom AS employe_nom,
      a.type || ' ' || a.date_debut || ' → ' || a.date_fin AS libelle, a.created_at
    FROM rh_absences a
    INNER JOIN rh_employes e ON e.id = a.employe_id
    WHERE a.statut = 'demandee' AND a.statut_n1 = 'en_attente' ${filter}
    ORDER BY a.date_debut
  `).all(...params) as Record<string, unknown>[];

  const pointages = db.prepare(`
    SELECT p.id, p.employe_id, e.prenom || ' ' || e.nom AS employe_nom,
      'Pointage ' || p.date || ' (' || COALESCE(p.heures_travaillees, 0) || ' h)' AS libelle, p.created_at
    FROM rh_pointages p
    INNER JOIN rh_employes e ON e.id = p.employe_id
    WHERE p.statut = 'soumis' AND p.statut_n1 = 'en_attente' ${filter.replace(/a\.employe_id/g, 'p.employe_id')}
    ORDER BY p.date DESC
  `).all(...params) as Record<string, unknown>[];

  const docs = db.prepare(`
    SELECT d.id, d.employe_id, e.prenom || ' ' || e.nom AS employe_nom,
      'Document : ' || d.nom AS libelle, d.created_at
    FROM rh_documents d
    INNER JOIN rh_employes e ON e.id = d.employe_id
    WHERE d.statut_validation = 'en_attente_n1' ${filter.replace(/a\.employe_id/g, 'd.employe_id')}
    ORDER BY d.created_at DESC
  `).all(...params) as Record<string, unknown>[];

  const items: RhValidationN1Item[] = [];
  for (const r of absences) {
    items.push({
      type: 'absence',
      id: r.id as number,
      employeId: r.employe_id as number,
      employeNom: r.employe_nom as string,
      libelle: r.libelle as string,
      createdAt: r.created_at as string,
    });
  }
  for (const r of pointages) {
    items.push({
      type: 'pointage',
      id: r.id as number,
      employeId: r.employe_id as number,
      employeNom: r.employe_nom as string,
      libelle: r.libelle as string,
      createdAt: r.created_at as string,
    });
  }
  for (const r of docs) {
    items.push({
      type: 'document',
      id: r.id as number,
      employeId: r.employe_id as number,
      employeNom: r.employe_nom as string,
      libelle: r.libelle as string,
      createdAt: r.created_at as string,
    });
  }
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function validerN1Absence(
  actorUserId: number,
  absenceId: number,
  approuve: boolean,
  commentaire?: string,
): void {
  const db = getDatabase();
  const row = db.prepare(`SELECT employe_id FROM rh_absences WHERE id = ?`).get(absenceId) as
    | { employe_id: number }
    | undefined;
  if (!row) throw new Error('Absence introuvable.');
  assertCanValidateN1(actorUserId, row.employe_id);
  db.prepare(`
    UPDATE rh_absences SET statut_n1 = ?, valide_n1_par = ?, valide_n1_at = datetime('now'),
      commentaire_n1 = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(approuve ? 'approuve' : 'refuse', actorUserId, commentaire ?? null, absenceId);
  if (!approuve) {
    db.prepare(`UPDATE rh_absences SET statut = 'refusee' WHERE id = ?`).run(absenceId);
  }
  writeAuditLog({
    userId: actorUserId,
    action: 'UPDATE',
    module: 'rh',
    description: `Validation N+1 absence #${absenceId} : ${approuve ? 'approuvé' : 'refusé'}`,
  });
}

export function validerN1Pointage(actorUserId: number, pointageId: number, approuve: boolean): void {
  const db = getDatabase();
  const row = db.prepare(`SELECT employe_id FROM rh_pointages WHERE id = ?`).get(pointageId) as
    | { employe_id: number }
    | undefined;
  if (!row) throw new Error('Pointage introuvable.');
  assertCanValidateN1(actorUserId, row.employe_id);
  db.prepare(`
    UPDATE rh_pointages SET statut_n1 = ?, valide_n1_par = ?, valide_n1_at = datetime('now'), updated_at = datetime('now')
    WHERE id = ?
  `).run(approuve ? 'approuve' : 'refuse', actorUserId, pointageId);
  if (!approuve) {
    db.prepare(`UPDATE rh_pointages SET statut = 'refuse' WHERE id = ?`).run(pointageId);
  }
  writeAuditLog({
    userId: actorUserId,
    action: 'UPDATE',
    module: 'rh',
    description: `Validation N+1 pointage #${pointageId}`,
  });
}

export function validerN1Document(actorUserId: number, documentId: number, approuve: boolean): void {
  const db = getDatabase();
  const row = db.prepare(`SELECT employe_id FROM rh_documents WHERE id = ?`).get(documentId) as
    | { employe_id: number }
    | undefined;
  if (!row) throw new Error('Document introuvable.');
  assertCanValidateN1(actorUserId, row.employe_id);
  db.prepare(`
    UPDATE rh_documents SET statut_validation = ?, valide_n1_par = ?, valide_n1_at = datetime('now')
    WHERE id = ?
  `).run(approuve ? 'valide' : 'rejete', actorUserId, documentId);
  writeAuditLog({
    userId: actorUserId,
    action: 'UPDATE',
    module: 'rh',
    description: `Validation N+1 document #${documentId}`,
  });
}

export function countValidationsN1EnAttente(actorUserId: number): number {
  return listValidationsN1(actorUserId).length;
}
