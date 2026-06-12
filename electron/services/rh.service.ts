import { randomUUID } from 'node:crypto';
import { bcrypt } from '../utils/bcrypt';
import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { assertPermission, userHasPermission } from './permissions.service';
import { isGlobalAdminRole, getActorContext } from './actorContext';
import { isValidEmail, normalizeEmail } from '../utils/validators';
import type {
  RhAbsence,
  RhContrat,
  RhDashboard,
  RhDepartement,
  RhEmploye,
  RhMonEspace,
  RhPointage,
  RhPoste,
  RhRecrutement,
  CreateAbsenceInput,
  CreateContratInput,
  CreateDepartementInput,
  CreateEmployeInput,
  CreatePosteInput,
  CreateRecrutementInput,
  UpsertPointageInput,
  StatutAbsence,
  StatutPointage,
  StatutRecrutement,
} from '../../src/shared/types/rh';

const TEMP_PASSWORD = 'ChangeMe@2026!';

function assertRhManage(actorUserId: number): void {
  assertPermission(actorUserId, 'rh.manage');
}

function assertRhTeam(actorUserId: number): void {
  if (!userHasPermission(actorUserId, 'rh.manage') && !userHasPermission(actorUserId, 'rh.team')) {
    throw new Error('Permission refusée : validation équipe RH');
  }
}

function assertRhSelf(actorUserId: number): void {
  if (
    !userHasPermission(actorUserId, 'rh.manage') &&
    !userHasPermission(actorUserId, 'rh.team') &&
    !userHasPermission(actorUserId, 'rh.self')
  ) {
    throw new Error('Permission refusée : espace RH');
  }
}

function getEmployeIdForUser(userId: number): number | null {
  const db = getDatabase();
  const row = db
    .prepare(`SELECT employe_id FROM users WHERE id = ? AND deleted_at IS NULL`)
    .get(userId) as { employe_id: number | null } | undefined;
  if (row?.employe_id) return row.employe_id;
  const emp = db
    .prepare(`SELECT id FROM rh_employes WHERE user_id = ? AND deleted_at IS NULL LIMIT 1`)
    .get(userId) as { id: number } | undefined;
  return emp?.id ?? null;
}

function mapEmploye(row: Record<string, unknown>): RhEmploye {
  return {
    id: row.id as number,
    nom: row.nom as string,
    prenom: row.prenom as string,
    emailPersonnel: (row.email_personnel as string | null) ?? null,
    telephone: (row.telephone as string | null) ?? null,
    dateEmbauche: row.date_embauche as string,
    statutRh: row.statut_rh as RhEmploye['statutRh'],
    posteActuelId: (row.poste_actuel_id as number | null) ?? null,
    posteNom: (row.poste_nom as string | null) ?? null,
    departementNom: (row.departement_nom as string | null) ?? null,
    hotelId: (row.hotel_id as number | null) ?? null,
    hotelName: (row.hotel_name as string | null) ?? null,
    userId: (row.user_id as number | null) ?? null,
    userEmail: (row.user_email as string | null) ?? null,
    accountStatus: (row.account_status as RhEmploye['accountStatus']) ?? null,
  };
}

const employeSql = `
  SELECT e.*, p.nom AS poste_nom, d.nom AS departement_nom,
         h.name AS hotel_name, u.email AS user_email, u.account_status
  FROM rh_employes e
  LEFT JOIN rh_postes p ON p.id = e.poste_actuel_id
  LEFT JOIN rh_departements d ON d.id = p.departement_id
  LEFT JOIN hotels h ON h.id = e.hotel_id
  LEFT JOIN users u ON u.id = e.user_id AND u.deleted_at IS NULL
  WHERE e.deleted_at IS NULL
`;

// ── Référentiel ───────────────────────────────────────────────────────────────

export function listDepartements(actorUserId: number): RhDepartement[] {
  assertRhManage(actorUserId);
  const rows = getDatabase()
    .prepare(`SELECT * FROM rh_departements WHERE actif = 1 ORDER BY nom`)
    .all() as Record<string, unknown>[];
  return rows.map((r) => ({
    id: r.id as number,
    nom: r.nom as string,
    description: (r.description as string | null) ?? null,
    actif: r.actif === 1,
  }));
}

