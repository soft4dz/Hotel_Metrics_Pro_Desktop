/**
 * Conformité Loi 18-07 / ANPDP — protection des données personnelles (Algérie).
 * Registre des traitements, consentements, droits des personnes, incidents, conservation.
 */
import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { assertPermission } from './permissions.service';
import { createWorkflow } from './workflow.service';

export type RgpdBaseLegale = 'consentement' | 'contrat' | 'obligation_legale' | 'interet_legitime' | 'mission_publique';
export type RgpdSujetType = 'client' | 'employe' | 'heberge' | 'autre';
export type RgpdTypeDemande = 'acces' | 'rectification' | 'suppression' | 'opposition' | 'portabilite';
export type RgpdDemandeStatut = 'recue' | 'en_cours' | 'traitee' | 'refusee';
export type RgpdIncidentGravite = 'faible' | 'moderee' | 'grave' | 'critique';
export type RgpdIncidentStatut = 'ouvert' | 'en_cours' | 'clos';

export interface RgpdTraitement {
  id: number;
  code: string;
  libelle: string;
  finalite: string;
  baseLegale: RgpdBaseLegale;
  categoriesDonnees: string[];
  categoriesPersonnes: string[];
  destinataires: string | null;
  dureeConservation: string | null;
  mesuresSecurite: string | null;
  responsableTraitement: string | null;
  sousTraitants: string | null;
  transfertHorsAlgerie: boolean;
  actif: boolean;
}

export interface RgpdConsentement {
  id: number;
  traitementId: number | null;
  sujetType: RgpdSujetType;
  sujetId: number | null;
  sujetLabel: string;
  finalite: string;
  consentementDonne: boolean;
  preuvePath: string | null;
  dateConsentement: string;
  dateRetrait: string | null;
  statut: string;
}

export interface RgpdDemandeDroit {
  id: number;
  typeDemande: RgpdTypeDemande;
  sujetType: RgpdSujetType;
  sujetId: number | null;
  sujetLabel: string;
  canal: string | null;
  description: string | null;
  statut: RgpdDemandeStatut;
  dateReception: string;
  dateEcheance: string | null;
  dateTraitement: string | null;
  reponse: string | null;
}

export interface RgpdIncident {
  id: number;
  dateIncident: string;
  dateDetection: string;
  gravite: RgpdIncidentGravite;
  nature: string;
  donneesConcernees: string | null;
  personnesConcernees: number;
  mesuresCorrectives: string | null;
  notificationAnpdp: boolean;
  dateNotificationAnpdp: string | null;
  statut: RgpdIncidentStatut;
}

export interface RgpdPolitiqueConservation {
  id: number;
  code: string;
  typeDonnee: string;
  libelle: string;
  dureeMois: number;
  baseLegale: string | null;
  gedRetentionPolicyId: number | null;
  gedPolitiqueCode: string | null;
  justification: string | null;
}

export interface RgpdDashboard {
  traitementsActifs: number;
  consentementsActifs: number;
  demandesEnCours: number;
  demandesEnRetard: number;
  incidentsOuverts: number;
  incidentsCritiques: number;
}

function assertRgpdAdmin(actorUserId: number): void {
  assertPermission(actorUserId, 'users.manage');
}

