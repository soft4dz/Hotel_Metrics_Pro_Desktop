import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { assertPermission } from './permissions.service';
import { listEmployes } from './rh.service';
import {
  CNAS_PATRON_TAUX,
  CNAS_SALARIE_TAUX,
  SMIG_DZD,
  calculateIrg,
  calculatePaieDz,
} from './rh-paie-dz-engine';
import type { RhConformiteAlerte, RhConformiteDashboard } from '../../src/shared/types/rh';

export { SMIG_DZD, CNAS_SALARIE_TAUX, CNAS_PATRON_TAUX, calculateIrg, calculatePaieDz };

export const CONGES_JOURS_PAR_MOIS = 2.5;
export const BONUS_CONGES_SUD = 10;

function assertRhConformite(actorUserId: number): void {
  assertPermission(actorUserId, 'rh.manage');
}

function moisTravaillesDansAnnee(dateEmbauche: string, annee: number): number {
  const debutAnnee = `${annee}-01-01`;
  const finAnnee = `${annee}-12-31`;
  const start = dateEmbauche > debutAnnee ? dateEmbauche : debutAnnee;
  if (start > finAnnee) return 0;
  const db = getDatabase();
  const row = db
    .prepare(`
      SELECT CAST(
        (julianday(MIN(?, ?)) - julianday(?) + 1) / 30.0 AS REAL
      ) AS m
    `)
    .get(finAnnee, start, start) as { m: number };
  return Math.min(12, Math.max(0, Math.round(row.m * 10) / 10));
}

export function syncCongesLegaux90_11(actorUserId: number, annee?: number): number {
  assertRhConformite(actorUserId);
  const db = getDatabase();
  const y = annee ?? new Date().getFullYear();
  const employes = listEmployes(actorUserId).filter((e) => e.statutRh === 'actif');
  let updated = 0;

  for (const emp of employes) {
    const row = db.prepare(`SELECT date_embauche, bonus_conges_sud FROM rh_employes WHERE id = ?`).get(emp.id) as
      | { date_embauche: string; bonus_conges_sud: number }
      | undefined;
    if (!row) continue;

    const mois = moisTravaillesDansAnnee(row.date_embauche, y);
    let acquis = Math.round(mois * CONGES_JOURS_PAR_MOIS * 100) / 100;
    if (row.bonus_conges_sud) {
      acquis += Math.round((BONUS_CONGES_SUD * mois / 12) * 100) / 100;
    }

    const existing = db
      .prepare(`SELECT pris FROM rh_soldes_conges WHERE employe_id = ? AND annee = ? AND type = 'CP'`)
      .get(emp.id, y) as { pris: number } | undefined;
    const pris = existing?.pris ?? 0;
    const reste = Math.round((acquis - pris) * 100) / 100;

    db.prepare(`
      INSERT INTO rh_soldes_conges (employe_id, annee, type, acquis, pris, reste)
      VALUES (?, ?, 'CP', ?, ?, ?)
      ON CONFLICT(employe_id, annee, type) DO UPDATE SET
        acquis = excluded.acquis, reste = excluded.reste, updated_at = datetime('now')
    `).run(emp.id, y, acquis, pris, reste);
    updated += 1;
  }

  writeAuditLog({
    userId: actorUserId,
    action: 'UPDATE',
    module: 'rh',
    description: `Synchronisation congés légaux 90-11 (${y}) — ${updated} employé(s)`,
  });
  return updated;
}

export function initConformiteSuiviEmploye(employeId: number): void {
  const db = getDatabase();
  const items = [
    { code: 'anem', libelle: 'Déclaration embauche ANEM (48h)' },
    { code: 'visite_med', libelle: 'Visite médicale d\'embauche' },
    { code: 'contrat_signe', libelle: 'Contrat signé et archivé' },
    { code: 'cnas_affiliation', libelle: 'Affiliation CNAS / NSS' },
  ];
  const ins = db.prepare(`
    INSERT OR IGNORE INTO rh_conformite_suivi (employe_id, code, libelle, statut)
    VALUES (?, ?, ?, 'a_faire')
  `);
  for (const it of items) ins.run(employeId, it.code, it.libelle);
}

