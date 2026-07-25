import { getDatabase } from '../database/sqlite';
import { assertRhManage, assertRhSelf, getEmployeIdForUser, employeSql, mapEmploye } from './rh-helpers';
import { isGlobalAdminRole, getActorContext } from './actorContext';
import { userHasPermission } from './permissions.service';
import { listOnboardingForMonEspace } from './rh-pilotage.service';
import { listContratsForSelf, countContratsEcheanceProche } from './rh-contrat.service';
import { listOrganisation } from './rh-affectation.service';
import { getAffectationActive } from './rh-affectation.service';
import { listPointages } from './rh-pointage.service';
import { listAbsences } from './rh-pointage.service';
import type {
  RhDashboard,
  RhMonEspace,
  RhBulletin,
  RhDocument,
  RhEmployeFormation,
  RhEntretien,
  RhSoldeConges,
} from '../../src/shared/types/rh';

function mapSolde(row: Record<string, unknown>): RhSoldeConges {
  return {
    id: row.id as number,
    employeId: row.employe_id as number,
    employeNom: row.employe_nom as string,
    annee: row.annee as number,
    type: row.type as RhSoldeConges['type'],
    acquis: row.acquis as number,
    pris: row.pris as number,
    reste: row.reste as number,
  };
}

function mapEmployeFormationRow(r: Record<string, unknown>): RhEmployeFormation {
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

function mapEntretienRow(r: Record<string, unknown>): RhEntretien {
  return {
    id: r.id as number,
    employeId: r.employe_id as number,
    employeNom: r.employe_nom as string,
    dateEntretien: r.date_entretien as string,
    type: r.type as RhEntretien['type'],
    evaluateurEmployeId: (r.evaluateur_employe_id as number) ?? null,
    evaluateurNom: (r.evaluateur_nom as string) ?? null,
    noteGlobale: (r.note_globale as number) ?? null,
    objectifs: (r.objectifs as string) ?? null,
    commentaires: (r.commentaires as string) ?? null,
    statut: r.statut as RhEntretien['statut'],
  };
}

function countTalentCertificationsEcheance(db: ReturnType<typeof getDatabase>, jours: number): number {
  const limite = new Date(Date.now() + jours * 86_400_000).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  return (
    db.prepare(`
      SELECT COUNT(*) AS c FROM rh_employe_formations
      WHERE statut IN ('obtenu','en_cours') AND date_echeance IS NOT NULL
        AND date_echeance BETWEEN ? AND ?
    `).get(today, limite) as { c: number }
  ).c;
}

function countTalentEntretiensPlanifies(db: ReturnType<typeof getDatabase>, jours: number): number {
  const limite = new Date(Date.now() + jours * 86_400_000).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  return (
    db.prepare(`
      SELECT COUNT(*) AS c FROM rh_entretiens
      WHERE statut = 'planifie' AND date_entretien BETWEEN ? AND ?
    `).get(today, limite) as { c: number }
  ).c;
}

function listFormationsProchesMonEspace(db: ReturnType<typeof getDatabase>, employeId: number): RhEmployeFormation[] {
  return db.prepare(`
    SELECT ef.*, e.prenom || ' ' || e.nom AS employe_nom,
      f.code AS formation_code, f.libelle AS formation_libelle, f.obligatoire
    FROM rh_employe_formations ef
    INNER JOIN rh_employes e ON e.id = ef.employe_id
    INNER JOIN rh_formations f ON f.id = ef.formation_id
    WHERE ef.employe_id = ? ORDER BY ef.date_echeance LIMIT 5
  `).all(employeId).map((r) => mapEmployeFormationRow(r as Record<string, unknown>));
}

function listEntretiensAvenirMonEspace(db: ReturnType<typeof getDatabase>, employeId: number): RhEntretien[] {
  return db.prepare(`
    SELECT en.*, e.prenom || ' ' || e.nom AS employe_nom, ev.prenom || ' ' || ev.nom AS evaluateur_nom
    FROM rh_entretiens en
    INNER JOIN rh_employes e ON e.id = en.employe_id
    LEFT JOIN rh_employes ev ON ev.id = en.evaluateur_employe_id
    WHERE en.employe_id = ? AND en.statut = 'planifie'
    ORDER BY en.date_entretien LIMIT 3
  `).all(employeId).map((r) => mapEntretienRow(r as Record<string, unknown>));
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export function getRhDashboard(
  actorUserId: number,
  dateDebut?: string,
  dateFin?: string,
  hotelId?: number,
): RhDashboard {
  assertRhManage(actorUserId);
  const db = getDatabase();
  const fin = dateFin ?? new Date().toISOString().slice(0, 10);
  const debut = dateDebut ?? new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);

  let hotelName: string | null = null;
  if (hotelId) {
    const h = db.prepare(`SELECT name FROM hotels WHERE id = ?`).get(hotelId) as { name: string } | undefined;
    hotelName = h?.name ?? null;
  }

  const effectifSql = hotelId
    ? `SELECT COUNT(DISTINCT e.id) AS c FROM rh_employes e
       WHERE e.statut_rh = 'actif' AND e.deleted_at IS NULL
       AND (
         e.hotel_id = ?
         OR EXISTS (SELECT 1 FROM rh_affectations a WHERE a.employe_id = e.id AND a.statut = 'active' AND a.hotel_id = ?)
       )`
    : `SELECT COUNT(*) AS c FROM rh_employes WHERE statut_rh = 'actif' AND deleted_at IS NULL`;
  const effectif = (
    hotelId ? db.prepare(effectifSql).get(hotelId, hotelId) : db.prepare(effectifSql).get()
  ) as { c: number };

  const recrutements = db.prepare(`SELECT COUNT(*) AS c FROM rh_recrutements WHERE statut = 'en_cours'`).get() as { c: number };
  const absencesAtt = db.prepare(`SELECT COUNT(*) AS c FROM rh_absences WHERE statut = 'demandee'`).get() as { c: number };
  const ptSoumis = db.prepare(`SELECT COUNT(*) AS c FROM rh_pointages WHERE statut = 'soumis'`).get() as { c: number };
  const comptesAtt = db.prepare(`SELECT COUNT(*) AS c FROM users WHERE account_status = 'en_attente' AND deleted_at IS NULL`).get() as { c: number };

  const recettesRow = hotelId
    ? (db.prepare(`
        SELECT COALESCE(SUM(montant), 0) AS total
        FROM recettes_journalieres
        WHERE hotel_id = ? AND date_journal BETWEEN ? AND ? AND deleted_at IS NULL
      `).get(hotelId, debut, fin) as { total: number })
    : (db.prepare(`
        SELECT COALESCE(SUM(montant), 0) AS total
        FROM recettes_journalieres
        WHERE date_journal BETWEEN ? AND ? AND deleted_at IS NULL
      `).get(debut, fin) as { total: number });

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

  const masseRow = hotelId
    ? (db.prepare(`
        SELECT COALESCE(SUM(c.salaire_brut), 0) AS m
        FROM rh_contrats c
        INNER JOIN rh_employes e ON e.id = c.employe_id AND e.deleted_at IS NULL
        WHERE c.actif = 1 AND (e.hotel_id = ? OR EXISTS (
          SELECT 1 FROM rh_affectations a WHERE a.employe_id = e.id AND a.statut = 'active' AND a.hotel_id = ?
        ))
      `).get(hotelId, hotelId) as { m: number })
    : (db.prepare(`
        SELECT COALESCE(SUM(salaire_brut), 0) AS m
        FROM rh_contrats WHERE actif = 1
      `).get() as { m: number });
  const masse = masseRow.m * 1.45;

  const departs = hotelId
    ? (db.prepare(`
        SELECT COUNT(*) AS c FROM rh_employes
        WHERE statut_rh = 'sorti' AND updated_at BETWEEN ? AND ? AND hotel_id = ?
      `).get(debut, fin, hotelId) as { c: number })
    : (db.prepare(`
        SELECT COUNT(*) AS c FROM rh_employes
        WHERE statut_rh = 'sorti' AND updated_at BETWEEN ? AND ?
      `).get(debut, fin) as { c: number });

  const org = listOrganisation(actorUserId, hotelId);
  const contratsAlerte = countContratsEcheanceProche(actorUserId, 60);

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
    hotelId: hotelId ?? null,
    hotelName,
    manqueEffectifTotal: org.totalManque,
    contratsEcheanceProche: contratsAlerte,
    certificationsEcheanceProche: countTalentCertificationsEcheance(db, 90),
    entretiensPlanifies: countTalentEntretiensPlanifies(db, 30),
  };
}

