import { randomUUID } from 'node:crypto';
import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { dualWrite } from './dualWrite';
import {
  getActorContext,
  actorCanAccessHotel,
  isGlobalAdminRole,
  applyActorHotelFilter,
} from './actorContext';

// ── Types ─────────────────────────────────────────────────────────────────────

export type FactureStatut = 'brouillon' | 'soumise' | 'validee' | 'payee' | 'annulee';
export type TypeClient = 'particulier' | 'entreprise';
export type ModePaiementFact = 'especes' | 'cheque' | 'virement' | 'carte' | 'effet' | 'autre';

export interface ClientFacturation {
  id: number;
  type: TypeClient;
  nom: string;
  raisonSociale: string | null;
  email: string | null;
  telephone: string | null;
  adresse: string | null;
  nif: string | null;
  rc: string | null;
}

export interface LigneFacture {
  id: number;
  factureId: number;
  designation: string;
  quantite: number;
  prixUnitaire: number;
  tauxTva: number;
  montantHt: number;
  montantTva: number;
  montantTtc: number;
  ordre: number;
}

export interface PaiementFacture {
  id: number;
  factureId: number;
  datePaiement: string;
  montant: number;
  mode: ModePaiementFact;
  reference: string | null;
  notes: string | null;
  createdAt: string;
}

export interface FactureListItem {
  id: number;
  uuid: string;
  hotelId: number;
  hotelName: string;
  clientId: number | null;
  clientNom: string;
  numero: string;
  dateEmission: string;
  dateEcheance: string | null;
  statut: FactureStatut;
  montantHt: number;
  montantTva: number;
  montantTtc: number;
  montantPaye: number;
  montantRestant: number;
  createdAt: string;
}

export interface FactureDetail extends FactureListItem {
  notes: string | null;
  lignes: LigneFacture[];
  paiements: PaiementFacture[];
}

export interface FacturationDashboard {
  totalFactureHt: number;
  totalFactureTtc: number;
  totalEncaisseMois: number;
  totalEnAttente: number;
  nombreEnRetard: number;
  tauxRecouvrement: number;
  evolutionMensuelle: { mois: string; facture: number; encaisse: number }[];
  parHotel: { hotelId: number; hotelName: string; facture: number; encaisse: number; enAttente: number }[];
  recentesFactures: FactureListItem[];
}

export interface CreateClientInput {
  type: TypeClient;
  nom: string;
  raisonSociale?: string;
  email?: string;
  telephone?: string;
  adresse?: string;
  nif?: string;
  rc?: string;
}

export interface LigneInput {
  designation: string;
  quantite: number;
  prixUnitaire: number;
  tauxTva?: number;
  ordre?: number;
}

export interface CreateFactureInput {
  hotelId: number;
  clientId?: number;
  clientNom?: string;
  dateEmission?: string;
  dateEcheance?: string;
  notes?: string;
  lignes: LigneInput[];
}

export interface AddPaiementInput {
  factureId: number;
  datePaiement: string;
  montant: number;
  mode: ModePaiementFact;
  reference?: string;
  notes?: string;
}

export interface FactureFilters {
  hotelId?: number;
  statut?: FactureStatut;
  clientId?: number;
  dateDebut?: string;
  dateFin?: string;
  search?: string;
}

// ── Permission ────────────────────────────────────────────────────────────────

