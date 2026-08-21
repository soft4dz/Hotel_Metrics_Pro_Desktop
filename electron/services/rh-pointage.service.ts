import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { userHasPermission } from './permissions.service';
import {
  assertRhSelf,
  assertRhTeam,
  getTeamEmployeIds,
  assertCanAccessEmploye,
  teamFilterSql,
  getEmployeIdForUser,
  countJoursAbsence,
} from './rh-helpers';
import { SOLDE_TYPES, decrementSoldeConges } from './rh-contrat.service';
import type {
  RhPointage,
  RhAbsence,
  UpsertPointageInput,
  CreateAbsenceInput,
  StatutAbsence,
  StatutPointage,
} from '../../src/shared/types/rh';

// ── Pointages ─────────────────────────────────────────────────────────────────

function calcHeures(entree: string | null, sortie: string | null): number | null {
  if (!entree || !sortie) return null;
  const [eh, em] = entree.split(':').map(Number);
  const [sh, sm] = sortie.split(':').map(Number);
  const mins = sh * 60 + sm - (eh * 60 + em);
  return mins > 0 ? Math.round((mins / 60) * 100) / 100 : null;
}

function mapPointage(row: Record<string, unknown>): RhPointage {
  return {
    id: row.id as number,
    employeId: row.employe_id as number,
    employeNom: row.employe_nom as string,
    date: row.date as string,
    heureEntree: (row.heure_entree as string | null) ?? null,
    heureSortie: (row.heure_sortie as string | null) ?? null,
    heuresTravaillees: (row.heures_travaillees as number | null) ?? null,
    statut: row.statut as StatutPointage,
    statutN1: (row.statut_n1 as RhPointage['statutN1']) ?? 'en_attente',
  };
}

export function listPointages(
  actorUserId: number,
  dateDebut?: string,
  dateFin?: string,
  employeId?: number,
): RhPointage[] {
  if (userHasPermission(actorUserId, 'rh.manage') || userHasPermission(actorUserId, 'rh.team')) {
    const team = getTeamEmployeIds(actorUserId);
    const teamClause = teamFilterSql(team, 'pt.employe_id');
    const conditions = [teamClause.sql];
    const params: unknown[] = [...teamClause.params];
    if (dateDebut) { conditions.push('pt.date >= ?'); params.push(dateDebut); }
    if (dateFin) { conditions.push('pt.date <= ?'); params.push(dateFin); }
    if (employeId) {
      assertCanAccessEmploye(actorUserId, employeId);
      conditions.push('pt.employe_id = ?');
      params.push(employeId);
    }
    return getDatabase().prepare(`
      SELECT pt.*, e.prenom || ' ' || e.nom AS employe_nom
      FROM rh_pointages pt
      INNER JOIN rh_employes e ON e.id = pt.employe_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY pt.date DESC, employe_nom
    `).all(...params).map((r) => mapPointage(r as Record<string, unknown>));
  }
  const myId = getEmployeIdForUser(actorUserId);
  if (!myId) return [];
  return getDatabase().prepare(`
    SELECT pt.*, e.prenom || ' ' || e.nom AS employe_nom
    FROM rh_pointages pt
    INNER JOIN rh_employes e ON e.id = pt.employe_id
    WHERE pt.employe_id = ?
    ORDER BY pt.date DESC
  `).all(myId).map((r) => mapPointage(r as Record<string, unknown>));
}

