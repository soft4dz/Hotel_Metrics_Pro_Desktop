import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { dualWrite } from './dualWrite';
import {
  getActorContext,
  actorHasAllHotels,
  actorCanAccessHotel,
  isGlobalAdminRole,
  applyActorHotelFilter,
} from './actorContext';

export type ModePaiement = 'especes' | 'cheque' | 'virement' | 'carte' | 'effet' | 'autre';
export type EncaissementStatut = 'en_attente' | 'confirme' | 'rejete';

export interface EncaissementItem {
  id: number;
  uuid: string;
  hotelId: number;
  hotelName: string;
  dateEncaissement: string;
  montant: number;
  mode: ModePaiement;
  reference: string | null;
  description: string | null;
  statut: EncaissementStatut;
  compteBancaireId: number | null;
  compteBancaireIntitule: string | null;
  createdAt: string;
}

export interface EncaissementFilters {
  hotelId?: number;
  mode?: ModePaiement;
  statut?: EncaissementStatut;
  dateDebut?: string;
  dateFin?: string;
}

export interface CreateEncaissementInput {
  hotelId: number;
  dateEncaissement: string;
  montant: number;
  mode: ModePaiement;
  reference?: string;
  description?: string;
  statut?: EncaissementStatut;
  compteBancaireId?: number;
}

export interface CompteBancaire {
  id: number;
  hotelId: number;
  hotelName: string;
  intitule: string;
  banque: string;
  numeroCompte: string;
  soldeInitial: number;
  actif: boolean;
}

export interface CreateCompteInput {
  hotelId: number;
  intitule: string;
  banque: string;
  numeroCompte?: string;
  soldeInitial?: number;
  actif?: boolean;
}

export interface JournalCaisseEntry {
  id: number;
  hotelId: number;
  hotelName: string;
  dateOperation: string;
  libelle: string;
  entree: number;
  sortie: number;
  solde: number;
  createdAt: string;
}

export interface AddCaisseInput {
  hotelId: number;
  dateOperation: string;
  libelle: string;
  entree?: number;
  sortie?: number;
}

export interface TresorerieDashboard {
  totalEncaisseJour: number;
  totalEncaisseMois: number;
  totalEnAttente: number;
  nombreEnAttente: number;
  tauxCouverture: number;
  evolutionJours: { date: string; montant: number }[];
  parMode: { mode: ModePaiement; montant: number; count: number }[];
  parHotel: { hotelId: number; hotelName: string; encaisse: number; enAttente: number }[];
  recentEncaissements: EncaissementItem[];
}

// ── Assertion permission ──────────────────────────────────────────────────────

