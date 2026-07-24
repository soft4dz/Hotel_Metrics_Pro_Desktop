import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { createMouvement } from './stocks.service';
import { registerTvaAchatFromBonLivraison } from './fiscalite-avancee.service';
import { createWorkflow, submitWorkflow, findWorkflow } from './workflow.service';

export interface Fournisseur { id: number; uuid: string; code: string; raisonSociale: string; contactNom: string | null; email: string | null; telephone: string | null; adresse: string | null; rc: string | null; nif: string | null; nis: string | null; isActive: boolean; createdAt: string }
export interface BonCommande { id: number; uuid: string; numero: string; hotelId: number; fournisseurId: number; fournisseurNom: string; statut: string; dateCommande: string; dateLivraisonPrevue: string | null; dateLivraisonEffective: string | null; montantHt: number; montantTva: number; montantTtc: number; notes: string | null; creePar: number | null; validePar: number | null; valideAt: string | null; createdAt: string }
export interface BonCommandeLigne { id: number; bonId: number; produitId: number | null; designation: string; quantite: number; prixUnitaire: number; tvaPct: number; montantHt: number; qteRecue: number }
export interface CreateFournisseurInput { code: string; raisonSociale: string; contactNom?: string; email?: string; telephone?: string; adresse?: string; rc?: string; nif?: string; nis?: string }
export interface CreateBonInput { hotelId: number; fournisseurId: number; dateCommande?: string; dateLivraisonPrevue?: string; notes?: string; lignes: { produitId?: number; designation: string; quantite: number; prixUnitaire: number; tvaPct?: number }[] }
export interface LivrerBonInput { lignes?: { ligneId: number; qteRecue: number }[] }

export interface LivrerBonResult {
  bon: BonCommande;
  lignes: BonCommandeLigne[];
  mouvementsStock: number[];
  tvaAchatIds: number[];
}

function nextNumero(db: ReturnType<typeof getDatabase>): string {
  const year = new Date().getFullYear();
  const last = db.prepare(`SELECT COUNT(*) AS n FROM bons_commande WHERE strftime('%Y',date_commande) = ?`).get(String(year)) as { n: number };
  return `BC-${year}-${String(last.n + 1).padStart(4,'0')}`;
}

function mapBon(r: Record<string, unknown>): BonCommande {
  return {
    id: r.id as number,
    uuid: r.uuid as string,
    numero: r.numero as string,
    hotelId: r.hotel_id as number,
    fournisseurId: r.fournisseur_id as number,
    fournisseurNom: (r.fournisseur_nom as string) ?? '',
    statut: r.statut as string,
    dateCommande: r.date_commande as string,
    dateLivraisonPrevue: r.date_livraison_prevue as string | null,
    dateLivraisonEffective: (r.date_livraison_effective as string | null) ?? null,
    montantHt: r.montant_ht as number,
    montantTva: r.montant_tva as number,
    montantTtc: r.montant_ttc as number,
    notes: r.notes as string | null,
    creePar: r.cree_par as number | null,
    validePar: r.valide_par as number | null,
    valideAt: r.valide_at as string | null,
    createdAt: r.created_at as string,
  };
}

function mapLigne(r: Record<string, unknown>): BonCommandeLigne {
  return {
    id: r.id as number,
    bonId: r.bon_id as number,
    produitId: r.produit_id as number | null,
    designation: r.designation as string,
    quantite: Number(r.quantite),
    prixUnitaire: Number(r.prix_unitaire),
    tvaPct: Number(r.tva_pct),
    montantHt: Number(r.montant_ht),
    qteRecue: Number(r.qte_recue ?? 0),
  };
}

function getBonRow(id: number): Record<string, unknown> {
  const row = getDatabase().prepare(`
    SELECT bc.*, f.raison_sociale AS fournisseur_nom, f.nif AS fournisseur_nif
    FROM bons_commande bc
    JOIN fournisseurs f ON f.id = bc.fournisseur_id
    WHERE bc.id = ?
  `).get(id) as Record<string, unknown> | undefined;
  if (!row) throw new Error('Bon de commande introuvable.');
  return row;
}

export function listFournisseurs(): Fournisseur[] {
  const rows = getDatabase().prepare(`SELECT * FROM fournisseurs WHERE is_active = 1 ORDER BY raison_sociale`).all() as Record<string, unknown>[];
  return rows.map(r => ({ id: r.id as number, uuid: r.uuid as string, code: r.code as string, raisonSociale: r.raison_sociale as string, contactNom: r.contact_nom as string | null, email: r.email as string | null, telephone: r.telephone as string | null, adresse: r.adresse as string | null, rc: r.rc as string | null, nif: r.nif as string | null, nis: r.nis as string | null, isActive: Boolean(r.is_active), createdAt: r.created_at as string }));
}

