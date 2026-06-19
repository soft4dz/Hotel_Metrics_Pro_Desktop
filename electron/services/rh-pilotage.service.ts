import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { assertPermission, userHasPermission } from './permissions.service';
import type {
  RhComparatifUnite,
  RhOnboardingSuivi,
  RhPortRhSynthese,
  RhPrevisionEffectif,
  TypeActiviteEmploye,
  UpdateEmployeTypeActiviteInput,
} from '../../src/shared/types/rh';

function assertRhPilotage(actorUserId: number): void {
  assertPermission(actorUserId, 'rh.manage');
}

function getEmployeIdForUser(userId: number): number | null {
  const db = getDatabase();
  const row = db.prepare(`SELECT employe_id FROM users WHERE id = ? AND deleted_at IS NULL`).get(userId) as
    | { employe_id: number | null }
    | undefined;
  if (row?.employe_id) return row.employe_id;
  const emp = db.prepare(`SELECT id FROM rh_employes WHERE user_id = ? AND deleted_at IS NULL LIMIT 1`).get(userId) as
    | { id: number }
    | undefined;
  return emp?.id ?? null;
}

function effectifActifHotel(db: ReturnType<typeof getDatabase>, hotelId: number): number {
  return (
    db.prepare(`
      SELECT COUNT(DISTINCT e.id) AS c FROM rh_employes e
      WHERE e.statut_rh = 'actif' AND e.deleted_at IS NULL
      AND (
        e.hotel_id = ?
        OR EXISTS (SELECT 1 FROM rh_affectations a WHERE a.employe_id = e.id AND a.statut = 'active' AND a.hotel_id = ?)
      )
    `).get(hotelId, hotelId) as { c: number }
  ).c;
}

function masseSalarialeHotel(db: ReturnType<typeof getDatabase>, hotelId: number): number {
  const m = (
    db.prepare(`
      SELECT COALESCE(SUM(c.salaire_brut), 0) AS m
      FROM rh_contrats c
      INNER JOIN rh_employes e ON e.id = c.employe_id AND e.deleted_at IS NULL
      WHERE c.actif = 1 AND (
        e.hotel_id = ? OR EXISTS (
          SELECT 1 FROM rh_affectations a WHERE a.employe_id = e.id AND a.statut = 'active' AND a.hotel_id = ?
        )
      )
    `).get(hotelId, hotelId) as { m: number }
  ).m;
  return Math.round(m * 1.45 * 100) / 100;
}

function recettesHotel(db: ReturnType<typeof getDatabase>, hotelId: number, debut: string, fin: string): number {
  return (
    db.prepare(`
      SELECT COALESCE(SUM(montant), 0) AS t
      FROM recettes_journalieres
      WHERE hotel_id = ? AND date_journal BETWEEN ? AND ? AND deleted_at IS NULL
    `).get(hotelId, debut, fin) as { t: number }
  ).t;
}

function manqueOrganisationHotel(db: ReturnType<typeof getDatabase>, hotelId: number): number {
  const rows = db.prepare(`
    SELECT o.effectif_cible,
      (SELECT COUNT(DISTINCT e.id) FROM rh_employes e
       WHERE e.statut_rh = 'actif' AND e.deleted_at IS NULL AND e.poste_actuel_id = o.poste_id
       AND (e.hotel_id = o.hotel_id OR EXISTS (
         SELECT 1 FROM rh_affectations a WHERE a.employe_id = e.id AND a.statut = 'active' AND a.hotel_id = o.hotel_id
       ))) AS effectif_reel
    FROM rh_organisation o WHERE o.hotel_id = ?
  `).all(hotelId) as { effectif_cible: number; effectif_reel: number }[];
  return rows.reduce((s, r) => s + Math.max(0, r.effectif_cible - r.effectif_reel), 0);
}

function occupationFutureHotel(db: ReturnType<typeof getDatabase>, hotelId: number, mois: string): number {
  const [y, m] = mois.split('-').map(Number);
  const debut = `${mois}-01`;
  const fin = new Date(y, m, 0).toISOString().slice(0, 10);
  const chambres = (
    db.prepare(
      `SELECT COUNT(*) AS c FROM chambres WHERE hotel_id = ? AND actif = 1 AND statut != 'hors_service'`,
    ).get(hotelId) as { c: number }
  ).c;
  if (chambres === 0) return 0;
  const joursMois = new Date(y, m, 0).getDate();
  const capacite = chambres * joursMois;
  const nuitees = (
    db.prepare(`
      SELECT COUNT(*) AS c FROM reservations
      WHERE hotel_id = ? AND deleted_at IS NULL
        AND statut NOT IN ('annulee','no_show','provisoire')
        AND date_arrivee < ? AND date_depart > ?
    `).get(hotelId, fin, debut) as { c: number }
  ).c;
  return Math.round((nuitees / capacite) * 1000) / 10;
}

