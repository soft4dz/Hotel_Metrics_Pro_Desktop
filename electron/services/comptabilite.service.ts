import { randomUUID, createHash } from 'node:crypto';
import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import {
  getActorContext,
  isGlobalAdminRole,
} from './actorContext';

export type EcritureStatut = 'brouillon' | 'valide';
export type ExerciceStatut = 'ouvert' | 'ferme';

export interface Compte {
  id: number;
  numero: string;
  libelle: string;
  classe: number;
  typeSolde: 'debit' | 'credit';
  actif: boolean;
}

export interface Journal {
  id: number;
  code: string;
  libelle: string;
  type: string;
  actif: boolean;
}

export interface ExerciceComptable {
  id: number;
  code: string;
  libelle: string;
  dateDebut: string;
  dateFin: string;
  statut: ExerciceStatut;
  closedAt: string | null;
}

export interface LigneEcritureInput {
  compteNumero: string;
  libelle?: string;
  debit?: number;
  credit?: number;
  hotelId?: number;
}

export interface CreateEcritureInput {
  journalCode: string;
  dateEcriture: string;
  libelle: string;
  piece?: string;
  hotelId?: number;
  lignes: LigneEcritureInput[];
  sourceModule?: string;
  sourceRef?: string;
}

export interface EcritureListItem {
  id: number;
  uuid: string;
  journalCode: string;
  journalLibelle: string;
  dateEcriture: string;
  piece: string | null;
  libelle: string;
  statut: EcritureStatut;
  totalDebit: number;
  totalCredit: number;
  hotelId: number | null;
}

export interface EcritureDetail extends EcritureListItem {
  lignes: {
    id: number;
    compteNumero: string;
    compteLibelle: string;
    libelle: string | null;
    debit: number;
    credit: number;
    hotelId: number | null;
  }[];
}

export interface GrandLivreLigne {
  compteNumero: string;
  compteLibelle: string;
  dateEcriture: string;
  piece: string | null;
  libelle: string;
  debit: number;
  credit: number;
  solde: number;
}

export interface BalanceLigne {
  compteNumero: string;
  compteLibelle: string;
  classe: number;
  totalDebit: number;
  totalCredit: number;
  solde: number;
}

export interface EcritureFilters {
  exerciceId?: number;
  journalCode?: string;
  dateDebut?: string;
  dateFin?: string;
  statut?: EcritureStatut;
  hotelId?: number;
}

export const COMPTES_SCF = {
  CLIENTS: '411000',
  FOURNISSEURS: '401000',
  TVA_COLLECTEE: '445710',
  TVA_DEDUCTIBLE: '445660',
  STOCKS: '311000',
  ACHATS_CONSOMMES: '601000',
  CA_HEBERGEMENT: '707100',
  CA_RESTAURATION: '706100',
  BANQUE: '512000',
  CAISSE: '530000',
  SALAIRES: '641000',
  CNAS_PATRON: '645100',
} as const;

function assertCanComptabilite(actorUserId: number) {
  const actor = getActorContext(actorUserId);
  if (!isGlobalAdminRole(actor.roleCode)) {
    throw new Error('Permission refusée. Rôle administrateur requis pour la comptabilité.');
  }
  return actor;
}

function getCompteByNumero(numero: string): Compte {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM comptes WHERE numero = ? AND actif = 1').get(numero) as Record<string, unknown> | undefined;
  if (!row) throw new Error(`Compte ${numero} introuvable ou inactif.`);
  return mapCompte(row);
}

function getJournalByCode(code: string): Journal {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM journaux WHERE code = ? AND actif = 1').get(code) as Record<string, unknown> | undefined;
  if (!row) throw new Error(`Journal ${code} introuvable.`);
  return mapJournal(row);
}

export function getExerciceOuvert(): ExerciceComptable {
  const db = getDatabase();
  const row = db.prepare(`SELECT * FROM exercices_comptables WHERE statut = 'ouvert' ORDER BY date_debut DESC LIMIT 1`).get() as Record<string, unknown> | undefined;
  if (!row) throw new Error('Aucun exercice comptable ouvert.');
  return mapExercice(row);
}

function mapCompte(row: Record<string, unknown>): Compte {
  return {
    id: Number(row.id),
    numero: String(row.numero),
    libelle: String(row.libelle),
    classe: Number(row.classe),
    typeSolde: row.type_solde as 'debit' | 'credit',
    actif: Boolean(row.actif),
  };
}

