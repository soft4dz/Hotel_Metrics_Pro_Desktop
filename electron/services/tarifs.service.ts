import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { getActorContext, applyActorHotelFilter, isGlobalAdminRole } from './actorContext';
import type {
  ComposantTarif, CreateComposantInput,
  FormuleTarif, CreateFormuleInput,
  PlanTarifaire, CreatePlanInput,
  TarifJournalier, UpsertTarifInput, UpsertTarifsBulkInput,
  PromotionTarif, CreatePromotionInput,
  Convention, CreateConventionInput,
  SimulateurInput, SimulateurResult, DetailNuit,
} from '../../src/shared/types/tarifs';

// ── Helpers ───────────────────────────────────────────────────────────────────

function checkHotelAccess(actor: ReturnType<typeof getActorContext>, hotelId: number) {
  if (!isGlobalAdminRole(actor.roleCode) && !actor.hotelIds.includes(hotelId)) {
    throw new Error('Accès hôtel refusé.');
  }
}

function parseIds(json: string | null): number[] | null {
  if (!json) return null;
  try { return JSON.parse(json); } catch { return null; }
}

function dateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const cur = new Date(start);
  const fin = new Date(end);
  while (cur <= fin) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

// ── Composants ────────────────────────────────────────────────────────────────

export function listComposants(actorUserId: number, hotelId?: number): ComposantTarif[] {
  const actor = getActorContext(actorUserId);
  const db = getDatabase();
  const conditions = ['ct.actif = 1'];
  const params: unknown[] = [];
  applyActorHotelFilter(actor, conditions, params, { column: 'hotel_id', alias: 'ct' });
  if (hotelId) { conditions.push('ct.hotel_id = ?'); params.push(hotelId); }
  const rows = db.prepare(`
    SELECT ct.*, h.name as hotel_name FROM composants_tarif ct
    INNER JOIN hotels h ON h.id = ct.hotel_id
    WHERE ${conditions.join(' AND ')} ORDER BY h.name, ct.label
  `).all(...params) as any[];
  return rows.map((r) => ({
    id: r.id, hotelId: r.hotel_id, hotelName: r.hotel_name,
    code: r.code, label: r.label, modeCalcul: r.mode_calcul,
    prixDefaut: r.prix_defaut, description: r.description,
    actif: r.actif === 1, createdAt: r.created_at,
  }));
}