export function getComparatifUnites(
  actorUserId: number,
  dateDebut?: string,
  dateFin?: string,
): RhComparatifUnite[] {
  assertRhPilotage(actorUserId);
  const db = getDatabase();
  const fin = dateFin ?? new Date().toISOString().slice(0, 10);
  const debut = dateDebut ?? new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);

  const hotels = db.prepare(`SELECT id, name FROM hotels WHERE is_active = 1 AND deleted_at IS NULL ORDER BY name`).all() as {
    id: number;
    name: string;
  }[];

  return hotels.map((h) => {
    const effectif = effectifActifHotel(db, h.id);
    const recettes = recettesHotel(db, h.id, debut, fin);
    const masse = masseSalarialeHotel(db, h.id);
    const em = Math.max(effectif, 1);
    const coutCa = recettes > 0 ? Math.round((masse / recettes) * 10000) / 100 : 0;
    return {
      hotelId: h.id,
      hotelName: h.name,
      effectifActif: effectif,
      recettes,
      masseSalariale: masse,
      recettesParEffectif: Math.round((recettes / em) * 100) / 100,
      coutMainOeuvreSurCa: coutCa,
      manqueEffectif: manqueOrganisationHotel(db, h.id),
      periodeDebut: debut,
      periodeFin: fin,
    };
  });
}

export function getPrevisionsEffectif(
  actorUserId: number,
  opts?: { hotelId?: number; moisAhead?: number },
): RhPrevisionEffectif[] {
  assertRhPilotage(actorUserId);
  const db = getDatabase();
  const moisAhead = opts?.moisAhead ?? 3;
  const hotels = opts?.hotelId
    ? (db.prepare(`SELECT id, name FROM hotels WHERE id = ?`).all(opts.hotelId) as { id: number; name: string }[])
    : (db.prepare(`SELECT id, name FROM hotels WHERE is_active = 1 AND deleted_at IS NULL`).all() as {
        id: number;
        name: string;
      }[]);

  const globalBenchmark = (() => {
    const row = db.prepare(`
      SELECT COALESCE(SUM(rj.montant), 0) AS recettes,
        (SELECT COUNT(*) FROM rh_employes WHERE statut_rh = 'actif' AND deleted_at IS NULL) AS eff
      FROM recettes_journalieres rj
      WHERE rj.date_journal >= date('now', '-90 days') AND rj.deleted_at IS NULL
    `).get() as { recettes: number; eff: number };
    return row.eff > 0 ? row.recettes / row.eff : 50000;
  })();

  const results: RhPrevisionEffectif[] = [];
  const now = new Date();

  for (const h of hotels) {
    const effectifActuel = effectifActifHotel(db, h.id);
    const manque = manqueOrganisationHotel(db, h.id);

    for (let i = 1; i <= moisAhead; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const mois = d.toISOString().slice(0, 7);
      const moisNum = d.getMonth() + 1;
      const annee = d.getFullYear();

      const hist = db.prepare(`
        SELECT COALESCE(SUM(montant), 0) AS t FROM recettes_journalieres
        WHERE hotel_id = ? AND strftime('%m', date_journal) = ? AND deleted_at IS NULL
        AND CAST(strftime('%Y', date_journal) AS INTEGER) < ?
      `).get(h.id, String(moisNum).padStart(2, '0'), annee) as { t: number };

      const recent = db.prepare(`
        SELECT COALESCE(AVG(m), 0) AS avg FROM (
          SELECT SUM(montant) AS m FROM recettes_journalieres
          WHERE hotel_id = ? AND deleted_at IS NULL
          GROUP BY strftime('%Y-%m', date_journal)
          ORDER BY strftime('%Y-%m', date_journal) DESC LIMIT 3
        )
      `).get(h.id) as { avg: number };

      const recettesPrevues = hist.t > 0 ? hist.t : recent.avg;
      const occupation = occupationFutureHotel(db, h.id, mois);
      const coeffSaison = occupation >= 85 ? 1.15 : occupation >= 70 ? 1.05 : occupation < 50 ? 0.9 : 1;
      const recettesAjustees = recettesPrevues * coeffSaison;
      const effectifRecommande = Math.max(1, Math.ceil(recettesAjustees / globalBenchmark));
      const delta = effectifRecommande - effectifActuel;

      results.push({
        hotelId: h.id,
        hotelName: h.name,
        mois,
        effectifActuel,
        effectifRecommande,
        delta,
        recettesPrevues: Math.round(recettesAjustees),
        tauxOccupationPrevu: occupation,
        manqueOrganisation: manque,
        message:
          delta > 0
            ? `Renfort suggéré : +${delta} (occupation ${occupation} %)`
            : delta < -1
              ? `Effectif potentiellement surdimensionné (${Math.abs(delta)})`
              : 'Effectif aligné avec la charge prévue',
      });
    }
  }

  return results;
}