function mapJournal(row: Record<string, unknown>): Journal {
  return {
    id: Number(row.id),
    code: String(row.code),
    libelle: String(row.libelle),
    type: String(row.type),
    actif: Boolean(row.actif),
  };
}

function mapExercice(row: Record<string, unknown>): ExerciceComptable {
  return {
    id: Number(row.id),
    code: String(row.code),
    libelle: String(row.libelle),
    dateDebut: String(row.date_debut),
    dateFin: String(row.date_fin),
    statut: row.statut as ExerciceStatut,
    closedAt: row.closed_at ? String(row.closed_at) : null,
  };
}

function assertEquilibre(lignes: LigneEcritureInput[]): { totalDebit: number; totalCredit: number } {
  let totalDebit = 0;
  let totalCredit = 0;
  for (const l of lignes) {
    totalDebit += l.debit ?? 0;
    totalCredit += l.credit ?? 0;
  }
  const d = Math.round(totalDebit * 100) / 100;
  const c = Math.round(totalCredit * 100) / 100;
  if (Math.abs(d - c) > 0.01) throw new Error(`Écriture déséquilibrée : débit ${d} ≠ crédit ${c}.`);
  if (d === 0) throw new Error('Écriture vide.');
  return { totalDebit: d, totalCredit: c };
}

export function listComptes(_actorUserId: number, classe?: number): Compte[] {
  const db = getDatabase();
  const conds = ['actif = 1'];
  const params: unknown[] = [];
  if (classe) { conds.push('classe = ?'); params.push(classe); }
  return (db.prepare(`SELECT * FROM comptes WHERE ${conds.join(' AND ')} ORDER BY numero`).all(...params) as Record<string, unknown>[]).map(mapCompte);
}

export function listJournaux(_actorUserId: number): Journal[] {
  const db = getDatabase();
  return (db.prepare('SELECT * FROM journaux WHERE actif = 1 ORDER BY code').all() as Record<string, unknown>[]).map(mapJournal);
}

export function listExercices(_actorUserId: number): ExerciceComptable[] {
  const db = getDatabase();
  return (db.prepare('SELECT * FROM exercices_comptables ORDER BY date_debut DESC').all() as Record<string, unknown>[]).map(mapExercice);
}

export function createExercice(actorUserId: number, input: { code: string; libelle: string; dateDebut: string; dateFin: string }): ExerciceComptable {
  assertCanComptabilite(actorUserId);
  const db = getDatabase();
  const r = db.prepare(`INSERT INTO exercices_comptables (code, libelle, date_debut, date_fin, statut) VALUES (?, ?, ?, ?, 'ouvert')`).run(input.code, input.libelle, input.dateDebut, input.dateFin);
  writeAuditLog({ userId: actorUserId, action: 'CREATE', module: 'comptabilite', description: `Exercice ${input.code} créé` });
  return mapExercice(db.prepare('SELECT * FROM exercices_comptables WHERE id = ?').get(Number(r.lastInsertRowid)) as Record<string, unknown>);
}

