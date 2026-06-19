import { randomUUID } from 'node:crypto';
import { bcrypt } from '../utils/bcrypt';
import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { initConformiteSuiviEmploye } from './rh-conformite-dz.service';
import { initOnboardingForEmploye } from './rh-pilotage.service';
import { isValidEmail, normalizeEmail } from '../utils/validators';
import {
  assertRhManage,
  getEmployeIdForUser,
  employeSql,
  mapEmploye,
  TEMP_PASSWORD,
} from './rh-helpers';
import { createContrat } from './rh-contrat.service';
import { createAffectation } from './rh-affectation.service';
import type {
  RhEmploye,
  RhRecrutement,
  CreateEmployeInput,
  CreateEmployeWizardInput,
  CreateRecrutementInput,
  UpdateEmployeInput,
  SortirEmployeInput,
  StatutRecrutement,
} from '../../src/shared/types/rh';

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
  const newId = Number(result.lastInsertRowid);
  initConformiteSuiviEmploye(newId);
  writeAuditLog({ userId: actorUserId, action: 'CREATE', module: 'rh', description: `Employé ${input.prenom} ${input.nom} créé` });
  return getEmploye(actorUserId, newId)!;
}

export function createEmployeWizard(actorUserId: number, input: CreateEmployeWizardInput): RhEmploye {
  assertRhManage(actorUserId);
  if (!input.nin?.trim()) throw new Error('Le NIN est obligatoire.');
  if (!input.nss?.trim()) throw new Error('Le NSS est obligatoire.');
  if (!input.rib?.trim()) throw new Error('Le RIB est obligatoire.');
  if (!input.salaireBrut || input.salaireBrut <= 0) throw new Error('Le salaire brut est obligatoire.');

  const db = getDatabase();
  const result = db.prepare(`
    INSERT INTO rh_employes (
      nom, prenom, email_personnel, telephone, date_embauche, statut_rh,
      poste_actuel_id, hotel_id, nin, nss, rib, adresse, wilaya, commune,
      date_naissance, sexe, lieu_naissance_wilaya, lieu_naissance_commune, nationalite,
      nom_pere, prenom_pere, nom_mere, prenom_mere, situation_familiale, numero_acte_naissance,
      groupe_sanguin, conjoint_prenom, conjoint_nom, date_mariage, enfants_scolarises,
      enfants_charge, bonus_conges_sud, responsable_employe_id, dlg_matricule, situation_militaire
    ) VALUES (?, ?, ?, ?, ?, 'actif', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.nom.trim(),
    input.prenom.trim(),
    input.emailPersonnel?.trim() ?? null,
    input.telephone?.trim() ?? null,
    input.dateEmbauche,
    input.posteActuelId,
    input.hotelId,
    input.nin.trim(),
    input.nss.trim(),
    input.rib.trim(),
    input.adresse?.trim() ?? null,
    input.wilaya?.trim() ?? null,
    input.commune?.trim() ?? null,
    input.dateNaissance?.trim() ?? null,
    input.sexe ?? null,
    input.lieuNaissanceWilaya?.trim() ?? null,
    input.lieuNaissanceCommune?.trim() ?? null,
    input.nationalite?.trim() ?? 'Algérienne',
    input.nomPere?.trim() ?? null,
    input.prenomPere?.trim() ?? null,
    input.nomMere?.trim() ?? null,
    input.prenomMere?.trim() ?? null,
    input.situationFamiliale ?? null,
    input.numeroActeNaissance?.trim() ?? null,
    input.groupeSanguin ?? null,
    input.conjointPrenom?.trim() ?? null,
    input.conjointNom?.trim() ?? null,
    input.dateMariage?.trim() ?? null,
    input.enfantsScolarises ?? 0,
    input.enfantsCharge ?? 0,
    input.bonusCongesSud ? 1 : 0,
    input.responsableEmployeId ?? null,
    input.dlgMatricule?.trim().toUpperCase() ?? null,
    input.situationMilitaire ?? null,
  );

  const employeId = Number(result.lastInsertRowid);
  initConformiteSuiviEmploye(employeId);
  initOnboardingForEmploye(employeId);

  createContrat(actorUserId, {
    employeId,
    posteId: input.posteActuelId,
    type: input.typeContrat,
    dateDebut: input.dateEmbauche,
    salaireBrut: input.salaireBrut,
    heuresHebdo: input.heuresHebdo ?? 40,
  });

  createAffectation(actorUserId, {
    employeId,
    hotelId: input.hotelId,
    posteId: input.posteActuelId,
    dateDebut: input.dateEmbauche,
    type: 'principale',
  });

  writeAuditLog({
    userId: actorUserId,
    action: 'CREATE',
    module: 'rh',
    description: `Embauche complète ${input.prenom} ${input.nom} (wizard)`,
  });
  return getEmploye(actorUserId, employeId)!;
}

export function updateEmploye(actorUserId: number, id: number, input: UpdateEmployeInput): RhEmploye {
  assertRhManage(actorUserId);
  const db = getDatabase();
  const existing = db.prepare(`SELECT id FROM rh_employes WHERE id = ? AND deleted_at IS NULL`).get(id);
  if (!existing) throw new Error('Employé introuvable.');
  const fields: string[] = [];
  const params: unknown[] = [];
  if (input.nom !== undefined) { fields.push('nom = ?'); params.push(input.nom.trim()); }
  if (input.prenom !== undefined) { fields.push('prenom = ?'); params.push(input.prenom.trim()); }
  if (input.emailPersonnel !== undefined) { fields.push('email_personnel = ?'); params.push(input.emailPersonnel?.trim() ?? null); }
  if (input.telephone !== undefined) { fields.push('telephone = ?'); params.push(input.telephone?.trim() ?? null); }
  if (input.dateEmbauche !== undefined) { fields.push('date_embauche = ?'); params.push(input.dateEmbauche); }
  if (input.posteActuelId !== undefined) { fields.push('poste_actuel_id = ?'); params.push(input.posteActuelId); }
  if (input.hotelId !== undefined) { fields.push('hotel_id = ?'); params.push(input.hotelId); }
  if (input.statutRh !== undefined) { fields.push('statut_rh = ?'); params.push(input.statutRh); }
  if (input.dlgMatricule !== undefined) { fields.push('dlg_matricule = ?'); params.push(input.dlgMatricule?.trim().toUpperCase() ?? null); }
  if (input.nin !== undefined) { fields.push('nin = ?'); params.push(input.nin?.trim() ?? null); }
  if (input.nss !== undefined) { fields.push('nss = ?'); params.push(input.nss?.trim() ?? null); }
  if (input.rib !== undefined) { fields.push('rib = ?'); params.push(input.rib?.trim() ?? null); }
  if (input.adresse !== undefined) { fields.push('adresse = ?'); params.push(input.adresse?.trim() ?? null); }
  if (input.wilaya !== undefined) { fields.push('wilaya = ?'); params.push(input.wilaya?.trim() ?? null); }
  if (input.commune !== undefined) { fields.push('commune = ?'); params.push(input.commune?.trim() ?? null); }
  if (input.dateNaissance !== undefined) { fields.push('date_naissance = ?'); params.push(input.dateNaissance?.trim() ?? null); }
  if (input.sexe !== undefined) { fields.push('sexe = ?'); params.push(input.sexe); }
  if (input.lieuNaissanceWilaya !== undefined) { fields.push('lieu_naissance_wilaya = ?'); params.push(input.lieuNaissanceWilaya?.trim() ?? null); }
  if (input.lieuNaissanceCommune !== undefined) { fields.push('lieu_naissance_commune = ?'); params.push(input.lieuNaissanceCommune?.trim() ?? null); }
  if (input.nationalite !== undefined) { fields.push('nationalite = ?'); params.push(input.nationalite?.trim() ?? null); }
  if (input.nomPere !== undefined) { fields.push('nom_pere = ?'); params.push(input.nomPere?.trim() ?? null); }
  if (input.prenomPere !== undefined) { fields.push('prenom_pere = ?'); params.push(input.prenomPere?.trim() ?? null); }
  if (input.nomMere !== undefined) { fields.push('nom_mere = ?'); params.push(input.nomMere?.trim() ?? null); }
  if (input.prenomMere !== undefined) { fields.push('prenom_mere = ?'); params.push(input.prenomMere?.trim() ?? null); }
  if (input.situationFamiliale !== undefined) { fields.push('situation_familiale = ?'); params.push(input.situationFamiliale); }
  if (input.numeroActeNaissance !== undefined) { fields.push('numero_acte_naissance = ?'); params.push(input.numeroActeNaissance?.trim() ?? null); }
  if (input.groupeSanguin !== undefined) { fields.push('groupe_sanguin = ?'); params.push(input.groupeSanguin); }
  if (input.conjointPrenom !== undefined) { fields.push('conjoint_prenom = ?'); params.push(input.conjointPrenom?.trim() ?? null); }
  if (input.conjointNom !== undefined) { fields.push('conjoint_nom = ?'); params.push(input.conjointNom?.trim() ?? null); }
  if (input.dateMariage !== undefined) { fields.push('date_mariage = ?'); params.push(input.dateMariage?.trim() ?? null); }
  if (input.enfantsScolarises !== undefined) { fields.push('enfants_scolarises = ?'); params.push(input.enfantsScolarises); }
  if (input.situationMilitaire !== undefined) { fields.push('situation_militaire = ?'); params.push(input.situationMilitaire); }
  if (input.enfantsCharge !== undefined) { fields.push('enfants_charge = ?'); params.push(input.enfantsCharge); }
  if (input.bonusCongesSud !== undefined) { fields.push('bonus_conges_sud = ?'); params.push(input.bonusCongesSud ? 1 : 0); }
  if (input.responsableEmployeId !== undefined) { fields.push('responsable_employe_id = ?'); params.push(input.responsableEmployeId); }
  if (input.declarationAnemStatut !== undefined) { fields.push('declaration_anem_statut = ?'); params.push(input.declarationAnemStatut); }
  if (input.declarationAnemDate !== undefined) { fields.push('declaration_anem_date = ?'); params.push(input.declarationAnemDate); }
  if (fields.length === 0) throw new Error('Aucune modification.');
  fields.push(`updated_at = datetime('now')`);
  params.push(id);
  db.prepare(`UPDATE rh_employes SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'rh', description: `Employé #${id} modifié` });
  return getEmploye(actorUserId, id)!;
}