export function createFournisseur(input: CreateFournisseurInput): Fournisseur {
  const db = getDatabase();
  const res = db.prepare(`INSERT INTO fournisseurs (code,raison_sociale,contact_nom,email,telephone,adresse,rc,nif,nis) VALUES (?,?,?,?,?,?,?,?,?) RETURNING id`)
    .get(input.code, input.raisonSociale, input.contactNom ?? null, input.email ?? null, input.telephone ?? null, input.adresse ?? null, input.rc ?? null, input.nif ?? null, input.nis ?? null) as { id: number };
  return listFournisseurs().find(f => f.id === res.id)!;
}

export function listBonsCommande(hotelId?: number, statut?: string): BonCommande[] {
  const db = getDatabase();
  const where: string[] = [];
  const params: unknown[] = [];
  if (hotelId) { where.push('bc.hotel_id = ?'); params.push(hotelId); }
  if (statut) { where.push('bc.statut = ?'); params.push(statut); }
  const rows = db.prepare(`SELECT bc.*, f.raison_sociale AS fournisseur_nom FROM bons_commande bc JOIN fournisseurs f ON f.id = bc.fournisseur_id ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY bc.date_commande DESC`).all(...params) as Record<string, unknown>[];
  return rows.map(mapBon);
}

export function getBonLignes(bonId: number): BonCommandeLigne[] {
  const rows = getDatabase().prepare(`SELECT * FROM bons_commande_lignes WHERE bon_id = ? ORDER BY id`).all(bonId) as Record<string, unknown>[];
  return rows.map(mapLigne);
}

export function createBon(actorId: number, input: CreateBonInput): BonCommande {
  const db = getDatabase();
  const numero = nextNumero(db);
  let totalHt = 0; let totalTva = 0;
  for (const l of input.lignes) { const ht = l.quantite * l.prixUnitaire; totalHt += ht; totalTva += ht * ((l.tvaPct ?? 19) / 100); }
  const totalTtc = totalHt + totalTva;
  const res = db.prepare(`INSERT INTO bons_commande (numero,hotel_id,fournisseur_id,date_commande,date_livraison_prevue,montant_ht,montant_tva,montant_ttc,notes,cree_par) VALUES (?,?,?,?,?,?,?,?,?,?) RETURNING id`)
    .get(numero, input.hotelId, input.fournisseurId, input.dateCommande ?? new Date().toISOString().slice(0,10), input.dateLivraisonPrevue ?? null, totalHt, totalTva, totalTtc, input.notes ?? null, actorId) as { id: number };
  for (const l of input.lignes) {
    const ht = l.quantite * l.prixUnitaire;
    db.prepare(`INSERT INTO bons_commande_lignes (bon_id,produit_id,designation,quantite,prix_unitaire,tva_pct,montant_ht) VALUES (?,?,?,?,?,?,?)`)
      .run(res.id, l.produitId ?? null, l.designation, l.quantite, l.prixUnitaire, l.tvaPct ?? 19, ht);
  }
  writeAuditLog({ userId: actorId, action: 'CREATE', module: 'achats', description: `Bon de commande ${numero}` });
  return listBonsCommande(input.hotelId).find(b => b.id === res.id)!;
}

export function validerBon(actorId: number, id: number): BonCommande {
  const db = getDatabase();
  const bon = getBonRow(id);
  if (bon.statut !== 'brouillon') throw new Error('Seul un bon brouillon peut être validé.');

  const seuilRow = db.prepare(`SELECT value FROM app_settings WHERE key='workflow_seuil_achat_ttc'`).get() as { value: string } | undefined;
  const seuil = Number(seuilRow?.value ?? 200000);
  const montantTtc = Number(bon.montant_ttc);
  if (montantTtc > seuil) {
    let wf = findWorkflow('achats', 'bon_commande', id);
    if (!wf) {
      wf = createWorkflow(actorId, {
        module: 'achats',
        entityType: 'bon_commande',
        entityId: id,
        hotelId: bon.hotel_id as number,
        commentaire: `Validation BC ${bon.numero} — montant ${montantTtc} DA`,
      });
      wf = submitWorkflow(actorId, wf.id);
    }
    if (!['valide', 'valide_dec', 'cloture'].includes(wf.statut)) {
      throw new Error('Ce bon d\'achat nécessite une approbation workflow (montant > seuil).');
    }
  }

  db.prepare(`UPDATE bons_commande SET statut = 'valide', valide_par = ?, valide_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`).run(actorId, id);
  writeAuditLog({ userId: actorId, action: 'UPDATE', module: 'achats', description: `Validation BC ${bon.numero}` });
  return listBonsCommande().find(b => b.id === id)!;
}

