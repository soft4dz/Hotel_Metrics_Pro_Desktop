import { copyFileSync, existsSync, mkdirSync, unlinkSync } from 'node:fs';
import path from '../lib/nodePath';
import Electron from '../lib/electronApi';
import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { assertPermission, userHasPermission } from './permissions.service';
import type {
  AssignEmployeFormationInput,
  CreateCompetenceInput,
  CreateEntretienInput,
  CreateFormationCatalogInput,
  RhCompetence,
  RhDocument,
  RhEmployeFormation,
  RhEntretien,
  RhFormationCatalog,
  RhPosteCompetence,
  SetPosteCompetenceInput,
  TypeDocumentRh,
  TypeEntretien,
  UpdateEmployeFormationInput,
  UpdateEntretienInput,
  UpdateFormationCatalogInput,
} from '../../src/shared/types/rh';

function assertRhTalentManage(actorUserId: number): void {
  assertPermission(actorUserId, 'rh.manage');
}

function getEmployeIdForUser(userId: number): number | null {
  const row = getDatabase()
    .prepare(`SELECT employe_id FROM users WHERE id = ? AND deleted_at IS NULL`)
    .get(userId) as { employe_id: number } | undefined;
  return row?.employe_id ?? null;
}

function assertRhTalentView(actorUserId: number): void {
  if (!userHasPermission(actorUserId, 'rh.manage') && !userHasPermission(actorUserId, 'rh.team')) {
    assertPermission(actorUserId, 'rh.self');
  }
}