function assertCanFacturer(actorUserId: number) {
  const actor = getActorContext(actorUserId);
  if (!isGlobalAdminRole(actor.roleCode)) {
    throw new Error('Permission refusée. Rôle administrateur requis.');
  }
  return actor;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function calcLigne(l: LigneInput): Omit<LigneFacture, 'id' | 'factureId' | 'ordre'> {
  const tva = l.tauxTva ?? 19;
  const ht = Math.round(l.quantite * l.prixUnitaire * 100) / 100;
  const tvaAmt = Math.round(ht * tva) / 100;
  const ttc = Math.round((ht + tvaAmt) * 100) / 100;
  return {
    designation: l.designation,
    quantite: l.quantite,
    prixUnitaire: l.prixUnitaire,
    tauxTva: tva,
    montantHt: ht,
    montantTva: tvaAmt,
    montantTtc: ttc,
  };
}

function generateNumero(hotelId: number): string {
  const db = getDatabase();
  const year = new Date().getFullYear();
  const row = db.prepare(
    `SELECT COUNT(*) as cnt FROM factures WHERE hotel_id=? AND strftime('%Y', date_emission)=?`
  ).get(hotelId, String(year)) as { cnt: number };
  const seq = String(row.cnt + 1).padStart(4, '0');
  return `FAC-${year}-${seq}`;
}

function mapFactureRow(row: Record<string, unknown>): FactureListItem {
  const ttc = Number(row.montant_ttc ?? 0);
  const paye = Number(row.montant_paye ?? 0);
  return {
    id: Number(row.id),
    uuid: String(row.uuid ?? ''),
    hotelId: Number(row.hotel_id),
    hotelName: String(row.hotel_name ?? ''),
    clientId: row.client_id ? Number(row.client_id) : null,
    clientNom: String(row.client_nom ?? ''),
    numero: String(row.numero ?? ''),
    dateEmission: String(row.date_emission ?? ''),
    dateEcheance: row.date_echeance ? String(row.date_echeance) : null,
    statut: (row.statut as FactureStatut) ?? 'brouillon',
    montantHt: Number(row.montant_ht ?? 0),
    montantTva: Number(row.montant_tva ?? 0),
    montantTtc: ttc,
    montantPaye: paye,
    montantRestant: Math.max(0, ttc - paye),
    createdAt: String(row.created_at ?? ''),
  };
}

function getFactureById(id: number): FactureListItem {
  const db = getDatabase();
  const row = db.prepare(`
    SELECT f.*, h.name as hotel_name
    FROM factures f
    INNER JOIN hotels h ON h.id = f.hotel_id
    WHERE f.id = ? AND f.deleted_at IS NULL
  `).get(id) as Record<string, unknown> | undefined;
  if (!row) throw new Error(`Facture ${id} introuvable.`);
  return mapFactureRow(row);
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export function getFacturationDashboard(actorUserId: number, hotelId?: number): FacturationDashboard {
  const actor = getActorContext(actorUserId);
  const db = getDatabase();

  const conds: string[] = ['f.deleted_at IS NULL'];
  const params: unknown[] = [];
  if (hotelId) {
    if (!actorCanAccessHotel(actor, hotelId)) throw new Error('Accès refusé.');
    conds.push('f.hotel_id = ?');
    params.push(hotelId);
  } else {
    applyActorHotelFilter(actor, conds, params, { column: 'f.hotel_id' });
  }

  const where = conds.join(' AND ');
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const monthStr = `${year}-${month}`;

  const kpi = db.prepare(`
    SELECT
      SUM(CASE WHEN statut != 'annulee' THEN montant_ht ELSE 0 END)  as ht,
      SUM(CASE WHEN statut != 'annulee' THEN montant_ttc ELSE 0 END) as ttc,
      SUM(CASE WHEN strftime('%Y-%m', date_emission) = ? AND statut != 'annulee' THEN montant_paye ELSE 0 END) as enc_mois,
      SUM(CASE WHEN statut = 'validee' THEN (montant_ttc - montant_paye) ELSE 0 END)  as en_attente,
      COUNT(CASE WHEN statut = 'validee' AND date_echeance < date('now') THEN 1 END)  as en_retard
    FROM factures f WHERE ${where}
  `).get(monthStr, ...params) as Record<string, number>;

  const totalFact = kpi.ttc ?? 0;
  const totalEnc = kpi.enc_mois ?? 0;
  const tauxRec = totalFact > 0 ? Math.round((totalEnc / totalFact) * 100) : 0;

  // Evolution 6 derniers mois
  const evo = db.prepare(`
    SELECT strftime('%Y-%m', date_emission) as mois,
           SUM(CASE WHEN statut != 'annulee' THEN montant_ttc ELSE 0 END) as facture,
           SUM(CASE WHEN statut != 'annulee' THEN montant_paye ELSE 0 END) as encaisse
    FROM factures f WHERE ${where}
      AND date_emission >= date('now', '-6 months')
    GROUP BY mois ORDER BY mois
  `).all(...params) as { mois: string; facture: number; encaisse: number }[];

  // Par hôtel
  const parHotel = db.prepare(`
    SELECT f.hotel_id, h.name as hotel_name,
           SUM(CASE WHEN f.statut != 'annulee' THEN f.montant_ttc ELSE 0 END) as facture,
           SUM(CASE WHEN f.statut != 'annulee' THEN f.montant_paye ELSE 0 END) as encaisse,
           SUM(CASE WHEN f.statut = 'validee' THEN (f.montant_ttc - f.montant_paye) ELSE 0 END) as en_attente
    FROM factures f
    INNER JOIN hotels h ON h.id = f.hotel_id
    WHERE ${where}
    GROUP BY f.hotel_id ORDER BY h.name
  `).all(...params) as { hotel_id: number; hotel_name: string; facture: number; encaisse: number; en_attente: number }[];

  // 8 récentes
  const recentes = db.prepare(`
    SELECT f.*, h.name as hotel_name
    FROM factures f
    INNER JOIN hotels h ON h.id = f.hotel_id
    WHERE ${where}
    ORDER BY f.created_at DESC LIMIT 8
  `).all(...params) as Record<string, unknown>[];

  return {
    totalFactureHt: kpi.ht ?? 0,
    totalFactureTtc: totalFact,
    totalEncaisseMois: totalEnc,
    totalEnAttente: kpi.en_attente ?? 0,
    nombreEnRetard: kpi.en_retard ?? 0,
    tauxRecouvrement: tauxRec,
    evolutionMensuelle: evo,
    parHotel: parHotel.map((h) => ({
      hotelId: h.hotel_id,
      hotelName: h.hotel_name,
      facture: h.facture,
      encaisse: h.encaisse,
      enAttente: h.en_attente,
    })),
    recentesFactures: recentes.map(mapFactureRow),
  };
}

// ── Factures List ─────────────────────────────────────────────────────────────

export function listFactures(actorUserId: number, filters: FactureFilters = {}): FactureListItem[] {
  const actor = getActorContext(actorUserId);
  const db = getDatabase();

  const conds: string[] = ['f.deleted_at IS NULL'];
  const params: unknown[] = [];

  if (filters.hotelId) {
    if (!actorCanAccessHotel(actor, filters.hotelId)) throw new Error('Accès refusé.');
    conds.push('f.hotel_id = ?'); params.push(filters.hotelId);
  } else {
    applyActorHotelFilter(actor, conds, params, { column: 'f.hotel_id' });
  }

  if (filters.statut)     { conds.push('f.statut = ?');               params.push(filters.statut); }
  if (filters.clientId)   { conds.push('f.client_id = ?');            params.push(filters.clientId); }
  if (filters.dateDebut)  { conds.push('f.date_emission >= ?');       params.push(filters.dateDebut); }
  if (filters.dateFin)    { conds.push('f.date_emission <= ?');       params.push(filters.dateFin); }
  if (filters.search)     { conds.push('(f.numero LIKE ? OR f.client_nom LIKE ?)'); params.push(`%${filters.search}%`, `%${filters.search}%`); }

  const rows = db.prepare(`
    SELECT f.*, h.name as hotel_name
    FROM factures f
    INNER JOIN hotels h ON h.id = f.hotel_id
    WHERE ${conds.join(' AND ')}
    ORDER BY f.date_emission DESC, f.id DESC
    LIMIT 500
  `).all(...params) as Record<string, unknown>[];

  return rows.map(mapFactureRow);
}

// ── Facture Detail ────────────────────────────────────────────────────────────

export function getFactureDetail(actorUserId: number, id: number): FactureDetail {
  const actor = getActorContext(actorUserId);
  const base = getFactureById(id);
  if (!actorCanAccessHotel(actor, base.hotelId)) throw new Error('Accès refusé.');

  const db = getDatabase();

  const rawFacture = db.prepare(`
    SELECT f.*, h.name as hotel_name
    FROM factures f INNER JOIN hotels h ON h.id = f.hotel_id
    WHERE f.id = ? AND f.deleted_at IS NULL
  `).get(id) as Record<string, unknown>;

  const lignes = (db.prepare(`
    SELECT * FROM lignes_facture WHERE facture_id = ? ORDER BY ordre, id
  `).all(id) as Record<string, unknown>[]).map((l) => ({
    id: Number(l.id),
    factureId: Number(l.facture_id),
    designation: String(l.designation),
    quantite: Number(l.quantite),
    prixUnitaire: Number(l.prix_unitaire),
    tauxTva: Number(l.taux_tva),
    montantHt: Number(l.montant_ht),
    montantTva: Number(l.montant_tva),
    montantTtc: Number(l.montant_ttc),
    ordre: Number(l.ordre),
  }));

  const paiements = (db.prepare(`
    SELECT * FROM paiements_facture
    WHERE facture_id = ? AND deleted_at IS NULL
    ORDER BY date_paiement
  `).all(id) as Record<string, unknown>[]).map((p) => ({
    id: Number(p.id),
    factureId: Number(p.facture_id),
    datePaiement: String(p.date_paiement),
    montant: Number(p.montant),
    mode: String(p.mode) as ModePaiementFact,
    reference: p.reference ? String(p.reference) : null,
    notes: p.notes ? String(p.notes) : null,
    createdAt: String(p.created_at),
  }));

  return {
    ...mapFactureRow(rawFacture),
    notes: rawFacture.notes ? String(rawFacture.notes) : null,
    lignes,
    paiements,
  };
}

// ── Create Facture ────────────────────────────────────────────────────────────

export function createFacture(actorUserId: number, input: CreateFactureInput): FactureDetail {
  const actor = assertCanFacturer(actorUserId);
  if (!actorCanAccessHotel(actor, input.hotelId)) throw new Error('Accès hôtel refusé.');
  if (!input.lignes?.length) throw new Error('La facture doit contenir au moins une ligne.');

  const db = getDatabase();

  // Resolve client nom
  let clientNom = input.clientNom ?? '';
  if (input.clientId && !clientNom) {
    const c = db.prepare('SELECT nom, raison_sociale FROM clients_facturation WHERE id=?').get(input.clientId) as { nom: string; raison_sociale: string | null } | undefined;
    if (c) clientNom = c.raison_sociale ?? c.nom;
  }

  const numero = generateNumero(input.hotelId);

  const calcs = input.lignes.map(calcLigne);
  const totalHt = calcs.reduce((s, l) => s + l.montantHt, 0);
  const totalTva = calcs.reduce((s, l) => s + l.montantTva, 0);
  const totalTtc = calcs.reduce((s, l) => s + l.montantTtc, 0);

  const result = db.prepare(`
    INSERT INTO factures
      (uuid, hotel_id, client_id, client_nom, numero, date_emission, date_echeance, statut,
       montant_ht, montant_tva, montant_ttc, montant_paye, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'brouillon', ?, ?, ?, 0, ?, ?)
  `).run(
    randomUUID(),
    input.hotelId,
    input.clientId ?? null,
    clientNom,
    numero,
    input.dateEmission ?? new Date().toISOString().slice(0, 10),
    input.dateEcheance ?? null,
    Math.round(totalHt * 100) / 100,
    Math.round(totalTva * 100) / 100,
    Math.round(totalTtc * 100) / 100,
    input.notes ?? null,
    actorUserId,
  );

  const factureId = Number(result.lastInsertRowid);
  const stmt = db.prepare(`
    INSERT INTO lignes_facture (facture_id, designation, quantite, prix_unitaire, taux_tva, montant_ht, montant_tva, montant_ttc, ordre)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  input.lignes.forEach((l, i) => {
    const c = calcs[i];
    stmt.run(factureId, l.designation, l.quantite, l.prixUnitaire, c.tauxTva, c.montantHt, c.montantTva, c.montantTtc, l.ordre ?? i);
  });

  writeAuditLog({ userId: actorUserId, action: 'CREATE', module: 'facturation', description: `Facture ${numero} créée` });
  const facture = getFactureDetail(actorUserId, factureId);
  dualWrite(facture, 'post', '/facturation', {
    hotelId: input.hotelId,
    clientId: input.clientId,
    clientNom: clientNom,
    dateEmission: input.dateEmission ?? new Date().toISOString().slice(0, 10),
    dateEcheance: input.dateEcheance,
    notes: input.notes,
    lignes: input.lignes,
  });
  return facture;
}

// ── Update Facture Header ─────────────────────────────────────────────────────

export function updateFacture(
  actorUserId: number,
  id: number,
  input: Partial<CreateFactureInput>,
): FactureDetail {
  assertCanFacturer(actorUserId);
  const existing = getFactureById(id);
  if (existing.statut !== 'brouillon') throw new Error('Seules les factures brouillon peuvent être modifiées.');

  const db = getDatabase();
  const sets: string[] = [`updated_at = datetime('now')`];
  const params: unknown[] = [];

  if (input.clientId !== undefined) { sets.push('client_id = ?');     params.push(input.clientId ?? null); }
  if (input.clientNom !== undefined){ sets.push('client_nom = ?');    params.push(input.clientNom); }
  if (input.dateEmission)           { sets.push('date_emission = ?'); params.push(input.dateEmission); }
  if (input.dateEcheance !== undefined){ sets.push('date_echeance = ?'); params.push(input.dateEcheance ?? null); }
  if (input.notes !== undefined)    { sets.push('notes = ?');         params.push(input.notes ?? null); }

  if (input.lignes?.length) {
    db.prepare('DELETE FROM lignes_facture WHERE facture_id = ?').run(id);
    const calcs = input.lignes.map(calcLigne);
    const stmt = db.prepare(`
      INSERT INTO lignes_facture (facture_id, designation, quantite, prix_unitaire, taux_tva, montant_ht, montant_tva, montant_ttc, ordre)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    input.lignes.forEach((l, i) => {
      const c = calcs[i];
      stmt.run(id, l.designation, l.quantite, l.prixUnitaire, c.tauxTva, c.montantHt, c.montantTva, c.montantTtc, l.ordre ?? i);
    });
    const totalHt = calcs.reduce((s, l) => s + l.montantHt, 0);
    const totalTva = calcs.reduce((s, l) => s + l.montantTva, 0);
    const totalTtc = calcs.reduce((s, l) => s + l.montantTtc, 0);
    sets.push('montant_ht = ?');  params.push(Math.round(totalHt * 100) / 100);
    sets.push('montant_tva = ?'); params.push(Math.round(totalTva * 100) / 100);
    sets.push('montant_ttc = ?'); params.push(Math.round(totalTtc * 100) / 100);
  }

  params.push(id);
  db.prepare(`UPDATE factures SET ${sets.join(', ')} WHERE id = ? AND deleted_at IS NULL`).run(...params);
  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'facturation', description: `Facture ${existing.numero} modifiée` });
  return getFactureDetail(actorUserId, id);
}

