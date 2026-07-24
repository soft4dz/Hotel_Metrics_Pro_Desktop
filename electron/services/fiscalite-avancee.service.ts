/**
 * Fiscalité avancée DGI — TVA achats, liasse G50 étendue, télédéclarations.
 */
import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { getActorContext, isGlobalAdminRole } from './actorContext';
import { csvLine } from './rh-legal-export.util';
import { calculerDeclarationTva, listLiasseFiscale, type LiasseLigne } from './fiscalite-dz.service';

function assertCanFiscalite(actorUserId: number) {
  const actor = getActorContext(actorUserId);
  if (!isGlobalAdminRole(actor.roleCode)) throw new Error('Permission refusée pour la fiscalité.');
  return actor;
}

export interface RegistreTvaAchat {
  id: number;
  achatRef: string | null;
  achatRefId: number | null;
  dateOperation: string;
  periode: string;
  numeroPiece: string;
  fournisseurNom: string | null;
  nifFournisseur: string | null;
  baseHt: number;
  tauxTva: number;
  montantTva: number;
  montantTtc: number;
  source: string;
  hotelId: number | null;
}

export interface CreateTvaAchatInput {
  dateOperation: string;
  numeroPiece: string;
  fournisseurNom: string;
  nifFournisseur?: string;
  baseHt: number;
  tauxTva?: number;
  montantTva?: number;
  montantTtc?: number;
  hotelId?: number;
}

export type TeledeclarationType = 'tva' | 'liasse' | 'retenue';
export type TeledeclarationStatut = 'brouillon' | 'exportee' | 'declaree' | 'payee';

export interface Teledeclaration {
  id: number;
  typeDecl: TeledeclarationType;
  periode: string;
  referenceDgi: string | null;
  statut: TeledeclarationStatut;
  montantDeclare: number | null;
  dateExport: string | null;
  dateDeclaration: string | null;
}

function mapAchat(row: Record<string, unknown>): RegistreTvaAchat {
  return {
    id: Number(row.id),
    achatRef: row.achat_ref ? String(row.achat_ref) : null,
    achatRefId: row.achat_ref_id ? Number(row.achat_ref_id) : null,
    dateOperation: String(row.date_operation),
    periode: String(row.periode),
    numeroPiece: String(row.numero_piece),
    fournisseurNom: row.fournisseur_nom ? String(row.fournisseur_nom) : null,
    nifFournisseur: row.nif_fournisseur ? String(row.nif_fournisseur) : null,
    baseHt: Number(row.base_ht),
    tauxTva: Number(row.taux_tva),
    montantTva: Number(row.montant_tva),
    montantTtc: Number(row.montant_ttc),
    source: String(row.source ?? 'manuel'),
    hotelId: row.hotel_id ? Number(row.hotel_id) : null,
  };
}

export function listRegistreTvaAchats(actorUserId: number, periode?: string): RegistreTvaAchat[] {
  assertCanFiscalite(actorUserId);
  const conds = ['1=1'];
  const params: unknown[] = [];
  if (periode) { conds.push('periode = ?'); params.push(periode); }
  return (getDatabase().prepare(`SELECT * FROM registre_tva_achats WHERE ${conds.join(' AND ')} ORDER BY date_operation, id`).all(...params) as Record<string, unknown>[]).map(mapAchat);
}

export function createRegistreTvaAchat(actorUserId: number, input: CreateTvaAchatInput): RegistreTvaAchat {
  assertCanFiscalite(actorUserId);
  const taux = input.tauxTva ?? 19;
  const montantTva = input.montantTva ?? Math.round(input.baseHt * taux) / 100;
  const montantTtc = input.montantTtc ?? Math.round((input.baseHt + montantTva) * 100) / 100;
  const periode = input.dateOperation.slice(0, 7);
  const r = getDatabase().prepare(`
    INSERT INTO registre_tva_achats (date_operation, periode, numero_piece, fournisseur_nom, nif_fournisseur, base_ht, taux_tva, montant_tva, montant_ttc, hotel_id, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'manuel')
  `).run(input.dateOperation, periode, input.numeroPiece, input.fournisseurNom, input.nifFournisseur ?? null, input.baseHt, taux, montantTva, montantTtc, input.hotelId ?? null);
  writeAuditLog({ userId: actorUserId, action: 'CREATE', module: 'fiscalite', description: `Registre TVA achat ${input.numeroPiece}` });
  return mapAchat(getDatabase().prepare('SELECT * FROM registre_tva_achats WHERE id = ?').get(Number(r.lastInsertRowid)) as Record<string, unknown>);
}