function rhDocumentsDir(): string {
  const dir = path.join(Electron.app.getPath('userData'), 'data', 'rh-documents');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

function addMonths(isoDate: string, months: number): string {
  const d = new Date(isoDate);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function mapFormationCatalog(r: Record<string, unknown>): RhFormationCatalog {
  return {
    id: r.id as number,
    code: r.code as string,
    libelle: r.libelle as string,
    organisme: (r.organisme as string) ?? null,
    dureeHeures: (r.duree_heures as number) ?? null,
    validiteMois: (r.validite_mois as number) ?? null,
    obligatoire: Boolean(r.obligatoire),
    actif: Boolean(r.actif),
  };
}

function mapEmployeFormation(r: Record<string, unknown>): RhEmployeFormation {
  return {
    id: r.id as number,
    employeId: r.employe_id as number,
    employeNom: r.employe_nom as string,
    formationId: r.formation_id as number,
    formationCode: r.formation_code as string,
    formationLibelle: r.formation_libelle as string,
    dateObtention: (r.date_obtention as string) ?? null,
    dateEcheance: (r.date_echeance as string) ?? null,
    statut: r.statut as RhEmployeFormation['statut'],
    certificatRef: (r.certificat_ref as string) ?? null,
    notes: (r.notes as string) ?? null,
    obligatoire: Boolean(r.obligatoire),
  };
}

function mapCompetence(r: Record<string, unknown>): RhCompetence {
  return {
    id: r.id as number,
    code: r.code as string,
    libelle: r.libelle as string,
    categorie: (r.categorie as string) ?? null,
    description: (r.description as string) ?? null,
    actif: Boolean(r.actif),
  };
}

function mapPosteCompetence(r: Record<string, unknown>): RhPosteCompetence {
  return {
    id: r.id as number,
    posteId: r.poste_id as number,
    posteNom: r.poste_nom as string,
    competenceId: r.competence_id as number,
    competenceCode: r.competence_code as string,
    competenceLibelle: r.competence_libelle as string,
    niveauRequis: r.niveau_requis as number,
  };
}

function mapEntretien(r: Record<string, unknown>): RhEntretien {
  return {
    id: r.id as number,
    employeId: r.employe_id as number,
    employeNom: r.employe_nom as string,
    dateEntretien: r.date_entretien as string,
    type: r.type as TypeEntretien,
    evaluateurEmployeId: (r.evaluateur_employe_id as number) ?? null,
    evaluateurNom: (r.evaluateur_nom as string) ?? null,
    noteGlobale: (r.note_globale as number) ?? null,
    objectifs: (r.objectifs as string) ?? null,
    commentaires: (r.commentaires as string) ?? null,
    statut: r.statut as RhEntretien['statut'],
  };
}

function mapDocument(r: Record<string, unknown>): RhDocument {
  return {
    id: r.id as number,
    employeId: r.employe_id as number,
    employeNom: r.employe_nom as string,
    type: r.type as TypeDocumentRh,
    nom: r.nom as string,
    fichierPath: r.fichier_path as string,
    mimeType: (r.mime_type as string) ?? null,
    taille: (r.taille as number) ?? null,
    createdAt: r.created_at as string,
    source: (r.source as RhDocument['source']) ?? 'upload',
    statutValidation: (r.statut_validation as RhDocument['statutValidation']) ?? 'brouillon',
    valideN1Par: (r.valide_n1_par as number) ?? null,
    valideN1At: (r.valide_n1_at as string) ?? null,
    scanBatch: (r.scan_batch as string) ?? null,
    modeleCode: (r.modele_code as string) ?? null,
  };
}

const EMP_FORMATION_SQL = `
  SELECT ef.*,
    e.prenom || ' ' || e.nom AS employe_nom,
    f.code AS formation_code,
    f.libelle AS formation_libelle,
    f.obligatoire
  FROM rh_employe_formations ef
  INNER JOIN rh_employes e ON e.id = ef.employe_id
  INNER JOIN rh_formations f ON f.id = ef.formation_id
`;

export function countCertificationsEcheanceProche(actorUserId: number, jours = 90): number {
  assertRhTalentManage(actorUserId);
  const limite = new Date(Date.now() + jours * 86_400_000).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  const row = getDatabase()
    .prepare(`
      SELECT COUNT(*) AS c FROM rh_employe_formations
      WHERE statut IN ('obtenu','en_cours')
        AND date_echeance IS NOT NULL
        AND date_echeance BETWEEN ? AND ?
    `)
    .get(today, limite) as { c: number };
  return row.c;
}

export function countEntretiensPlanifies(actorUserId: number, jours = 30): number {
  assertRhTalentManage(actorUserId);
  const limite = new Date(Date.now() + jours * 86_400_000).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  const row = getDatabase()
    .prepare(`
      SELECT COUNT(*) AS c FROM rh_entretiens
      WHERE statut = 'planifie' AND date_entretien BETWEEN ? AND ?
    `)
    .get(today, limite) as { c: number };
  return row.c;
}

export function listFormationsCatalog(actorUserId: number, actifOnly = true): RhFormationCatalog[] {
  assertRhTalentView(actorUserId);
  const cond = actifOnly ? 'WHERE actif = 1' : '';
  return getDatabase()
    .prepare(`SELECT * FROM rh_formations ${cond} ORDER BY libelle`)
    .all()
    .map((r) => mapFormationCatalog(r as Record<string, unknown>));
}

export function createFormationCatalog(
  actorUserId: number,
  input: CreateFormationCatalogInput,
): RhFormationCatalog {
  assertRhTalentManage(actorUserId);
  const db = getDatabase();
  const result = db
    .prepare(`
      INSERT INTO rh_formations (code, libelle, organisme, duree_heures, validite_mois, obligatoire)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    .run(
      input.code.trim().toUpperCase(),
      input.libelle.trim(),
      input.organisme?.trim() ?? null,
      input.dureeHeures ?? null,
      input.validiteMois ?? null,
      input.obligatoire ? 1 : 0,
    );
  writeAuditLog({
    userId: actorUserId,
    action: 'CREATE',
    module: 'rh',
    description: `Formation catalogue ${input.code}`,
  });
  const row = db.prepare(`SELECT * FROM rh_formations WHERE id = ?`).get(result.lastInsertRowid) as Record<string, unknown>;
  return mapFormationCatalog(row);
}

export function updateFormationCatalog(
  actorUserId: number,
  id: number,
  input: UpdateFormationCatalogInput,
): RhFormationCatalog {
  assertRhTalentManage(actorUserId);
  const db = getDatabase();
  const cur = db.prepare(`SELECT * FROM rh_formations WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
  if (!cur) throw new Error('Formation introuvable.');
  db.prepare(`
    UPDATE rh_formations SET
      libelle = ?, organisme = ?, duree_heures = ?, validite_mois = ?,
      obligatoire = ?, actif = ?
    WHERE id = ?
  `).run(
    input.libelle?.trim() ?? cur.libelle,
    input.organisme !== undefined ? input.organisme : cur.organisme,
    input.dureeHeures !== undefined ? input.dureeHeures : cur.duree_heures,
    input.validiteMois !== undefined ? input.validiteMois : cur.validite_mois,
    input.obligatoire !== undefined ? (input.obligatoire ? 1 : 0) : cur.obligatoire,
    input.actif !== undefined ? (input.actif ? 1 : 0) : cur.actif,
    id,
  );
  const row = db.prepare(`SELECT * FROM rh_formations WHERE id = ?`).get(id) as Record<string, unknown>;
  return mapFormationCatalog(row);
}

export function listEmployeFormations(
  actorUserId: number,
  opts?: { employeId?: number; echeanceProche?: boolean },
): RhEmployeFormation[] {
  assertRhTalentView(actorUserId);
  const selfId = getEmployeIdForUser(actorUserId);
  const canManage = userHasPermission(actorUserId, 'rh.manage') || userHasPermission(actorUserId, 'rh.team');
  if (!canManage && opts?.employeId && opts.employeId !== selfId) {
    throw new Error('Accès refusé.');
  }
  const conditions = ['1=1'];
  const params: unknown[] = [];
  const targetId = opts?.employeId ?? (canManage ? undefined : selfId);
  if (targetId) {
    conditions.push('ef.employe_id = ?');
    params.push(targetId);
  }
  if (opts?.echeanceProche) {
    const limite = new Date(Date.now() + 90 * 86_400_000).toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    conditions.push(`ef.date_echeance BETWEEN ? AND ?`);
    params.push(today, limite);
  }
  return getDatabase()
    .prepare(`${EMP_FORMATION_SQL} WHERE ${conditions.join(' AND ')} ORDER BY ef.date_echeance, employe_nom`)
    .all(...params)
    .map((r) => mapEmployeFormation(r as Record<string, unknown>));
}

export function assignEmployeFormation(
  actorUserId: number,
  input: AssignEmployeFormationInput,
): RhEmployeFormation {
  assertRhTalentManage(actorUserId);
  const db = getDatabase();
  const result = db
    .prepare(`
      INSERT INTO rh_employe_formations (employe_id, formation_id, date_obtention, date_echeance, statut, certificat_ref, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      input.employeId,
      input.formationId,
      input.dateObtention ?? null,
      input.dateEcheance ?? null,
      input.statut ?? 'planifie',
      input.certificatRef?.trim() ?? null,
      input.notes?.trim() ?? null,
    );
  writeAuditLog({
    userId: actorUserId,
    action: 'CREATE',
    module: 'rh',
    description: `Formation assignée employé #${input.employeId}`,
  });
  const row = db
    .prepare(`${EMP_FORMATION_SQL} WHERE ef.id = ?`)
    .get(result.lastInsertRowid) as Record<string, unknown>;
  return mapEmployeFormation(row);
}

export function updateEmployeFormation(
  actorUserId: number,
  id: number,
  input: UpdateEmployeFormationInput,
): RhEmployeFormation {
  assertRhTalentManage(actorUserId);
  const db = getDatabase();
  const cur = db
    .prepare(`${EMP_FORMATION_SQL} WHERE ef.id = ?`)
    .get(id) as Record<string, unknown> | undefined;
  if (!cur) throw new Error('Suivi formation introuvable.');

  let dateEcheance = input.dateEcheance !== undefined ? input.dateEcheance : (cur.date_echeance as string | null);
  const statut = input.statut ?? (cur.statut as RhEmployeFormation['statut']);
  const dateObtention = input.dateObtention !== undefined ? input.dateObtention : (cur.date_obtention as string | null);

  if (statut === 'obtenu' && dateObtention && !dateEcheance) {
    const formation = db
      .prepare(`SELECT validite_mois FROM rh_formations WHERE id = ?`)
      .get(cur.formation_id) as { validite_mois: number | null } | undefined;
    if (formation?.validite_mois) {
      dateEcheance = addMonths(dateObtention, formation.validite_mois);
    }
  }

  db.prepare(`
    UPDATE rh_employe_formations SET
      date_obtention = ?, date_echeance = ?, statut = ?,
      certificat_ref = ?, notes = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    dateObtention,
    dateEcheance,
    statut,
    input.certificatRef !== undefined ? input.certificatRef : cur.certificat_ref,
    input.notes !== undefined ? input.notes : cur.notes,
    id,
  );

  const row = db.prepare(`${EMP_FORMATION_SQL} WHERE ef.id = ?`).get(id) as Record<string, unknown>;
  return mapEmployeFormation(row);
}

export function deleteEmployeFormation(actorUserId: number, id: number): void {
  assertRhTalentManage(actorUserId);
  getDatabase().prepare(`DELETE FROM rh_employe_formations WHERE id = ?`).run(id);
  writeAuditLog({ userId: actorUserId, action: 'DELETE', module: 'rh', description: `Suivi formation #${id} supprimé` });
}

export function listCompetences(actorUserId: number): RhCompetence[] {
  assertRhTalentView(actorUserId);
  return getDatabase()
    .prepare(`SELECT * FROM rh_competences WHERE actif = 1 ORDER BY categorie, libelle`)
    .all()
    .map((r) => mapCompetence(r as Record<string, unknown>));
}

export function createCompetence(actorUserId: number, input: CreateCompetenceInput): RhCompetence {
  assertRhTalentManage(actorUserId);
  const db = getDatabase();
  const result = db
    .prepare(`
      INSERT INTO rh_competences (code, libelle, categorie, description)
      VALUES (?, ?, ?, ?)
    `)
    .run(input.code.trim().toUpperCase(), input.libelle.trim(), input.categorie?.trim() ?? null, input.description?.trim() ?? null);
  const row = db.prepare(`SELECT * FROM rh_competences WHERE id = ?`).get(result.lastInsertRowid) as Record<string, unknown>;
  return mapCompetence(row);
}

export function listPosteCompetences(actorUserId: number, posteId?: number): RhPosteCompetence[] {
  assertRhTalentView(actorUserId);
  const conditions = ['1=1'];
  const params: unknown[] = [];
  if (posteId) {
    conditions.push('pc.poste_id = ?');
    params.push(posteId);
  }
  return getDatabase()
    .prepare(`
      SELECT pc.*, p.nom AS poste_nom, c.code AS competence_code, c.libelle AS competence_libelle
      FROM rh_poste_competences pc
      INNER JOIN rh_postes p ON p.id = pc.poste_id
      INNER JOIN rh_competences c ON c.id = pc.competence_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY p.nom, c.libelle
    `)
    .all(...params)
    .map((r) => mapPosteCompetence(r as Record<string, unknown>));
}

export function setPosteCompetence(actorUserId: number, input: SetPosteCompetenceInput): RhPosteCompetence {
  assertRhTalentManage(actorUserId);
  const db = getDatabase();
  const existing = db
    .prepare(`SELECT id FROM rh_poste_competences WHERE poste_id = ? AND competence_id = ?`)
    .get(input.posteId, input.competenceId) as { id: number } | undefined;
  if (existing) {
    db.prepare(`UPDATE rh_poste_competences SET niveau_requis = ? WHERE id = ?`).run(input.niveauRequis, existing.id);
  } else {
    db.prepare(`
      INSERT INTO rh_poste_competences (poste_id, competence_id, niveau_requis)
      VALUES (?, ?, ?)
    `).run(input.posteId, input.competenceId, input.niveauRequis);
  }
  const row = db
    .prepare(`
      SELECT pc.*, p.nom AS poste_nom, c.code AS competence_code, c.libelle AS competence_libelle
      FROM rh_poste_competences pc
      INNER JOIN rh_postes p ON p.id = pc.poste_id
      INNER JOIN rh_competences c ON c.id = pc.competence_id
      WHERE pc.poste_id = ? AND pc.competence_id = ?
    `)
    .get(input.posteId, input.competenceId) as Record<string, unknown>;
  return mapPosteCompetence(row);
}

export function removePosteCompetence(actorUserId: number, id: number): void {
  assertRhTalentManage(actorUserId);
  getDatabase().prepare(`DELETE FROM rh_poste_competences WHERE id = ?`).run(id);
}

export function listEntretiens(
  actorUserId: number,
  opts?: { employeId?: number; statut?: RhEntretien['statut'] },
): RhEntretien[] {
  assertRhTalentView(actorUserId);
  const selfId = getEmployeIdForUser(actorUserId);
  const canManage = userHasPermission(actorUserId, 'rh.manage') || userHasPermission(actorUserId, 'rh.team');
  if (!canManage && opts?.employeId && opts.employeId !== selfId) {
    throw new Error('Accès refusé.');
  }
  const conditions = ['1=1'];
  const params: unknown[] = [];
  const targetId = opts?.employeId ?? (canManage ? undefined : selfId);
  if (targetId) {
    conditions.push('en.employe_id = ?');
    params.push(targetId);
  }
  if (opts?.statut) {
    conditions.push('en.statut = ?');
    params.push(opts.statut);
  }
  return getDatabase()
    .prepare(`
      SELECT en.*,
        e.prenom || ' ' || e.nom AS employe_nom,
        ev.prenom || ' ' || ev.nom AS evaluateur_nom
      FROM rh_entretiens en
      INNER JOIN rh_employes e ON e.id = en.employe_id
      LEFT JOIN rh_employes ev ON ev.id = en.evaluateur_employe_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY en.date_entretien DESC
    `)
    .all(...params)
    .map((r) => mapEntretien(r as Record<string, unknown>));
}

export function createEntretien(actorUserId: number, input: CreateEntretienInput): RhEntretien {
  assertRhTalentManage(actorUserId);
  const db = getDatabase();
  const result = db
    .prepare(`
      INSERT INTO rh_entretiens (
        employe_id, date_entretien, type, evaluateur_employe_id,
        note_globale, objectifs, commentaires, statut
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      input.employeId,
      input.dateEntretien,
      input.type ?? 'annuel',
      input.evaluateurEmployeId ?? null,
      input.noteGlobale ?? null,
      input.objectifs?.trim() ?? null,
      input.commentaires?.trim() ?? null,
      input.statut ?? 'planifie',
    );
  writeAuditLog({
    userId: actorUserId,
    action: 'CREATE',
    module: 'rh',
    description: `Entretien planifié employé #${input.employeId}`,
  });
  const row = db
    .prepare(`
      SELECT en.*, e.prenom || ' ' || e.nom AS employe_nom, ev.prenom || ' ' || ev.nom AS evaluateur_nom
      FROM rh_entretiens en
      INNER JOIN rh_employes e ON e.id = en.employe_id
      LEFT JOIN rh_employes ev ON ev.id = en.evaluateur_employe_id
      WHERE en.id = ?
    `)
    .get(result.lastInsertRowid) as Record<string, unknown>;
  return mapEntretien(row);
}

export function updateEntretien(actorUserId: number, id: number, input: UpdateEntretienInput): RhEntretien {
  assertRhTalentManage(actorUserId);
  const db = getDatabase();
  const cur = db.prepare(`SELECT * FROM rh_entretiens WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
  if (!cur) throw new Error('Entretien introuvable.');
  db.prepare(`
    UPDATE rh_entretiens SET
      date_entretien = ?, type = ?, evaluateur_employe_id = ?,
      note_globale = ?, objectifs = ?, commentaires = ?, statut = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    input.dateEntretien ?? cur.date_entretien,
    input.type ?? cur.type,
    input.evaluateurEmployeId !== undefined ? input.evaluateurEmployeId : cur.evaluateur_employe_id,
    input.noteGlobale !== undefined ? input.noteGlobale : cur.note_globale,
    input.objectifs !== undefined ? input.objectifs : cur.objectifs,
    input.commentaires !== undefined ? input.commentaires : cur.commentaires,
    input.statut ?? cur.statut,
    id,
  );
  const row = db
    .prepare(`
      SELECT en.*, e.prenom || ' ' || e.nom AS employe_nom, ev.prenom || ' ' || ev.nom AS evaluateur_nom
      FROM rh_entretiens en
      INNER JOIN rh_employes e ON e.id = en.employe_id
      LEFT JOIN rh_employes ev ON ev.id = en.evaluateur_employe_id
      WHERE en.id = ?
    `)
    .get(id) as Record<string, unknown>;
  return mapEntretien(row);
}

export function deleteEntretien(actorUserId: number, id: number): void {
  assertRhTalentManage(actorUserId);
  getDatabase().prepare(`DELETE FROM rh_entretiens WHERE id = ?`).run(id);
}

export function listDocuments(actorUserId: number, employeId?: number): RhDocument[] {
  assertRhTalentView(actorUserId);
  const selfId = getEmployeIdForUser(actorUserId);
  const canManage = userHasPermission(actorUserId, 'rh.manage');
  const targetId = employeId ?? (canManage ? undefined : selfId);
  if (!canManage && employeId && employeId !== selfId) {
    throw new Error('Accès refusé.');
  }
  const conditions = ['1=1'];
  const params: unknown[] = [];
  if (targetId) {
    conditions.push('d.employe_id = ?');
    params.push(targetId);
  }
  return getDatabase()
    .prepare(`
      SELECT d.*, e.prenom || ' ' || e.nom AS employe_nom
      FROM rh_documents d
      INNER JOIN rh_employes e ON e.id = d.employe_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY d.created_at DESC
    `)
    .all(...params)
    .map((r) => mapDocument(r as Record<string, unknown>));
}

export async function pickAndUploadDocument(
  actorUserId: number,
  employeId: number,
  type: TypeDocumentRh,
  nom?: string,
): Promise<RhDocument> {
  assertRhTalentManage(actorUserId);
  const { canceled, filePaths } = await Electron.dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Documents', extensions: ['pdf', 'png', 'jpg', 'jpeg', 'doc', 'docx'] }],
  });
  if (canceled || !filePaths[0]) throw new Error('Import annulé.');
  const src = filePaths[0];
  const base = path.basename(src);
  const destName = `${employeId}_${Date.now()}_${base}`;
  const dest = path.join(rhDocumentsDir(), destName);
  copyFileSync(src, dest);
  const db = getDatabase();
  const result = db
    .prepare(`
      INSERT INTO rh_documents (employe_id, type, nom, fichier_path, mime_type, taille)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    .run(employeId, type, nom?.trim() || base, dest, null, null);
  writeAuditLog({
    userId: actorUserId,
    action: 'CREATE',
    module: 'rh',
    description: `Document RH ${type} employé #${employeId}`,
  });
  const row = db
    .prepare(`
      SELECT d.*, e.prenom || ' ' || e.nom AS employe_nom
      FROM rh_documents d INNER JOIN rh_employes e ON e.id = d.employe_id
      WHERE d.id = ?
    `)
    .get(result.lastInsertRowid) as Record<string, unknown>;
  return mapDocument(row);
}