export function initOnboardingForEmploye(employeId: number): void {
  const db = getDatabase();
  const steps = db.prepare(`SELECT code FROM rh_onboarding_modeles ORDER BY ordre`).all() as { code: string }[];
  const insert = db.prepare(`
    INSERT OR IGNORE INTO rh_onboarding_suivi (employe_id, step_code, statut) VALUES (?, ?, 'a_faire')
  `);
  for (const s of steps) {
    insert.run(employeId, s.code);
  }
  syncOnboardingProgress(employeId);
}

export function syncOnboardingProgress(employeId: number): void {
  const db = getDatabase();
  const mark = (code: string) => {
    db.prepare(`
      UPDATE rh_onboarding_suivi SET statut = 'fait', completed_at = datetime('now')
      WHERE employe_id = ? AND step_code = ? AND statut = 'a_faire'
    `).run(employeId, code);
  };

  const user = db.prepare(`SELECT account_status FROM users u INNER JOIN rh_employes e ON e.user_id = u.id WHERE e.id = ?`).get(employeId) as
    | { account_status: string }
    | undefined;
  if (user?.account_status === 'actif') mark('compte_active');

  const aff = db.prepare(`SELECT 1 FROM rh_affectations WHERE employe_id = ? AND statut = 'active' LIMIT 1`).get(employeId);
  if (aff) mark('affectation');

  const dlg = db.prepare(`SELECT dlg_matricule FROM rh_employes WHERE id = ? AND dlg_matricule IS NOT NULL AND dlg_matricule != ''`).get(employeId);
  if (dlg) mark('dlg_matricule');

  const pt = db.prepare(`SELECT 1 FROM rh_pointages WHERE employe_id = ? AND statut = 'valide' LIMIT 1`).get(employeId);
  if (pt) mark('pointage_demo');

  const oblig = db.prepare(`SELECT COUNT(*) AS c FROM rh_formations WHERE obligatoire = 1 AND actif = 1`).get() as { c: number };
  const assigned = db.prepare(`
    SELECT COUNT(DISTINCT ef.formation_id) AS c
    FROM rh_employe_formations ef
    INNER JOIN rh_formations f ON f.id = ef.formation_id AND f.obligatoire = 1
    WHERE ef.employe_id = ?
  `).get(employeId) as { c: number };
  if (oblig.c > 0 && assigned.c >= oblig.c) mark('formations_obligatoires');
}

export function listOnboardingSuivi(
  actorUserId: number,
  opts?: { employeId?: number; enCoursOnly?: boolean },
): RhOnboardingSuivi[] {
  if (userHasPermission(actorUserId, 'rh.manage')) {
    /* ok */
  } else {
    assertPermission(actorUserId, 'rh.self');
    const selfId = getEmployeIdForUser(actorUserId);
    if (!selfId || (opts?.employeId && opts.employeId !== selfId)) {
      throw new Error('Accès refusé.');
    }
    opts = { ...opts, employeId: selfId };
  }

  const conditions = ['1=1'];
  const params: unknown[] = [];
  if (opts?.employeId) {
    conditions.push('s.employe_id = ?');
    params.push(opts.employeId);
  }
  if (opts?.enCoursOnly) {
    conditions.push(`s.employe_id IN (
      SELECT employe_id FROM rh_onboarding_suivi WHERE statut = 'a_faire'
    )`);
  }

  return getDatabase()
    .prepare(`
      SELECT s.employe_id, e.prenom || ' ' || e.nom AS employe_nom,
        m.code AS step_code, m.libelle AS step_libelle, m.ordre, m.obligatoire,
        s.statut, s.completed_at
      FROM rh_onboarding_suivi s
      INNER JOIN rh_employes e ON e.id = s.employe_id
      INNER JOIN rh_onboarding_modeles m ON m.code = s.step_code
      WHERE ${conditions.join(' AND ')}
      ORDER BY e.nom, m.ordre
    `)
    .all(...params)
    .map((row) => {
      const r = row as Record<string, unknown>;
      return {
        employeId: r.employe_id as number,
        employeNom: r.employe_nom as string,
        stepCode: r.step_code as string,
        stepLibelle: r.step_libelle as string,
        ordre: r.ordre as number,
        obligatoire: Boolean(r.obligatoire),
        statut: r.statut as RhOnboardingSuivi['statut'],
        completedAt: (r.completed_at as string) ?? null,
      };
    });
}