export function upsertPointage(actorUserId: number, input: UpsertPointageInput): RhPointage {
  assertRhSelf(actorUserId);
  const myId = getEmployeIdForUser(actorUserId);
  if (!userHasPermission(actorUserId, 'rh.manage') && !userHasPermission(actorUserId, 'rh.team')) {
    if (!myId || myId !== input.employeId) throw new Error('Vous ne pouvez pointer que pour votre propre fiche.');
  } else if (!userHasPermission(actorUserId, 'rh.manage')) {
    assertCanAccessEmploye(actorUserId, input.employeId);
  }
  const heures = calcHeures(input.heureEntree ?? null, input.heureSortie ?? null);
  const db = getDatabase();
  const existing = db
    .prepare(`SELECT id, statut FROM rh_pointages WHERE employe_id = ? AND date = ?`)
    .get(input.employeId, input.date) as { id: number; statut: string } | undefined;
  if (existing && existing.statut === 'valide') throw new Error('Pointage déjà validé.');
  if (existing) {
    db.prepare(`
      UPDATE rh_pointages SET heure_entree = ?, heure_sortie = ?, heures_travaillees = ?, statut = 'brouillon', updated_at = datetime('now')
      WHERE id = ?
    `).run(input.heureEntree ?? null, input.heureSortie ?? null, heures, existing.id);
  } else {
    db.prepare(`
      INSERT INTO rh_pointages (employe_id, date, heure_entree, heure_sortie, heures_travaillees, statut)
      VALUES (?, ?, ?, ?, ?, 'brouillon')
    `).run(input.employeId, input.date, input.heureEntree ?? null, input.heureSortie ?? null, heures);
  }
  return listPointages(actorUserId, input.date, input.date, input.employeId)[0]!;
}

export function soumettrePointage(actorUserId: number, pointageId: number): RhPointage {
  assertRhSelf(actorUserId);
  const db = getDatabase();
  const pt = db.prepare(`SELECT * FROM rh_pointages WHERE id = ?`).get(pointageId) as Record<string, unknown> | undefined;
  if (!pt) throw new Error('Pointage introuvable.');
  const myId = getEmployeIdForUser(actorUserId);
  if (!userHasPermission(actorUserId, 'rh.manage') && pt.employe_id !== myId) {
    throw new Error('Accès refusé.');
  }
  db.prepare(`
    UPDATE rh_pointages SET statut = 'soumis', statut_n1 = 'en_attente', updated_at = datetime('now') WHERE id = ?
  `).run(pointageId);
  return listPointages(actorUserId).find((p) => p.id === pointageId)!;
}

export function validerPointage(actorUserId: number, pointageId: number, approuve: boolean): RhPointage {
  assertRhTeam(actorUserId);
  const db = getDatabase();
  const pt = db.prepare(`SELECT employe_id FROM rh_pointages WHERE id = ?`).get(pointageId) as
    | { employe_id: number }
    | undefined;
  if (!pt) throw new Error('Pointage introuvable.');
  assertCanAccessEmploye(actorUserId, pt.employe_id);
  const full = db.prepare(`SELECT statut_n1 FROM rh_pointages WHERE id = ?`).get(pointageId) as
    | { statut_n1: string }
    | undefined;
  if (!userHasPermission(actorUserId, 'rh.manage') && full?.statut_n1 !== 'approuve') {
    throw new Error('Validation RH impossible : accord N+1 requis.');
  }
  db.prepare(`
    UPDATE rh_pointages SET statut = ?, valide_par = ?, updated_at = datetime('now') WHERE id = ?
  `).run(approuve ? 'valide' : 'refuse', actorUserId, pointageId);
  return listPointages(actorUserId).find((p) => p.id === pointageId)!;
}

// ── Absences ──────────────────────────────────────────────────────────────────

function mapAbsence(row: Record<string, unknown>): RhAbsence {
  return {
    id: row.id as number,
    employeId: row.employe_id as number,
    employeNom: row.employe_nom as string,
    type: row.type as RhAbsence['type'],
    dateDebut: row.date_debut as string,
    dateFin: row.date_fin as string,
    motif: (row.motif as string | null) ?? null,
    statut: row.statut as StatutAbsence,
    statutN1: (row.statut_n1 as RhAbsence['statutN1']) ?? 'en_attente',
    commentaireN1: (row.commentaire_n1 as string | null) ?? null,
    cancelledAt: (row.cancelled_at as string | null) ?? null,
    decisionComment: (row.decision_comment as string | null) ?? null,
  };
}