function assertCanManageTresorerie(actor: ReturnType<typeof getActorContext>): void {
  if (!isGlobalAdminRole(actor.roleCode)) {
    throw new Error('Permission refusée : gestion encaissements.');
  }
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export function getDashboard(actorUserId: number, hotelId?: number): TresorerieDashboard {
  const actor = getActorContext(actorUserId);
  const db = getDatabase();

  const today = new Date().toISOString().slice(0, 10);
  const firstDayMonth = `${today.slice(0, 7)}-01`;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  // Build hotel filter clause
  let hotelClause = '';
  const hotelParams: unknown[] = [];
  if (hotelId) {
    if (!actorCanAccessHotel(actor, hotelId)) throw new Error('Accès hôtel refusé.');
    hotelClause = 'AND e.hotel_id = ?';
    hotelParams.push(hotelId);
  } else if (!actorHasAllHotels(actor)) {
    if (actor.hotelIds.length === 0) hotelClause = 'AND 1=0';
    else hotelClause = `AND e.hotel_id IN (${actor.hotelIds.map(() => '?').join(',')})`;
    hotelParams.push(...actor.hotelIds);
  }

  // Total encaissé aujourd'hui
  const totalJour = (db.prepare(`
    SELECT COALESCE(SUM(montant),0) as total
    FROM encaissements e
    WHERE deleted_at IS NULL AND statut = 'confirme'
      AND date_encaissement = ? ${hotelClause}
  `).get(today, ...hotelParams) as { total: number }).total;

  // Total encaissé ce mois
  const totalMois = (db.prepare(`
    SELECT COALESCE(SUM(montant),0) as total
    FROM encaissements e
    WHERE deleted_at IS NULL AND statut = 'confirme'
      AND date_encaissement >= ? ${hotelClause}
  `).get(firstDayMonth, ...hotelParams) as { total: number }).total;

  // En attente
  const attente = db.prepare(`
    SELECT COALESCE(SUM(montant),0) as total, COUNT(*) as nb
    FROM encaissements e
    WHERE deleted_at IS NULL AND statut = 'en_attente' ${hotelClause}
  `).get(...hotelParams) as { total: number; nb: number };

  // Taux de couverture (ratio confirmé / (confirmé + en_attente) * 100)
  const totalGlobal = totalMois + attente.total;
  const tauxCouverture = totalGlobal > 0 ? Math.round((totalMois / totalGlobal) * 100) : 0;

  // Évolution 30 jours (confirmés par jour)
  const evolutionRows = db.prepare(`
    SELECT date_encaissement as date, COALESCE(SUM(montant),0) as montant
    FROM encaissements e
    WHERE deleted_at IS NULL AND statut = 'confirme'
      AND date_encaissement >= ? ${hotelClause}
    GROUP BY date_encaissement
    ORDER BY date_encaissement
  `).all(thirtyDaysAgo, ...hotelParams) as { date: string; montant: number }[];

  // Répartition par mode
  const parModeRows = db.prepare(`
    SELECT mode, COALESCE(SUM(montant),0) as montant, COUNT(*) as count
    FROM encaissements e
    WHERE deleted_at IS NULL AND statut = 'confirme'
      AND date_encaissement >= ? ${hotelClause}
    GROUP BY mode
  `).all(firstDayMonth, ...hotelParams) as { mode: ModePaiement; montant: number; count: number }[];

  // Par hôtel
  const parHotelRows = db.prepare(`
    SELECT
      e.hotel_id,
      h.name as hotel_name,
      COALESCE(SUM(CASE WHEN statut='confirme' THEN montant ELSE 0 END),0) as encaisse,
      COALESCE(SUM(CASE WHEN statut='en_attente' THEN montant ELSE 0 END),0) as en_attente
    FROM encaissements e
    INNER JOIN hotels h ON h.id = e.hotel_id
    WHERE e.deleted_at IS NULL AND date_encaissement >= ? ${hotelClause.replace(/e\.hotel_id/g, 'e.hotel_id')}
    GROUP BY e.hotel_id, h.name
    ORDER BY encaisse DESC
  `).all(firstDayMonth, ...hotelParams) as {
    hotel_id: number; hotel_name: string; encaisse: number; en_attente: number;
  }[];

  // Derniers encaissements
  const recentRows = db.prepare(`
    SELECT e.*, h.name as hotel_name,
           cb.intitule as compte_intitule
    FROM encaissements e
    INNER JOIN hotels h ON h.id = e.hotel_id
    LEFT JOIN comptes_bancaires cb ON cb.id = e.compte_bancaire_id
    WHERE e.deleted_at IS NULL ${hotelClause.replace('e.hotel_id', 'e.hotel_id')}
    ORDER BY e.date_encaissement DESC, e.id DESC
    LIMIT 10
  `).all(...hotelParams) as RawEncaissement[];

  return {
    totalEncaisseJour: totalJour,
    totalEncaisseMois: totalMois,
    totalEnAttente: attente.total,
    nombreEnAttente: attente.nb,
    tauxCouverture,
    evolutionJours: evolutionRows,
    parMode: parModeRows,
    parHotel: parHotelRows.map((r) => ({
      hotelId: r.hotel_id,
      hotelName: r.hotel_name,
      encaisse: r.encaisse,
      enAttente: r.en_attente,
    })),
    recentEncaissements: recentRows.map(mapEncaissement),
  };
}

// ── Encaissements ─────────────────────────────────────────────────────────────

interface RawEncaissement {
  id: number; uuid: string; hotel_id: number; hotel_name: string;
  date_encaissement: string; montant: number; mode: string;
  reference: string | null; description: string | null; statut: string;
  compte_bancaire_id: number | null; compte_intitule: string | null;
  created_at: string;
}

function mapEncaissement(r: RawEncaissement): EncaissementItem {
  return {
    id: r.id,
    uuid: r.uuid,
    hotelId: r.hotel_id,
    hotelName: r.hotel_name,
    dateEncaissement: r.date_encaissement,
    montant: r.montant,
    mode: r.mode as ModePaiement,
    reference: r.reference,
    description: r.description,
    statut: r.statut as EncaissementStatut,
    compteBancaireId: r.compte_bancaire_id,
    compteBancaireIntitule: r.compte_intitule,
    createdAt: r.created_at,
  };
}

export function listEncaissements(actorUserId: number, filters: EncaissementFilters): EncaissementItem[] {
  const actor = getActorContext(actorUserId);
  const db = getDatabase();

  const conditions: string[] = ['e.deleted_at IS NULL'];
  const params: unknown[] = [];

  // Hotel filter (permission-aware)
  if (filters.hotelId) {
    if (!actorCanAccessHotel(actor, filters.hotelId)) throw new Error('Accès hôtel refusé.');
    conditions.push('e.hotel_id = ?');
    params.push(filters.hotelId);
  } else if (!actorHasAllHotels(actor)) {
    if (actor.hotelIds.length === 0) return [];
    conditions.push(`e.hotel_id IN (${actor.hotelIds.map(() => '?').join(',')})`);
    params.push(...actor.hotelIds);
  }

  if (filters.mode)    { conditions.push('e.mode = ?');   params.push(filters.mode); }
  if (filters.statut)  { conditions.push('e.statut = ?'); params.push(filters.statut); }
  if (filters.dateDebut) { conditions.push('e.date_encaissement >= ?'); params.push(filters.dateDebut); }
  if (filters.dateFin)   { conditions.push('e.date_encaissement <= ?'); params.push(filters.dateFin); }

  const rows = db.prepare(`
    SELECT e.*, h.name as hotel_name, cb.intitule as compte_intitule
    FROM encaissements e
    INNER JOIN hotels h ON h.id = e.hotel_id
    LEFT JOIN comptes_bancaires cb ON cb.id = e.compte_bancaire_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY e.date_encaissement DESC, e.id DESC
    LIMIT 500
  `).all(...params) as RawEncaissement[];

  return rows.map(mapEncaissement);
}

export function createEncaissement(actorUserId: number, input: CreateEncaissementInput): EncaissementItem {
  const actor = getActorContext(actorUserId);
  if (!actorCanAccessHotel(actor, input.hotelId)) throw new Error('Accès hôtel refusé.');

  const db = getDatabase();
  const result = db.prepare(`
    INSERT INTO encaissements
      (hotel_id, date_encaissement, montant, mode, reference, description, statut, compte_bancaire_id, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.hotelId,
    input.dateEncaissement,
    input.montant,
    input.mode,
    input.reference ?? null,
    input.description ?? null,
    input.statut ?? 'en_attente',
    input.compteBancaireId ?? null,
    actorUserId,
  );

  const encId = Number(result.lastInsertRowid);
  writeAuditLog({
    userId: actorUserId,
    action: 'CREATE',
    module: 'encaissements',
    description: `Encaissement ${input.mode} de ${input.montant} DA créé (id=${encId})`,
  });
  const enc = getEncaissementById(encId);
  dualWrite(enc, 'post', '/tresorerie/encaissements', { ...input, createdBy: actorUserId });
  return enc;
}

export function updateEncaissement(
  actorUserId: number,
  id: number,
  input: Partial<CreateEncaissementInput>,
): EncaissementItem {
  const actor = getActorContext(actorUserId);
  const existing = getEncaissementById(id);
  if (!actorCanAccessHotel(actor, existing.hotelId)) throw new Error('Accès refusé.');
  if (existing.statut === 'confirme') throw new Error('Impossible de modifier un encaissement confirmé.');

  const db = getDatabase();
  const sets: string[] = ['updated_at = datetime(\'now\')'];
  const params: unknown[] = [];

  if (input.montant !== undefined)         { sets.push('montant = ?');          params.push(input.montant); }
  if (input.mode !== undefined)            { sets.push('mode = ?');             params.push(input.mode); }
  if (input.dateEncaissement !== undefined){ sets.push('date_encaissement = ?');params.push(input.dateEncaissement); }
  if (input.reference !== undefined)       { sets.push('reference = ?');        params.push(input.reference); }
  if (input.description !== undefined)     { sets.push('description = ?');      params.push(input.description); }
  if (input.compteBancaireId !== undefined){ sets.push('compte_bancaire_id = ?');params.push(input.compteBancaireId); }

  params.push(id);
  db.prepare(`UPDATE encaissements SET ${sets.join(', ')} WHERE id = ? AND deleted_at IS NULL`).run(...params);
  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'encaissements', description: `Encaissement ${id} modifié` });
  const encUpdated = getEncaissementById(id);
  dualWrite(encUpdated, 'patch', `/tresorerie/encaissements/${id}/statut`, input);
  return encUpdated;
}

export function confirmerEncaissement(actorUserId: number, id: number): EncaissementItem {
  const actor = getActorContext(actorUserId);
  assertCanManageTresorerie(actor);
  const db = getDatabase();
  db.prepare(`UPDATE encaissements SET statut='confirme', updated_at=datetime('now') WHERE id=? AND deleted_at IS NULL`).run(id);
  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'encaissements', description: `Encaissement ${id} confirmé` });
  const encConfirme = getEncaissementById(id);
  dualWrite(encConfirme, 'patch', `/tresorerie/encaissements/${id}/statut`, { statut: 'confirme' });
  return encConfirme;
}

export function rejeterEncaissement(actorUserId: number, id: number, motif: string): EncaissementItem {
  const actor = getActorContext(actorUserId);
  assertCanManageTresorerie(actor);
  const db = getDatabase();
  db.prepare(`UPDATE encaissements SET statut='rejete', description=?, updated_at=datetime('now') WHERE id=? AND deleted_at IS NULL`).run(
    motif, id,
  );
  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'encaissements', description: `Encaissement ${id} rejeté : ${motif}` });
  const encRejete = getEncaissementById(id);
  dualWrite(encRejete, 'patch', `/tresorerie/encaissements/${id}/statut`, { statut: 'rejete' });
  return encRejete;
}

export function deleteEncaissement(actorUserId: number, id: number): boolean {
  const actor = getActorContext(actorUserId);
  assertCanManageTresorerie(actor);
  const db = getDatabase();
  db.prepare(`UPDATE encaissements SET deleted_at=datetime('now') WHERE id=? AND deleted_at IS NULL`).run(id);
  writeAuditLog({ userId: actorUserId, action: 'DELETE', module: 'encaissements', description: `Encaissement ${id} supprimé` });
  dualWrite(true, 'delete', `/tresorerie/encaissements/${id}`);
  return true;
}

function getEncaissementById(id: number): EncaissementItem {
  const db = getDatabase();
  const row = db.prepare(`
    SELECT e.*, h.name as hotel_name, cb.intitule as compte_intitule
    FROM encaissements e
    INNER JOIN hotels h ON h.id = e.hotel_id
    LEFT JOIN comptes_bancaires cb ON cb.id = e.compte_bancaire_id
    WHERE e.id = ?
  `).get(id) as RawEncaissement | undefined;
  if (!row) throw new Error(`Encaissement ${id} introuvable.`);
  return mapEncaissement(row);
}

// ── Comptes bancaires ─────────────────────────────────────────────────────────

interface RawCompte {
  id: number; hotel_id: number; hotel_name: string;
  intitule: string; banque: string; numero_compte: string;
  solde_initial: number; actif: number;
}

function mapCompte(r: RawCompte): CompteBancaire {
  return {
    id: r.id,
    hotelId: r.hotel_id,
    hotelName: r.hotel_name,
    intitule: r.intitule,
    banque: r.banque,
    numeroCompte: r.numero_compte,
    soldeInitial: r.solde_initial,
    actif: r.actif === 1,
  };
}

export function listComptesBancaires(actorUserId: number, hotelId?: number): CompteBancaire[] {
  const actor = getActorContext(actorUserId);
  const db = getDatabase();

  const conditions: string[] = ['1=1'];
  const params: unknown[] = [];

  if (hotelId) {
    if (!actorCanAccessHotel(actor, hotelId)) throw new Error('Accès hôtel refusé.');
    conditions.push('cb.hotel_id = ?');
    params.push(hotelId);
  } else {
    applyActorHotelFilter(actor, conditions, params, { column: 'cb.hotel_id' });
  }

  const rows = db.prepare(`
    SELECT cb.*, h.name as hotel_name
    FROM comptes_bancaires cb
    INNER JOIN hotels h ON h.id = cb.hotel_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY h.name, cb.intitule
  `).all(...params) as RawCompte[];

  return rows.map(mapCompte);
}

export function createCompteBancaire(actorUserId: number, input: CreateCompteInput): CompteBancaire {
  const actor = getActorContext(actorUserId);
  assertCanManageTresorerie(actor);
  if (!actorCanAccessHotel(actor, input.hotelId)) throw new Error('Accès hôtel refusé.');

  const db = getDatabase();
  const result = db.prepare(`
    INSERT INTO comptes_bancaires (hotel_id, intitule, banque, numero_compte, solde_initial, actif)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(input.hotelId, input.intitule, input.banque, input.numeroCompte ?? '', input.soldeInitial ?? 0, input.actif !== false ? 1 : 0);

  const compte = getCompteById(Number(result.lastInsertRowid));
  dualWrite(compte, 'post', '/tresorerie/comptes', { ...input });
  return compte;
}

export function updateCompteBancaire(
  actorUserId: number,
  id: number,
  input: Partial<CreateCompteInput & { actif?: boolean }>,
): CompteBancaire {
  const actor = getActorContext(actorUserId);
  assertCanManageTresorerie(actor);

  const db = getDatabase();
  const sets: string[] = ['updated_at = datetime(\'now\')'];
  const params: unknown[] = [];

  if (input.intitule !== undefined)    { sets.push('intitule = ?');     params.push(input.intitule); }
  if (input.banque !== undefined)      { sets.push('banque = ?');       params.push(input.banque); }
  if (input.numeroCompte !== undefined){ sets.push('numero_compte = ?');params.push(input.numeroCompte); }
  if (input.soldeInitial !== undefined){ sets.push('solde_initial = ?');params.push(input.soldeInitial); }
  if (input.actif !== undefined)       { sets.push('actif = ?');        params.push(input.actif ? 1 : 0); }

  params.push(id);
  db.prepare(`UPDATE comptes_bancaires SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  return getCompteById(id);
}

export function deleteCompteBancaire(actorUserId: number, id: number): boolean {
  const actor = getActorContext(actorUserId);
  assertCanManageTresorerie(actor);
  const db = getDatabase();
  db.prepare(`UPDATE comptes_bancaires SET actif=0 WHERE id=?`).run(id);
  return true;
}

function getCompteById(id: number): CompteBancaire {
  const db = getDatabase();
  const row = db.prepare(`
    SELECT cb.*, h.name as hotel_name
    FROM comptes_bancaires cb INNER JOIN hotels h ON h.id = cb.hotel_id
    WHERE cb.id = ?
  `).get(id) as RawCompte | undefined;
  if (!row) throw new Error(`Compte bancaire ${id} introuvable.`);
  return mapCompte(row);
}

// ── Journal de caisse ─────────────────────────────────────────────────────────

export function getJournalCaisse(
  actorUserId: number,
  hotelId: number,
  dateDebut: string,
  dateFin: string,
): JournalCaisseEntry[] {
  const actor = getActorContext(actorUserId);
  if (!actorCanAccessHotel(actor, hotelId)) throw new Error('Accès hôtel refusé.');

  const db = getDatabase();
  const rows = db.prepare(`
    SELECT jc.*, h.name as hotel_name
    FROM journal_caisse jc
    INNER JOIN hotels h ON h.id = jc.hotel_id
    WHERE jc.hotel_id = ? AND jc.date_operation BETWEEN ? AND ?
      AND jc.deleted_at IS NULL
    ORDER BY jc.date_operation, jc.id
  `).all(hotelId, dateDebut, dateFin) as {
    id: number; hotel_id: number; hotel_name: string; date_operation: string;
    libelle: string; entree: number; sortie: number; created_at: string;
  }[];

  // Calculate running balance
  let solde = 0;
  return rows.map((r) => {
    solde = solde + r.entree - r.sortie;
    return {
      id: r.id,
      hotelId: r.hotel_id,
      hotelName: r.hotel_name,
      dateOperation: r.date_operation,
      libelle: r.libelle,
      entree: r.entree,
      sortie: r.sortie,
      solde,
      createdAt: r.created_at,
    };
  });
}

export function addOperationCaisse(actorUserId: number, input: AddCaisseInput): JournalCaisseEntry {
  const actor = getActorContext(actorUserId);
  if (!actorCanAccessHotel(actor, input.hotelId)) throw new Error('Accès hôtel refusé.');

  const db = getDatabase();
  const result = db.prepare(`
    INSERT INTO journal_caisse (hotel_id, date_operation, libelle, entree, sortie, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    input.hotelId,
    input.dateOperation,
    input.libelle,
    input.entree ?? 0,
    input.sortie ?? 0,
    actorUserId,
  );

  writeAuditLog({
    userId: actorUserId, action: 'CREATE', module: 'encaissements',
    description: `Opération caisse : ${input.libelle}`,
  });

  const entries = getJournalCaisse(actorUserId, input.hotelId, input.dateOperation, input.dateOperation);
  const entry = entries.find((e) => e.id === Number(result.lastInsertRowid)) ?? entries[entries.length - 1];
  dualWrite(entry, 'post', '/tresorerie/journal', {
    hotelId: input.hotelId,
    dateOperation: input.dateOperation,
    libelle: input.libelle,
    entree: input.entree ?? 0,
    sortie: input.sortie ?? 0,
  });
  return entry;
}

export function deleteOperationCaisse(actorUserId: number, id: number): boolean {
  const actor = getActorContext(actorUserId);
  assertCanManageTresorerie(actor);
  const db = getDatabase();
  db.prepare(`UPDATE journal_caisse SET deleted_at=datetime('now') WHERE id=?`).run(id);
  return true;
}