export function updateConformiteSuivi(
  actorUserId: number,
  employeId: number,
  code: string,
  statut: 'a_faire' | 'en_cours' | 'fait' | 'non_requis',
  opts?: { dateRealisation?: string; notes?: string },
): void {
  assertRhConformite(actorUserId);
  const db = getDatabase();
  db.prepare(`
    UPDATE rh_conformite_suivi SET statut = ?, date_realisation = ?, notes = ?
    WHERE employe_id = ? AND code = ?
  `).run(statut, opts?.dateRealisation ?? null, opts?.notes ?? null, employeId, code);

  if (code === 'anem' && statut === 'fait') {
    db.prepare(`
      UPDATE rh_employes SET declaration_anem_statut = 'declaree',
        declaration_anem_date = COALESCE(?, date('now')), updated_at = datetime('now')
      WHERE id = ?
    `).run(opts?.dateRealisation ?? null, employeId);
  }
}

export function getConformiteDashboard(actorUserId: number): RhConformiteDashboard {
  assertRhConformite(actorUserId);
  const db = getDatabase();

  const sansNss = (db.prepare(`
    SELECT COUNT(*) AS c FROM rh_employes WHERE statut_rh = 'actif' AND deleted_at IS NULL
      AND (nss IS NULL OR nss = '')
  `).get() as { c: number }).c;

  const sansNin = (db.prepare(`
    SELECT COUNT(*) AS c FROM rh_employes WHERE statut_rh = 'actif' AND deleted_at IS NULL
      AND (nin IS NULL OR nin = '')
  `).get() as { c: number }).c;

  const anemEnRetard = (db.prepare(`
    SELECT COUNT(*) AS c FROM rh_employes WHERE statut_rh = 'actif' AND deleted_at IS NULL
      AND declaration_anem_statut = 'a_faire'
      AND julianday('now') - julianday(date_embauche) > 2
  `).get() as { c: number }).c;

  const sousSmig = (db.prepare(`
    SELECT COUNT(*) AS c FROM rh_employes e
    INNER JOIN rh_contrats c ON c.employe_id = e.id AND c.actif = 1
    WHERE e.statut_rh = 'actif' AND e.deleted_at IS NULL AND c.salaire_brut < ?
  `).get(SMIG_DZD) as { c: number }).c;

  const dossiersIncomplets = (db.prepare(`
    SELECT COUNT(DISTINCT e.id) AS c FROM rh_employes e
    WHERE e.statut_rh = 'actif' AND e.deleted_at IS NULL
    AND (
      SELECT COUNT(*) FROM rh_dossier_modeles m WHERE m.obligatoire = 1
    ) > (
      SELECT COUNT(DISTINCT d.modele_code) FROM rh_documents d
      WHERE d.employe_id = e.id AND d.statut_validation = 'valide' AND d.modele_code IS NOT NULL
    )
  `).get() as { c: number }).c;

  const alertes: RhConformiteAlerte[] = [];
  if (sansNss > 0) alertes.push({ niveau: 'critique', message: `${sansNss} employé(s) sans NSS` });
  if (sansNin > 0) alertes.push({ niveau: 'urgent', message: `${sansNin} employé(s) sans NIN` });
  if (anemEnRetard > 0) alertes.push({ niveau: 'critique', message: `${anemEnRetard} déclaration(s) ANEM en retard` });
  if (sousSmig > 0) alertes.push({ niveau: 'urgent', message: `${sousSmig} salaire(s) sous le SMIG (${SMIG_DZD} DZD)` });
  if (dossiersIncomplets > 0) alertes.push({ niveau: 'attention', message: `${dossiersIncomplets} dossier(s) administratif(s) incomplet(s)` });

  const suivi = db.prepare(`
    SELECT cs.*, e.prenom || ' ' || e.nom AS employe_nom
    FROM rh_conformite_suivi cs
    INNER JOIN rh_employes e ON e.id = cs.employe_id
    WHERE cs.statut != 'fait' AND cs.statut != 'non_requis'
    ORDER BY cs.date_echeance, employe_nom LIMIT 30
  `).all() as Record<string, unknown>[];

  return {
    sansNss,
    sansNin,
    anemEnRetard,
    sousSmig,
    dossiersIncomplets,
    smig: SMIG_DZD,
    alertes,
    suivi: suivi.map((r) => ({
      employeId: r.employe_id as number,
      employeNom: r.employe_nom as string,
      code: r.code as string,
      libelle: r.libelle as string,
      statut: r.statut as RhConformiteDashboard['suivi'][number]['statut'],
      dateEcheance: (r.date_echeance as string) ?? null,
      dateRealisation: (r.date_realisation as string) ?? null,
      notes: (r.notes as string) ?? null,
    })),
  };
}