function parseJsonArray(raw: unknown): string[] {
  if (!raw || typeof raw !== 'string') return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

function mapTraitement(row: Record<string, unknown>): RgpdTraitement {
  return {
    id: Number(row.id),
    code: String(row.code),
    libelle: String(row.libelle),
    finalite: String(row.finalite),
    baseLegale: row.base_legale as RgpdBaseLegale,
    categoriesDonnees: parseJsonArray(row.categories_donnees),
    categoriesPersonnes: parseJsonArray(row.categories_personnes),
    destinataires: row.destinataires ? String(row.destinataires) : null,
    dureeConservation: row.duree_conservation ? String(row.duree_conservation) : null,
    mesuresSecurite: row.mesures_securite ? String(row.mesures_securite) : null,
    responsableTraitement: row.responsable_traitement ? String(row.responsable_traitement) : null,
    sousTraitants: row.sous_traitants ? String(row.sous_traitants) : null,
    transfertHorsAlgerie: Boolean(row.transfert_hors_algerie),
    actif: Boolean(row.actif),
  };
}

export function getRgpdDashboard(actorUserId: number): RgpdDashboard {
  assertRgpdAdmin(actorUserId);
  const db = getDatabase();
  const today = new Date().toISOString().slice(0, 10);
  return {
    traitementsActifs: (db.prepare(`SELECT COUNT(*) as c FROM rgpd_traitements WHERE actif=1`).get() as { c: number }).c,
    consentementsActifs: (db.prepare(`SELECT COUNT(*) as c FROM rgpd_consentements WHERE statut='actif'`).get() as { c: number }).c,
    demandesEnCours: (db.prepare(`SELECT COUNT(*) as c FROM rgpd_demandes_droits WHERE statut IN ('recue','en_cours')`).get() as { c: number }).c,
    demandesEnRetard: (db.prepare(`
      SELECT COUNT(*) as c FROM rgpd_demandes_droits
      WHERE statut IN ('recue','en_cours') AND date_echeance IS NOT NULL AND date_echeance < ?
    `).get(today) as { c: number }).c,
    incidentsOuverts: (db.prepare(`SELECT COUNT(*) as c FROM rgpd_incidents WHERE statut IN ('ouvert','en_cours')`).get() as { c: number }).c,
    incidentsCritiques: (db.prepare(`
      SELECT COUNT(*) as c FROM rgpd_incidents WHERE statut IN ('ouvert','en_cours') AND gravite IN ('grave','critique')
    `).get() as { c: number }).c,
  };
}

export function listTraitements(actorUserId: number, actifOnly = true): RgpdTraitement[] {
  assertRgpdAdmin(actorUserId);
  const where = actifOnly ? 'WHERE actif=1' : '';
  return (getDatabase().prepare(`SELECT * FROM rgpd_traitements ${where} ORDER BY libelle`).all() as Record<string, unknown>[]).map(mapTraitement);
}

export function upsertTraitement(actorUserId: number, input: {
  id?: number;
  code: string;
  libelle: string;
  finalite: string;
  baseLegale: RgpdBaseLegale;
  categoriesDonnees?: string[];
  categoriesPersonnes?: string[];
  destinataires?: string;
  dureeConservation?: string;
  mesuresSecurite?: string;
  responsableTraitement?: string;
  sousTraitants?: string;
  transfertHorsAlgerie?: boolean;
}): RgpdTraitement {
  assertRgpdAdmin(actorUserId);
  const db = getDatabase();
  const catsD = JSON.stringify(input.categoriesDonnees ?? []);
  const catsP = JSON.stringify(input.categoriesPersonnes ?? []);

  if (input.id) {
    db.prepare(`
      UPDATE rgpd_traitements SET code=?, libelle=?, finalite=?, base_legale=?,
        categories_donnees=?, categories_personnes=?, destinataires=?, duree_conservation=?,
        mesures_securite=?, responsable_traitement=?, sous_traitants=?, transfert_hors_algerie=?,
        updated_at=datetime('now') WHERE id=?
    `).run(
      input.code, input.libelle, input.finalite, input.baseLegale, catsD, catsP,
      input.destinataires ?? null, input.dureeConservation ?? null, input.mesuresSecurite ?? null,
      input.responsableTraitement ?? null, input.sousTraitants ?? null, input.transfertHorsAlgerie ? 1 : 0, input.id,
    );
    writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'rgpd', description: `Traitement RGPD #${input.id} mis à jour` });
    return mapTraitement(db.prepare('SELECT * FROM rgpd_traitements WHERE id=?').get(input.id) as Record<string, unknown>);
  }

  const r = db.prepare(`
    INSERT INTO rgpd_traitements (code, libelle, finalite, base_legale, categories_donnees, categories_personnes,
      destinataires, duree_conservation, mesures_securite, responsable_traitement, sous_traitants, transfert_hors_algerie)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.code, input.libelle, input.finalite, input.baseLegale, catsD, catsP,
    input.destinataires ?? null, input.dureeConservation ?? null, input.mesuresSecurite ?? null,
    input.responsableTraitement ?? null, input.sousTraitants ?? null, input.transfertHorsAlgerie ? 1 : 0,
  );
  const id = Number(r.lastInsertRowid);
  writeAuditLog({ userId: actorUserId, action: 'CREATE', module: 'rgpd', description: `Traitement RGPD ${input.code} créé` });
  return mapTraitement(db.prepare('SELECT * FROM rgpd_traitements WHERE id=?').get(id) as Record<string, unknown>);
}

export function listConsentements(actorUserId: number, statut?: string): RgpdConsentement[] {
  assertRgpdAdmin(actorUserId);
  const db = getDatabase();
  const rows = statut
    ? db.prepare(`SELECT * FROM rgpd_consentements WHERE statut=? ORDER BY date_consentement DESC LIMIT 200`).all(statut)
    : db.prepare(`SELECT * FROM rgpd_consentements ORDER BY date_consentement DESC LIMIT 200`).all();
  return (rows as Record<string, unknown>[]).map((row) => ({
    id: Number(row.id),
    traitementId: row.traitement_id ? Number(row.traitement_id) : null,
    sujetType: row.sujet_type as RgpdSujetType,
    sujetId: row.sujet_id ? Number(row.sujet_id) : null,
    sujetLabel: String(row.sujet_label),
    finalite: String(row.finalite),
    consentementDonne: Boolean(row.consentement_donne),
    preuvePath: row.preuve_path ? String(row.preuve_path) : null,
    dateConsentement: String(row.date_consentement),
    dateRetrait: row.date_retrait ? String(row.date_retrait) : null,
    statut: String(row.statut),
  }));
}

export function createConsentement(actorUserId: number, input: {
  traitementId?: number;
  sujetType: RgpdSujetType;
  sujetId?: number;
  sujetLabel: string;
  finalite: string;
  dateConsentement: string;
  preuvePath?: string;
}): RgpdConsentement {
  assertRgpdAdmin(actorUserId);
  const r = getDatabase().prepare(`
    INSERT INTO rgpd_consentements (traitement_id, sujet_type, sujet_id, sujet_label, finalite, date_consentement, preuve_path, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.traitementId ?? null, input.sujetType, input.sujetId ?? null, input.sujetLabel,
    input.finalite, input.dateConsentement, input.preuvePath ?? null, actorUserId,
  );
  writeAuditLog({ userId: actorUserId, action: 'CREATE', module: 'rgpd', description: `Consentement enregistré — ${input.sujetLabel}` });
  return listConsentements(actorUserId).find((c) => c.id === Number(r.lastInsertRowid))!;
}