export function listAbsences(
  actorUserId: number,
  statut?: StatutAbsence,
  opts?: { dateDebut?: string; dateFin?: string; hotelId?: number },
): RhAbsence[] {
  const canManage = userHasPermission(actorUserId, 'rh.manage') || userHasPermission(actorUserId, 'rh.team');
  const db = getDatabase();
  const extra: string[] = [];
  const params: unknown[] = [];
  if (opts?.dateDebut && opts?.dateFin) {
    extra.push('a.date_debut <= ? AND a.date_fin >= ?');
    params.push(opts.dateFin, opts.dateDebut);
  }
  if (opts?.hotelId) { extra.push('e.hotel_id = ?'); params.push(opts.hotelId); }
  const extraSql = extra.length ? ` AND ${extra.join(' AND ')}` : '';

  if (canManage) {
    const team = getTeamEmployeIds(actorUserId);
    const teamClause = teamFilterSql(team, 'a.employe_id');
    const teamSql = team === null ? '' : ` AND ${teamClause.sql}`;
    const teamParams = team === null ? [] : teamClause.params;
    if (statut) {
      return db.prepare(`
        SELECT a.*, e.prenom || ' ' || e.nom AS employe_nom
        FROM rh_absences a INNER JOIN rh_employes e ON e.id = a.employe_id
        WHERE a.statut = ?${extraSql}${teamSql} ORDER BY a.date_debut DESC
      `).all(statut, ...params, ...teamParams).map((r) => mapAbsence(r as Record<string, unknown>));
    }
    return db.prepare(`
      SELECT a.*, e.prenom || ' ' || e.nom AS employe_nom
      FROM rh_absences a INNER JOIN rh_employes e ON e.id = a.employe_id
      WHERE 1=1${extraSql}${teamSql} ORDER BY a.date_debut DESC
    `).all(...params, ...teamParams).map((r) => mapAbsence(r as Record<string, unknown>));
  }
  const myId = getEmployeIdForUser(actorUserId);
  if (!myId) return [];
  return db.prepare(`
    SELECT a.*, e.prenom || ' ' || e.nom AS employe_nom
    FROM rh_absences a INNER JOIN rh_employes e ON e.id = a.employe_id
    WHERE a.employe_id = ? ORDER BY a.date_debut DESC
  `).all(myId).map((r) => mapAbsence(r as Record<string, unknown>));
}

export function createAbsence(actorUserId: number, input: CreateAbsenceInput): RhAbsence {
  assertRhSelf(actorUserId);
  const myId = getEmployeIdForUser(actorUserId);
  if (!userHasPermission(actorUserId, 'rh.manage') && (!myId || myId !== input.employeId)) {
    throw new Error('Vous ne pouvez demander une absence que pour votre fiche.');
  }
  const db = getDatabase();
  if (input.dateFin < input.dateDebut) throw new Error('La date de fin doit être postérieure ou égale à la date de début.');
  const employe = db.prepare(`SELECT statut_rh FROM rh_employes WHERE id = ?`).get(input.employeId) as { statut_rh: string } | undefined;
  if (!employe || employe.statut_rh !== 'actif') throw new Error('La demande nécessite une fiche salarié active.');
  const overlap = db.prepare(`SELECT 1 FROM rh_absences WHERE employe_id=? AND statut IN ('demandee','approuvee') AND cancelled_at IS NULL AND date_debut<=? AND date_fin>=? LIMIT 1`).get(input.employeId,input.dateFin,input.dateDebut);
  if (overlap) throw new Error('Une demande existe déjà sur tout ou partie de cette période.');
  if (SOLDE_TYPES.has(input.type)) {
    const annee=Number(input.dateDebut.slice(0,4));
    if (input.dateFin.slice(0,4)!==String(annee)) throw new Error('Une demande avec solde ne peut pas chevaucher deux années.');
    const jours=countJoursAbsence(input.dateDebut,input.dateFin);
    const solde=db.prepare(`SELECT reste FROM rh_soldes_conges WHERE employe_id=? AND annee=? AND type=?`).get(input.employeId,annee,input.type) as {reste:number}|undefined;
    if (!solde || solde.reste < jours) throw new Error(`Solde insuffisant : ${solde?.reste ?? 0} jour(s) disponible(s), ${jours} demandé(s).`);
  }
  const result = db.prepare(`
    INSERT INTO rh_absences (employe_id, type, date_debut, date_fin, motif, statut_n1)
    VALUES (?, ?, ?, ?, ?, 'en_attente')
  `).run(input.employeId, input.type, input.dateDebut, input.dateFin, input.motif ?? null);
  writeAuditLog({ userId: actorUserId, action: 'CREATE', module: 'rh', description: `Demande absence ${input.type}` });
  return listAbsences(actorUserId).find((a) => a.id === Number(result.lastInsertRowid))!;
}