// ── Workflow actions ──────────────────────────────────────────────────────────

function updateStatut(actorUserId: number, id: number, from: FactureStatut[], to: FactureStatut): FactureListItem {
  assertCanFacturer(actorUserId);
  const db = getDatabase();
  const row = getFactureById(id);
  if (!from.includes(row.statut)) throw new Error(`Transition invalide : ${row.statut} → ${to}`);
  db.prepare(`UPDATE factures SET statut=?, updated_at=datetime('now') WHERE id=?`).run(to, id);
  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'facturation', description: `Facture ${row.numero} : ${row.statut} → ${to}` });
  return getFactureById(id);
}

export const soumettreFacture = (uid: number, id: number) => updateStatut(uid, id, ['brouillon'], 'soumise');
export const validerFacture   = (uid: number, id: number) => updateStatut(uid, id, ['soumise'], 'validee');
export const annulerFacture   = (uid: number, id: number) => updateStatut(uid, id, ['brouillon', 'soumise'], 'annulee');

export function deleteFacture(actorUserId: number, id: number): boolean {
  assertCanFacturer(actorUserId);
  const row = getFactureById(id);
  if (!['brouillon', 'annulee'].includes(row.statut)) throw new Error('Seules les factures brouillon ou annulées peuvent être supprimées.');
  const db = getDatabase();
  db.prepare(`UPDATE factures SET deleted_at=datetime('now') WHERE id=?`).run(id);
  writeAuditLog({ userId: actorUserId, action: 'DELETE', module: 'facturation', description: `Facture ${row.numero} supprimée` });
  dualWrite(true, 'delete', `/facturation/${id}`);
  return true;
}

