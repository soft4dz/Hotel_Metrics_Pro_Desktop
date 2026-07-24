import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { getActorContext, isGlobalAdminRole } from './actorContext';
import { csvLine } from './rh-legal-export.util';

function assertCanFiscalite(actorUserId: number) {
  const actor = getActorContext(actorUserId);
  if (!isGlobalAdminRole(actor.roleCode)) throw new Error('Permission refusée pour la fiscalité.');
  return actor;
}

export interface RegistreTvaVente {
  id: number;
  factureId: number | null;
  dateOperation: string;
  periode: string;
  numeroPiece: string;
  clientNom: string | null;
  nifClient: string | null;
  baseHt: number;
  tauxTva: number;
  montantTva: number;
  montantTtc: number;
  typeMouvement: 'vente' | 'avoir';
  hotelId: number | null;
}

export interface DeclarationTva {
  id: number;
  periode: string;
  baseHtVentes: number;
  tvaCollectee: number;
  tvaDeductible: number;
  creditAnterieur: number;
  solde: number;
  statut: 'brouillon' | 'calculee' | 'declaree' | 'payee';
}

export interface RetenueSource {
  id: number;
  fournisseurNom: string;
  nifFournisseur: string | null;
  baseHt: number;
  taux: number;
  montantRetenu: number;
  dateRetenue: string;
  reference: string | null;
  hotelId: number | null;
}

export interface LiasseLigne {
  id: number;
  exercice: number;
  codeG50: string;
  libelle: string;
  montant: number;
}

export interface CreateRetenueInput {
  fournisseurNom: string;
  nifFournisseur?: string;
  baseHt: number;
  taux?: number;
  dateRetenue: string;
  reference?: string;
  hotelId?: number;
}

