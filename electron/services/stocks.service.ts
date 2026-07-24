import { getDatabase } from '../database/sqlite';
import { postComptaForMouvement } from './stocks-compta.service';

export interface StockProduit { id: number; uuid: string; code: string; designation: string; categorieId: number | null; categorieLabel: string | null; unite: string; prixUnitaire: number; seuilAlerte: number; isActive: boolean }
export interface StockNiveau { hotelId: number; produitId: number; produitCode: string; produitDesignation: string; unite: string; quantite: number; seuilAlerte: number; enAlerte: boolean; valeur: number }
export interface StockMouvement { id: number; uuid: string; hotelId: number; produitId: number; produitDesignation: string; typeMouvement: string; quantite: number; prixUnitaire: number | null; montant: number | null; reference: string | null; motif: string | null; dateMouvement: string; createdAt: string }
export interface CreateProduitInput { code: string; designation: string; categorieId?: number | null; unite?: string; prixUnitaire?: number; seuilAlerte?: number }
export interface CreateMouvementInput { hotelId: number; produitId: number; typeMouvement: string; quantite: number; prixUnitaire?: number; reference?: string; motif?: string; dateMouvement?: string; sourceType?: string; sourceId?: number; skipCompta?: boolean }

export function listProduits(): StockProduit[] {
  const db = getDatabase();
  const rows = db.prepare(`SELECT p.*, c.label AS cat_label FROM stock_produits p LEFT JOIN stock_categories c ON c.id = p.categorie_id WHERE p.is_active = 1 ORDER BY p.designation`).all() as Record<string, unknown>[];
  return rows.map(r => ({ id: r.id as number, uuid: r.uuid as string, code: r.code as string, designation: r.designation as string, categorieId: r.categorie_id as number | null, categorieLabel: r.cat_label as string | null, unite: r.unite as string, prixUnitaire: r.prix_unitaire as number, seuilAlerte: r.seuil_alerte as number, isActive: Boolean(r.is_active) }));
}

export function createProduit(input: CreateProduitInput): StockProduit {
  const db = getDatabase();
  const res = db.prepare(`INSERT INTO stock_produits (code,designation,categorie_id,unite,prix_unitaire,seuil_alerte) VALUES (?,?,?,?,?,?) RETURNING id`).get(input.code, input.designation, input.categorieId ?? null, input.unite ?? 'pièce', input.prixUnitaire ?? 0, input.seuilAlerte ?? 0) as { id: number };
  return listProduits().find(p => p.id === res.id)!;
}

export function getNiveaux(hotelId: number): StockNiveau[] {
  const db = getDatabase();
  const rows = db.prepare(`SELECT sn.*, p.code AS code, p.designation, p.unite, p.seuil_alerte, p.prix_unitaire FROM stock_niveaux sn JOIN stock_produits p ON p.id = sn.produit_id WHERE sn.hotel_id = ? ORDER BY p.designation`).all(hotelId) as Record<string, number & string>[];
  return rows.map(r => ({ hotelId, produitId: r.produit_id as number, produitCode: r.code as string, produitDesignation: r.designation as string, unite: r.unite as string, quantite: r.quantite as number, seuilAlerte: r.seuil_alerte as number, enAlerte: (r.quantite as number) <= (r.seuil_alerte as number), valeur: (r.quantite as number) * (r.prix_unitaire as number) }));
}

export function createMouvement(actorId: number, input: CreateMouvementInput): StockMouvement {
  const db = getDatabase();
  const prix = input.prixUnitaire;
  const montant = prix !== undefined ? Math.abs(input.quantite) * prix : null;
  const signe = ['sortie', 'perte'].includes(input.typeMouvement) ? -1 : 1;
  const res = db.prepare(`INSERT INTO stock_mouvements (hotel_id,produit_id,type_mouvement,quantite,prix_unitaire,montant,reference,motif,date_mouvement,saisi_par,source_type,source_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id`)
    .get(input.hotelId, input.produitId, input.typeMouvement, input.quantite * signe, prix ?? null, montant, input.reference ?? null, input.motif ?? null, input.dateMouvement ?? new Date().toISOString().slice(0,10), actorId, input.sourceType ?? null, input.sourceId ?? null) as { id: number };
  // Update niveau
  db.prepare(`INSERT INTO stock_niveaux (hotel_id,produit_id,quantite) VALUES (?,?,?) ON CONFLICT(hotel_id,produit_id) DO UPDATE SET quantite = quantite + excluded.quantite, updated_at = datetime('now')`)
    .run(input.hotelId, input.produitId, input.quantite * signe);
  const row = db.prepare(`SELECT m.*, p.designation FROM stock_mouvements m JOIN stock_produits p ON p.id = m.produit_id WHERE m.id = ?`).get(res.id) as Record<string, unknown>;
  if (!input.skipCompta) {
    try {
      postComptaForMouvement(res.id);
    } catch {
      /* compta optionnelle */
    }
  }
  return { id: row.id as number, uuid: row.uuid as string, hotelId: row.hotel_id as number, produitId: row.produit_id as number, produitDesignation: row.designation as string, typeMouvement: row.type_mouvement as string, quantite: row.quantite as number, prixUnitaire: row.prix_unitaire as number | null, montant: row.montant as number | null, reference: row.reference as string | null, motif: row.motif as string | null, dateMouvement: row.date_mouvement as string, createdAt: row.created_at as string };
}

export function listCategories(): { id: number; code: string; label: string; parentId: number | null }[] {
  const rows = getDatabase().prepare(`SELECT * FROM stock_categories ORDER BY label`).all() as Record<string, unknown>[];
  return rows.map(r => ({ id: r.id as number, code: r.code as string, label: r.label as string, parentId: r.parent_id as number | null }));
}