// ── Paiements ─────────────────────────────────────────────────────────────────

export function addPaiement(actorUserId: number, input: AddPaiementInput): FactureDetail {
  assertCanFacturer(actorUserId);
  const row = getFactureById(input.factureId);
  if (row.statut !== 'validee') throw new Error('Seules les factures validées peuvent recevoir un paiement.');
  if (input.montant <= 0) throw new Error('Le montant doit être positif.');

  const db = getDatabase();
  db.prepare(`
    INSERT INTO paiements_facture (facture_id, date_paiement, montant, mode, reference, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.factureId,
    input.datePaiement,
    input.montant,
    input.mode,
    input.reference ?? null,
    input.notes ?? null,
    actorUserId,
  );

  const totalPaye = db.prepare(
    `SELECT COALESCE(SUM(montant),0) as total FROM paiements_facture WHERE facture_id=? AND deleted_at IS NULL`
  ).get(input.factureId) as { total: number };

  const newStatut: FactureStatut = totalPaye.total >= row.montantTtc ? 'payee' : 'validee';
  db.prepare(`UPDATE factures SET montant_paye=?, statut=?, updated_at=datetime('now') WHERE id=?`).run(
    totalPaye.total, newStatut, input.factureId,
  );

  writeAuditLog({ userId: actorUserId, action: 'CREATE', module: 'facturation', description: `Paiement ${input.montant} DA ajouté à facture ${row.numero}` });
  const factureAvecPaiement = getFactureDetail(actorUserId, input.factureId);
  dualWrite(factureAvecPaiement, 'post', `/facturation/${input.factureId}/paiements`, {
    datePaiement: input.datePaiement,
    montant: input.montant,
    mode: input.mode,
    reference: input.reference,
    notes: input.notes,
  });
  return factureAvecPaiement;
}

export function deletePaiement(actorUserId: number, id: number): FactureDetail {
  assertCanFacturer(actorUserId);
  const db = getDatabase();
  const pmt = db.prepare('SELECT * FROM paiements_facture WHERE id=?').get(id) as { facture_id: number } | undefined;
  if (!pmt) throw new Error(`Paiement ${id} introuvable.`);

  db.prepare(`UPDATE paiements_facture SET deleted_at=datetime('now') WHERE id=?`).run(id);

  const totalPaye = db.prepare(
    `SELECT COALESCE(SUM(montant),0) as total FROM paiements_facture WHERE facture_id=? AND deleted_at IS NULL`
  ).get(pmt.facture_id) as { total: number };

  const row = getFactureById(pmt.facture_id);
  const newStatut: FactureStatut = totalPaye.total >= row.montantTtc ? 'payee' : 'validee';
  db.prepare(`UPDATE factures SET montant_paye=?, statut=?, updated_at=datetime('now') WHERE id=?`).run(
    totalPaye.total, newStatut, pmt.facture_id,
  );

  return getFactureDetail(actorUserId, pmt.facture_id);
}

// ── Clients ───────────────────────────────────────────────────────────────────

export function listClients(_actorUserId: number, search?: string): ClientFacturation[] {
  const db = getDatabase();
  const conds: string[] = ['deleted_at IS NULL'];
  const params: unknown[] = [];
  if (search) { conds.push('(nom LIKE ? OR raison_sociale LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
  return (db.prepare(`SELECT * FROM clients_facturation WHERE ${conds.join(' AND ')} ORDER BY nom LIMIT 200`).all(...params) as Record<string, unknown>[]).map(mapClient);
}

export function createClient(actorUserId: number, input: CreateClientInput): ClientFacturation {
  assertCanFacturer(actorUserId);
  const db = getDatabase();
  const r = db.prepare(`
    INSERT INTO clients_facturation (type, nom, raison_sociale, email, telephone, adresse, nif, rc)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.type,
    input.nom,
    input.raisonSociale ?? null,
    input.email ?? null,
    input.telephone ?? null,
    input.adresse ?? null,
    input.nif ?? null,
    input.rc ?? null,
  );
  return mapClient(db.prepare('SELECT * FROM clients_facturation WHERE id=?').get(Number(r.lastInsertRowid)) as Record<string, unknown>);
}