export function creerEcriture(actorUserId: number, input: CreateEcritureInput, autoValider = false): EcritureDetail {
  assertCanComptabilite(actorUserId);
  assertEquilibre(input.lignes);
  const exercice = getExerciceOuvert();
  const journal = getJournalByCode(input.journalCode);
  if (input.dateEcriture < exercice.dateDebut || input.dateEcriture > exercice.dateFin) {
    throw new Error(`Date hors exercice ${exercice.code}.`);
  }

  const db = getDatabase();
  const ecritureId = db.transaction(() => {
    const r = db.prepare(`
      INSERT INTO ecritures_comptables (uuid, journal_id, exercice_id, date_ecriture, piece, libelle, statut, source_module, source_ref, hotel_id, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(randomUUID(), journal.id, exercice.id, input.dateEcriture, input.piece ?? null, input.libelle, autoValider ? 'valide' : 'brouillon', input.sourceModule ?? null, input.sourceRef ?? null, input.hotelId ?? null, actorUserId);
    const id = Number(r.lastInsertRowid);
    const stmt = db.prepare(`INSERT INTO lignes_ecriture (ecriture_id, compte_id, libelle, debit, credit, hotel_id, ordre) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    input.lignes.forEach((l, i) => {
      const compte = getCompteByNumero(l.compteNumero);
      stmt.run(id, compte.id, l.libelle ?? null, l.debit ?? 0, l.credit ?? 0, l.hotelId ?? input.hotelId ?? null, i);
    });
    if (autoValider) db.prepare(`UPDATE ecritures_comptables SET validated_by=?, validated_at=datetime('now') WHERE id=?`).run(actorUserId, id);
    return id;
  })();

  writeAuditLog({ userId: actorUserId, action: 'CREATE', module: 'comptabilite', description: `Écriture ${input.journalCode} ${input.libelle}` });
  return getEcritureDetail(actorUserId, ecritureId);
}

export function validerEcriture(actorUserId: number, id: number): EcritureDetail {
  assertCanComptabilite(actorUserId);
  const db = getDatabase();
  const row = db.prepare('SELECT statut FROM ecritures_comptables WHERE id = ?').get(id) as { statut: string } | undefined;
  if (!row) throw new Error(`Écriture ${id} introuvable.`);
  if (row.statut === 'valide') throw new Error('Écriture déjà validée.');
  db.prepare(`UPDATE ecritures_comptables SET statut='valide', validated_by=?, validated_at=datetime('now'), updated_at=datetime('now') WHERE id=?`).run(actorUserId, id);
  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'comptabilite', description: `Écriture ${id} validée` });
  return getEcritureDetail(actorUserId, id);
}

function mapEcritureRow(row: Record<string, unknown>): EcritureListItem {
  return {
    id: Number(row.id),
    uuid: String(row.uuid),
    journalCode: String(row.journal_code ?? ''),
    journalLibelle: String(row.journal_libelle ?? ''),
    dateEcriture: String(row.date_ecriture),
    piece: row.piece ? String(row.piece) : null,
    libelle: String(row.libelle),
    statut: row.statut as EcritureStatut,
    totalDebit: Number(row.total_debit ?? 0),
    totalCredit: Number(row.total_credit ?? 0),
    hotelId: row.hotel_id ? Number(row.hotel_id) : null,
  };
}

export function listEcritures(actorUserId: number, filters: EcritureFilters = {}): EcritureListItem[] {
  assertCanComptabilite(actorUserId);
  const db = getDatabase();
  const conds = ['1=1'];
  const params: unknown[] = [];
  if (filters.exerciceId) { conds.push('e.exercice_id = ?'); params.push(filters.exerciceId); }
  if (filters.journalCode) { conds.push('j.code = ?'); params.push(filters.journalCode); }
  if (filters.dateDebut) { conds.push('e.date_ecriture >= ?'); params.push(filters.dateDebut); }
  if (filters.dateFin) { conds.push('e.date_ecriture <= ?'); params.push(filters.dateFin); }
  if (filters.statut) { conds.push('e.statut = ?'); params.push(filters.statut); }
  if (filters.hotelId) { conds.push('e.hotel_id = ?'); params.push(filters.hotelId); }

  return (db.prepare(`
    SELECT e.*, j.code as journal_code, j.libelle as journal_libelle,
           COALESCE(SUM(l.debit), 0) as total_debit, COALESCE(SUM(l.credit), 0) as total_credit
    FROM ecritures_comptables e
    INNER JOIN journaux j ON j.id = e.journal_id
    LEFT JOIN lignes_ecriture l ON l.ecriture_id = e.id
    WHERE ${conds.join(' AND ')}
    GROUP BY e.id ORDER BY e.date_ecriture DESC, e.id DESC LIMIT 500
  `).all(...params) as Record<string, unknown>[]).map(mapEcritureRow);
}

export function getEcritureDetail(actorUserId: number, id: number): EcritureDetail {
  assertCanComptabilite(actorUserId);
  const db = getDatabase();
  const row = db.prepare(`
    SELECT e.*, j.code as journal_code, j.libelle as journal_libelle,
           COALESCE(SUM(l.debit), 0) as total_debit, COALESCE(SUM(l.credit), 0) as total_credit
    FROM ecritures_comptables e INNER JOIN journaux j ON j.id = e.journal_id
    LEFT JOIN lignes_ecriture l ON l.ecriture_id = e.id WHERE e.id = ? GROUP BY e.id
  `).get(id) as Record<string, unknown> | undefined;
  if (!row) throw new Error(`Écriture ${id} introuvable.`);

  const lignes = (db.prepare(`
    SELECT l.*, c.numero as compte_numero, c.libelle as compte_libelle
    FROM lignes_ecriture l INNER JOIN comptes c ON c.id = l.compte_id
    WHERE l.ecriture_id = ? ORDER BY l.ordre, l.id
  `).all(id) as Record<string, unknown>[]).map((l) => ({
    id: Number(l.id),
    compteNumero: String(l.compte_numero),
    compteLibelle: String(l.compte_libelle),
    libelle: l.libelle ? String(l.libelle) : null,
    debit: Number(l.debit),
    credit: Number(l.credit),
    hotelId: l.hotel_id ? Number(l.hotel_id) : null,
  }));

  return { ...mapEcritureRow(row), lignes };
}

