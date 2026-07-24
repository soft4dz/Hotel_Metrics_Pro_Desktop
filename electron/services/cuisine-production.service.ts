import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { createMouvement } from './stocks.service';
import { emitErpEvent } from './event-bus.service';
import type {
  CuisineRecette,
  CuisineRecetteLigne,
  CuisineOrdreProduction,
  CreateRecetteInput,
  UpsertRecetteLigneInput,
  CreateOrdreProductionInput,
} from '../../src/shared/types/cuisine';

function mapLigne(row: Record<string, unknown>): CuisineRecetteLigne {
  return {
    id: row.id as number,
    recetteId: row.recette_id as number,
    produitId: row.produit_id as number,
    produitCode: row.produit_code as string,
    produitDesignation: row.produit_designation as string,
    quantite: row.quantite as number,
    unite: row.unite as string,
    tauxPerte: row.taux_perte as number,
    ordre: row.ordre as number,
    coutLigne: (row.cout_ligne as number | null) ?? undefined,
  };
}

function getPmpProduit(produitId: number): number {
  const row = getDatabase().prepare(`SELECT prix_unitaire FROM stock_produits WHERE id = ?`).get(produitId) as
    | { prix_unitaire: number }
    | undefined;
  return row?.prix_unitaire ?? 0;
}

function loadLignes(recetteId: number): CuisineRecetteLigne[] {
  const rows = getDatabase().prepare(`
    SELECT l.*, p.code AS produit_code, p.designation AS produit_designation,
           l.quantite * (1 + l.taux_perte / 100) * p.prix_unitaire AS cout_ligne
    FROM cuisine_recette_lignes l
    JOIN stock_produits p ON p.id = l.produit_id
    WHERE l.recette_id = ?
    ORDER BY l.ordre, l.id
  `).all(recetteId) as Record<string, unknown>[];
  return rows.map(mapLigne);
}

function mapRecette(row: Record<string, unknown>, lignes?: CuisineRecetteLigne[]): CuisineRecette {
  const id = row.id as number;
  return {
    id,
    uuid: row.uuid as string,
    hotelId: row.hotel_id as number,
    code: row.code as string,
    nom: row.nom as string,
    portions: row.portions as number,
    prixVente: (row.prix_vente as number | null) ?? null,
    coutRevient: (row.cout_revient as number | null) ?? null,
    margePct: (row.marge_pct as number | null) ?? null,
    statut: row.statut as CuisineRecette['statut'],
    validePar: (row.valide_par as number | null) ?? null,
    valideAt: (row.valide_at as string | null) ?? null,
    lignes: lignes ?? loadLignes(id),
    createdAt: row.created_at as string,
  };
}

export function calculerCoutRevient(recetteId: number): number {
  const lignes = loadLignes(recetteId);
  return Math.round(lignes.reduce((s, l) => s + (l.coutLigne ?? 0), 0) * 100) / 100;
}

export function listRecettes(hotelId: number): CuisineRecette[] {
  const rows = getDatabase().prepare(`
    SELECT * FROM cuisine_recettes WHERE hotel_id = ? AND statut != 'archive' ORDER BY nom
  `).all(hotelId) as Record<string, unknown>[];
  return rows.map((r) => mapRecette(r, loadLignes(r.id as number)));
}

export function getRecette(id: number): CuisineRecette | null {
  const row = getDatabase().prepare(`SELECT * FROM cuisine_recettes WHERE id = ?`).get(id) as
    | Record<string, unknown>
    | undefined;
  return row ? mapRecette(row) : null;
}

export function createRecette(actorUserId: number, input: CreateRecetteInput): CuisineRecette {
  const db = getDatabase();
  const res = db.prepare(`
    INSERT INTO cuisine_recettes (hotel_id, code, nom, portions, prix_vente, cree_par)
    VALUES (?, ?, ?, ?, ?, ?) RETURNING id
  `).get(
    input.hotelId,
    input.code.trim(),
    input.nom.trim(),
    input.portions ?? 1,
    input.prixVente ?? null,
    actorUserId,
  ) as { id: number };
  writeAuditLog({ userId: actorUserId, action: 'CREATE', module: 'cuisine', description: `Fiche technique créée : ${input.nom}`, newValue: `recette:${res.id}` });
  return getRecette(res.id)!;
}