export function enregistrerTvaVente(
  actorUserId: number,
  input: {
    factureId: number;
    dateOperation: string;
    numeroPiece: string;
    clientNom: string;
    nifClient: string | null;
    baseHt: number;
    montantTva: number;
    montantTtc: number;
    tauxTva?: number;
    typeMouvement?: 'vente' | 'avoir';
    hotelId: number;
  },
): void {
  const db = getDatabase();
  const periode = input.dateOperation.slice(0, 7);
  db.prepare(`
    INSERT INTO registre_tva_ventes
      (facture_id, date_operation, periode, numero_piece, client_nom, nif_client, base_ht, taux_tva, montant_tva, montant_ttc, type_mouvement, hotel_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.factureId, input.dateOperation, periode, input.numeroPiece, input.clientNom, input.nifClient,
    input.baseHt, input.tauxTva ?? 19, input.montantTva, input.montantTtc, input.typeMouvement ?? 'vente', input.hotelId,
  );
  writeAuditLog({ userId: actorUserId, action: 'CREATE', module: 'fiscalite', description: `Registre TVA vente ${input.numeroPiece}` });
}

export function genererRegistreTvaMensuel(actorUserId: number, periode: string): RegistreTvaVente[] {
  assertCanFiscalite(actorUserId);
  return listRegistreTvaVentes(actorUserId, periode);
}

export function listRegistreTvaVentes(actorUserId: number, periode?: string): RegistreTvaVente[] {
  assertCanFiscalite(actorUserId);
  const db = getDatabase();
  const conds = ['1=1'];
  const params: unknown[] = [];
  if (periode) { conds.push('periode = ?'); params.push(periode); }
  return (db.prepare(`SELECT * FROM registre_tva_ventes WHERE ${conds.join(' AND ')} ORDER BY date_operation, id`).all(...params) as Record<string, unknown>[]).map(mapRegistreVente);
}

function mapRegistreVente(row: Record<string, unknown>): RegistreTvaVente {
  return {
    id: Number(row.id),
    factureId: row.facture_id ? Number(row.facture_id) : null,
    dateOperation: String(row.date_operation),
    periode: String(row.periode),
    numeroPiece: String(row.numero_piece),
    clientNom: row.client_nom ? String(row.client_nom) : null,
    nifClient: row.nif_client ? String(row.nif_client) : null,
    baseHt: Number(row.base_ht),
    tauxTva: Number(row.taux_tva),
    montantTva: Number(row.montant_tva),
    montantTtc: Number(row.montant_ttc),
    typeMouvement: row.type_mouvement as 'vente' | 'avoir',
    hotelId: row.hotel_id ? Number(row.hotel_id) : null,
  };
}

export function calculerDeclarationTva(actorUserId: number, periode: string): DeclarationTva {
  assertCanFiscalite(actorUserId);
  const db = getDatabase();

  const ventes = db.prepare(`
    SELECT COALESCE(SUM(CASE WHEN type_mouvement='vente' THEN base_ht ELSE -base_ht END), 0) as base_ht,
           COALESCE(SUM(CASE WHEN type_mouvement='vente' THEN montant_tva ELSE -montant_tva END), 0) as tva_col
    FROM registre_tva_ventes WHERE periode = ?
  `).get(periode) as { base_ht: number; tva_col: number };

  const achats = db.prepare(`
    SELECT COALESCE(SUM(montant_tva), 0) as tva_ded FROM registre_tva_achats WHERE periode = ?
  `).get(periode) as { tva_ded: number };

  const prev = db.prepare(`
    SELECT solde FROM declarations_tva WHERE periode < ? AND statut IN ('calculee','declaree','payee') ORDER BY periode DESC LIMIT 1
  `).get(periode) as { solde: number } | undefined;

  const creditAnterieur = prev && prev.solde < 0 ? Math.abs(prev.solde) : 0;
  const tvaCollectee = ventes.tva_col ?? 0;
  const tvaDeductible = achats.tva_ded ?? 0;
  const solde = Math.round((tvaCollectee - tvaDeductible - creditAnterieur) * 100) / 100;

  db.prepare(`
    INSERT INTO declarations_tva (periode, base_ht_ventes, tva_collectee, tva_deductible, credit_anterieur, solde, statut, calculated_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'calculee', datetime('now'), datetime('now'))
    ON CONFLICT(periode) DO UPDATE SET
      base_ht_ventes=excluded.base_ht_ventes, tva_collectee=excluded.tva_collectee,
      tva_deductible=excluded.tva_deductible, credit_anterieur=excluded.credit_anterieur,
      solde=excluded.solde, statut='calculee', calculated_at=datetime('now'), updated_at=datetime('now')
  `).run(periode, ventes.base_ht ?? 0, tvaCollectee, tvaDeductible, creditAnterieur, solde);

  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'fiscalite', description: `Déclaration TVA ${periode} calculée — solde ${solde}` });
  return getDeclarationTva(actorUserId, periode)!;
}

export function getDeclarationTva(actorUserId: number, periode: string): DeclarationTva | null {
  assertCanFiscalite(actorUserId);
  const row = getDatabase().prepare('SELECT * FROM declarations_tva WHERE periode = ?').get(periode) as Record<string, unknown> | undefined;
  if (!row) return null;
  return mapDeclaration(row);
}

export function listDeclarationsTva(actorUserId: number): DeclarationTva[] {
  assertCanFiscalite(actorUserId);
  return (getDatabase().prepare('SELECT * FROM declarations_tva ORDER BY periode DESC').all() as Record<string, unknown>[]).map(mapDeclaration);
}

function mapDeclaration(row: Record<string, unknown>): DeclarationTva {
  return {
    id: Number(row.id),
    periode: String(row.periode),
    baseHtVentes: Number(row.base_ht_ventes),
    tvaCollectee: Number(row.tva_collectee),
    tvaDeductible: Number(row.tva_deductible),
    creditAnterieur: Number(row.credit_anterieur),
    solde: Number(row.solde),
    statut: row.statut as DeclarationTva['statut'],
  };
}

export function enregistrerRetenueSource(actorUserId: number, input: CreateRetenueInput): RetenueSource {
  assertCanFiscalite(actorUserId);
  const taux = input.taux ?? 15;
  const montantRetenu = Math.round(input.baseHt * taux) / 100;
  const r = getDatabase().prepare(`
    INSERT INTO retenues_source (fournisseur_nom, nif_fournisseur, base_ht, taux, montant_retenu, date_retenue, reference, hotel_id, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(input.fournisseurNom, input.nifFournisseur ?? null, input.baseHt, taux, montantRetenu, input.dateRetenue, input.reference ?? null, input.hotelId ?? null, actorUserId);
  writeAuditLog({ userId: actorUserId, action: 'CREATE', module: 'fiscalite', description: `Retenue source ${montantRetenu} DA — ${input.fournisseurNom}` });
  return mapRetenue(getDatabase().prepare('SELECT * FROM retenues_source WHERE id = ?').get(Number(r.lastInsertRowid)) as Record<string, unknown>);
}

export function listRetenuesSource(actorUserId: number): RetenueSource[] {
  assertCanFiscalite(actorUserId);
  return (getDatabase().prepare('SELECT * FROM retenues_source ORDER BY date_retenue DESC').all() as Record<string, unknown>[]).map(mapRetenue);
}

function mapRetenue(row: Record<string, unknown>): RetenueSource {
  return {
    id: Number(row.id),
    fournisseurNom: String(row.fournisseur_nom),
    nifFournisseur: row.nif_fournisseur ? String(row.nif_fournisseur) : null,
    baseHt: Number(row.base_ht),
    taux: Number(row.taux),
    montantRetenu: Number(row.montant_retenu),
    dateRetenue: String(row.date_retenue),
    reference: row.reference ? String(row.reference) : null,
    hotelId: row.hotel_id ? Number(row.hotel_id) : null,
  };
}

export function genererLiasseFiscale(actorUserId: number, exercice: number): LiasseLigne[] {
  assertCanFiscalite(actorUserId);
  const db = getDatabase();

  const ca = db.prepare(`
    SELECT COALESCE(SUM(CASE WHEN type_mouvement='vente' THEN base_ht ELSE -base_ht END), 0) as ht
    FROM registre_tva_ventes WHERE periode LIKE ?
  `).get(`${exercice}-%`) as { ht: number };

  const tvaCol = db.prepare(`
    SELECT COALESCE(SUM(CASE WHEN type_mouvement='vente' THEN montant_tva ELSE -montant_tva END), 0) as tva
    FROM registre_tva_ventes WHERE periode LIKE ?
  `).get(`${exercice}-%`) as { tva: number };

  const lignes = [
    { code: 'G50-001', libelle: 'Chiffre d\'affaires HT', montant: ca.ht ?? 0 },
    { code: 'G50-010', libelle: 'TVA collectée', montant: tvaCol.tva ?? 0 },
    { code: 'G29-001', libelle: 'Résultat comptable (simplifié)', montant: (ca.ht ?? 0) * 0.15 },
  ];

  for (const l of lignes) {
    db.prepare(`
      INSERT INTO liasse_fiscale_lignes (exercice, code_g50, libelle, montant, source)
      VALUES (?, ?, ?, ?, 'auto')
      ON CONFLICT(exercice, code_g50) DO UPDATE SET montant=excluded.montant, source='auto'
    `).run(exercice, l.code, l.libelle, Math.round(l.montant * 100) / 100);
  }

  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'fiscalite', description: `Liasse fiscale ${exercice} générée` });
  return listLiasseFiscale(actorUserId, exercice);
}