export function getGrandLivre(actorUserId: number, compteNumero: string, dateDebut?: string, dateFin?: string): GrandLivreLigne[] {
  assertCanComptabilite(actorUserId);
  const compte = getCompteByNumero(compteNumero);
  const db = getDatabase();
  const conds = ['e.statut = ?', 'l.compte_id = ?'];
  const params: unknown[] = ['valide', compte.id];
  if (dateDebut) { conds.push('e.date_ecriture >= ?'); params.push(dateDebut); }
  if (dateFin) { conds.push('e.date_ecriture <= ?'); params.push(dateFin); }

  const rows = db.prepare(`
    SELECT e.date_ecriture, e.piece, e.libelle, l.debit, l.credit
    FROM lignes_ecriture l INNER JOIN ecritures_comptables e ON e.id = l.ecriture_id
    WHERE ${conds.join(' AND ')} ORDER BY e.date_ecriture, e.id, l.ordre
  `).all(...params) as { date_ecriture: string; piece: string | null; libelle: string; debit: number; credit: number }[];

  let solde = 0;
  return rows.map((r) => {
    solde += r.debit - r.credit;
    return { compteNumero: compte.numero, compteLibelle: compte.libelle, dateEcriture: r.date_ecriture, piece: r.piece, libelle: r.libelle, debit: r.debit, credit: r.credit, solde: Math.round(solde * 100) / 100 };
  });
}

export function getBalanceGenerale(actorUserId: number, exerciceId?: number, dateDebut?: string, dateFin?: string): BalanceLigne[] {
  assertCanComptabilite(actorUserId);
  const db = getDatabase();
  const exercice = exerciceId
    ? mapExercice(db.prepare('SELECT * FROM exercices_comptables WHERE id = ?').get(exerciceId) as Record<string, unknown>)
    : getExerciceOuvert();
  const conds = ['e.statut = ?', 'e.exercice_id = ?'];
  const params: unknown[] = ['valide', exercice.id];
  if (dateDebut) { conds.push('e.date_ecriture >= ?'); params.push(dateDebut); }
  if (dateFin) { conds.push('e.date_ecriture <= ?'); params.push(dateFin); }

  return (db.prepare(`
    SELECT c.numero as compte_numero, c.libelle as compte_libelle, c.classe,
           COALESCE(SUM(l.debit), 0) as total_debit, COALESCE(SUM(l.credit), 0) as total_credit
    FROM lignes_ecriture l INNER JOIN ecritures_comptables e ON e.id = l.ecriture_id INNER JOIN comptes c ON c.id = l.compte_id
    WHERE ${conds.join(' AND ')} GROUP BY c.id HAVING total_debit > 0 OR total_credit > 0 ORDER BY c.numero
  `).all(...params) as { compte_numero: string; compte_libelle: string; classe: number; total_debit: number; total_credit: number }[]).map((r) => ({
    compteNumero: r.compte_numero,
    compteLibelle: r.compte_libelle,
    classe: r.classe,
    totalDebit: r.total_debit,
    totalCredit: r.total_credit,
    solde: Math.round((r.total_debit - r.total_credit) * 100) / 100,
  }));
}