export function revokeConsentement(actorUserId: number, id: number, dateRetrait: string): RgpdConsentement {
  assertRgpdAdmin(actorUserId);
  getDatabase().prepare(`
    UPDATE rgpd_consentements SET statut='retire', date_retrait=?, consentement_donne=0 WHERE id=?
  `).run(dateRetrait, id);
  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'rgpd', description: `Consentement #${id} retiré` });
  return listConsentements(actorUserId).find((c) => c.id === id)!;
}

export function listDemandes(actorUserId: number, statut?: RgpdDemandeStatut): RgpdDemandeDroit[] {
  assertRgpdAdmin(actorUserId);
  const db = getDatabase();
  const rows = statut
    ? db.prepare(`SELECT * FROM rgpd_demandes_droits WHERE statut=? ORDER BY date_reception DESC LIMIT 200`).all(statut)
    : db.prepare(`SELECT * FROM rgpd_demandes_droits ORDER BY date_reception DESC LIMIT 200`).all();
  return (rows as Record<string, unknown>[]).map(mapDemande);
}

function mapDemande(row: Record<string, unknown>): RgpdDemandeDroit {
  return {
    id: Number(row.id),
    typeDemande: row.type_demande as RgpdTypeDemande,
    sujetType: row.sujet_type as RgpdSujetType,
    sujetId: row.sujet_id ? Number(row.sujet_id) : null,
    sujetLabel: String(row.sujet_label),
    canal: row.canal ? String(row.canal) : null,
    description: row.description ? String(row.description) : null,
    statut: row.statut as RgpdDemandeStatut,
    dateReception: String(row.date_reception),
    dateEcheance: row.date_echeance ? String(row.date_echeance) : null,
    dateTraitement: row.date_traitement ? String(row.date_traitement) : null,
    reponse: row.reponse ? String(row.reponse) : null,
  };
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function createDemandeDroit(actorUserId: number, input: {
  typeDemande: RgpdTypeDemande;
  sujetType: RgpdSujetType;
  sujetId?: number;
  sujetLabel: string;
  canal?: string;
  description?: string;
  dateReception: string;
}): RgpdDemandeDroit {
  assertRgpdAdmin(actorUserId);
  const dateEcheance = addDays(input.dateReception, 30);
  const r = getDatabase().prepare(`
    INSERT INTO rgpd_demandes_droits (type_demande, sujet_type, sujet_id, sujet_label, canal, description, date_reception, date_echeance)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.typeDemande, input.sujetType, input.sujetId ?? null, input.sujetLabel,
    input.canal ?? null, input.description ?? null, input.dateReception, dateEcheance,
  );
  const id = Number(r.lastInsertRowid);
  createWorkflow(actorUserId, {
    module: 'rgpd',
    entityType: 'demande_droit',
    entityId: id,
    priorite: input.typeDemande === 'suppression' ? 'haute' : 'normale',
    commentaire: `Demande ${input.typeDemande} — ${input.sujetLabel}`,
  });
  writeAuditLog({ userId: actorUserId, action: 'CREATE', module: 'rgpd', description: `Demande droit ${input.typeDemande} #${id}` });
  return mapDemande(getDatabase().prepare('SELECT * FROM rgpd_demandes_droits WHERE id=?').get(id) as Record<string, unknown>);
}

export function updateDemandeStatut(actorUserId: number, id: number, statut: RgpdDemandeStatut, reponse?: string): RgpdDemandeDroit {
  assertRgpdAdmin(actorUserId);
  const dateTraitement = ['traitee', 'refusee'].includes(statut) ? new Date().toISOString().slice(0, 10) : null;
  getDatabase().prepare(`
    UPDATE rgpd_demandes_droits SET statut=?, reponse=?, date_traitement=?, traite_par=?, updated_at=datetime('now') WHERE id=?
  `).run(statut, reponse ?? null, dateTraitement, actorUserId, id);
  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'rgpd', description: `Demande droit #${id} → ${statut}` });
  return mapDemande(getDatabase().prepare('SELECT * FROM rgpd_demandes_droits WHERE id=?').get(id) as Record<string, unknown>);
}