export interface BonLivraisonTvaInput {
  bonId: number;
  numeroPiece: string;
  dateOperation: string;
  fournisseurNom: string;
  nifFournisseur?: string;
  baseHt: number;
  montantTva: number;
  montantTtc: number;
  hotelId?: number;
}

/** Alimentation TVA achats depuis réception BC (sans rôle fiscalité strict). */
export function registerTvaAchatFromBonLivraison(actorUserId: number, input: BonLivraisonTvaInput): RegistreTvaAchat {
  const periode = input.dateOperation.slice(0, 7);
  const taux = input.baseHt > 0 ? Math.round((input.montantTva / input.baseHt) * 10000) / 100 : 19;
  const r = getDatabase().prepare(`
    INSERT INTO registre_tva_achats (achat_ref, achat_ref_id, date_operation, periode, numero_piece, fournisseur_nom, nif_fournisseur, base_ht, taux_tva, montant_tva, montant_ttc, hotel_id, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'achats')
  `).run(
    input.numeroPiece,
    input.bonId,
    input.dateOperation,
    periode,
    input.numeroPiece,
    input.fournisseurNom,
    input.nifFournisseur ?? null,
    input.baseHt,
    taux,
    input.montantTva,
    input.montantTtc,
    input.hotelId ?? null,
  );
  writeAuditLog({ userId: actorUserId, action: 'CREATE', module: 'fiscalite', description: `TVA achat réception BC ${input.numeroPiece}` });
  return mapAchat(getDatabase().prepare('SELECT * FROM registre_tva_achats WHERE id = ?').get(Number(r.lastInsertRowid)) as Record<string, unknown>);
}

export function importTvaAchatsFromBons(actorUserId: number, periode: string): { imported: number; skipped: number } {
  assertCanFiscalite(actorUserId);
  const db = getDatabase();
  const bons = db.prepare(`
    SELECT bc.id, bc.numero, bc.date_commande, bc.montant_ht, bc.montant_tva, bc.montant_ttc, bc.hotel_id,
           f.raison_sociale as fournisseur_nom, f.nif as nif_fournisseur
    FROM bons_commande bc
    JOIN fournisseurs f ON f.id = bc.fournisseur_id
    WHERE bc.statut = 'valide'
      AND strftime('%Y-%m', bc.date_commande) = ?
      AND NOT EXISTS (SELECT 1 FROM registre_tva_achats r WHERE r.achat_ref_id = bc.id)
  `).all(periode) as Record<string, unknown>[];

  let imported = 0;
  for (const b of bons) {
    db.prepare(`
      INSERT INTO registre_tva_achats (achat_ref, achat_ref_id, date_operation, periode, numero_piece, fournisseur_nom, nif_fournisseur, base_ht, taux_tva, montant_tva, montant_ttc, hotel_id, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 19, ?, ?, ?, 'achats')
    `).run(
      String(b.numero), Number(b.id), String(b.date_commande), periode, String(b.numero),
      String(b.fournisseur_nom), b.nif_fournisseur ?? null,
      Number(b.montant_ht), Number(b.montant_tva), Number(b.montant_ttc), b.hotel_id ?? null,
    );
    imported += 1;
  }
  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'fiscalite', description: `Import TVA achats ${periode} — ${imported} bon(s)` });
  return { imported, skipped: 0 };
}