export function cloturerExercice(actorUserId: number, exerciceId: number): ExerciceComptable {
  assertCanComptabilite(actorUserId);
  const db = getDatabase();
  const ex = db.prepare('SELECT * FROM exercices_comptables WHERE id = ?').get(exerciceId) as Record<string, unknown> | undefined;
  if (!ex) throw new Error('Exercice introuvable.');
  if (ex.statut === 'ferme') throw new Error('Exercice déjà fermé.');
  const brouillons = db.prepare(`SELECT COUNT(*) as c FROM ecritures_comptables WHERE exercice_id = ? AND statut = 'brouillon'`).get(exerciceId) as { c: number };
  if (brouillons.c > 0) throw new Error(`${brouillons.c} écriture(s) en brouillon — validez avant clôture.`);
  db.prepare(`UPDATE exercices_comptables SET statut='ferme', closed_at=datetime('now'), closed_by=? WHERE id=?`).run(actorUserId, exerciceId);
  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'comptabilite', description: `Exercice ${ex.code} clôturé` });
  return mapExercice(db.prepare('SELECT * FROM exercices_comptables WHERE id = ?').get(exerciceId) as Record<string, unknown>);
}

export interface FactureEcritureInput {
  factureId: number;
  numero: string;
  dateEmission: string;
  clientNom: string;
  montantHt: number;
  montantTva: number;
  montantTtc: number;
  hotelId: number;
  typeDocument: 'facture' | 'avoir';
}

export function genererEcritureFacture(actorUserId: number, input: FactureEcritureInput): EcritureDetail | null {
  try {
    const isAvoir = input.typeDocument === 'avoir';
    const lignes: LigneEcritureInput[] = isAvoir
      ? [
          { compteNumero: COMPTES_SCF.CLIENTS, debit: 0, credit: input.montantTtc, hotelId: input.hotelId },
          { compteNumero: COMPTES_SCF.CA_HEBERGEMENT, debit: input.montantHt, credit: 0, hotelId: input.hotelId },
          { compteNumero: COMPTES_SCF.TVA_COLLECTEE, debit: input.montantTva, credit: 0, hotelId: input.hotelId },
        ]
      : [
          { compteNumero: COMPTES_SCF.CLIENTS, debit: input.montantTtc, credit: 0, hotelId: input.hotelId },
          { compteNumero: COMPTES_SCF.CA_HEBERGEMENT, debit: 0, credit: input.montantHt, hotelId: input.hotelId },
          { compteNumero: COMPTES_SCF.TVA_COLLECTEE, debit: 0, credit: input.montantTva, hotelId: input.hotelId },
        ];
    return creerEcriture(actorUserId, {
      journalCode: 'VE', dateEcriture: input.dateEmission,
      libelle: isAvoir ? `Avoir ${input.numero} — ${input.clientNom}` : `Facture ${input.numero} — ${input.clientNom}`,
      piece: input.numero, hotelId: input.hotelId, sourceModule: 'facturation', sourceRef: String(input.factureId), lignes,
    }, true);
  } catch (err) {
    writeAuditLog({ userId: actorUserId, action: 'ERROR', module: 'comptabilite', description: `Échec écriture facture ${input.numero}: ${err instanceof Error ? err.message : String(err)}` });
    return null;
  }
}

export interface EncaissementEcritureInput {
  encaissementId: number;
  dateEncaissement: string;
  montant: number;
  mode: string;
  reference: string | null;
  hotelId: number;
}

export function genererEcritureEncaissement(actorUserId: number, input: EncaissementEcritureInput): EcritureDetail | null {
  try {
    const journalCode = input.mode === 'especes' ? 'CA' : 'BQ';
    const compteTresorerie = input.mode === 'especes' ? COMPTES_SCF.CAISSE : COMPTES_SCF.BANQUE;
    return creerEcriture(actorUserId, {
      journalCode, dateEcriture: input.dateEncaissement,
      libelle: input.reference ? `Encaissement ${input.mode} — ${input.reference}` : `Encaissement ${input.mode} #${input.encaissementId}`,
      piece: input.reference ?? String(input.encaissementId), hotelId: input.hotelId, sourceModule: 'tresorerie', sourceRef: String(input.encaissementId),
      lignes: [
        { compteNumero: compteTresorerie, debit: input.montant, credit: 0, hotelId: input.hotelId },
        { compteNumero: COMPTES_SCF.CLIENTS, debit: 0, credit: input.montant, hotelId: input.hotelId },
      ],
    }, true);
  } catch (err) {
    writeAuditLog({ userId: actorUserId, action: 'ERROR', module: 'comptabilite', description: `Échec écriture encaissement #${input.encaissementId}: ${err instanceof Error ? err.message : String(err)}` });
    return null;
  }
}

export function hashDocument(payload: string): string {
  return createHash('sha256').update(payload).digest('hex');
}