export function createComposant(actorUserId: number, input: CreateComposantInput): ComposantTarif {
  const actor = getActorContext(actorUserId);
  checkHotelAccess(actor, input.hotelId);
  const db = getDatabase();
  const result = db.prepare(`
    INSERT INTO composants_tarif (hotel_id, code, label, mode_calcul, prix_defaut, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(input.hotelId, input.code.toUpperCase(), input.label, input.modeCalcul, input.prixDefaut, input.description ?? null);
  writeAuditLog({ userId: actorUserId, action: 'CREATE', module: 'tarifs', description: `Composant "${input.label}" créé` });
  return listComposants(actorUserId, input.hotelId).find((c) => c.id === Number(result.lastInsertRowid))!;
}

export function deleteComposant(actorUserId: number, id: number): boolean {
  const db = getDatabase();
  const used = db.prepare(`SELECT COUNT(*) as cnt FROM formule_composants WHERE composant_id=?`).get(id) as { cnt: number };
  if (used.cnt > 0) throw new Error('Ce composant est utilisé dans une formule.');
  db.prepare(`UPDATE composants_tarif SET actif=0, updated_at=datetime('now') WHERE id=?`).run(id);
  writeAuditLog({ userId: actorUserId, action: 'DELETE', module: 'tarifs', description: `Composant ${id} désactivé` });
  return true;
}

// ── Formules ──────────────────────────────────────────────────────────────────

function loadFormuleComposants(db: ReturnType<typeof getDatabase>, formuleId: number) {
  return (db.prepare(`
    SELECT fc.*, ct.code, ct.label, ct.mode_calcul, ct.prix_defaut
    FROM formule_composants fc
    INNER JOIN composants_tarif ct ON ct.id = fc.composant_id
    WHERE fc.formule_id = ?
  `).all(formuleId) as any[]).map((r) => ({
    composantId: r.composant_id,
    code: r.code, label: r.label,
    modeCalcul: r.mode_calcul, prixDefaut: r.prix_defaut,
    prixOverride: r.prix_override,
    prixEffectif: r.prix_override ?? r.prix_defaut,
  }));
}

export function listFormules(actorUserId: number, hotelId?: number): FormuleTarif[] {
  const actor = getActorContext(actorUserId);
  const db = getDatabase();
  const conditions = ['ft.actif = 1'];
  const params: unknown[] = [];
  applyActorHotelFilter(actor, conditions, params, { column: 'hotel_id', alias: 'ft' });
  if (hotelId) { conditions.push('ft.hotel_id = ?'); params.push(hotelId); }
  const rows = db.prepare(`
    SELECT ft.*, h.name as hotel_name FROM formules_tarif ft
    INNER JOIN hotels h ON h.id = ft.hotel_id
    WHERE ${conditions.join(' AND ')} ORDER BY h.name, ft.code
  `).all(...params) as any[];
  return rows.map((r) => ({
    id: r.id, hotelId: r.hotel_id, hotelName: r.hotel_name,
    code: r.code, label: r.label, description: r.description,
    actif: r.actif === 1, createdAt: r.created_at,
    composants: loadFormuleComposants(db, r.id),
  }));
}

export function createFormule(actorUserId: number, input: CreateFormuleInput): FormuleTarif {
  const actor = getActorContext(actorUserId);
  checkHotelAccess(actor, input.hotelId);
  const db = getDatabase();
  const result = db.prepare(`
    INSERT INTO formules_tarif (hotel_id, code, label, description)
    VALUES (?, ?, ?, ?)
  `).run(input.hotelId, input.code.toUpperCase(), input.label, input.description ?? null);
  const formuleId = Number(result.lastInsertRowid);
  const insertComp = db.prepare(`INSERT INTO formule_composants (formule_id, composant_id, prix_override) VALUES (?,?,?)`);
  for (const c of input.composants) insertComp.run(formuleId, c.composantId, c.prixOverride ?? null);
  writeAuditLog({ userId: actorUserId, action: 'CREATE', module: 'tarifs', description: `Formule "${input.label}" créée` });
  return listFormules(actorUserId, input.hotelId).find((f) => f.id === formuleId)!;
}

export function deleteFormule(actorUserId: number, id: number): boolean {
  const db = getDatabase();
  const used = db.prepare(`SELECT COUNT(*) as cnt FROM tarifs_journaliers WHERE formule_id=?`).get(id) as { cnt: number };
  if (used.cnt > 0) throw new Error('Cette formule est utilisée dans des tarifs journaliers.');
  db.prepare(`UPDATE formules_tarif SET actif=0, updated_at=datetime('now') WHERE id=?`).run(id);
  writeAuditLog({ userId: actorUserId, action: 'DELETE', module: 'tarifs', description: `Formule ${id} désactivée` });
  return true;
}

// ── Plans tarifaires ──────────────────────────────────────────────────────────

export function listPlans(actorUserId: number, hotelId?: number): PlanTarifaire[] {
  const actor = getActorContext(actorUserId);
  const db = getDatabase();
  const conditions = ['p.actif = 1'];
  const params: unknown[] = [];
  applyActorHotelFilter(actor, conditions, params, { column: 'hotel_id', alias: 'p' });
  if (hotelId) { conditions.push('p.hotel_id = ?'); params.push(hotelId); }
  const rows = db.prepare(`
    SELECT p.*, h.name as hotel_name FROM plans_tarifaires p
    INNER JOIN hotels h ON h.id = p.hotel_id
    WHERE ${conditions.join(' AND ')} ORDER BY h.name, p.priorite DESC, p.label
  `).all(...params) as any[];
  return rows.map((r) => ({
    id: r.id, hotelId: r.hotel_id, hotelName: r.hotel_name,
    code: r.code, label: r.label, typePlan: r.type_plan,
    conditionsAnnulation: r.conditions_annulation, conditionsPaiement: r.conditions_paiement,
    priorite: r.priorite, actif: r.actif === 1, createdAt: r.created_at,
  }));
}

export function createPlan(actorUserId: number, input: CreatePlanInput): PlanTarifaire {
  const actor = getActorContext(actorUserId);
  checkHotelAccess(actor, input.hotelId);
  const db = getDatabase();
  const result = db.prepare(`
    INSERT INTO plans_tarifaires (hotel_id, code, label, type_plan, conditions_annulation, conditions_paiement, priorite)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(input.hotelId, input.code.toUpperCase(), input.label, input.typePlan,
    input.conditionsAnnulation ?? null, input.conditionsPaiement ?? null, input.priorite ?? 10);
  writeAuditLog({ userId: actorUserId, action: 'CREATE', module: 'tarifs', description: `Plan "${input.label}" créé` });
  return listPlans(actorUserId, input.hotelId).find((p) => p.id === Number(result.lastInsertRowid))!;
}

export function deletePlan(actorUserId: number, id: number): boolean {
  const db = getDatabase();
  const used = db.prepare(`SELECT COUNT(*) as cnt FROM tarifs_journaliers WHERE plan_id=?`).get(id) as { cnt: number };
  if (used.cnt > 0) throw new Error('Ce plan est utilisé dans des tarifs journaliers.');
  db.prepare(`UPDATE plans_tarifaires SET actif=0, updated_at=datetime('now') WHERE id=?`).run(id);
  writeAuditLog({ userId: actorUserId, action: 'DELETE', module: 'tarifs', description: `Plan ${id} désactivé` });
  return true;
}

// ── Tarifs journaliers ────────────────────────────────────────────────────────

export function getTarifsGrille(
  _actorUserId: number,
  hotelId: number,
  planId: number,
  dateDebut: string,
  dateFin: string,
  formuleId?: number,
): TarifJournalier[] {
  const db = getDatabase();
  const conditions = ['tj.hotel_id = ?', 'tj.plan_id = ?', 'tj.date_application BETWEEN ? AND ?'];
  const params: unknown[] = [hotelId, planId, dateDebut, dateFin];
  if (formuleId !== undefined) { conditions.push('tj.formule_id = ?'); params.push(formuleId); }
  else { conditions.push('tj.formule_id IS NULL'); }
  const rows = db.prepare(`
    SELECT tj.*, tc.label as type_chambre_label, p.label as plan_label,
           ft.label as formule_label
    FROM tarifs_journaliers tj
    INNER JOIN types_chambres tc ON tc.id = tj.type_chambre_id
    INNER JOIN plans_tarifaires p ON p.id = tj.plan_id
    LEFT JOIN formules_tarif ft ON ft.id = tj.formule_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY tj.date_application, tc.label
  `).all(...params) as any[];
  return rows.map(mapTarif);
}

function mapTarif(r: any): TarifJournalier {
  return {
    id: r.id, hotelId: r.hotel_id,
    typeChambreId: r.type_chambre_id, typeChambreLabel: r.type_chambre_label,
    planId: r.plan_id, planLabel: r.plan_label,
    formuleId: r.formule_id, formuleLabel: r.formule_label,
    dateApplication: r.date_application,
    prixBase: r.prix_base, prixPersonneSupp: r.prix_personne_supp,
    minSejour: r.min_sejour, maxSejour: r.max_sejour,
    fermetureVente: r.fermeture_vente === 1,
    restrictionArrivee: r.restriction_arrivee,
    restrictionDepart: r.restriction_depart,
  };
}

export function upsertTarif(_actorUserId: number, input: UpsertTarifInput): TarifJournalier {
  const db = getDatabase();
  db.prepare(`
    INSERT INTO tarifs_journaliers
      (hotel_id, type_chambre_id, plan_id, formule_id, date_application,
       prix_base, prix_personne_supp, min_sejour, max_sejour,
       fermeture_vente, restriction_arrivee, restriction_depart)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(hotel_id, type_chambre_id, plan_id, formule_id, date_application)
    DO UPDATE SET
      prix_base=excluded.prix_base, prix_personne_supp=excluded.prix_personne_supp,
      min_sejour=excluded.min_sejour, max_sejour=excluded.max_sejour,
      fermeture_vente=excluded.fermeture_vente,
      restriction_arrivee=excluded.restriction_arrivee,
      restriction_depart=excluded.restriction_depart,
      updated_at=datetime('now')
  `).run(
    input.hotelId, input.typeChambreId, input.planId, input.formuleId ?? null,
    input.dateApplication, input.prixBase, input.prixPersonneSupp ?? 0,
    input.minSejour ?? 1, input.maxSejour ?? null,
    input.fermetureVente ? 1 : 0,
    input.restrictionArrivee ?? 'AUCUNE', input.restrictionDepart ?? 'AUCUNE',
  );
  const row = db.prepare(`
    SELECT tj.*, tc.label as type_chambre_label, p.label as plan_label, ft.label as formule_label
    FROM tarifs_journaliers tj
    INNER JOIN types_chambres tc ON tc.id = tj.type_chambre_id
    INNER JOIN plans_tarifaires p ON p.id = tj.plan_id
    LEFT JOIN formules_tarif ft ON ft.id = tj.formule_id
    WHERE tj.hotel_id=? AND tj.type_chambre_id=? AND tj.plan_id=?
      AND tj.date_application=?
      ${input.formuleId ? 'AND tj.formule_id=?' : 'AND tj.formule_id IS NULL'}
  `).get(...([input.hotelId, input.typeChambreId, input.planId, input.dateApplication, ...(input.formuleId ? [input.formuleId] : [])])) as any;
  return mapTarif(row);
}

export function upsertTarifsBulk(actorUserId: number, input: UpsertTarifsBulkInput): number {
  const dates = dateRange(input.dateDebut, input.dateFin);
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO tarifs_journaliers
      (hotel_id, type_chambre_id, plan_id, formule_id, date_application,
       prix_base, prix_personne_supp, min_sejour, max_sejour, fermeture_vente)
    VALUES (?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(hotel_id, type_chambre_id, plan_id, formule_id, date_application)
    DO UPDATE SET
      prix_base=excluded.prix_base, prix_personne_supp=excluded.prix_personne_supp,
      min_sejour=excluded.min_sejour, max_sejour=excluded.max_sejour,
      fermeture_vente=excluded.fermeture_vente, updated_at=datetime('now')
  `);
  let count = 0;
  const bulk = db.transaction(() => {
    for (const date of dates) {
      for (const tcId of input.typeChambreIds) {
        stmt.run(
          input.hotelId, tcId, input.planId, input.formuleId ?? null, date,
          input.prixBase, input.prixPersonneSupp ?? 0, input.minSejour ?? 1,
          input.maxSejour ?? null, input.fermetureVente ? 1 : 0,
        );
        count++;
      }
    }
  });
  bulk();
  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'tarifs', description: `${count} tarifs mis à jour en masse` });
  return count;
}

// ── Promotions ────────────────────────────────────────────────────────────────

export function listPromotions(actorUserId: number, hotelId?: number): PromotionTarif[] {
  const actor = getActorContext(actorUserId);
  const db = getDatabase();
  const conditions: string[] = [];
  const params: unknown[] = [];
  applyActorHotelFilter(actor, conditions, params, { column: 'hotel_id', alias: 'p' });
  if (hotelId) { conditions.push('p.hotel_id = ?'); params.push(hotelId); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = db.prepare(`
    SELECT p.*, h.name as hotel_name FROM promotions_tarif p
    INNER JOIN hotels h ON h.id = p.hotel_id
    ${where} ORDER BY p.date_debut DESC
  `).all(...params) as any[];
  return rows.map((r) => ({
    id: r.id, hotelId: r.hotel_id, hotelName: r.hotel_name,
    nom: r.nom, description: r.description,
    dateDebut: r.date_debut, dateFin: r.date_fin,
    typeReduction: r.type_reduction, valeurReduction: r.valeur_reduction,
    minSejour: r.min_sejour, joursSemaine: parseIds(r.jours_semaine),
    typeChambreIds: parseIds(r.type_chambres_ids), formulesIds: parseIds(r.formules_ids),
    actif: r.actif === 1, createdAt: r.created_at,
  }));
}

export function createPromotion(actorUserId: number, input: CreatePromotionInput): PromotionTarif {
  const actor = getActorContext(actorUserId);
  checkHotelAccess(actor, input.hotelId);
  const db = getDatabase();
  const result = db.prepare(`
    INSERT INTO promotions_tarif
      (hotel_id, nom, description, date_debut, date_fin, type_reduction,
       valeur_reduction, min_sejour, jours_semaine, type_chambres_ids, formules_ids)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    input.hotelId, input.nom, input.description ?? null,
    input.dateDebut, input.dateFin, input.typeReduction, input.valeurReduction,
    input.minSejour ?? 1,
    input.joursSemaine?.length ? JSON.stringify(input.joursSemaine) : null,
    input.typeChambreIds?.length ? JSON.stringify(input.typeChambreIds) : null,
    input.formulesIds?.length ? JSON.stringify(input.formulesIds) : null,
  );
  writeAuditLog({ userId: actorUserId, action: 'CREATE', module: 'tarifs', description: `Promotion "${input.nom}" créée` });
  return listPromotions(actorUserId, input.hotelId).find((p) => p.id === Number(result.lastInsertRowid))!;
}

export function togglePromotion(_actorUserId: number, id: number, actif: boolean): boolean {
  const db = getDatabase();
  db.prepare(`UPDATE promotions_tarif SET actif=?, updated_at=datetime('now') WHERE id=?`).run(actif ? 1 : 0, id);
  return true;
}

export function deletePromotion(actorUserId: number, id: number): boolean {
  const db = getDatabase();
  db.prepare(`DELETE FROM promotions_tarif WHERE id=?`).run(id);
  writeAuditLog({ userId: actorUserId, action: 'DELETE', module: 'tarifs', description: `Promotion ${id} supprimée` });
  return true;
}

// ── Conventions ───────────────────────────────────────────────────────────────

function loadConventionTarifs(db: ReturnType<typeof getDatabase>, conventionId: number): Convention['tarifs'] {
  return (db.prepare(`
    SELECT ct.*, tc.label as type_chambre_label, ft.label as formule_label
    FROM convention_tarifs ct
    INNER JOIN types_chambres tc ON tc.id = ct.type_chambre_id
    LEFT JOIN formules_tarif ft ON ft.id = ct.formule_id
    WHERE ct.convention_id = ?
  `).all(conventionId) as any[]).map((r) => ({
    id: r.id, typeChambreId: r.type_chambre_id, typeChambreLabel: r.type_chambre_label,
    formuleId: r.formule_id, formuleLabel: r.formule_label,
    typeReduction: r.type_reduction, valeur: r.valeur,
  }));
}

export function listConventions(actorUserId: number, hotelId?: number, clientId?: number): Convention[] {
  const actor = getActorContext(actorUserId);
  const db = getDatabase();
  const conditions: string[] = [];
  const params: unknown[] = [];
  applyActorHotelFilter(actor, conditions, params, { column: 'hotel_id', alias: 'cv' });
  if (hotelId)  { conditions.push('cv.hotel_id = ?');  params.push(hotelId); }
  if (clientId) { conditions.push('cv.client_id = ?'); params.push(clientId); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = db.prepare(`
    SELECT cv.*, h.name as hotel_name,
           c.nom as client_nom, c.prenom as client_prenom
    FROM conventions cv
    INNER JOIN hotels h ON h.id = cv.hotel_id
    INNER JOIN clients c ON c.id = cv.client_id
    ${where} ORDER BY cv.date_debut DESC
  `).all(...params) as any[];
  return rows.map((r) => ({
    id: r.id, hotelId: r.hotel_id, hotelName: r.hotel_name,
    clientId: r.client_id,
    clientNom: `${r.client_nom}${r.client_prenom ? ' ' + r.client_prenom : ''}`,
    nom: r.nom, description: r.description,
    dateDebut: r.date_debut, dateFin: r.date_fin,
    priorite: r.priorite, estActive: r.est_active === 1,
    tarifs: loadConventionTarifs(db, r.id),
    createdAt: r.created_at,
  }));
}

export function createConvention(actorUserId: number, input: CreateConventionInput): Convention {
  const actor = getActorContext(actorUserId);
  checkHotelAccess(actor, input.hotelId);
  const db = getDatabase();
  const result = db.prepare(`
    INSERT INTO conventions (hotel_id, client_id, nom, description, date_debut, date_fin, priorite)
    VALUES (?,?,?,?,?,?,?)
  `).run(input.hotelId, input.clientId, input.nom, input.description ?? null,
    input.dateDebut, input.dateFin, input.priorite ?? 10);
  const conventionId = Number(result.lastInsertRowid);
  const insLigne = db.prepare(`
    INSERT INTO convention_tarifs (convention_id, type_chambre_id, formule_id, type_reduction, valeur)
    VALUES (?,?,?,?,?)
  `);
  for (const t of input.tarifs) insLigne.run(conventionId, t.typeChambreId, t.formuleId ?? null, t.typeReduction, t.valeur);
  writeAuditLog({ userId: actorUserId, action: 'CREATE', module: 'tarifs', description: `Convention "${input.nom}" créée` });
  return listConventions(actorUserId, input.hotelId).find((c) => c.id === conventionId)!;
}

export function toggleConvention(_actorUserId: number, id: number, actif: boolean): boolean {
  const db = getDatabase();
  db.prepare(`UPDATE conventions SET est_active=?, updated_at=datetime('now') WHERE id=?`).run(actif ? 1 : 0, id);
  return true;
}

export function deleteConvention(actorUserId: number, id: number): boolean {
  const db = getDatabase();
  db.prepare(`DELETE FROM convention_tarifs WHERE convention_id=?`).run(id);
  db.prepare(`DELETE FROM conventions WHERE id=?`).run(id);
  writeAuditLog({ userId: actorUserId, action: 'DELETE', module: 'tarifs', description: `Convention ${id} supprimée` });
  return true;
}

// ── Simulateur de prix ────────────────────────────────────────────────────────

export function simulerPrix(_actorUserId: number, input: SimulateurInput): SimulateurResult {
  const db = getDatabase();
  const dates = dateRange(input.dateArrivee, input.dateDepart).slice(0, -1); // exclure jour départ
  if (dates.length === 0) throw new Error('Dates invalides.');

  // Formule composants
  const formuleComposants = input.formuleId
    ? (db.prepare(`
        SELECT fc.*, ct.label, ct.mode_calcul, ct.prix_defaut
        FROM formule_composants fc
        INNER JOIN composants_tarif ct ON ct.id = fc.composant_id
        WHERE fc.formule_id = ?
      `).all(input.formuleId) as any[])
    : [];

  // Convention active pour ce client
  let conventionAppliquee: string | null = null;
  let conventionLigne: any = null;
  if (input.clientId) {
    const conv = db.prepare(`
      SELECT cv.nom, ct.type_reduction, ct.valeur
      FROM conventions cv
      INNER JOIN convention_tarifs ct ON ct.convention_id = cv.id
      WHERE cv.hotel_id=? AND cv.client_id=? AND cv.est_active=1
        AND cv.date_debut <= ? AND cv.date_fin >= ?
        AND ct.type_chambre_id=?
        AND (ct.formule_id IS NULL OR ct.formule_id=?)
      ORDER BY cv.priorite DESC
      LIMIT 1
    `).get(input.hotelId, input.clientId, input.dateArrivee, input.dateDepart,
           input.typeChambreId, input.formuleId ?? null) as any;
    if (conv) { conventionAppliquee = conv.nom; conventionLigne = conv; }
  }

  // Promotions actives (seulement si pas de convention)
  let promoAppliquee: string | null = null;
  let promoLigne: any = null;
  if (!conventionLigne) {
    const promo = db.prepare(`
      SELECT nom, type_reduction, valeur_reduction
      FROM promotions_tarif
      WHERE hotel_id=? AND actif=1
        AND date_debut <= ? AND date_fin >= ?
        AND min_sejour <= ?
        AND (type_chambres_ids IS NULL OR type_chambres_ids LIKE ?)
      ORDER BY valeur_reduction DESC LIMIT 1
    `).get(input.hotelId, input.dateArrivee, input.dateDepart, dates.length,
           `%${input.typeChambreId}%`) as any;
    if (promo) { promoAppliquee = promo.nom; promoLigne = promo; }
  }

  const detail: DetailNuit[] = [];
  let total = 0;

  for (const date of dates) {
    // Tarif base du jour
    const tarif = db.prepare(`
      SELECT prix_base, prix_personne_supp FROM tarifs_journaliers
      WHERE hotel_id=? AND type_chambre_id=? AND plan_id=? AND date_application=?
        AND (formule_id=? OR formule_id IS NULL)
      ORDER BY (formule_id IS NOT NULL) DESC LIMIT 1
    `).get(input.hotelId, input.typeChambreId, input.planId, date, input.formuleId ?? null) as any;

    const prixBase = tarif?.prix_base ?? 0;
    const prixSupp = tarif ? tarif.prix_personne_supp * Math.max(0, input.nbAdultes - 2) : 0;

    // Composants formule
    const prixComposants = formuleComposants.map((fc: any) => {
      const prix = fc.prix_override ?? fc.prix_defaut;
      let montant = 0;
      if (fc.mode_calcul === 'PAR_NUIT') montant = prix;
      else if (fc.mode_calcul === 'PAR_PERSONNE_NUIT') montant = prix * input.nbAdultes;
      else if (fc.mode_calcul === 'FIXE') montant = prix / dates.length;
      return { label: fc.label, montant };
    });
    const totalComposants = prixComposants.reduce((s: number, c: { label: string; montant: number }) => s + c.montant, 0);
    const prixAvantReduction = prixBase + prixSupp + totalComposants;

    let prixConvention: number | null = null;
    let prixPromo: number | null = null;
    let prixFinal = prixAvantReduction;

    if (conventionLigne) {
      prixConvention = conventionLigne.type_reduction === 'FIXE_PRIX'
        ? conventionLigne.valeur
        : prixAvantReduction * (1 - conventionLigne.valeur / 100);
      prixFinal = prixConvention;
    } else if (promoLigne) {
      prixPromo = promoLigne.type_reduction === 'POURCENTAGE'
        ? prixAvantReduction * (1 - promoLigne.valeur_reduction / 100)
        : Math.max(0, prixAvantReduction - promoLigne.valeur_reduction);
      prixFinal = prixPromo;
    }

    detail.push({ date, prixBase, prixComposants, prixConvention, prixPromo, prixFinal });
    total += prixFinal;
  }

  return {
    nbNuits: dates.length,
    prixTotal: Math.round(total * 100) / 100,
    conventionAppliquee,
    promoAppliquee,
    detail,
  };
}
