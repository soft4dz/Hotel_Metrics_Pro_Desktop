import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { assertPermission } from './permissions.service';
import type {
  CreateCampagneEvaluationInput,
  RhCampagneEvaluation,
  RhCampagneEvaluationLigne,
  RhCampagneSynthese,
  RhEmployeCompetence,
  RhMatriceGpec,
  SetEmployeCompetenceInput,
  SoumettreEvaluationInput,
  UpdateCampagneEvaluationInput,
} from '../../src/shared/types/rh';

function assertRhManage(actorUserId: number): void {
  assertPermission(actorUserId, 'rh.manage');
}

function mapEmployeCompetence(row: Record<string, unknown>): RhEmployeCompetence {
  return {
    id: row.id as number,
    employeId: row.employe_id as number,
    employeNom: row.employe_nom as string,
    competenceId: row.competence_id as number,
    competenceCode: row.competence_code as string,
    competenceLibelle: row.competence_libelle as string,
    niveauActuel: row.niveau_actuel as number,
    niveauRequis: (row.niveau_requis as number | null) ?? null,
    ecart: row.niveau_requis != null ? (row.niveau_actuel as number) - (row.niveau_requis as number) : null,
    source: row.source as RhEmployeCompetence['source'],
    dateMaj: row.date_maj as string,
    commentaire: (row.commentaire as string | null) ?? null,
  };
}

function mapCampagne(row: Record<string, unknown>): RhCampagneEvaluation {
  return {
    id: row.id as number,
    titre: row.titre as string,
    description: (row.description as string | null) ?? null,
    periodeDebut: row.periode_debut as string,
    periodeFin: row.periode_fin as string,
    statut: row.statut as RhCampagneEvaluation['statut'],
    nbEvaluations: (row.nb_evaluations as number) ?? 0,
    nbValidees: (row.nb_validees as number) ?? 0,
    createdAt: row.created_at as string,
  };
}

function mapLigne(row: Record<string, unknown>): RhCampagneEvaluationLigne {
  return {
    id: row.id as number,
    campagneId: row.campagne_id as number,
    employeId: row.employe_id as number,
    employeNom: row.employe_nom as string,
    competenceId: row.competence_id as number,
    competenceCode: row.competence_code as string,
    competenceLibelle: row.competence_libelle as string,
    niveauRequis: row.niveau_requis as number,
    niveauObserve: (row.niveau_observe as number | null) ?? null,
    ecart: (row.ecart as number | null) ?? null,
    commentaire: (row.commentaire as string | null) ?? null,
    evaluateurNom: (row.evaluateur_nom as string | null) ?? null,
    statut: row.statut as RhCampagneEvaluationLigne['statut'],
  };
}

const campagneSql = `
  SELECT c.*,
         (SELECT COUNT(*) FROM rh_campagne_evaluations ce WHERE ce.campagne_id = c.id) AS nb_evaluations,
         (SELECT COUNT(*) FROM rh_campagne_evaluations ce WHERE ce.campagne_id = c.id AND ce.statut = 'valide') AS nb_validees
  FROM rh_campagnes_evaluation c
`;

export function listEmployeCompetences(actorUserId: number, employeId?: number): RhEmployeCompetence[] {
  assertRhManage(actorUserId);
  const conditions = ['e.deleted_at IS NULL'];
  const params: unknown[] = [];
  if (employeId) {
    conditions.push('ec.employe_id = ?');
    params.push(employeId);
  }
  return getDatabase()
    .prepare(`
      SELECT ec.*, e.prenom || ' ' || e.nom AS employe_nom,
             c.code AS competence_code, c.libelle AS competence_libelle,
             pc.niveau_requis
      FROM rh_employe_competences ec
      INNER JOIN rh_employes e ON e.id = ec.employe_id
      INNER JOIN rh_competences c ON c.id = ec.competence_id
      LEFT JOIN rh_poste_competences pc ON pc.competence_id = ec.competence_id
        AND pc.poste_id = e.poste_actuel_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY employe_nom, c.libelle
    `)
    .all(...params)
    .map((r) => mapEmployeCompetence(r as Record<string, unknown>));
}