export function deciderAbsence(actorUserId: number, absenceId: number, approuve: boolean): RhAbsence {
  assertRhTeam(actorUserId);
  const db = getDatabase();
  const absence = db
    .prepare(`SELECT employe_id, type, date_debut, date_fin, statut FROM rh_absences WHERE id = ?`)
    .get(absenceId) as
    | { employe_id: number; type: string; date_debut: string; date_fin: string; statut: string }
    | undefined;
  if (!absence) throw new Error('Absence introuvable.');
  if (absence.statut !== 'demandee') throw new Error('Cette demande a déjà reçu une décision.');
  assertCanAccessEmploye(actorUserId, absence.employe_id);
  const n1 = db.prepare(`SELECT statut_n1 FROM rh_absences WHERE id = ?`).get(absenceId) as
    | { statut_n1: string }
    | undefined;
  if (approuve && !userHasPermission(actorUserId, 'rh.manage') && n1?.statut_n1 !== 'approuve') {
    throw new Error('Validation RH impossible : accord N+1 requis.');
  }
  db.prepare(`
    UPDATE rh_absences SET statut = ?, decide_par = ?, updated_at = datetime('now') WHERE id = ?
  `).run(approuve ? 'approuvee' : 'refusee', actorUserId, absenceId);

  if (approuve && SOLDE_TYPES.has(absence.type)) {
    const jours = countJoursAbsence(absence.date_debut, absence.date_fin);
    const annee = Number(absence.date_debut.slice(0, 4));
    decrementSoldeConges(absence.employe_id, absence.type, jours, annee);
  }
  return listAbsences(actorUserId).find((a) => a.id === absenceId)!;
}

export function cancelAbsence(actorUserId:number, absenceId:number, motif?:string):RhAbsence {
  assertRhSelf(actorUserId);
  const db=getDatabase();
  const row=db.prepare(`SELECT employe_id,statut FROM rh_absences WHERE id=?`).get(absenceId) as {employe_id:number;statut:string}|undefined;
  if(!row)throw new Error('Demande introuvable.');
  const myId=getEmployeIdForUser(actorUserId);
  if(!userHasPermission(actorUserId,'rh.manage')&&row.employe_id!==myId)throw new Error('Accès refusé.');
  if(row.statut!=='demandee')throw new Error('Seule une demande en attente peut être annulée.');
  db.prepare(`UPDATE rh_absences SET statut='refusee',cancelled_by=?,cancelled_at=datetime('now'),decision_comment=?,updated_at=datetime('now') WHERE id=?`).run(actorUserId,motif?.trim()||'Annulée par le salarié',absenceId);
  writeAuditLog({userId:actorUserId,action:'UPDATE',module:'rh',description:`Annulation demande absence #${absenceId}`});
  return listAbsences(actorUserId).find(a=>a.id===absenceId)!;
}