export function exportRegistreTvaAchatsCsv(actorUserId: number, periode: string): string {
  assertCanFiscalite(actorUserId);
  const rows = listRegistreTvaAchats(actorUserId, periode);
  const lines = [
    csvLine(['Période', 'Date', 'N° pièce', 'Fournisseur', 'NIF', 'Base HT', 'TVA', 'TTC', 'Source']),
    ...rows.map((r) => csvLine([r.periode, r.dateOperation, r.numeroPiece, r.fournisseurNom ?? '', r.nifFournisseur ?? '', r.baseHt.toFixed(2), r.montantTva.toFixed(2), r.montantTtc.toFixed(2), r.source])),
  ];
  writeAuditLog({ userId: actorUserId, action: 'EXPORT', module: 'fiscalite', description: `Export registre TVA achats ${periode}` });
  return lines.join('\n');
}

export function genererLiasseFiscaleAvancee(actorUserId: number, exercice: number): LiasseLigne[] {
  assertCanFiscalite(actorUserId);
  const db = getDatabase();

  const ca = db.prepare(`
    SELECT COALESCE(SUM(CASE WHEN type_mouvement='vente' THEN base_ht ELSE -base_ht END), 0) as ht
    FROM registre_tva_ventes WHERE periode LIKE ?
  `).get(`${exercice}-%`) as { ht: number };

  const achats = db.prepare(`
    SELECT COALESCE(SUM(base_ht), 0) as ht, COALESCE(SUM(montant_tva), 0) as tva
    FROM registre_tva_achats WHERE periode LIKE ?
  `).get(`${exercice}-%`) as { ht: number; tva: number };

  const tvaCol = db.prepare(`
    SELECT COALESCE(SUM(CASE WHEN type_mouvement='vente' THEN montant_tva ELSE -montant_tva END), 0) as tva
    FROM registre_tva_ventes WHERE periode LIKE ?
  `).get(`${exercice}-%`) as { tva: number };

  const creditTva = db.prepare(`
    SELECT COALESCE(SUM(CASE WHEN solde < 0 THEN ABS(solde) ELSE 0 END), 0) as credit
    FROM declarations_tva WHERE periode LIKE ?
  `).get(`${exercice}-%`) as { credit: number };

  const resultatComptable = (ca.ht ?? 0) - (achats.ht ?? 0);
  const resultatFiscal = resultatComptable;
  const ibsEstime = Math.max(0, resultatFiscal * 0.26);

  const lignes = [
    { code: 'G50-001', libelle: 'Chiffre d\'affaires HT', montant: ca.ht ?? 0 },
    { code: 'G50-002', libelle: 'Achats et charges HT', montant: achats.ht ?? 0 },
    { code: 'G50-010', libelle: 'TVA collectée', montant: tvaCol.tva ?? 0 },
    { code: 'G50-011', libelle: 'TVA déductible', montant: achats.tva ?? 0 },
    { code: 'G50-012', libelle: 'Crédit de TVA antérieur', montant: creditTva.credit ?? 0 },
    { code: 'G50-013', libelle: 'Solde TVA à payer', montant: Math.max(0, (tvaCol.tva ?? 0) - (achats.tva ?? 0) - (creditTva.credit ?? 0)) },
    { code: 'G4-001', libelle: 'Résultat fiscal (simplifié)', montant: resultatFiscal },
    { code: 'G29-001', libelle: 'Résultat comptable', montant: resultatComptable },
    { code: 'G29-002', libelle: 'Impôt sur les bénéfices estimé (IBS 26%)', montant: ibsEstime },
  ];

  for (const l of lignes) {
    db.prepare(`
      INSERT INTO liasse_fiscale_lignes (exercice, code_g50, libelle, montant, source)
      VALUES (?, ?, ?, ?, 'auto_avance')
      ON CONFLICT(exercice, code_g50) DO UPDATE SET montant=excluded.montant, source='auto_avance'
    `).run(exercice, l.code, l.libelle, Math.round(l.montant * 100) / 100);
  }

  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'fiscalite', description: `Liasse fiscale avancée ${exercice} générée (${lignes.length} lignes G50/G4/G29)` });
  return listLiasseFiscale(actorUserId, exercice);
}