export function updateRecette(
  _actorUserId: number,
  id: number,
  input: Partial<Pick<CreateRecetteInput, 'nom' | 'portions' | 'prixVente'>>,
): CuisineRecette {
  const existing = getRecette(id);
  if (!existing) throw new Error('Fiche technique introuvable.');
  if (existing.statut === 'valide') throw new Error('Fiche validée — modification impossible.');
  getDatabase().prepare(`
    UPDATE cuisine_recettes
    SET nom = COALESCE(?, nom), portions = COALESCE(?, portions), prix_vente = COALESCE(?, prix_vente),
        updated_at = datetime('now')
    WHERE id = ?
  `).run(input.nom ?? null, input.portions ?? null, input.prixVente ?? null, id);
  return getRecette(id)!;
}

export function upsertRecetteLigne(
  _actorUserId: number,
  recetteId: number,
  input: UpsertRecetteLigneInput,
  ligneId?: number,
): CuisineRecette {
  const recette = getRecette(recetteId);
  if (!recette) throw new Error('Fiche technique introuvable.');
  if (recette.statut === 'valide') throw new Error('Fiche validée — modification impossible.');
  const db = getDatabase();
  if (ligneId) {
    db.prepare(`
      UPDATE cuisine_recette_lignes
      SET produit_id = ?, quantite = ?, unite = ?, taux_perte = ?, ordre = ?
      WHERE id = ? AND recette_id = ?
    `).run(
      input.produitId,
      input.quantite,
      input.unite ?? 'kg',
      input.tauxPerte ?? 0,
      input.ordre ?? 0,
      ligneId,
      recetteId,
    );
  } else {
    db.prepare(`
      INSERT INTO cuisine_recette_lignes (recette_id, produit_id, quantite, unite, taux_perte, ordre)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(recetteId, input.produitId, input.quantite, input.unite ?? 'kg', input.tauxPerte ?? 0, input.ordre ?? 0);
  }
  const cout = calculerCoutRevient(recetteId);
  db.prepare(`UPDATE cuisine_recettes SET cout_revient = ?, updated_at = datetime('now') WHERE id = ?`).run(cout, recetteId);
  return getRecette(recetteId)!;
}

export function removeRecetteLigne(_actorUserId: number, recetteId: number, ligneId: number): CuisineRecette {
  const recette = getRecette(recetteId);
  if (!recette || recette.statut === 'valide') throw new Error('Modification impossible.');
  getDatabase().prepare(`DELETE FROM cuisine_recette_lignes WHERE id = ? AND recette_id = ?`).run(ligneId, recetteId);
  const cout = calculerCoutRevient(recetteId);
  getDatabase().prepare(`UPDATE cuisine_recettes SET cout_revient = ?, updated_at = datetime('now') WHERE id = ?`).run(cout, recetteId);
  return getRecette(recetteId)!;
}

export function validerRecette(actorUserId: number, id: number): CuisineRecette {
  const recette = getRecette(id);
  if (!recette) throw new Error('Fiche technique introuvable.');
  if (recette.lignes.length === 0) throw new Error('Ajoutez au moins un ingrédient avant validation.');
  const cout = calculerCoutRevient(id);
  const margePct = recette.prixVente && recette.prixVente > 0
    ? Math.round(((recette.prixVente - cout) / recette.prixVente) * 10000) / 100
    : null;
  getDatabase().prepare(`
    UPDATE cuisine_recettes
    SET statut = 'valide', cout_revient = ?, marge_pct = ?, valide_par = ?, valide_at = datetime('now'), updated_at = datetime('now')
    WHERE id = ?
  `).run(cout, margePct, actorUserId, id);
  writeAuditLog({ userId: actorUserId, action: 'VALIDATE', module: 'cuisine', description: `Fiche technique validée : ${recette.nom}`, newValue: `recette:${id}` });
  emitErpEvent({
    type: 'RECIPE_VALIDATED',
    entiteType: 'cuisine_recette',
    entiteId: id,
    data: { hotelId: recette.hotelId, nom: recette.nom, coutRevient: cout, margePct },
  });
  return getRecette(id)!;
}

export function listOrdresProduction(hotelId: number): CuisineOrdreProduction[] {
  const rows = getDatabase().prepare(`
    SELECT o.*, r.nom AS recette_nom
    FROM cuisine_ordres_production o
    JOIN cuisine_recettes r ON r.id = o.recette_id
    WHERE o.hotel_id = ?
    ORDER BY o.date_production DESC, o.id DESC
  `).all(hotelId) as Record<string, unknown>[];
  return rows.map((r) => ({
    id: r.id as number,
    uuid: r.uuid as string,
    hotelId: r.hotel_id as number,
    recetteId: r.recette_id as number,
    recetteNom: r.recette_nom as string,
    dateProduction: r.date_production as string,
    portionsPrevues: r.portions_prevues as number,
    portionsRealisees: (r.portions_realisees as number | null) ?? null,
    statut: r.statut as CuisineOrdreProduction['statut'],
    coutTheorique: (r.cout_theorique as number | null) ?? null,
    executeAt: (r.execute_at as string | null) ?? null,
  }));
}

export function createOrdreProduction(actorUserId: number, input: CreateOrdreProductionInput): CuisineOrdreProduction {
  const recette = getRecette(input.recetteId);
  if (!recette || recette.statut !== 'valide') throw new Error('Recette validée requise.');
  const coutUnitaire = recette.coutRevient ?? calculerCoutRevient(input.recetteId);
  const coutTheorique = Math.round(coutUnitaire * input.portionsPrevues * 100) / 100;
  const db = getDatabase();
  const res = db.prepare(`
    INSERT INTO cuisine_ordres_production (hotel_id, recette_id, date_production, portions_prevues, cout_theorique)
    VALUES (?, ?, ?, ?, ?) RETURNING id
  `).get(input.hotelId, input.recetteId, input.dateProduction, input.portionsPrevues, coutTheorique) as { id: number };
  writeAuditLog({ userId: actorUserId, action: 'CREATE', module: 'cuisine', description: `Ordre production : ${recette.nom}`, newValue: `ordre:${res.id}` });
  return listOrdresProduction(input.hotelId).find((o) => o.id === res.id)!;
}

export function executerOrdreProduction(actorUserId: number, ordreId: number): CuisineOrdreProduction {
  const db = getDatabase();
  const ordre = db.prepare(`
    SELECT o.*, r.portions AS recette_portions, r.nom AS recette_nom
    FROM cuisine_ordres_production o
    JOIN cuisine_recettes r ON r.id = o.recette_id
    WHERE o.id = ?
  `).get(ordreId) as Record<string, unknown> | undefined;
  if (!ordre) throw new Error('Ordre de production introuvable.');
  if (ordre.statut === 'termine') throw new Error('Ordre déjà exécuté.');
  const recetteId = ordre.recette_id as number;
  const hotelId = ordre.hotel_id as number;
  const portions = ordre.portions_prevues as number;
  const recettePortions = (ordre.recette_portions as number) || 1;
  const ratio = portions / recettePortions;
  const lignes = loadLignes(recetteId);
  for (const ligne of lignes) {
    const qty = Math.round(ligne.quantite * (1 + ligne.tauxPerte / 100) * ratio * 1000) / 1000;
    if (qty <= 0) continue;
    createMouvement(actorUserId, {
      hotelId,
      produitId: ligne.produitId,
      typeMouvement: 'sortie',
      quantite: qty,
      prixUnitaire: getPmpProduit(ligne.produitId),
      reference: `OP-${ordreId}`,
      motif: `Production ${ordre.recette_nom as string} (${portions} portions)`,
    });
  }
  db.prepare(`
    UPDATE cuisine_ordres_production
    SET statut = 'termine', portions_realisees = ?, execute_par = ?, execute_at = datetime('now')
    WHERE id = ?
  `).run(portions, actorUserId, ordreId);
  writeAuditLog({ userId: actorUserId, action: 'EXECUTE', module: 'cuisine', description: `Production exécutée : ${ordre.recette_nom as string}`, newValue: `ordre:${ordreId}` });
  emitErpEvent({
    type: 'PRODUCTION_EXECUTED',
    entiteType: 'cuisine_ordre',
    entiteId: ordreId,
    data: { hotelId, recetteId, portions },
  });
  return listOrdresProduction(hotelId).find((o) => o.id === ordreId)!;
}
