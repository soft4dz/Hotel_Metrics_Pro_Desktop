import { getDatabase } from '../database/sqlite';
import { assertPermission, userHasPermission } from './permissions.service';
import { getActorContext } from './actorContext';
import type { RhEmploye, ShiftPlanning } from '../../src/shared/types/rh';

export const TEMP_PASSWORD = 'ChangeMe@2026!';

export function assertRhManage(actorUserId: number): void {
  assertPermission(actorUserId, 'rh.manage');
}

export function assertRhTeam(actorUserId: number): void {
  if (!userHasPermission(actorUserId, 'rh.manage') && !userHasPermission(actorUserId, 'rh.team')) {
    throw new Error('Permission refusée : validation équipe RH');
  }
}

export function assertRhView(actorUserId: number): void {
  if (
    !userHasPermission(actorUserId, 'rh.manage') &&
    !userHasPermission(actorUserId, 'rh.team')
  ) {
    throw new Error('Permission refusée : consultation RH');
  }
}

export function assertRhSelf(actorUserId: number): void {
  if (
    !userHasPermission(actorUserId, 'rh.manage') &&
    !userHasPermission(actorUserId, 'rh.team') &&
    !userHasPermission(actorUserId, 'rh.self')
  ) {
    throw new Error('Permission refusée : espace RH');
  }
}

export const SHIFT_HORAIRES: Record<ShiftPlanning, { debut: string; fin: string }> = {
  matin: { debut: '06:00', fin: '14:00' },
  apres_midi: { debut: '14:00', fin: '22:00' },
  soir: { debut: '18:00', fin: '22:00' },
  nuit: { debut: '22:00', fin: '06:00' },
  jour: { debut: '09:00', fin: '17:00' },
};

/** null = accès total ; tableau vide = aucun membre */
export function getTeamEmployeIds(actorUserId: number): number[] | null {
  if (userHasPermission(actorUserId, 'rh.manage')) return null;
  if (!userHasPermission(actorUserId, 'rh.team')) return [];
  const chefId = getEmployeIdForUser(actorUserId);
  if (!chefId) return [];
  const db = getDatabase();
  const ids = new Set<number>([chefId]);
  const equipe = db
    .prepare(`SELECT membre_employe_id FROM rh_equipes WHERE chef_employe_id = ?`)
    .all(chefId) as { membre_employe_id: number }[];
  for (const m of equipe) ids.add(m.membre_employe_id);
  const orgMembres = db
    .prepare(`
      SELECT DISTINCT e.id
      FROM rh_employes e
      INNER JOIN rh_affectations a ON a.employe_id = e.id AND a.statut = 'active'
      INNER JOIN rh_organisation o ON o.hotel_id = a.hotel_id AND o.poste_id = a.poste_id
      WHERE o.responsable_employe_id = ? AND e.statut_rh = 'actif' AND e.deleted_at IS NULL
    `)
    .all(chefId) as { id: number }[];
  for (const m of orgMembres) ids.add(m.id);
  return Array.from(ids);
}

export function assertCanAccessEmploye(actorUserId: number, employeId: number): void {
  const team = getTeamEmployeIds(actorUserId);
  if (team === null) return;
  if (!team.includes(employeId)) {
    throw new Error("Accès refusé : cet employé n'est pas dans votre périmètre équipe.");
  }
}

export function teamFilterSql(team: number[] | null, column: string): { sql: string; params: number[] } {
  if (team === null) return { sql: '1=1', params: [] };
  if (team.length === 0) return { sql: '0=1', params: [] };
  return { sql: `${column} IN (${team.map(() => '?').join(',')})`, params: team };
}

export function getEmployeIdForUser(userId: number): number | null {
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

export const employeSql = `
  SELECT e.*, p.nom AS poste_nom, d.nom AS departement_nom,
         h.name AS hotel_name, u.email AS user_email, u.account_status,
         r.prenom || ' ' || r.nom AS responsable_nom
  FROM rh_employes e
  LEFT JOIN rh_postes p ON p.id = e.poste_actuel_id
  LEFT JOIN rh_departements d ON d.id = p.departement_id
  LEFT JOIN hotels h ON h.id = e.hotel_id
  LEFT JOIN users u ON u.id = e.user_id AND u.deleted_at IS NULL
  LEFT JOIN rh_employes r ON r.id = e.responsable_employe_id
  WHERE e.deleted_at IS NULL
`;

export function mapEmploye(row: Record<string, unknown>): RhEmploye {
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
    dateSortie: (row.date_sortie as string | null) ?? null,
    motifSortie: (row.motif_sortie as string | null) ?? null,
    dlgMatricule: (row.dlg_matricule as string | null) ?? null,
    typeActivite: (row.type_activite as RhEmploye['typeActivite']) ?? 'hotel',
    nin: (row.nin as string | null) ?? null,
    nss: (row.nss as string | null) ?? null,
    rib: (row.rib as string | null) ?? null,
    adresse: (row.adresse as string | null) ?? null,
    wilaya: (row.wilaya as string | null) ?? null,
    commune: (row.commune as string | null) ?? null,
    dateNaissance: (row.date_naissance as string | null) ?? null,
    sexe: (row.sexe as RhEmploye['sexe']) ?? null,
    lieuNaissanceWilaya: (row.lieu_naissance_wilaya as string | null) ?? null,
    lieuNaissanceCommune: (row.lieu_naissance_commune as string | null) ?? null,
    nationalite: (row.nationalite as string | null) ?? null,
    nomPere: (row.nom_pere as string | null) ?? null,
    prenomPere: (row.prenom_pere as string | null) ?? null,
    nomMere: (row.nom_mere as string | null) ?? null,
    prenomMere: (row.prenom_mere as string | null) ?? null,
    situationFamiliale: (row.situation_familiale as RhEmploye['situationFamiliale']) ?? null,
    numeroActeNaissance: (row.numero_acte_naissance as string | null) ?? null,
    groupeSanguin: (row.groupe_sanguin as RhEmploye['groupeSanguin']) ?? null,
    conjointPrenom: (row.conjoint_prenom as string | null) ?? null,
    conjointNom: (row.conjoint_nom as string | null) ?? null,
    dateMariage: (row.date_mariage as string | null) ?? null,
    enfantsScolarises: (row.enfants_scolarises as number) ?? 0,
    situationMilitaire: (row.situation_militaire as RhEmploye['situationMilitaire']) ?? null,
    enfantsCharge: (row.enfants_charge as number) ?? 0,
    bonusCongesSud: Boolean(row.bonus_conges_sud),
    responsableEmployeId: (row.responsable_employe_id as number | null) ?? null,
    responsableNom: (row.responsable_nom as string | null) ?? null,
    declarationAnemStatut: (row.declaration_anem_statut as RhEmploye['declarationAnemStatut']) ?? 'a_faire',
    declarationAnemDate: (row.declaration_anem_date as string | null) ?? null,
  };
}

export function countJoursAbsence(dateDebut: string, dateFin: string): number {
  const db = getDatabase();
  const row = db
    .prepare(`SELECT CAST(julianday(?) - julianday(?) + 1 AS INTEGER) AS j`)
    .get(dateFin, dateDebut) as { j: number };
  return Math.max(row.j, 0);
}

export { getActorContext };
export { userHasPermission };