export function createDepartement(actorUserId: number, input: CreateDepartementInput): RhDepartement {
  assertRhManage(actorUserId);
  const db = getDatabase();
  const result = db
    .prepare(`INSERT INTO rh_departements (nom, description) VALUES (?, ?)`)
    .run(input.nom.trim(), input.description?.trim() ?? null);
  writeAuditLog({ userId: actorUserId, action: 'CREATE', module: 'rh', description: `Département "${input.nom}" créé` });
  return listDepartements(actorUserId).find((d) => d.id === Number(result.lastInsertRowid))!;
}

export function listPostes(actorUserId: number): RhPoste[] {
  assertRhManage(actorUserId);
  const rows = getDatabase()
    .prepare(`
      SELECT p.*, d.nom AS departement_nom
      FROM rh_postes p
      INNER JOIN rh_departements d ON d.id = p.departement_id
      WHERE p.actif = 1
      ORDER BY d.nom, p.nom
    `)
    .all() as Record<string, unknown>[];
  return rows.map((r) => ({
    id: r.id as number,
    nom: r.nom as string,
    departementId: r.departement_id as number,
    departementNom: r.departement_nom as string,
    salaireMin: (r.salaire_min as number | null) ?? null,
    salaireMax: (r.salaire_max as number | null) ?? null,
    roleSystemAssocie: (r.role_system_associe as string | null) ?? null,
    description: (r.description as string | null) ?? null,
    actif: r.actif === 1,
  }));
}