export function listLiasseFiscale(actorUserId: number, exercice: number): LiasseLigne[] {
  assertCanFiscalite(actorUserId);
  return (getDatabase().prepare('SELECT * FROM liasse_fiscale_lignes WHERE exercice = ? ORDER BY code_g50').all(exercice) as Record<string, unknown>[]).map((r) => ({
    id: Number(r.id),
    exercice: Number(r.exercice),
    codeG50: String(r.code_g50),
    libelle: String(r.libelle),
    montant: Number(r.montant),
  }));
}

export function exportLiasseCsv(actorUserId: number, exercice: number): string {
  assertCanFiscalite(actorUserId);
  const lignes = listLiasseFiscale(actorUserId, exercice);
  const lines = [csvLine(['Exercice', 'Code G50', 'Libellé', 'Montant']), ...lignes.map((l) => csvLine([exercice, l.codeG50, l.libelle, l.montant.toFixed(2)]))];
  writeAuditLog({ userId: actorUserId, action: 'EXPORT', module: 'fiscalite', description: `Export liasse fiscale ${exercice}` });
  return lines.join('\n');
}

export function exportRegistreTvaCsv(actorUserId: number, periode: string): string {
  assertCanFiscalite(actorUserId);
  const rows = listRegistreTvaVentes(actorUserId, periode);
  const lines = [
    csvLine(['Période', 'Date', 'N° pièce', 'Client', 'NIF', 'Base HT', 'TVA', 'TTC', 'Type']),
    ...rows.map((r) => csvLine([r.periode, r.dateOperation, r.numeroPiece, r.clientNom ?? '', r.nifClient ?? '', r.baseHt.toFixed(2), r.montantTva.toFixed(2), r.montantTtc.toFixed(2), r.typeMouvement])),
  ];
  writeAuditLog({ userId: actorUserId, action: 'EXPORT', module: 'fiscalite', description: `Export registre TVA ${periode}` });
  return lines.join('\n');
}
