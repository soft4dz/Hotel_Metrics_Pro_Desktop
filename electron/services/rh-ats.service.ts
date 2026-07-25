import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { assertPermission } from './permissions.service';
import { mapRecrutementRow, refuserRecrutement, validerRecrutement } from './rh-employe.service';
import type {
  AvancerCandidatureInput,
  CreateEntretienRecrutementInput,
  CreateOffreEmploiInput,
  CreateRecrutementInput,
  EtapeRecrutement,
  RhOffreEmploi,
  RhPipelineRecrutement,
  RhRecrutement,
  RhRecrutementEntretien,
  RhRecrutementHistorique,
  StatutOffreEmploi,
  UpdateEntretienRecrutementInput,
  UpdateOffreEmploiInput,
} from '../../src/shared/types/rh';

export const ETAPES_PIPELINE: EtapeRecrutement[] = [
  'candidature',
  'preselection',
  'entretien_rh',
  'entretien_metier',
  'proposition',
  'embauche',
];

export const ETAPES_TERMINALES: EtapeRecrutement[] = ['embauche', 'refuse'];

const recrutementSql = `
  SELECT r.*, p.nom AS poste_nom, d.nom AS departement_nom,
         o.titre AS offre_titre
  FROM rh_recrutements r
  INNER JOIN rh_postes p ON p.id = r.poste_id
  INNER JOIN rh_departements d ON d.id = p.departement_id
  LEFT JOIN rh_offres_emploi o ON o.id = r.offre_id
`;

const offreSql = `
  SELECT o.*, p.nom AS poste_nom, d.nom AS departement_nom,
         (SELECT COUNT(*) FROM rh_recrutements r WHERE r.offre_id = o.id AND r.statut = 'en_cours') AS nb_candidatures
  FROM rh_offres_emploi o
  INNER JOIN rh_postes p ON p.id = o.poste_id
  INNER JOIN rh_departements d ON d.id = p.departement_id
`;

function assertRhManage(actorUserId: number): void {
  assertPermission(actorUserId, 'rh.manage');
}

export function isTransitionAutorisee(from: EtapeRecrutement, to: EtapeRecrutement): boolean {
  if (from === to) return false;
  if (to === 'refuse') return from !== 'embauche' && from !== 'refuse';
  if (from === 'refuse' || from === 'embauche') return false;
  const fromIdx = ETAPES_PIPELINE.indexOf(from);
  const toIdx = ETAPES_PIPELINE.indexOf(to);
  if (fromIdx < 0 || toIdx < 0) return false;
  return toIdx === fromIdx + 1 || toIdx === fromIdx + 2;
}

function mapOffre(row: Record<string, unknown>): RhOffreEmploi {
  return {
    id: row.id as number,
    posteId: row.poste_id as number,
    posteNom: row.poste_nom as string,
    departementNom: row.departement_nom as string,
    titre: row.titre as string,
    description: (row.description as string | null) ?? null,
    statut: row.statut as StatutOffreEmploi,
    nbPostes: row.nb_postes as number,
    dateOuverture: (row.date_ouverture as string | null) ?? null,
    dateCloture: (row.date_cloture as string | null) ?? null,
    nbCandidatures: row.nb_candidatures as number,
    createdAt: row.created_at as string,
  };
}