export function deleteDocument(actorUserId: number, id: number): void {
  assertRhTalentManage(actorUserId);
  const db = getDatabase();
  const doc = db.prepare(`SELECT fichier_path FROM rh_documents WHERE id = ?`).get(id) as { fichier_path: string } | undefined;
  if (doc?.fichier_path && existsSync(doc.fichier_path)) {
    try {
      unlinkSync(doc.fichier_path);
    } catch {
      /* fichier déjà absent */
    }
  }
  db.prepare(`DELETE FROM rh_documents WHERE id = ?`).run(id);
}

export function openDocument(actorUserId: number, id: number): void {
  assertRhTalentView(actorUserId);
  const doc = getDatabase()
    .prepare(`SELECT fichier_path, employe_id FROM rh_documents WHERE id = ?`)
    .get(id) as { fichier_path: string; employe_id: number } | undefined;
  if (!doc) throw new Error('Document introuvable.');
  const selfId = getEmployeIdForUser(actorUserId);
  const canManage = userHasPermission(actorUserId, 'rh.manage');
  if (!canManage && doc.employe_id !== selfId) throw new Error('Accès refusé.');
  void Electron.shell.openPath(doc.fichier_path);
}

export function listEmployeFormationsForMonEspace(employeId: number): RhEmployeFormation[] {
  return getDatabase()
    .prepare(`${EMP_FORMATION_SQL} WHERE ef.employe_id = ? ORDER BY ef.date_echeance LIMIT 5`)
    .all(employeId)
    .map((r) => mapEmployeFormation(r as Record<string, unknown>));
}

export function listEntretiensForMonEspace(employeId: number): RhEntretien[] {
  return getDatabase()
    .prepare(`
      SELECT en.*, e.prenom || ' ' || e.nom AS employe_nom, ev.prenom || ' ' || ev.nom AS evaluateur_nom
      FROM rh_entretiens en
      INNER JOIN rh_employes e ON e.id = en.employe_id
      LEFT JOIN rh_employes ev ON ev.id = en.evaluateur_employe_id
      WHERE en.employe_id = ? AND en.statut = 'planifie'
      ORDER BY en.date_entretien LIMIT 3
    `)
    .all(employeId)
    .map((r) => mapEntretien(r as Record<string, unknown>));
}
