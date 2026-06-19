import { getDatabase } from '../database/sqlite';

export interface Fournisseur { id: number; uuid: string; code: string; raisonSociale: string; contactNom: string | null; email: string | null; telephone: string | null; adresse: string | null; rc: string | null; nif: string | null; nis: string | null; isActive: boolean; createdAt: string }
export interface BonCommande { id: number; uuid: string; numero: string; hotelId: number; fournisseurId: number; fournisseurNom: string; statut: string; dateCommande: string; dateLivraisonPrevue: string | null; montantHt: number; montantTva: number; montantTtc: number; notes: string | null; creePar: number | null; validePar: number | null; valideAt: string | null; createdAt: string }
export interface BonCommandeLigne { id: number; bonId: number; produitId: number | null; designation: string; quantite: number; prixUnitaire: number; tvaPct: number; montantHt: number; qteRecue: number }
export interface CreateFournisseurInput { code: string; raisonSociale: string; contactNom?: string; email?: string; telephone?: string; adresse?: string; rc?: string; nif?: string; nis?: string }
export interface CreateBonInput { hotelId: number; fournisseurId: number; dateCommande?: string; dateLivraisonPrevue?: string; notes?: string; lignes: { produitId?: number; designation: string; quantite: number; prixUnitaire: number; tvaPct?: number }[] }

function nextNumero(db: ReturnType<typeof getDatabase>): string {
  const year = new Date().getFullYear();
  const last = db.prepare(`SELECT COUNT(*) AS n FROM bons_commande WHERE strftime('%Y',date_commande) = ?`).get(String(year)) as { n: number };
  return `BC-${year}-${String(last.n + 1).padStart(4,'0')}`;
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
  return rows.map(r => ({ id: r.id as number, uuid: r.uuid as string, numero: r.numero as string, hotelId: r.hotel_id as number, fournisseurId: r.fournisseur_id as number, fournisseurNom: r.fournisseur_nom as string, statut: r.statut as string, dateCommande: r.date_commande as string, dateLivraisonPrevue: r.date_livraison_prevue as string | null, montantHt: r.montant_ht as number, montantTva: r.montant_tva as number, montantTtc: r.montant_ttc as number, notes: r.notes as string | null, creePar: r.cree_par as number | null, validePar: r.valide_par as number | null, valideAt: r.valide_at as string | null, createdAt: r.created_at as string }));
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
  return listBonsCommande(input.hotelId).find(b => b.id === res.id)!;
}

export function validerBon(actorId: number, id: number): BonCommande {
  getDatabase().prepare(`UPDATE bons_commande SET statut = 'valide', valide_par = ?, valide_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`).run(actorId, id);
  return listBonsCommande().find(b => b.id === id)!;
}