// ── Mon Espace ────────────────────────────────────────────────────────────────

export function getMonEspace(actorUserId: number): RhMonEspace {
  assertRhSelf(actorUserId);
  const employeId = getEmployeIdForUser(actorUserId);
  if (!employeId) {
    return {
      employe: null,
      contratActif: null,
      affectationActive: null,
      pointagesRecents: [],
      absences: [],
      formationsProches: [],
      entretiensAvenir: [],
      soldesConges: [],
      dernierBulletin: null,
      onboarding: [],
      mesDocuments: [],
    };
  }
  const db = getDatabase();
  const row = db.prepare(`${employeSql} AND e.id = ?`).get(employeId) as Record<string, unknown>;
  const employe = mapEmploye(row);
  const contrats = listContratsForSelf(employeId);
  const pointages = listPointages(actorUserId).slice(0, 10);
  const absences = listAbsences(actorUserId);
  const affectationActive = getAffectationActive(actorUserId, employeId);
  const annee = new Date().getFullYear();

  const soldesRows = db.prepare(`
    SELECT s.*, e.prenom || ' ' || e.nom AS employe_nom
    FROM rh_soldes_conges s
    INNER JOIN rh_employes e ON e.id = s.employe_id
    WHERE s.employe_id = ? AND s.annee >= ?
    ORDER BY s.annee DESC, s.type
  `).all(employeId, annee - 1) as Record<string, unknown>[];

  const bulletinRow = db.prepare(`
    SELECT b.*, e.prenom || ' ' || e.nom AS employe_nom, e.dlg_matricule
    FROM rh_bulletins b
    INNER JOIN rh_employes e ON e.id = b.employe_id
    WHERE b.employe_id = ?
    ORDER BY b.periode DESC LIMIT 1
  `).get(employeId) as Record<string, unknown> | undefined;

  const docRows = db.prepare(`
    SELECT d.*, e.prenom || ' ' || e.nom AS employe_nom
    FROM rh_documents d INNER JOIN rh_employes e ON e.id = d.employe_id
    WHERE d.employe_id = ? ORDER BY d.created_at DESC LIMIT 10
  `).all(employeId) as Record<string, unknown>[];

  return {
    employe,
    contratActif: contrats.find((c) => c.actif) ?? null,
    affectationActive,
    pointagesRecents: pointages,
    absences,
    formationsProches: listFormationsProchesMonEspace(db, employeId),
    entretiensAvenir: listEntretiensAvenirMonEspace(db, employeId),
    soldesConges: soldesRows.map((r) => mapSolde(r)),
    dernierBulletin: bulletinRow
      ? {
          id: bulletinRow.id as number,
          employeId: bulletinRow.employe_id as number,
          employeNom: bulletinRow.employe_nom as string,
          dlgMatricule: (bulletinRow.dlg_matricule as string | null) ?? null,
          periode: bulletinRow.periode as string,
          brut: bulletinRow.brut as number,
          net: bulletinRow.net as number,
          charges: bulletinRow.charges as number,
          heuresTravaillees: bulletinRow.heures_travaillees as number,
          joursAbsence: bulletinRow.jours_absence as number,
          primesTotal: bulletinRow.primes_total as number,
          brutBase: (bulletinRow.brut_base as number | undefined) ?? 0,
          heuresSup: (bulletinRow.heures_sup as number | undefined) ?? 0,
          montantHs: (bulletinRow.montant_hs as number | undefined) ?? 0,
          retenueAbsence: (bulletinRow.retenue_absence as number | undefined) ?? 0,
          joursAbsenceNonRemuneree: (bulletinRow.jours_absence_non_remuneree as number | undefined) ?? 0,
          statut: bulletinRow.statut as RhBulletin['statut'],
          source: bulletinRow.source as RhBulletin['source'],
          dlgReference: (bulletinRow.dlg_reference as string | null) ?? null,
          tresorerieId: (bulletinRow.tresorerie_id as number | null) ?? null,
        }
      : null,
    onboarding: listOnboardingForMonEspace(employeId),
    mesDocuments: docRows.map((r) => ({
      id: r.id as number,
      employeId: r.employe_id as number,
      employeNom: r.employe_nom as string,
      type: r.type as RhDocument['type'],
      nom: r.nom as string,
      fichierPath: r.fichier_path as string,
      mimeType: (r.mime_type as string | null) ?? null,
      taille: (r.taille as number | null) ?? null,
      createdAt: r.created_at as string,
      source: (r.source as RhDocument['source']) ?? 'upload',
      statutValidation: (r.statut_validation as RhDocument['statutValidation']) ?? 'brouillon',
      valideN1Par: (r.valide_n1_par as number) ?? null,
      valideN1At: (r.valide_n1_at as string) ?? null,
      scanBatch: (r.scan_batch as string) ?? null,
      modeleCode: (r.modele_code as string) ?? null,
    })),
  };
}

// ── Comptes ───────────────────────────────────────────────────────────────────

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