export function exportDeclarationTvaG50(actorUserId: number, periode: string): string {
  assertCanFiscalite(actorUserId);
  const decl = calculerDeclarationTva(actorUserId, periode);
  const lines = [
    csvLine(['Champ G50', 'Valeur', 'Période']),
    csvLine(['BASE_HT_VENTES', decl.baseHtVentes.toFixed(2), periode]),
    csvLine(['TVA_COLLECTEE', decl.tvaCollectee.toFixed(2), periode]),
    csvLine(['TVA_DEDUCTIBLE', decl.tvaDeductible.toFixed(2), periode]),
    csvLine(['CREDIT_ANTERIEUR', decl.creditAnterieur.toFixed(2), periode]),
    csvLine(['SOLDE_A_PAYER', decl.solde.toFixed(2), periode]),
  ];
  const payload = lines.join('\n');
  const db = getDatabase();
  const existing = db.prepare(`SELECT id FROM fiscalite_teledeclarations WHERE type_decl='tva' AND periode=?`).get(periode) as { id: number } | undefined;
  if (existing) {
    db.prepare(`
      UPDATE fiscalite_teledeclarations SET statut='exportee', montant_declare=?, export_payload=?, date_export=datetime('now'), updated_at=datetime('now') WHERE id=?
    `).run(decl.solde, payload, existing.id);
  } else {
    db.prepare(`
      INSERT INTO fiscalite_teledeclarations (type_decl, periode, statut, montant_declare, export_payload, date_export, created_by, updated_at)
      VALUES ('tva', ?, 'exportee', ?, ?, datetime('now'), ?, datetime('now'))
    `).run(periode, decl.solde, payload, actorUserId);
  }
  writeAuditLog({ userId: actorUserId, action: 'EXPORT', module: 'fiscalite', description: `Export télédéclaration TVA G50 ${periode}` });
  return payload;
}

export function listTeledeclarations(actorUserId: number, typeDecl?: TeledeclarationType): Teledeclaration[] {
  assertCanFiscalite(actorUserId);
  const conds = ['1=1'];
  const params: unknown[] = [];
  if (typeDecl) { conds.push('type_decl = ?'); params.push(typeDecl); }
  return (getDatabase().prepare(`SELECT * FROM fiscalite_teledeclarations WHERE ${conds.join(' AND ')} ORDER BY periode DESC, id DESC`).all(...params) as Record<string, unknown>[]).map(mapTeledecl);
}

function mapTeledecl(row: Record<string, unknown>): Teledeclaration {
  return {
    id: Number(row.id),
    typeDecl: row.type_decl as TeledeclarationType,
    periode: String(row.periode),
    referenceDgi: row.reference_dgi ? String(row.reference_dgi) : null,
    statut: row.statut as TeledeclarationStatut,
    montantDeclare: row.montant_declare != null ? Number(row.montant_declare) : null,
    dateExport: row.date_export ? String(row.date_export) : null,
    dateDeclaration: row.date_declaration ? String(row.date_declaration) : null,
  };
}

export function marquerTeledeclarationDeclaree(
  actorUserId: number,
  id: number,
  referenceDgi: string,
): Teledeclaration {
  assertCanFiscalite(actorUserId);
  const db = getDatabase();
  db.prepare(`
    UPDATE fiscalite_teledeclarations SET statut='declaree', reference_dgi=?, date_declaration=datetime('now'), updated_at=datetime('now') WHERE id=?
  `).run(referenceDgi, id);
  const row = db.prepare('SELECT * FROM fiscalite_teledeclarations WHERE id = ?').get(id) as Record<string, unknown>;
  if (!row) throw new Error('Télédéclaration introuvable.');
  if (row.type_decl === 'tva') {
    db.prepare(`UPDATE declarations_tva SET statut='declaree', updated_at=datetime('now') WHERE periode=?`).run(row.periode);
  }
  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'fiscalite', description: `Télédéclaration ${row.type_decl} ${row.periode} marquée déclarée — ref ${referenceDgi}` });
  return mapTeledecl(row);
}