export function setEmployeCompetence(actorUserId: number, input: SetEmployeCompetenceInput): RhEmployeCompetence {
  assertRhManage(actorUserId);
  const db = getDatabase();
  const existing = db.prepare(`
    SELECT id FROM rh_employe_competences WHERE employe_id = ? AND competence_id = ?
  `).get(input.employeId, input.competenceId) as { id: number } | undefined;

  if (existing) {
    db.prepare(`
      UPDATE rh_employe_competences
      SET niveau_actuel = ?, source = ?, commentaire = ?, date_maj = date('now'), updated_at = datetime('now')
      WHERE id = ?
    `).run(input.niveauActuel, input.source ?? 'manuel', input.commentaire?.trim() ?? null, existing.id);
  } else {
    db.prepare(`
      INSERT INTO rh_employe_competences (employe_id, competence_id, niveau_actuel, source, commentaire)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      input.employeId,
      input.competenceId,
      input.niveauActuel,
      input.source ?? 'manuel',
      input.commentaire?.trim() ?? null,
    );
  }

  writeAuditLog({
    userId: actorUserId,
    action: 'UPDATE',
    module: 'rh',
    description: `Compétence employé #${input.employeId} — niveau ${input.niveauActuel}`,
  });
  return listEmployeCompetences(actorUserId, input.employeId).find((c) => c.competenceId === input.competenceId)!;
}

export function getMatriceGpec(actorUserId: number, employeId: number): RhMatriceGpec {
  assertRhManage(actorUserId);
  const db = getDatabase();
  const emp = db.prepare(`
    SELECT e.id, e.prenom || ' ' || e.nom AS nom, e.poste_actuel_id, p.nom AS poste_nom
    FROM rh_employes e
    LEFT JOIN rh_postes p ON p.id = e.poste_actuel_id
    WHERE e.id = ? AND e.deleted_at IS NULL
  `).get(employeId) as Record<string, unknown> | undefined;
  if (!emp) throw new Error('Employé introuvable.');

  const posteId = emp.poste_actuel_id as number | null;
  const requises = posteId
    ? (db.prepare(`
        SELECT pc.competence_id, pc.niveau_requis, c.code, c.libelle
        FROM rh_poste_competences pc
        INNER JOIN rh_competences c ON c.id = pc.competence_id
        WHERE pc.poste_id = ?
      `).all(posteId) as Record<string, unknown>[])
    : [];

  const actuelles = listEmployeCompetences(actorUserId, employeId);
  const actuellesMap = new Map(actuelles.map((c) => [c.competenceId, c]));

  const lignes = requises.map((r) => {
    const compId = r.competence_id as number;
    const actuelle = actuellesMap.get(compId);
    const niveauRequis = r.niveau_requis as number;
    const niveauActuel = actuelle?.niveauActuel ?? 0;
    return {
      competenceId: compId,
      competenceCode: r.code as string,
      competenceLibelle: r.libelle as string,
      niveauRequis,
      niveauActuel,
      ecart: niveauActuel - niveauRequis,
      statut: niveauActuel >= niveauRequis ? 'ok' as const : niveauActuel > 0 ? 'partiel' as const : 'manquant' as const,
    };
  });

  const extras = actuelles.filter((a) => !requises.some((r) => (r.competence_id as number) === a.competenceId));

  return {
    employeId,
    employeNom: emp.nom as string,
    posteNom: (emp.poste_nom as string | null) ?? null,
    lignes,
    competencesExtra: extras,
    tauxCouverture: requises.length > 0
      ? Math.round((lignes.filter((l) => l.statut === 'ok').length / requises.length) * 100)
      : 100,
  };
}

export function listCampagnesEvaluation(actorUserId: number): RhCampagneEvaluation[] {
  assertRhManage(actorUserId);
  return getDatabase()
    .prepare(`${campagneSql} ORDER BY c.created_at DESC`)
    .all()
    .map((r) => mapCampagne(r as Record<string, unknown>));
}

export function createCampagneEvaluation(
  actorUserId: number,
  input: CreateCampagneEvaluationInput,
): RhCampagneEvaluation {
  assertRhManage(actorUserId);
  const result = getDatabase().prepare(`
    INSERT INTO rh_campagnes_evaluation (titre, description, periode_debut, periode_fin, statut, created_by)
    VALUES (?, ?, ?, ?, 'brouillon', ?)
  `).run(
    input.titre.trim(),
    input.description?.trim() ?? null,
    input.periodeDebut,
    input.periodeFin,
    actorUserId,
  );
  writeAuditLog({ userId: actorUserId, action: 'CREATE', module: 'rh', description: `Campagne GPEC : ${input.titre}` });
  return listCampagnesEvaluation(actorUserId).find((c) => c.id === Number(result.lastInsertRowid))!;
}