export function completeOnboardingStep(actorUserId: number, employeId: number, stepCode: string): void {
  assertRhPilotage(actorUserId);
  getDatabase()
    .prepare(`
      UPDATE rh_onboarding_suivi SET statut = 'fait', completed_at = datetime('now')
      WHERE employe_id = ? AND step_code = ?
    `)
    .run(employeId, stepCode);
  writeAuditLog({
    userId: actorUserId,
    action: 'UPDATE',
    module: 'rh',
    description: `Onboarding ${stepCode} validé employé #${employeId}`,
  });
}

export function getPortRhSynthese(actorUserId: number): RhPortRhSynthese {
  assertRhPilotage(actorUserId);
  const db = getDatabase();

  const employesPort = db.prepare(`
    SELECT e.id, e.prenom || ' ' || e.nom AS nom, e.type_activite, p.nom AS poste_nom
    FROM rh_employes e
    LEFT JOIN rh_postes p ON p.id = e.poste_actuel_id
    WHERE e.statut_rh = 'actif' AND e.deleted_at IS NULL
      AND e.type_activite IN ('port','mixte')
    ORDER BY e.nom
  `).all() as { id: number; nom: string; type_activite: string; poste_nom: string | null }[];

  let contratsActifs = 0;
  let facturesOuvertes = 0;
  try {
    contratsActifs = (db.prepare(`SELECT COUNT(*) AS c FROM port_contrats WHERE statut = 'actif' AND deleted_at IS NULL`).get() as { c: number }).c;
    facturesOuvertes = (
      db.prepare(`SELECT COUNT(*) AS c FROM port_factures WHERE statut IN ('brouillon','emise','partiellement_payee') AND deleted_at IS NULL`).get() as { c: number }
    ).c;
  } catch {
    /* PortMaster non installé */
  }

  return {
    employesPort: employesPort.map((e) => ({
      employeId: e.id,
      employeNom: e.nom,
      typeActivite: e.type_activite as TypeActiviteEmploye,
      posteNom: e.poste_nom,
    })),
    contratsPortActifs: contratsActifs,
    facturesPortOuvertes: facturesOuvertes,
    totalEmployesPort: employesPort.length,
  };
}

export function updateEmployeTypeActivite(
  actorUserId: number,
  input: UpdateEmployeTypeActiviteInput,
): void {
  assertRhPilotage(actorUserId);
  getDatabase()
    .prepare(`UPDATE rh_employes SET type_activite = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(input.typeActivite, input.employeId);
  writeAuditLog({
    userId: actorUserId,
    action: 'UPDATE',
    module: 'rh',
    description: `Type activité ${input.typeActivite} employé #${input.employeId}`,
  });
}

export function listOnboardingForMonEspace(employeId: number): RhOnboardingSuivi[] {
  syncOnboardingProgress(employeId);
  return getDatabase()
    .prepare(`
      SELECT s.employe_id, e.prenom || ' ' || e.nom AS employe_nom,
        m.code AS step_code, m.libelle AS step_libelle, m.ordre, m.obligatoire,
        s.statut, s.completed_at
      FROM rh_onboarding_suivi s
      INNER JOIN rh_employes e ON e.id = s.employe_id
      INNER JOIN rh_onboarding_modeles m ON m.code = s.step_code
      WHERE s.employe_id = ?
      ORDER BY m.ordre
    `)
    .all(employeId)
    .map((row) => {
      const r = row as Record<string, unknown>;
      return {
        employeId: r.employe_id as number,
        employeNom: r.employe_nom as string,
        stepCode: r.step_code as string,
        stepLibelle: r.step_libelle as string,
        ordre: r.ordre as number,
        obligatoire: Boolean(r.obligatoire),
        statut: r.statut as RhOnboardingSuivi['statut'],
        completedAt: (r.completed_at as string) ?? null,
      };
    });
}