export function listIncidents(actorUserId: number, statut?: RgpdIncidentStatut): RgpdIncident[] {
  assertRgpdAdmin(actorUserId);
  const db = getDatabase();
  const rows = statut
    ? db.prepare(`SELECT * FROM rgpd_incidents WHERE statut=? ORDER BY date_detection DESC LIMIT 100`).all(statut)
    : db.prepare(`SELECT * FROM rgpd_incidents ORDER BY date_detection DESC LIMIT 100`).all();
  return (rows as Record<string, unknown>[]).map(mapIncident);
}

function mapIncident(row: Record<string, unknown>): RgpdIncident {
  return {
    id: Number(row.id),
    dateIncident: String(row.date_incident),
    dateDetection: String(row.date_detection),
    gravite: row.gravite as RgpdIncidentGravite,
    nature: String(row.nature),
    donneesConcernees: row.donnees_concernees ? String(row.donnees_concernees) : null,
    personnesConcernees: Number(row.personnes_concernees ?? 0),
    mesuresCorrectives: row.mesures_correctives ? String(row.mesures_correctives) : null,
    notificationAnpdp: Boolean(row.notification_anpdp),
    dateNotificationAnpdp: row.date_notification_anpdp ? String(row.date_notification_anpdp) : null,
    statut: row.statut as RgpdIncidentStatut,
  };
}