export function envoyerBon(actorId: number, id: number): BonCommande {
  const bon = getBonRow(id);
  if (bon.statut !== 'valide') throw new Error('Seul un bon validé peut être envoyé au fournisseur.');
  getDatabase().prepare(`UPDATE bons_commande SET statut = 'envoye', updated_at = datetime('now') WHERE id = ?`).run(id);
  writeAuditLog({ userId: actorId, action: 'UPDATE', module: 'achats', description: `Envoi BC ${bon.numero} au fournisseur` });
  return listBonsCommande().find(b => b.id === id)!;
}

export function livrerBon(actorId: number, id: number, input?: LivrerBonInput): LivrerBonResult {
  const db = getDatabase();
  const bonRow = getBonRow(id);
  const statut = String(bonRow.statut);
  if (!['valide', 'envoye', 'recu_partiel'].includes(statut)) {
    throw new Error('Réception impossible pour ce statut de bon.');
  }

  const lignes = getBonLignes(id);
  const updates = input?.lignes?.length
    ? input.lignes
    : lignes.filter((l) => l.qteRecue < l.quantite).map((l) => ({ ligneId: l.id, qteRecue: l.quantite - l.qteRecue }));

  if (!updates.length) throw new Error('Aucune quantité à recevoir.');

  const mouvementsStock: number[] = [];
  const tvaAchatIds: number[] = [];
  const today = new Date().toISOString().slice(0, 10);
  let totalHtRecu = 0;
  let totalTvaRecu = 0;

  const run = db.transaction(() => {
    for (const upd of updates) {
      const ligne = lignes.find((l) => l.id === upd.ligneId);
      if (!ligne) throw new Error(`Ligne ${upd.ligneId} introuvable.`);
      const reste = ligne.quantite - ligne.qteRecue;
      if (upd.qteRecue <= 0 || upd.qteRecue > reste) {
        throw new Error(`Quantité invalide pour la ligne « ${ligne.designation} ».`);
      }
      const newQteRecue = ligne.qteRecue + upd.qteRecue;
      db.prepare(`UPDATE bons_commande_lignes SET qte_recue = ? WHERE id = ?`).run(newQteRecue, ligne.id);
      ligne.qteRecue = newQteRecue;

      const htLigne = upd.qteRecue * ligne.prixUnitaire;
      const tvaLigne = htLigne * (ligne.tvaPct / 100);
      totalHtRecu += htLigne;
      totalTvaRecu += tvaLigne;

      if (ligne.produitId) {
        const mv = createMouvement(actorId, {
          hotelId: bonRow.hotel_id as number,
          produitId: ligne.produitId,
          typeMouvement: 'entree',
          quantite: upd.qteRecue,
          prixUnitaire: ligne.prixUnitaire,
          reference: String(bonRow.numero),
          motif: `Réception BC ${bonRow.numero}`,
          dateMouvement: today,
        });
        mouvementsStock.push(mv.id);
      }
    }

    const refreshed = getBonLignes(id);
    const allRecu = refreshed.every((l) => l.qteRecue >= l.quantite);
    const newStatut = allRecu ? 'recu' : 'recu_partiel';
    db.prepare(`
      UPDATE bons_commande
      SET statut = ?, date_livraison_effective = COALESCE(date_livraison_effective, ?), updated_at = datetime('now')
      WHERE id = ?
    `).run(newStatut, today, id);

    if (totalHtRecu > 0) {
      const tvaRow = registerTvaAchatFromBonLivraison(actorId, {
        bonId: id,
        numeroPiece: String(bonRow.numero),
        dateOperation: today,
        fournisseurNom: String(bonRow.fournisseur_nom),
        nifFournisseur: bonRow.fournisseur_nif ? String(bonRow.fournisseur_nif) : undefined,
        baseHt: Math.round(totalHtRecu * 100) / 100,
        montantTva: Math.round(totalTvaRecu * 100) / 100,
        montantTtc: Math.round((totalHtRecu + totalTvaRecu) * 100) / 100,
        hotelId: bonRow.hotel_id as number,
      });
      tvaAchatIds.push(tvaRow.id);
    }
  });

  run();

  writeAuditLog({
    userId: actorId,
    action: 'UPDATE',
    module: 'achats',
    description: `Réception BC ${bonRow.numero} — ${updates.length} ligne(s), stock ${mouvementsStock.length}, TVA ${tvaAchatIds.length}`,
  });

  return {
    bon: listBonsCommande().find((b) => b.id === id)!,
    lignes: getBonLignes(id),
    mouvementsStock,
    tvaAchatIds,
  };
}