export interface StockVariationEcritureInput {
  mouvementId: number;
  hotelId: number;
  typeMouvement: string;
  montant: number;
  reference: string | null;
  motif: string | null;
  dateMouvement: string;
}

/** Écriture auto variation stock SCF — OD consommation ou entrée achat. */
export function genererEcritureVariationStock(actorUserId: number, input: StockVariationEcritureInput): EcritureDetail | null {
  if (input.montant <= 0) return null;
  try {
    const isEntree = input.typeMouvement === 'entree';
    const fromReception = (input.motif ?? '').includes('Réception BC');
    const montant = Math.round(input.montant * 100) / 100;
    const piece = input.reference ?? `MVT-${input.mouvementId}`;
    const libelle = input.motif ?? `Mouvement stock ${input.typeMouvement}`;

    let journalCode = 'OD';
    let lignes: LigneEcritureInput[];

    if (isEntree && fromReception) {
      journalCode = 'AC';
      lignes = [
        { compteNumero: COMPTES_SCF.STOCKS, debit: montant, credit: 0, hotelId: input.hotelId },
        { compteNumero: COMPTES_SCF.FOURNISSEURS, debit: 0, credit: montant, hotelId: input.hotelId },
      ];
    } else if (isEntree) {
      lignes = [
        { compteNumero: COMPTES_SCF.STOCKS, debit: montant, credit: 0, hotelId: input.hotelId },
        { compteNumero: COMPTES_SCF.ACHATS_CONSOMMES, debit: 0, credit: montant, hotelId: input.hotelId },
      ];
    } else {
      lignes = [
        { compteNumero: COMPTES_SCF.ACHATS_CONSOMMES, debit: montant, credit: 0, hotelId: input.hotelId },
        { compteNumero: COMPTES_SCF.STOCKS, debit: 0, credit: montant, hotelId: input.hotelId },
      ];
    }

    return creerEcriture(actorUserId, {
      journalCode,
      dateEcriture: input.dateMouvement,
      libelle,
      piece,
      hotelId: input.hotelId,
      sourceModule: 'stocks',
      sourceRef: String(input.mouvementId),
      lignes,
    }, true);
  } catch (err) {
    writeAuditLog({
      userId: actorUserId,
      action: 'ERROR',
      module: 'comptabilite',
      description: `Échec écriture stock #${input.mouvementId}: ${err instanceof Error ? err.message : String(err)}`,
    });
    return null;
  }
}

export interface VenteRestaurationEcritureInput {
  ticketId: number;
  hotelId: number;
  dateTicket: string;
  numero: string;
  totalTtc: number;
  totalHt: number;
  tvaMontant: number;
  modePaiement: string;
}

/** Écriture vente restauration POS — CA 706100 + TVA + trésorerie. */
export function genererEcritureVenteRestauration(actorUserId: number, input: VenteRestaurationEcritureInput): EcritureDetail | null {
  if (input.totalTtc <= 0) return null;
  try {
    const journalCode = input.modePaiement === 'especes' ? 'CA' : 'BQ';
    const compteTresorerie = input.modePaiement === 'especes' ? COMPTES_SCF.CAISSE : COMPTES_SCF.BANQUE;
    const ht = Math.round(input.totalHt * 100) / 100;
    const tva = Math.round(input.tvaMontant * 100) / 100;
    const ttc = Math.round(input.totalTtc * 100) / 100;
    const lignes: LigneEcritureInput[] = [
      { compteNumero: compteTresorerie, debit: ttc, credit: 0, hotelId: input.hotelId },
      { compteNumero: COMPTES_SCF.CA_RESTAURATION, debit: 0, credit: ht, hotelId: input.hotelId },
    ];
    if (tva > 0) {
      lignes.push({ compteNumero: COMPTES_SCF.TVA_COLLECTEE, debit: 0, credit: tva, hotelId: input.hotelId });
    }
    return creerEcriture(actorUserId, {
      journalCode,
      dateEcriture: input.dateTicket,
      libelle: `Vente POS ${input.numero}`,
      piece: input.numero,
      hotelId: input.hotelId,
      sourceModule: 'pos',
      sourceRef: String(input.ticketId),
      lignes,
    }, true);
  } catch (err) {
    writeAuditLog({
      userId: actorUserId,
      action: 'ERROR',
      module: 'comptabilite',
      description: `Échec écriture POS #${input.ticketId}: ${err instanceof Error ? err.message : String(err)}`,
    });
    return null;
  }
}