function mapEntretien(row: Record<string, unknown>): RhRecrutementEntretien {
  return {
    id: row.id as number,
    recrutementId: row.recrutement_id as number,
    type: row.type as RhRecrutementEntretien['type'],
    dateHeure: row.date_heure as string,
    lieu: (row.lieu as string | null) ?? null,
    intervieweurId: (row.intervieweur_id as number | null) ?? null,
    intervieweurNom: (row.intervieweur_nom as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    noteEvaluation: (row.note_evaluation as number | null) ?? null,
    statut: row.statut as RhRecrutementEntretien['statut'],
    createdAt: row.created_at as string,
  };
}

function mapHistorique(row: Record<string, unknown>): RhRecrutementHistorique {
  return {
    id: row.id as number,
    recrutementId: row.recrutement_id as number,
    etapeAvant: (row.etape_avant as string | null) ?? null,
    etapeApres: row.etape_apres as string,
    commentaire: (row.commentaire as string | null) ?? null,
    createdByNom: (row.created_by_nom as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

function logHistorique(
  db: ReturnType<typeof getDatabase>,
  recrutementId: number,
  etapeAvant: string | null,
  etapeApres: string,
  actorUserId: number,
  commentaire?: string | null,
): void {
  db.prepare(`
    INSERT INTO rh_recrutement_historique (recrutement_id, etape_avant, etape_apres, commentaire, created_by)
    VALUES (?, ?, ?, ?, ?)
  `).run(recrutementId, etapeAvant, etapeApres, commentaire?.trim() ?? null, actorUserId);
}

function getRecrutementRow(db: ReturnType<typeof getDatabase>, id: number): Record<string, unknown> | undefined {
  return db.prepare(`${recrutementSql} WHERE r.id = ?`).get(id) as Record<string, unknown> | undefined;
}

export function listOffresEmploi(actorUserId: number, statut?: StatutOffreEmploi): RhOffreEmploi[] {
  assertRhManage(actorUserId);
  const db = getDatabase();
  if (statut) {
    return db
      .prepare(`${offreSql} WHERE o.statut = ? ORDER BY o.created_at DESC`)
      .all(statut)
      .map((r) => mapOffre(r as Record<string, unknown>));
  }
  return db
    .prepare(`${offreSql} ORDER BY o.created_at DESC`)
    .all()
    .map((r) => mapOffre(r as Record<string, unknown>));
}

export function createOffreEmploi(actorUserId: number, input: CreateOffreEmploiInput): RhOffreEmploi {
  assertRhManage(actorUserId);
  const db = getDatabase();
  const poste = db.prepare(`SELECT id FROM rh_postes WHERE id = ? AND actif = 1`).get(input.posteId);
  if (!poste) throw new Error('Poste introuvable ou inactif.');

  const result = db.prepare(`
    INSERT INTO rh_offres_emploi (poste_id, titre, description, statut, nb_postes, date_ouverture, date_cloture, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.posteId,
    input.titre.trim(),
    input.description?.trim() ?? null,
    input.statut ?? 'brouillon',
    input.nbPostes ?? 1,
    input.dateOuverture ?? null,
    input.dateCloture ?? null,
    actorUserId,
  );

  writeAuditLog({ userId: actorUserId, action: 'CREATE', module: 'rh', description: `Offre emploi : ${input.titre}` });
  return listOffresEmploi(actorUserId).find((o) => o.id === Number(result.lastInsertRowid))!;
}

export function updateOffreEmploi(actorUserId: number, id: number, input: UpdateOffreEmploiInput): RhOffreEmploi {
  assertRhManage(actorUserId);
  const db = getDatabase();
  const existing = db.prepare(`SELECT id FROM rh_offres_emploi WHERE id = ?`).get(id);
  if (!existing) throw new Error('Offre introuvable.');

  const fields: string[] = [];
  const params: unknown[] = [];
  if (input.titre !== undefined) { fields.push('titre = ?'); params.push(input.titre.trim()); }
  if (input.description !== undefined) { fields.push('description = ?'); params.push(input.description?.trim() ?? null); }
  if (input.statut !== undefined) { fields.push('statut = ?'); params.push(input.statut); }
  if (input.nbPostes !== undefined) { fields.push('nb_postes = ?'); params.push(input.nbPostes); }
  if (input.dateOuverture !== undefined) { fields.push('date_ouverture = ?'); params.push(input.dateOuverture); }
  if (input.dateCloture !== undefined) { fields.push('date_cloture = ?'); params.push(input.dateCloture); }
  if (fields.length === 0) return listOffresEmploi(actorUserId).find((o) => o.id === id)!;

  fields.push("updated_at = datetime('now')");
  params.push(id);
  db.prepare(`UPDATE rh_offres_emploi SET ${fields.join(', ')} WHERE id = ?`).run(...params);

  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'rh', description: `Offre emploi #${id} mise à jour` });
  return listOffresEmploi(actorUserId).find((o) => o.id === id)!;
}

export function getPipelineRecrutement(actorUserId: number, offreId?: number): RhPipelineRecrutement {
  assertRhManage(actorUserId);
  const db = getDatabase();
  const cols = [...ETAPES_PIPELINE, 'refuse'] as EtapeRecrutement[];
  const pipeline = Object.fromEntries(cols.map((e) => [e, [] as RhRecrutement[]])) as RhPipelineRecrutement;

  const rows = offreId
    ? db.prepare(`${recrutementSql} WHERE r.offre_id = ? ORDER BY r.updated_at DESC`).all(offreId)
    : db.prepare(`${recrutementSql} ORDER BY r.updated_at DESC`).all();

  for (const row of rows) {
    const rec = mapRecrutementRow(row as Record<string, unknown>);
    const etape = (rec.etape ?? 'candidature') as EtapeRecrutement;
    if (pipeline[etape]) pipeline[etape].push(rec);
  }
  return pipeline;
}

export function avancerCandidature(actorUserId: number, input: AvancerCandidatureInput): RhRecrutement {
  assertRhManage(actorUserId);
  const db = getDatabase();
  const rec = getRecrutementRow(db, input.recrutementId);
  if (!rec) throw new Error('Candidature introuvable.');
  if (rec.statut !== 'en_cours') throw new Error('Cette candidature est déjà clôturée.');

  const etapeActuelle = ((rec.etape as string) || 'candidature') as EtapeRecrutement;
  const etapeCible = input.etape;

  if (!isTransitionAutorisee(etapeActuelle, etapeCible) && etapeCible !== 'refuse') {
    throw new Error(`Transition ${etapeActuelle} → ${etapeCible} non autorisée.`);
  }

  if (etapeCible === 'embauche') {
    logHistorique(db, input.recrutementId, etapeActuelle, etapeCible, actorUserId, input.commentaire);
    db.prepare(`UPDATE rh_recrutements SET etape = 'embauche', updated_at = datetime('now') WHERE id = ?`).run(input.recrutementId);
    const result = validerRecrutement(actorUserId, input.recrutementId);
    if (rec.offre_id) {
      db.prepare(`UPDATE rh_offres_emploi SET statut = 'pourvue', updated_at = datetime('now') WHERE id = ?`).run(rec.offre_id);
    }
    return result;
  }

  if (etapeCible === 'refuse') {
    logHistorique(db, input.recrutementId, etapeActuelle, etapeCible, actorUserId, input.commentaire);
    db.prepare(`UPDATE rh_recrutements SET etape = 'refuse', updated_at = datetime('now') WHERE id = ?`).run(input.recrutementId);
    return refuserRecrutement(actorUserId, input.recrutementId, input.commentaire ?? undefined);
  }

  db.prepare(`UPDATE rh_recrutements SET etape = ?, updated_at = datetime('now') WHERE id = ?`).run(etapeCible, input.recrutementId);
  logHistorique(db, input.recrutementId, etapeActuelle, etapeCible, actorUserId, input.commentaire);
  writeAuditLog({
    userId: actorUserId,
    action: 'UPDATE',
    module: 'rh',
    description: `Candidature #${input.recrutementId} : ${etapeActuelle} → ${etapeCible}`,
  });
  return mapRecrutementRow(getRecrutementRow(db, input.recrutementId)!);
}

export function createCandidature(actorUserId: number, input: CreateRecrutementInput): RhRecrutement {
  assertRhManage(actorUserId);
  const db = getDatabase();
  let posteId = input.posteId;
  if (input.offreId) {
    const offre = db.prepare(`SELECT poste_id, statut FROM rh_offres_emploi WHERE id = ?`).get(input.offreId) as
      | { poste_id: number; statut: string }
      | undefined;
    if (!offre) throw new Error('Offre introuvable.');
    if (offre.statut === 'archivee' || offre.statut === 'pourvue') {
      throw new Error('Cette offre n\'accepte plus de candidatures.');
    }
    posteId = offre.poste_id;
  }

  const result = db.prepare(`
    INSERT INTO rh_recrutements (
      poste_id, offre_id, candidat_nom, candidat_prenom, candidat_email, candidat_telephone,
      notes, source, score, etape, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'candidature', ?)
  `).run(
    posteId,
    input.offreId ?? null,
    input.candidatNom.trim(),
    input.candidatPrenom?.trim() ?? null,
    input.candidatEmail?.trim() ?? null,
    input.candidatTelephone?.trim() ?? null,
    input.notes?.trim() ?? null,
    input.source?.trim() ?? null,
    input.score ?? null,
    actorUserId,
  );

  const recrutementId = Number(result.lastInsertRowid);
  logHistorique(db, recrutementId, null, 'candidature', actorUserId, 'Candidature créée');
  writeAuditLog({ userId: actorUserId, action: 'CREATE', module: 'rh', description: `Candidature ${input.candidatNom}` });
  return mapRecrutementRow(getRecrutementRow(db, recrutementId)!);
}

export function listEntretiensRecrutement(actorUserId: number, recrutementId: number): RhRecrutementEntretien[] {
  assertRhManage(actorUserId);
  return getDatabase()
    .prepare(`
      SELECT en.*, u.full_name AS intervieweur_nom
      FROM rh_recrutement_entretiens en
      LEFT JOIN users u ON u.id = en.intervieweur_id
      WHERE en.recrutement_id = ?
      ORDER BY en.date_heure DESC
    `)
    .all(recrutementId)
    .map((r) => mapEntretien(r as Record<string, unknown>));
}

export function createEntretienRecrutement(
  actorUserId: number,
  input: CreateEntretienRecrutementInput,
): RhRecrutementEntretien {
  assertRhManage(actorUserId);
  const db = getDatabase();
  const rec = db.prepare(`SELECT id, statut FROM rh_recrutements WHERE id = ?`).get(input.recrutementId);
  if (!rec) throw new Error('Candidature introuvable.');
  if ((rec as { statut: string }).statut !== 'en_cours') throw new Error('Candidature clôturée.');

  const result = db.prepare(`
    INSERT INTO rh_recrutement_entretiens (
      recrutement_id, type, date_heure, lieu, intervieweur_id, notes, note_evaluation, statut
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.recrutementId,
    input.type ?? 'rh',
    input.dateHeure,
    input.lieu?.trim() ?? null,
    input.intervieweurId ?? null,
    input.notes?.trim() ?? null,
    input.noteEvaluation ?? null,
    input.statut ?? 'planifie',
  );

  writeAuditLog({
    userId: actorUserId,
    action: 'CREATE',
    module: 'rh',
    description: `Entretien recrutement candidature #${input.recrutementId}`,
  });
  return listEntretiensRecrutement(actorUserId, input.recrutementId).find((e) => e.id === Number(result.lastInsertRowid))!;
}

export function updateEntretienRecrutement(
  actorUserId: number,
  id: number,
  input: UpdateEntretienRecrutementInput,
): RhRecrutementEntretien {
  assertRhManage(actorUserId);
  const db = getDatabase();
  const existing = db.prepare(`SELECT recrutement_id FROM rh_recrutement_entretiens WHERE id = ?`).get(id) as
    | { recrutement_id: number }
    | undefined;
  if (!existing) throw new Error('Entretien introuvable.');

  const fields: string[] = [];
  const params: unknown[] = [];
  if (input.type !== undefined) { fields.push('type = ?'); params.push(input.type); }
  if (input.dateHeure !== undefined) { fields.push('date_heure = ?'); params.push(input.dateHeure); }
  if (input.lieu !== undefined) { fields.push('lieu = ?'); params.push(input.lieu?.trim() ?? null); }
  if (input.intervieweurId !== undefined) { fields.push('intervieweur_id = ?'); params.push(input.intervieweurId); }
  if (input.notes !== undefined) { fields.push('notes = ?'); params.push(input.notes?.trim() ?? null); }
  if (input.noteEvaluation !== undefined) { fields.push('note_evaluation = ?'); params.push(input.noteEvaluation); }
  if (input.statut !== undefined) { fields.push('statut = ?'); params.push(input.statut); }
  if (fields.length === 0) return listEntretiensRecrutement(actorUserId, existing.recrutement_id).find((e) => e.id === id)!;

  fields.push("updated_at = datetime('now')");
  params.push(id);
  db.prepare(`UPDATE rh_recrutement_entretiens SET ${fields.join(', ')} WHERE id = ?`).run(...params);

  return listEntretiensRecrutement(actorUserId, existing.recrutement_id).find((e) => e.id === id)!;
}

export function listHistoriqueCandidature(actorUserId: number, recrutementId: number): RhRecrutementHistorique[] {
  assertRhManage(actorUserId);
  return getDatabase()
    .prepare(`
      SELECT h.*, u.full_name AS created_by_nom
      FROM rh_recrutement_historique h
      LEFT JOIN users u ON u.id = h.created_by
      WHERE h.recrutement_id = ?
      ORDER BY h.created_at DESC
    `)
    .all(recrutementId)
    .map((r) => mapHistorique(r as Record<string, unknown>));
}