export function sortirEmploye(actorUserId: number, id: number, input: SortirEmployeInput): RhEmploye {
  assertRhManage(actorUserId);
  const db = getDatabase();
  const emp = db
    .prepare(`SELECT id, user_id, statut_rh FROM rh_employes WHERE id = ? AND deleted_at IS NULL`)
    .get(id) as { id: number; user_id: number | null; statut_rh: string } | undefined;
  if (!emp) throw new Error('Employé introuvable.');
  if (emp.statut_rh === 'sorti') throw new Error('Cet employé est déjà sorti.');

  const fin = input.dateSortie;
  db.prepare(`
    UPDATE rh_employes
    SET statut_rh = 'sorti', date_sortie = ?, motif_sortie = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(fin, input.motifSortie?.trim() ?? null, id);
  db.prepare(`
    UPDATE rh_affectations
    SET statut = 'terminee', date_fin = COALESCE(date_fin, ?), updated_at = datetime('now')
    WHERE employe_id = ? AND statut = 'active'
  `).run(fin, id);
  db.prepare(`UPDATE rh_contrats SET actif = 0, updated_at = datetime('now') WHERE employe_id = ? AND actif = 1`).run(id);
  if (emp.user_id) {
    db.prepare(`
      UPDATE users SET is_active = 0, account_status = 'inactif', updated_at = datetime('now')
      WHERE id = ? AND deleted_at IS NULL
    `).run(emp.user_id);
  }
  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'rh', description: `Sortie employé #${id} au ${fin}` });
  return getEmploye(actorUserId, id)!;
}

// ── Recrutements ──────────────────────────────────────────────────────────────

const recrutementSql = `
  SELECT r.*, p.nom AS poste_nom, d.nom AS departement_nom
  FROM rh_recrutements r
  INNER JOIN rh_postes p ON p.id = r.poste_id
  INNER JOIN rh_departements d ON d.id = p.departement_id
`;

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
  if (rec.statut !== 'en_cours') throw new Error("Ce recrutement n'est plus en cours.");

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
  initOnboardingForEmploye(employeId);
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

export { getEmployeIdForUser };