export function updateCampagneEvaluation(
  actorUserId: number,
  id: number,
  input: UpdateCampagneEvaluationInput,
): RhCampagneEvaluation {
  assertRhManage(actorUserId);
  const db = getDatabase();
  const fields: string[] = [];
  const params: unknown[] = [];
  if (input.titre !== undefined) { fields.push('titre = ?'); params.push(input.titre.trim()); }
  if (input.description !== undefined) { fields.push('description = ?'); params.push(input.description?.trim() ?? null); }
  if (input.periodeDebut !== undefined) { fields.push('periode_debut = ?'); params.push(input.periodeDebut); }
  if (input.periodeFin !== undefined) { fields.push('periode_fin = ?'); params.push(input.periodeFin); }
  if (input.statut !== undefined) { fields.push('statut = ?'); params.push(input.statut); }
  if (fields.length === 0) return listCampagnesEvaluation(actorUserId).find((c) => c.id === id)!;
  fields.push("updated_at = datetime('now')");
  params.push(id);
  db.prepare(`UPDATE rh_campagnes_evaluation SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  return listCampagnesEvaluation(actorUserId).find((c) => c.id === id)!;
}

export function lancerCampagneEvaluation(actorUserId: number, campagneId: number): RhCampagneSynthese {
  assertRhManage(actorUserId);
  const db = getDatabase();
  const campagne = db.prepare(`SELECT * FROM rh_campagnes_evaluation WHERE id = ?`).get(campagneId) as
    | Record<string, unknown>
    | undefined;
  if (!campagne) throw new Error('Campagne introuvable.');
  if (campagne.statut === 'cloturee') throw new Error('Campagne déjà clôturée.');

  const employes = db.prepare(`
    SELECT e.id, e.poste_actuel_id FROM rh_employes e
    WHERE e.deleted_at IS NULL AND e.statut_rh = 'actif' AND e.poste_actuel_id IS NOT NULL
  `).all() as { id: number; poste_actuel_id: number }[];

  let lignesCrees = 0;
  for (const emp of employes) {
    const comps = db.prepare(`
      SELECT competence_id, niveau_requis FROM rh_poste_competences WHERE poste_id = ?
    `).all(emp.poste_actuel_id) as { competence_id: number; niveau_requis: number }[];

    for (const c of comps) {
      const res = db.prepare(`
        INSERT OR IGNORE INTO rh_campagne_evaluations (campagne_id, employe_id, competence_id, niveau_requis)
        VALUES (?, ?, ?, ?)
      `).run(campagneId, emp.id, c.competence_id, c.niveau_requis);
      if (res.changes > 0) lignesCrees++;
    }
  }

  db.prepare(`UPDATE rh_campagnes_evaluation SET statut = 'en_cours', updated_at = datetime('now') WHERE id = ?`).run(campagneId);
  writeAuditLog({
    userId: actorUserId,
    action: 'UPDATE',
    module: 'rh',
    description: `Campagne GPEC #${campagneId} lancée — ${lignesCrees} ligne(s)`,
  });
  return getCampagneSynthese(actorUserId, campagneId);
}

export function listCampagneEvaluations(
  actorUserId: number,
  campagneId: number,
  employeId?: number,
): RhCampagneEvaluationLigne[] {
  assertRhManage(actorUserId);
  const conditions = ['ce.campagne_id = ?'];
  const params: unknown[] = [campagneId];
  if (employeId) {
    conditions.push('ce.employe_id = ?');
    params.push(employeId);
  }
  return getDatabase()
    .prepare(`
      SELECT ce.*, e.prenom || ' ' || e.nom AS employe_nom,
             c.code AS competence_code, c.libelle AS competence_libelle,
             ev.prenom || ' ' || ev.nom AS evaluateur_nom
      FROM rh_campagne_evaluations ce
      INNER JOIN rh_employes e ON e.id = ce.employe_id
      INNER JOIN rh_competences c ON c.id = ce.competence_id
      LEFT JOIN rh_employes ev ON ev.id = ce.evaluateur_employe_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY employe_nom, c.libelle
    `)
    .all(...params)
    .map((r) => mapLigne(r as Record<string, unknown>));
}