export function createPoste(actorUserId: number, input: CreatePosteInput): RhPoste {
  assertRhManage(actorUserId);
  const db = getDatabase();
  db.prepare(`
    INSERT INTO rh_postes (nom, departement_id, salaire_min, salaire_max, role_system_associe, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    input.nom.trim(),
    input.departementId,
    input.salaireMin ?? null,
    input.salaireMax ?? null,
    input.roleSystemAssocie ?? null,
    input.description?.trim() ?? null,
  );
  writeAuditLog({ userId: actorUserId, action: 'CREATE', module: 'rh', description: `Poste "${input.nom}" créé` });
  return listPostes(actorUserId).find((p) => p.nom === input.nom.trim())!;
}

// ── Employés ──────────────────────────────────────────────────────────────────

export function listEmployes(actorUserId: number, search?: string): RhEmploye[] {
  assertRhManage(actorUserId);
  const db = getDatabase();
  if (search?.trim()) {
    const q = `%${search.trim()}%`;
    return db
      .prepare(`${employeSql} AND (e.nom LIKE ? OR e.prenom LIKE ? OR e.email_personnel LIKE ?) ORDER BY e.nom, e.prenom`)
      .all(q, q, q)
      .map((r) => mapEmploye(r as Record<string, unknown>));
  }
  return db
    .prepare(`${employeSql} ORDER BY e.nom, e.prenom`)
    .all()
    .map((r) => mapEmploye(r as Record<string, unknown>));
}

export function getEmploye(actorUserId: number, id: number): RhEmploye | null {
  assertRhManage(actorUserId);
  const row = getDatabase().prepare(`${employeSql} AND e.id = ?`).get(id) as Record<string, unknown> | undefined;
  return row ? mapEmploye(row) : null;
}

export function createEmploye(actorUserId: number, input: CreateEmployeInput): RhEmploye {
  assertRhManage(actorUserId);
  const db = getDatabase();
  const result = db.prepare(`
    INSERT INTO rh_employes (nom, prenom, email_personnel, telephone, date_embauche, statut_rh, poste_actuel_id, hotel_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.nom.trim(),
    input.prenom.trim(),
    input.emailPersonnel?.trim() ?? null,
    input.telephone?.trim() ?? null,
    input.dateEmbauche,
    input.statutRh ?? 'actif',
    input.posteActuelId ?? null,
    input.hotelId ?? null,
  );
  writeAuditLog({ userId: actorUserId, action: 'CREATE', module: 'rh', description: `Employé ${input.prenom} ${input.nom} créé` });
  return getEmploye(actorUserId, Number(result.lastInsertRowid))!;
}

// ── Recrutements ────────────────────────────────────────────────────────────

function mapRecrutement(row: Record<string, unknown>): RhRecrutement {
  return {
    id: row.id as number,
    posteId: row.poste_id as number,
    posteNom: row.poste_nom as string,
    departementNom: row.departement_nom as string,
    candidatNom: row.candidat_nom as string,
    candidatPrenom: (row.candidat_prenom as string | null) ?? null,
    candidatEmail: (row.candidat_email as string | null) ?? null,
    candidatTelephone: (row.candidat_telephone as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    statut: row.statut as StatutRecrutement,
    employeCreeId: (row.employe_cree_id as number | null) ?? null,
    utilisateurCreeId: (row.utilisateur_cree_id as number | null) ?? null,
    createdAt: row.created_at as string,
  };
}

const recrutementSql = `
  SELECT r.*, p.nom AS poste_nom, d.nom AS departement_nom
  FROM rh_recrutements r
  INNER JOIN rh_postes p ON p.id = r.poste_id
  INNER JOIN rh_departements d ON d.id = p.departement_id
`;

export function listRecrutements(actorUserId: number, statut?: StatutRecrutement): RhRecrutement[] {
  assertRhManage(actorUserId);
  const db = getDatabase();
  if (statut) {
    return db
      .prepare(`${recrutementSql} WHERE r.statut = ? ORDER BY r.created_at DESC`)
      .all(statut)
      .map((r) => mapRecrutement(r as Record<string, unknown>));
  }
  return db
    .prepare(`${recrutementSql} ORDER BY r.created_at DESC`)
    .all()
    .map((r) => mapRecrutement(r as Record<string, unknown>));
}

export function createRecrutement(actorUserId: number, input: CreateRecrutementInput): RhRecrutement {
  assertRhManage(actorUserId);
  const db = getDatabase();
  const result = db.prepare(`
    INSERT INTO rh_recrutements (poste_id, candidat_nom, candidat_prenom, candidat_email, candidat_telephone, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.posteId,
    input.candidatNom.trim(),
    input.candidatPrenom?.trim() ?? null,
    input.candidatEmail?.trim() ?? null,
    input.candidatTelephone?.trim() ?? null,
    input.notes?.trim() ?? null,
    actorUserId,
  );
  writeAuditLog({ userId: actorUserId, action: 'CREATE', module: 'rh', description: `Recrutement candidat ${input.candidatNom}` });
  return listRecrutements(actorUserId).find((r) => r.id === Number(result.lastInsertRowid))!;
}

export function validerRecrutement(actorUserId: number, recrutementId: number): RhRecrutement {
  assertRhManage(actorUserId);
  const db = getDatabase();

  const rec = db.prepare(`${recrutementSql} WHERE r.id = ?`).get(recrutementId) as Record<string, unknown> | undefined;
  if (!rec) throw new Error('Recrutement introuvable.');
  if (rec.statut !== 'en_cours') throw new Error('Ce recrutement n\'est plus en cours.');

  const poste = db.prepare(`SELECT * FROM rh_postes WHERE id = ?`).get(rec.poste_id as number) as Record<string, unknown>;
  const roleCode = (poste.role_system_associe as string) || 'LECTURE_SEULE';
  const roleRow = db.prepare(`SELECT id FROM roles WHERE code = ? AND deleted_at IS NULL`).get(roleCode) as { id: number } | undefined;
  if (!roleRow) throw new Error(`Rôle système "${roleCode}" introuvable pour ce poste.`);

  const prenom = (rec.candidat_prenom as string) || '';
  const nom = rec.candidat_nom as string;
  const emailRaw = (rec.candidat_email as string) || `${prenom}.${nom}@hotelmetrics.local`.toLowerCase().replace(/\s+/g, '.');
  if (!isValidEmail(emailRaw)) throw new Error('E-mail candidat invalide.');

  const email = normalizeEmail(emailRaw);
  const dup = db.prepare(`SELECT 1 FROM users WHERE email = ? AND deleted_at IS NULL`).get(email);
  if (dup) throw new Error('Un compte existe déjà avec cet e-mail.');

  const empResult = db.prepare(`
    INSERT INTO rh_employes (nom, prenom, email_personnel, date_embauche, statut_rh, poste_actuel_id)
    VALUES (?, ?, ?, date('now'), 'actif', ?)
  `).run(nom, prenom || nom, email, rec.poste_id);

  const employeId = Number(empResult.lastInsertRowid);
  const fullName = `${prenom} ${nom}`.trim();
  const passwordHash = bcrypt.hashSync(TEMP_PASSWORD, 12);

  const userResult = db.prepare(`
    INSERT INTO users (uuid, email, password_hash, full_name, role_id, is_active, account_status, employe_id, must_change_password, created_by, updated_by, sync_status)
    VALUES (?, ?, ?, ?, ?, 0, 'en_attente', ?, 1, ?, ?, 'pending_create')
  `).run(randomUUID(), email, passwordHash, fullName, roleRow.id, employeId, actorUserId, actorUserId);

  const userId = Number(userResult.lastInsertRowid);
  db.prepare(`UPDATE rh_employes SET user_id = ?, updated_at = datetime('now') WHERE id = ?`).run(userId, employeId);

  db.prepare(`
    INSERT INTO rh_contrats (employe_id, poste_id, type, date_debut, salaire_brut, heures_hebdo)
    VALUES (?, ?, 'CDI', date('now'), ?, 35)
  `).run(employeId, rec.poste_id, (poste.salaire_min as number) ?? 0);

  db.prepare(`
    UPDATE rh_recrutements
    SET statut = 'valide', employe_cree_id = ?, utilisateur_cree_id = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(employeId, userId, recrutementId);

  writeAuditLog({
    userId: actorUserId,
    action: 'UPDATE',
    module: 'rh',
    description: `Recrutement validé — employé ${fullName}, compte en attente d'activation`,
    newValue: JSON.stringify({ employeId, userId, email }),
  });

  return listRecrutements(actorUserId).find((r) => r.id === recrutementId)!;
}

export function refuserRecrutement(actorUserId: number, recrutementId: number, motif?: string): RhRecrutement {
  assertRhManage(actorUserId);
  const db = getDatabase();
  db.prepare(`
    UPDATE rh_recrutements SET statut = 'refuse', notes = COALESCE(?, notes), updated_at = datetime('now') WHERE id = ?
  `).run(motif ?? null, recrutementId);
  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'rh', description: `Recrutement ${recrutementId} refusé` });
  return listRecrutements(actorUserId).find((r) => r.id === recrutementId)!;
}

// ── Contrats ──────────────────────────────────────────────────────────────────

export function listContrats(actorUserId: number, employeId: number): RhContrat[] {
  assertRhManage(actorUserId);
  const rows = getDatabase().prepare(`
    SELECT c.*, p.nom AS poste_nom
    FROM rh_contrats c
    INNER JOIN rh_postes p ON p.id = c.poste_id
    WHERE c.employe_id = ?
    ORDER BY c.date_debut DESC
  `).all(employeId) as Record<string, unknown>[];
  return rows.map((r) => ({
    id: r.id as number,
    employeId: r.employe_id as number,
    posteId: r.poste_id as number,
    posteNom: r.poste_nom as string,
    type: r.type as RhContrat['type'],
    dateDebut: r.date_debut as string,
    dateFin: (r.date_fin as string | null) ?? null,
    salaireBrut: r.salaire_brut as number,
    heuresHebdo: r.heures_hebdo as number,
    actif: r.actif === 1,
  }));
}

export function createContrat(actorUserId: number, input: CreateContratInput): RhContrat {
  assertRhManage(actorUserId);
  const db = getDatabase();
  db.prepare(`UPDATE rh_contrats SET actif = 0, updated_at = datetime('now') WHERE employe_id = ? AND actif = 1`).run(input.employeId);
  const result = db.prepare(`
    INSERT INTO rh_contrats (employe_id, poste_id, type, date_debut, date_fin, salaire_brut, heures_hebdo)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.employeId,
    input.posteId,
    input.type,
    input.dateDebut,
    input.dateFin ?? null,
    input.salaireBrut,
    input.heuresHebdo ?? 35,
  );
  db.prepare(`UPDATE rh_employes SET poste_actuel_id = ?, updated_at = datetime('now') WHERE id = ?`).run(input.posteId, input.employeId);
  return listContrats(actorUserId, input.employeId).find((c) => c.id === Number(result.lastInsertRowid))!;
}

// ── Pointages ─────────────────────────────────────────────────────────────────

function calcHeures(entree: string | null, sortie: string | null): number | null {
  if (!entree || !sortie) return null;
  const [eh, em] = entree.split(':').map(Number);
  const [sh, sm] = sortie.split(':').map(Number);
  const mins = (sh * 60 + sm) - (eh * 60 + em);
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
  };
}

export function listPointages(actorUserId: number, dateDebut?: string, dateFin?: string, employeId?: number): RhPointage[] {
  if (userHasPermission(actorUserId, 'rh.manage') || userHasPermission(actorUserId, 'rh.team')) {
    const conditions = ['1=1'];
    const params: unknown[] = [];
    if (dateDebut) { conditions.push('pt.date >= ?'); params.push(dateDebut); }
    if (dateFin) { conditions.push('pt.date <= ?'); params.push(dateFin); }
    if (employeId) { conditions.push('pt.employe_id = ?'); params.push(employeId); }
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
  }
  const heures = calcHeures(input.heureEntree ?? null, input.heureSortie ?? null);
  const db = getDatabase();
  const existing = db.prepare(`SELECT id, statut FROM rh_pointages WHERE employe_id = ? AND date = ?`).get(input.employeId, input.date) as { id: number; statut: string } | undefined;
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
  db.prepare(`UPDATE rh_pointages SET statut = 'soumis', updated_at = datetime('now') WHERE id = ?`).run(pointageId);
  return listPointages(actorUserId).find((p) => p.id === pointageId)!;
}

export function validerPointage(actorUserId: number, pointageId: number, approuve: boolean): RhPointage {
  assertRhTeam(actorUserId);
  const db = getDatabase();
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
  };
}

export function listAbsences(actorUserId: number, statut?: StatutAbsence): RhAbsence[] {
  const canManage = userHasPermission(actorUserId, 'rh.manage') || userHasPermission(actorUserId, 'rh.team');
  const db = getDatabase();
  if (canManage) {
    if (statut) {
      return db.prepare(`
        SELECT a.*, e.prenom || ' ' || e.nom AS employe_nom
        FROM rh_absences a INNER JOIN rh_employes e ON e.id = a.employe_id
        WHERE a.statut = ? ORDER BY a.date_debut DESC
      `).all(statut).map((r) => mapAbsence(r as Record<string, unknown>));
    }
    return db.prepare(`
      SELECT a.*, e.prenom || ' ' || e.nom AS employe_nom
      FROM rh_absences a INNER JOIN rh_employes e ON e.id = a.employe_id
      ORDER BY a.date_debut DESC
    `).all().map((r) => mapAbsence(r as Record<string, unknown>));
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
  const result = db.prepare(`
    INSERT INTO rh_absences (employe_id, type, date_debut, date_fin, motif)
    VALUES (?, ?, ?, ?, ?)
  `).run(input.employeId, input.type, input.dateDebut, input.dateFin, input.motif ?? null);
  writeAuditLog({ userId: actorUserId, action: 'CREATE', module: 'rh', description: `Demande absence ${input.type}` });
  return listAbsences(actorUserId).find((a) => a.id === Number(result.lastInsertRowid))!;
}

export function deciderAbsence(actorUserId: number, absenceId: number, approuve: boolean): RhAbsence {
  assertRhTeam(actorUserId);
  const db = getDatabase();
  db.prepare(`
    UPDATE rh_absences SET statut = ?, decide_par = ?, updated_at = datetime('now') WHERE id = ?
  `).run(approuve ? 'approuvee' : 'refusee', actorUserId, absenceId);
  return listAbsences(actorUserId).find((a) => a.id === absenceId)!;
}

// ── Dashboard & Mon espace ────────────────────────────────────────────────────

export function getRhDashboard(actorUserId: number, dateDebut?: string, dateFin?: string): RhDashboard {
  assertRhManage(actorUserId);
  const db = getDatabase();
  const fin = dateFin ?? new Date().toISOString().slice(0, 10);
  const debut = dateDebut ?? new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);

  const effectif = db.prepare(`SELECT COUNT(*) AS c FROM rh_employes WHERE statut_rh = 'actif' AND deleted_at IS NULL`).get() as { c: number };
  const recrutements = db.prepare(`SELECT COUNT(*) AS c FROM rh_recrutements WHERE statut = 'en_cours'`).get() as { c: number };
  const absencesAtt = db.prepare(`SELECT COUNT(*) AS c FROM rh_absences WHERE statut = 'demandee'`).get() as { c: number };
  const ptSoumis = db.prepare(`SELECT COUNT(*) AS c FROM rh_pointages WHERE statut = 'soumis'`).get() as { c: number };
  const comptesAtt = db.prepare(`SELECT COUNT(*) AS c FROM users WHERE account_status = 'en_attente' AND deleted_at IS NULL`).get() as { c: number };

  const recettesRow = db.prepare(`
    SELECT COALESCE(SUM(montant), 0) AS total
    FROM recettes_journalieres
    WHERE date_journal BETWEEN ? AND ? AND deleted_at IS NULL
  `).get(debut, fin) as { total: number };

  const heuresReelles = db.prepare(`
    SELECT COALESCE(SUM(heures_travaillees), 0) AS h
    FROM rh_pointages WHERE date BETWEEN ? AND ? AND statut = 'valide'
  `).get(debut, fin) as { h: number };

  const heuresAbsence = db.prepare(`
    SELECT COALESCE(SUM(
      (julianday(date_fin) - julianday(date_debut) + 1) * 7
    ), 0) AS h
    FROM rh_absences
    WHERE statut = 'approuvee' AND date_debut <= ? AND date_fin >= ?
  `).get(fin, debut) as { h: number };

  const effectifMoyen = Math.max(effectif.c, 1);
  const heuresTheo = effectifMoyen * 35 * 4;
  const masseRow = db.prepare(`
    SELECT COALESCE(SUM(salaire_brut), 0) AS m
    FROM rh_contrats WHERE actif = 1
  `).get() as { m: number };
  const masse = masseRow.m * 1.45;

  const departs = db.prepare(`
    SELECT COUNT(*) AS c FROM rh_employes
    WHERE statut_rh = 'sorti' AND updated_at BETWEEN ? AND ?
  `).get(debut, fin) as { c: number };

  return {
    effectifActif: effectif.c,
    recrutementsEnCours: recrutements.c,
    absencesEnAttente: absencesAtt.c,
    pointagesASoumettre: ptSoumis.c,
    comptesEnAttente: comptesAtt.c,
    recettesParEffectif: Math.round((recettesRow.total / effectifMoyen) * 100) / 100,
    tauxPresence: heuresTheo > 0 ? Math.round((heuresReelles.h / heuresTheo) * 10000) / 100 : 0,
    tauxAbsenteisme: heuresTheo > 0 ? Math.round((heuresAbsence.h / heuresTheo) * 10000) / 100 : 0,
    masseSalariale: Math.round(masse * 100) / 100,
    coutMoyenEmploye: Math.round((masse / effectifMoyen) * 100) / 100,
    tauxTurnover: Math.round((departs.c / effectifMoyen) * 10000) / 100,
    periodeDebut: debut,
    periodeFin: fin,
  };
}

export function getMonEspace(actorUserId: number): RhMonEspace {
  assertRhSelf(actorUserId);
  const employeId = getEmployeIdForUser(actorUserId);
  if (!employeId) {
    return { employe: null, contratActif: null, pointagesRecents: [], absences: [] };
  }
  const row = getDatabase().prepare(`${employeSql} AND e.id = ?`).get(employeId) as Record<string, unknown>;
  const employe = mapEmploye(row);
  const contrats = listContratsForSelf(employeId);
  const pointages = listPointages(actorUserId).slice(0, 10);
  const absences = listAbsences(actorUserId);
  return {
    employe,
    contratActif: contrats.find((c) => c.actif) ?? null,
    pointagesRecents: pointages,
    absences,
  };
}

function listContratsForSelf(employeId: number): RhContrat[] {
  const rows = getDatabase().prepare(`
    SELECT c.*, p.nom AS poste_nom FROM rh_contrats c
    INNER JOIN rh_postes p ON p.id = c.poste_id WHERE c.employe_id = ?
  `).all(employeId) as Record<string, unknown>[];
  return rows.map((r) => ({
    id: r.id as number,
    employeId: r.employe_id as number,
    posteId: r.poste_id as number,
    posteNom: r.poste_nom as string,
    type: r.type as RhContrat['type'],
    dateDebut: r.date_debut as string,
    dateFin: (r.date_fin as string | null) ?? null,
    salaireBrut: r.salaire_brut as number,
    heuresHebdo: r.heures_hebdo as number,
    actif: r.actif === 1,
  }));
}

export function countPendingAccounts(actorUserId: number): number {
  const actor = getActorContext(actorUserId);
  if (!isGlobalAdminRole(actor.roleCode) && !userHasPermission(actorUserId, 'users.manage')) {
    return 0;
  }
  const row = getDatabase()
    .prepare(`SELECT COUNT(*) AS c FROM users WHERE account_status = 'en_attente' AND deleted_at IS NULL`)
    .get() as { c: number };
  return row.c;
}