export function updateClient(actorUserId: number, id: number, input: Partial<CreateClientInput>): ClientFacturation {
  assertCanFacturer(actorUserId);
  const db = getDatabase();
  const sets: string[] = [`updated_at = datetime('now')`];
  const params: unknown[] = [];

  if (input.type)              { sets.push('type = ?');           params.push(input.type); }
  if (input.nom)               { sets.push('nom = ?');            params.push(input.nom); }
  if (input.raisonSociale !== undefined) { sets.push('raison_sociale = ?'); params.push(input.raisonSociale ?? null); }
  if (input.email !== undefined)         { sets.push('email = ?');          params.push(input.email ?? null); }
  if (input.telephone !== undefined)     { sets.push('telephone = ?');      params.push(input.telephone ?? null); }
  if (input.adresse !== undefined)       { sets.push('adresse = ?');        params.push(input.adresse ?? null); }
  if (input.nif !== undefined)           { sets.push('nif = ?');            params.push(input.nif ?? null); }
  if (input.rc !== undefined)            { sets.push('rc = ?');             params.push(input.rc ?? null); }

  params.push(id);
  db.prepare(`UPDATE clients_facturation SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  return mapClient(db.prepare('SELECT * FROM clients_facturation WHERE id=?').get(id) as Record<string, unknown>);
}

export function deleteClient(actorUserId: number, id: number): boolean {
  assertCanFacturer(actorUserId);
  const db = getDatabase();
  db.prepare(`UPDATE clients_facturation SET deleted_at=datetime('now') WHERE id=?`).run(id);
  return true;
}

function mapClient(row: Record<string, unknown>): ClientFacturation {
  return {
    id: Number(row.id),
    type: (row.type as TypeClient) ?? 'particulier',
    nom: String(row.nom ?? ''),
    raisonSociale: row.raison_sociale ? String(row.raison_sociale) : null,
    email: row.email ? String(row.email) : null,
    telephone: row.telephone ? String(row.telephone) : null,
    adresse: row.adresse ? String(row.adresse) : null,
    nif: row.nif ? String(row.nif) : null,
    rc: row.rc ? String(row.rc) : null,
  };
}