export function soumettreEvaluationLigne(
  actorUserId: number,
  ligneId: number,
  input: SoumettreEvaluationInput,
): RhCampagneEvaluationLigne {
  assertRhManage(actorUserId);
  const db = getDatabase();
  const ligne = db.prepare(`SELECT * FROM rh_campagne_evaluations WHERE id = ?`).get(ligneId) as
    | Record<string, unknown>
    | undefined;
  if (!ligne) throw new Error('Ligne évaluation introuvable.');

  const ecart = input.niveauObserve - (ligne.niveau_requis as number);
  db.prepare(`
    UPDATE rh_campagne_evaluations
    SET niveau_observe = ?, ecart = ?, commentaire = ?, evaluateur_employe_id = ?,
        statut = 'soumis', updated_at = datetime('now')
    WHERE id = ?
  `).run(
    input.niveauObserve,
    ecart,
    input.commentaire?.trim() ?? null,
    input.evaluateurEmployeId ?? null,
    ligneId,
  );

  return listCampagneEvaluations(actorUserId, ligne.campagne_id as number).find((l) => l.id === ligneId)!;
}

export function validerEvaluationLigne(actorUserId: number, ligneId: number): RhCampagneEvaluationLigne {
  assertRhManage(actorUserId);
  const db = getDatabase();
  const ligne = db.prepare(`SELECT * FROM rh_campagne_evaluations WHERE id = ?`).get(ligneId) as
    | Record<string, unknown>
    | undefined;
  if (!ligne) throw new Error('Ligne évaluation introuvable.');
  if (ligne.niveau_observe == null) throw new Error('Évaluation non renseignée.');

  db.prepare(`
    UPDATE rh_campagne_evaluations SET statut = 'valide', updated_at = datetime('now') WHERE id = ?
  `).run(ligneId);

  db.prepare(`
    INSERT INTO rh_employe_competences (employe_id, competence_id, niveau_actuel, source, commentaire)
    VALUES (?, ?, ?, 'evaluation', ?)
    ON CONFLICT(employe_id, competence_id) DO UPDATE SET
      niveau_actuel = excluded.niveau_actuel,
      source = 'evaluation',
      commentaire = excluded.commentaire,
      date_maj = date('now'),
      updated_at = datetime('now')
  `).run(
    ligne.employe_id,
    ligne.competence_id,
    ligne.niveau_observe,
    (ligne.commentaire as string) ?? null,
  );

  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'rh', description: `Évaluation GPEC #${ligneId} validée` });
  return listCampagneEvaluations(actorUserId, ligne.campagne_id as number).find((l) => l.id === ligneId)!;
}

export function getCampagneSynthese(actorUserId: number, campagneId: number): RhCampagneSynthese {
  assertRhManage(actorUserId);
  const campagne = listCampagnesEvaluation(actorUserId).find((c) => c.id === campagneId);
  if (!campagne) throw new Error('Campagne introuvable.');
  const lignes = listCampagneEvaluations(actorUserId, campagneId);
  const soumis = lignes.filter((l) => l.statut !== 'brouillon').length;
  const valides = lignes.filter((l) => l.statut === 'valide').length;
  const ecarts = lignes.filter((l) => l.ecart != null && l.ecart < 0).length;
  return {
    campagne,
    totalLignes: lignes.length,
    soumis,
    valides,
    ecartsNegatifs: ecarts,
    tauxCompletion: lignes.length > 0 ? Math.round((valides / lignes.length) * 100) : 0,
  };
}

export function cloturerCampagneEvaluation(actorUserId: number, campagneId: number): RhCampagneEvaluation {
  assertRhManage(actorUserId);
  const db = getDatabase();
  const pending = db.prepare(`
    SELECT COUNT(*) AS c FROM rh_campagne_evaluations WHERE campagne_id = ? AND statut != 'valide'
  `).get(campagneId) as { c: number };
  if (pending.c > 0) {
    throw new Error(`${pending.c} évaluation(s) non validée(s). Validez ou supprimez avant clôture.`);
  }
  db.prepare(`UPDATE rh_campagnes_evaluation SET statut = 'cloturee', updated_at = datetime('now') WHERE id = ?`).run(campagneId);
  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'rh', description: `Campagne GPEC #${campagneId} clôturée` });
  return listCampagnesEvaluation(actorUserId).find((c) => c.id === campagneId)!;
}
