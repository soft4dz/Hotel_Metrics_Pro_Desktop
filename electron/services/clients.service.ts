import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { getActorContext, isGlobalAdminRole } from './actorContext';
import { dualWrite } from './dualWrite';

// ── Types ─────────────────────────────────────────────────────────────────────

export type TypeClient = 'particulier' | 'entreprise';
export type RegimeImposition = 'reel' | 'forfait_unique' | 'ifu' | 'auto_entrepreneur';
export type TypeContact = 'gerant' | 'dg' | 'daf' | 'commercial' | 'comptable' | 'autre';

export interface ClientStats {
  clientId: number;
  nbFactures: number;
  totalFactureHt: number;
  totalFactureTtc: number;
  montantPaye: number;
  montantRestant: number;
  derniereFactureDate: string | null;
}

export interface ClientContact {
  id: number;
  clientId: number;
  type: TypeContact;
  nom: string;
  titre: string | null;
  telephone: string | null;
  email: string | null;
  principal: boolean;
  notes: string | null;
  createdAt: string;
}

export interface CreateContactInput {
  type: TypeContact;
  nom: string;
  titre?: string | null;
  telephone?: string | null;
  email?: string | null;
  principal?: boolean;
  notes?: string | null;
}

export interface ClientComplet {
  id: number;
  type: TypeClient;
  civilite: string | null;
  nom: string;
  prenom: string | null;
  raisonSociale: string | null;
  formeJuridique: string | null;
  email: string | null;
  telephone: string | null;
  mobile: string | null;
  fax: string | null;
  siteWeb: string | null;
  adresse: string | null;
  adresseLigne1: string | null;
  adresseLigne2: string | null;
  ville: string | null;
  wilaya: string | null;
  codePostal: string | null;
  pays: string;
  nif: string | null;
  dateExpirationNif: string | null;
  rc: string | null;
  dateExpirationNrc: string | null;
  nis: string | null;
  ai: string | null;
  dateCreationEntreprise: string | null;
  numeroAgrement: string | null;
  assujettITva: boolean;
  numeroTva: string | null;
  regimeImposition: RegimeImposition | null;
  banqueClient: string | null;
  agenceBancaire: string | null;
  rib: string | null;
  notesInternes: string | null;
  actif: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClientItem extends ClientComplet {
  stats: ClientStats;
}

export interface ClientItemDetail extends ClientItem {
  contacts: ClientContact[];
}

export interface ClientFilters {
  search?: string;
  type?: TypeClient;
  actif?: boolean;
}

export interface CreateClientInput {
  type: TypeClient;
  civilite?: string | null;
  nom: string;
  prenom?: string | null;
  raisonSociale?: string | null;
  formeJuridique?: string | null;
  email?: string | null;
  telephone?: string | null;
  mobile?: string | null;
  fax?: string | null;
  siteWeb?: string | null;
  adresse?: string | null;
  adresseLigne1?: string | null;
  adresseLigne2?: string | null;
  ville?: string | null;
  wilaya?: string | null;
  codePostal?: string | null;
  pays?: string | null;
  nif?: string | null;
  dateExpirationNif?: string | null;
  rc?: string | null;
  dateExpirationNrc?: string | null;
  nis?: string | null;
  ai?: string | null;
  dateCreationEntreprise?: string | null;
  numeroAgrement?: string | null;
  assujettITva?: boolean;
  numeroTva?: string | null;
  regimeImposition?: RegimeImposition | null;
  banqueClient?: string | null;
  agenceBancaire?: string | null;
  rib?: string | null;
  notesInternes?: string | null;
  actif?: boolean;
}

export interface ClientsDashboard {
  totalClients: number;
  clientsActifs: number;
  clientsEntreprises: number;
  clientsParticuliers: number;
  totalFactureHt: number;
  totalFactureTtc: number;
  montantRestant: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function assertCanManageClients(actorUserId: number): void {
  const actor = getActorContext(actorUserId);
  if (!isGlobalAdminRole(actor.roleCode)) throw new Error('Accès refusé — droits insuffisants');
}

type DbRow = Record<string, unknown>;

function rowToClient(row: DbRow): ClientComplet {
  return {
    id: row.id as number,
    type: row.type as TypeClient,
    civilite: (row.civilite as string | null) ?? null,
    nom: row.nom as string,
    prenom: (row.prenom as string | null) ?? null,
    raisonSociale: (row.raison_sociale as string | null) ?? null,
    formeJuridique: (row.forme_juridique as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    telephone: (row.telephone as string | null) ?? null,
    mobile: (row.mobile as string | null) ?? null,
    fax: (row.fax as string | null) ?? null,
    siteWeb: (row.site_web as string | null) ?? null,
    adresse: (row.adresse as string | null) ?? null,
    adresseLigne1: (row.adresse_ligne1 as string | null) ?? null,
    adresseLigne2: (row.adresse_ligne2 as string | null) ?? null,
    ville: (row.ville as string | null) ?? null,
    wilaya: (row.wilaya as string | null) ?? null,
    codePostal: (row.code_postal as string | null) ?? null,
    pays: (row.pays as string) || 'Algérie',
    nif: (row.nif as string | null) ?? null,
    dateExpirationNif: (row.date_expiration_nif as string | null) ?? null,
    rc: (row.rc as string | null) ?? null,
    dateExpirationNrc: (row.date_expiration_nrc as string | null) ?? null,
    nis: (row.nis as string | null) ?? null,
    ai: (row.ai as string | null) ?? null,
    dateCreationEntreprise: (row.date_creation_entreprise as string | null) ?? null,
    numeroAgrement: (row.numero_agrement as string | null) ?? null,
    assujettITva: Number(row.assujetti_tva) !== 0,
    numeroTva: (row.numero_tva as string | null) ?? null,
    regimeImposition: (row.regime_imposition as RegimeImposition | null) ?? null,
    banqueClient: (row.banque_client as string | null) ?? null,
    agenceBancaire: (row.agence_bancaire as string | null) ?? null,
    rib: (row.rib as string | null) ?? null,
    notesInternes: (row.notes_internes as string | null) ?? null,
    actif: Number(row.actif) !== 0,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function rowToStats(row: DbRow): ClientStats {
  return {
    clientId: row.id as number,
    nbFactures: Number(row.nb_factures ?? 0),
    totalFactureHt: Number(row.total_ht ?? 0),
    totalFactureTtc: Number(row.total_ttc ?? 0),
    montantPaye: Number(row.montant_paye ?? 0),
    montantRestant: Number(row.montant_restant ?? 0),
    derniereFactureDate: (row.derniere_facture as string | null) ?? null,
  };
}

function rowToContact(row: DbRow): ClientContact {
  return {
    id: row.id as number,
    clientId: row.client_id as number,
    type: row.type as TypeContact,
    nom: row.nom as string,
    titre: (row.titre as string | null) ?? null,
    telephone: (row.telephone as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    principal: Number(row.principal) !== 0,
    notes: (row.notes as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

const STATS_JOIN = `
  LEFT JOIN factures f
    ON f.client_id = c.id AND f.deleted_at IS NULL AND f.statut != 'annulee'
`;

const STATS_COLS = `
  COUNT(f.id)                                           AS nb_factures,
  COALESCE(SUM(f.montant_ht), 0)                        AS total_ht,
  COALESCE(SUM(f.montant_ttc), 0)                       AS total_ttc,
  COALESCE(SUM(f.montant_paye), 0)                      AS montant_paye,
  COALESCE(SUM(f.montant_ttc) - SUM(f.montant_paye), 0) AS montant_restant,
  MAX(f.date_emission)                                  AS derniere_facture
`;

// ── Dashboard ─────────────────────────────────────────────────────────────────

export function getClientsDashboard(actorUserId: number): ClientsDashboard {
  assertCanManageClients(actorUserId);
  const db = getDatabase();

  const counts = db.prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN actif = 1 THEN 1 ELSE 0 END) AS actifs,
      SUM(CASE WHEN type = 'entreprise' THEN 1 ELSE 0 END) AS entreprises,
      SUM(CASE WHEN type = 'particulier' THEN 1 ELSE 0 END) AS particuliers
    FROM clients_facturation WHERE deleted_at IS NULL
  `).get() as DbRow;

  const money = db.prepare(`
    SELECT
      COALESCE(SUM(montant_ht), 0)  AS total_ht,
      COALESCE(SUM(montant_ttc), 0) AS total_ttc,
      COALESCE(SUM(montant_ttc) - SUM(montant_paye), 0) AS restant
    FROM factures WHERE deleted_at IS NULL AND statut != 'annulee'
  `).get() as DbRow;

  return {
    totalClients: Number(counts.total ?? 0),
    clientsActifs: Number(counts.actifs ?? 0),
    clientsEntreprises: Number(counts.entreprises ?? 0),
    clientsParticuliers: Number(counts.particuliers ?? 0),
    totalFactureHt: Number(money.total_ht ?? 0),
    totalFactureTtc: Number(money.total_ttc ?? 0),
    montantRestant: Number(money.restant ?? 0),
  };
}

// ── Client CRUD ───────────────────────────────────────────────────────────────

export function listClients(actorUserId: number, filters?: ClientFilters): ClientItem[] {
  assertCanManageClients(actorUserId);
  const db = getDatabase();

  const conds: string[] = ['c.deleted_at IS NULL'];
  const params: unknown[] = [];

  if (filters?.search) {
    conds.push(
      '(c.nom LIKE ? OR c.raison_sociale LIKE ? OR c.email LIKE ? OR c.telephone LIKE ? OR c.nif LIKE ?)',
    );
    const q = `%${filters.search}%`;
    params.push(q, q, q, q, q);
  }
  if (filters?.type) { conds.push('c.type = ?'); params.push(filters.type); }
  if (filters?.actif !== undefined) { conds.push('c.actif = ?'); params.push(filters.actif ? 1 : 0); }

  const rows = db.prepare(`
    SELECT c.*, ${STATS_COLS}
    FROM clients_facturation c
    ${STATS_JOIN}
    WHERE ${conds.join(' AND ')}
    GROUP BY c.id
    ORDER BY c.nom ASC
  `).all(...params) as DbRow[];

  return rows.map((row) => ({ ...rowToClient(row), stats: rowToStats(row) }));
}

export function getClient(actorUserId: number, id: number): ClientItem {
  assertCanManageClients(actorUserId);
  const db = getDatabase();

  const row = db.prepare(`
    SELECT c.*, ${STATS_COLS}
    FROM clients_facturation c
    ${STATS_JOIN}
    WHERE c.id = ? AND c.deleted_at IS NULL
    GROUP BY c.id
  `).get(id) as DbRow | undefined;

  if (!row) throw new Error('Client introuvable');
  return { ...rowToClient(row), stats: rowToStats(row) };
}

export function getClientDetail(actorUserId: number, id: number): ClientItemDetail {
  const client = getClient(actorUserId, id);
  const contacts = listContacts(actorUserId, id);
  return { ...client, contacts };
}

export function createClient(actorUserId: number, input: CreateClientInput): ClientItemDetail {
  assertCanManageClients(actorUserId);
  const db = getDatabase();

  const result = db.prepare(`
    INSERT INTO clients_facturation (
      type, civilite, nom, prenom, raison_sociale, forme_juridique,
      email, telephone, mobile, fax, site_web,
      adresse, adresse_ligne1, adresse_ligne2, ville, wilaya, code_postal, pays,
      nif, date_expiration_nif, rc, date_expiration_nrc, nis, ai,
      date_creation_entreprise, numero_agrement,
      assujetti_tva, numero_tva, regime_imposition,
      banque_client, agence_bancaire, rib,
      notes_internes, actif,
      created_at, updated_at
    ) VALUES (
      ?,?,?,?,?,?,
      ?,?,?,?,?,
      ?,?,?,?,?,?,?,
      ?,?,?,?,?,?,
      ?,?,
      ?,?,?,
      ?,?,?,
      ?,?,
      datetime('now'), datetime('now')
    )
  `).run(
    input.type,
    input.civilite ?? null,
    input.nom,
    input.prenom ?? null,
    input.raisonSociale ?? null,
    input.formeJuridique ?? null,
    input.email ?? null,
    input.telephone ?? null,
    input.mobile ?? null,
    input.fax ?? null,
    input.siteWeb ?? null,
    input.adresse ?? null,
    input.adresseLigne1 ?? null,
    input.adresseLigne2 ?? null,
    input.ville ?? null,
    input.wilaya ?? null,
    input.codePostal ?? null,
    input.pays ?? 'Algérie',
    input.nif ?? null,
    input.dateExpirationNif ?? null,
    input.rc ?? null,
    input.dateExpirationNrc ?? null,
    input.nis ?? null,
    input.ai ?? null,
    input.dateCreationEntreprise ?? null,
    input.numeroAgrement ?? null,
    input.assujettITva ? 1 : 0,
    input.numeroTva ?? null,
    input.regimeImposition ?? null,
    input.banqueClient ?? null,
    input.agenceBancaire ?? null,
    input.rib ?? null,
    input.notesInternes ?? null,
    input.actif !== false ? 1 : 0,
  );

  const id = result.lastInsertRowid as number;
  writeAuditLog({ action: 'create', module: 'clients', description: `Création client ${input.nom}`, userId: actorUserId });
  const detail = getClientDetail(actorUserId, id);
  dualWrite(detail, 'post', '/clients', { ...input });
  return detail;
}

export function updateClient(actorUserId: number, id: number, input: Partial<CreateClientInput>): ClientItemDetail {
  assertCanManageClients(actorUserId);
  const db = getDatabase();

  const ex = getClient(actorUserId, id);
  const v = <T>(next: T | null | undefined, cur: T): T => (next !== undefined ? (next as T) : cur);

  db.prepare(`
    UPDATE clients_facturation SET
      type = ?, civilite = ?, nom = ?, prenom = ?, raison_sociale = ?, forme_juridique = ?,
      email = ?, telephone = ?, mobile = ?, fax = ?, site_web = ?,
      adresse = ?, adresse_ligne1 = ?, adresse_ligne2 = ?,
      ville = ?, wilaya = ?, code_postal = ?, pays = ?,
      nif = ?, date_expiration_nif = ?,
      rc = ?, date_expiration_nrc = ?,
      nis = ?, ai = ?,
      date_creation_entreprise = ?, numero_agrement = ?,
      assujetti_tva = ?, numero_tva = ?, regime_imposition = ?,
      banque_client = ?, agence_bancaire = ?, rib = ?,
      notes_internes = ?, actif = ?,
      updated_at = datetime('now')
    WHERE id = ? AND deleted_at IS NULL
  `).run(
    v(input.type, ex.type),
    v(input.civilite, ex.civilite),
    v(input.nom, ex.nom),
    v(input.prenom, ex.prenom),
    v(input.raisonSociale, ex.raisonSociale),
    v(input.formeJuridique, ex.formeJuridique),
    v(input.email, ex.email),
    v(input.telephone, ex.telephone),
    v(input.mobile, ex.mobile),
    v(input.fax, ex.fax),
    v(input.siteWeb, ex.siteWeb),
    v(input.adresse, ex.adresse),
    v(input.adresseLigne1, ex.adresseLigne1),
    v(input.adresseLigne2, ex.adresseLigne2),
    v(input.ville, ex.ville),
    v(input.wilaya, ex.wilaya),
    v(input.codePostal, ex.codePostal),
    v(input.pays, ex.pays) || 'Algérie',
    v(input.nif, ex.nif),
    v(input.dateExpirationNif, ex.dateExpirationNif),
    v(input.rc, ex.rc),
    v(input.dateExpirationNrc, ex.dateExpirationNrc),
    v(input.nis, ex.nis),
    v(input.ai, ex.ai),
    v(input.dateCreationEntreprise, ex.dateCreationEntreprise),
    v(input.numeroAgrement, ex.numeroAgrement),
    input.assujettITva !== undefined ? (input.assujettITva ? 1 : 0) : (ex.assujettITva ? 1 : 0),
    v(input.numeroTva, ex.numeroTva),
    v(input.regimeImposition, ex.regimeImposition),
    v(input.banqueClient, ex.banqueClient),
    v(input.agenceBancaire, ex.agenceBancaire),
    v(input.rib, ex.rib),
    v(input.notesInternes, ex.notesInternes),
    input.actif !== undefined ? (input.actif ? 1 : 0) : (ex.actif ? 1 : 0),
    id,
  );

  writeAuditLog({ action: 'update', module: 'clients', description: `Modification client ${ex.nom}`, userId: actorUserId });
  const updated = getClientDetail(actorUserId, id);
  dualWrite(updated, 'patch', `/clients/${id}`, input);
  return updated;
}

export function toggleActifClient(actorUserId: number, id: number): ClientItemDetail {
  assertCanManageClients(actorUserId);
  const db = getDatabase();

  const ex = getClient(actorUserId, id);
  const newActif = !ex.actif;
  db.prepare(`UPDATE clients_facturation SET actif = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(newActif ? 1 : 0, id);

  writeAuditLog({
    action: 'update',
    module: 'clients',
    description: `Client ${ex.nom} ${newActif ? 'activé' : 'désactivé'}`,
    userId: actorUserId,
  });
  return getClientDetail(actorUserId, id);
}

export function deleteClient(actorUserId: number, id: number): boolean {
  assertCanManageClients(actorUserId);
  const db = getDatabase();

  const ex = getClient(actorUserId, id);

  const activeInvoices = db.prepare(
    `SELECT COUNT(*) AS cnt FROM factures WHERE client_id = ? AND deleted_at IS NULL AND statut NOT IN ('annulee')`,
  ).get(id) as { cnt: number };

  if (activeInvoices.cnt > 0) {
    throw new Error(`Ce client a ${activeInvoices.cnt} facture(s) active(s) — suppression impossible.`);
  }

  db.prepare(`UPDATE clients_facturation SET deleted_at = datetime('now') WHERE id = ?`).run(id);
  writeAuditLog({ action: 'delete', module: 'clients', description: `Suppression client ${ex.nom}`, userId: actorUserId });
  dualWrite(true, 'delete', `/clients/${id}`);
  return true;
}

// ── Contacts ──────────────────────────────────────────────────────────────────

export function listContacts(_actorUserId: number, clientId: number): ClientContact[] {
  const db = getDatabase();
  const rows = db.prepare(
    `SELECT * FROM clients_contacts WHERE client_id = ? ORDER BY principal DESC, nom ASC`,
  ).all(clientId) as DbRow[];
  return rows.map(rowToContact);
}

export function createContact(actorUserId: number, clientId: number, input: CreateContactInput): ClientContact {
  assertCanManageClients(actorUserId);
  const db = getDatabase();

  // Si principal, retirer le flag des autres contacts du même client
  if (input.principal) {
    db.prepare(`UPDATE clients_contacts SET principal = 0 WHERE client_id = ?`).run(clientId);
  }

  const result = db.prepare(`
    INSERT INTO clients_contacts (client_id, type, nom, titre, telephone, email, principal, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).run(
    clientId,
    input.type,
    input.nom,
    input.titre ?? null,
    input.telephone ?? null,
    input.email ?? null,
    input.principal ? 1 : 0,
    input.notes ?? null,
  );

  const row = db.prepare(`SELECT * FROM clients_contacts WHERE id = ?`)
    .get(result.lastInsertRowid) as DbRow;

  writeAuditLog({ action: 'create', module: 'clients', description: `Ajout contact ${input.nom}`, userId: actorUserId });
  return rowToContact(row);
}

export function updateContact(actorUserId: number, contactId: number, input: Partial<CreateContactInput>): ClientContact {
  assertCanManageClients(actorUserId);
  const db = getDatabase();

  const existing = db.prepare(`SELECT * FROM clients_contacts WHERE id = ?`).get(contactId) as DbRow | undefined;
  if (!existing) throw new Error('Contact introuvable');

  if (input.principal) {
    db.prepare(`UPDATE clients_contacts SET principal = 0 WHERE client_id = ?`).run(existing.client_id);
  }

  db.prepare(`
    UPDATE clients_contacts SET
      type = ?, nom = ?, titre = ?, telephone = ?, email = ?, principal = ?, notes = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    input.type ?? existing.type,
    input.nom ?? existing.nom,
    input.titre !== undefined ? (input.titre ?? null) : existing.titre,
    input.telephone !== undefined ? (input.telephone ?? null) : existing.telephone,
    input.email !== undefined ? (input.email ?? null) : existing.email,
    input.principal !== undefined ? (input.principal ? 1 : 0) : existing.principal,
    input.notes !== undefined ? (input.notes ?? null) : existing.notes,
    contactId,
  );

  const row = db.prepare(`SELECT * FROM clients_contacts WHERE id = ?`).get(contactId) as DbRow;
  return rowToContact(row);
}

export function deleteContact(actorUserId: number, contactId: number): boolean {
  assertCanManageClients(actorUserId);
  const db = getDatabase();

  const existing = db.prepare(`SELECT * FROM clients_contacts WHERE id = ?`).get(contactId) as DbRow | undefined;
  if (!existing) throw new Error('Contact introuvable');

  db.prepare(`DELETE FROM clients_contacts WHERE id = ?`).run(contactId);
  writeAuditLog({ action: 'delete', module: 'clients', description: `Suppression contact`, userId: actorUserId });
  return true;
}