export function createIncident(actorUserId: number, input: {
  dateIncident: string;
  dateDetection: string;
  gravite: RgpdIncidentGravite;
  nature: string;
  donneesConcernees?: string;
  personnesConcernees?: number;
  mesuresCorrectives?: string;
  notificationAnpdp?: boolean;
  dateNotificationAnpdp?: string;
}): RgpdIncident {
  assertRgpdAdmin(actorUserId);
  const r = getDatabase().prepare(`
    INSERT INTO rgpd_incidents (date_incident, date_detection, gravite, nature, donnees_concernees,
      personnes_concernees, mesures_correctives, notification_anpdp, date_notification_anpdp, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.dateIncident, input.dateDetection, input.gravite, input.nature,
    input.donneesConcernees ?? null, input.personnesConcernees ?? 0, input.mesuresCorrectives ?? null,
    input.notificationAnpdp ? 1 : 0, input.dateNotificationAnpdp ?? null, actorUserId,
  );
  const id = Number(r.lastInsertRowid);
  if (['grave', 'critique'].includes(input.gravite)) {
    createWorkflow(actorUserId, {
      module: 'rgpd',
      entityType: 'incident_donnees',
      entityId: id,
      priorite: 'critique',
      commentaire: `Incident données ${input.gravite} — notification ANPDP à évaluer`,
    });
  }
  writeAuditLog({ userId: actorUserId, action: 'CREATE', module: 'rgpd', description: `Incident données #${id} — ${input.gravite}` });
  return mapIncident(getDatabase().prepare('SELECT * FROM rgpd_incidents WHERE id=?').get(id) as Record<string, unknown>);
}

export function updateIncident(actorUserId: number, id: number, input: {
  statut?: RgpdIncidentStatut;
  mesuresCorrectives?: string;
  notificationAnpdp?: boolean;
  dateNotificationAnpdp?: string;
}): RgpdIncident {
  assertRgpdAdmin(actorUserId);
  const sets: string[] = ['updated_at=datetime(\'now\')'];
  const params: unknown[] = [];
  if (input.statut) { sets.push('statut=?'); params.push(input.statut); }
  if (input.mesuresCorrectives !== undefined) { sets.push('mesures_correctives=?'); params.push(input.mesuresCorrectives); }
  if (input.notificationAnpdp !== undefined) { sets.push('notification_anpdp=?'); params.push(input.notificationAnpdp ? 1 : 0); }
  if (input.dateNotificationAnpdp !== undefined) { sets.push('date_notification_anpdp=?'); params.push(input.dateNotificationAnpdp); }
  params.push(id);
  getDatabase().prepare(`UPDATE rgpd_incidents SET ${sets.join(', ')} WHERE id=?`).run(...params);
  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'rgpd', description: `Incident #${id} mis à jour` });
  return mapIncident(getDatabase().prepare('SELECT * FROM rgpd_incidents WHERE id=?').get(id) as Record<string, unknown>);
}

export function listPolitiquesConservation(actorUserId: number): RgpdPolitiqueConservation[] {
  assertRgpdAdmin(actorUserId);
  return (getDatabase().prepare(`
    SELECT p.*, g.code as ged_politique_code FROM rgpd_politique_conservation p
    LEFT JOIN ged_retention_policies g ON g.id = p.ged_retention_policy_id
    WHERE p.actif=1 ORDER BY p.type_donnee, p.libelle
  `).all() as Record<string, unknown>[]).map((row) => ({
    id: Number(row.id),
    code: String(row.code),
    typeDonnee: String(row.type_donnee),
    libelle: String(row.libelle),
    dureeMois: Number(row.duree_mois),
    baseLegale: row.base_legale ? String(row.base_legale) : null,
    gedRetentionPolicyId: row.ged_retention_policy_id ? Number(row.ged_retention_policy_id) : null,
    gedPolitiqueCode: row.ged_politique_code ? String(row.ged_politique_code) : null,
    justification: row.justification ? String(row.justification) : null,
  }));
}

export function exportRegistreTraitementsCsv(actorUserId: number): string {
  assertRgpdAdmin(actorUserId);
  const rows = listTraitements(actorUserId, false);
  const lines = [
    'Code;Libellé;Finalité;Base légale;Durée conservation;Responsable;Transfert hors Algérie',
    ...rows.map((t) => [
      t.code, t.libelle, t.finalite, t.baseLegale, t.dureeConservation ?? '',
      t.responsableTraitement ?? '', t.transfertHorsAlgerie ? 'Oui' : 'Non',
    ].join(';')),
  ];
  writeAuditLog({ userId: actorUserId, action: 'EXPORT', module: 'rgpd', description: 'Export registre traitements CSV' });
  return lines.join('\n');
}
