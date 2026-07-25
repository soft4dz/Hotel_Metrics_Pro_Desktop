import { getDatabase } from '../database/sqlite';

import type { EnregistrerVentePosInput, CuisineVentePos } from '../../src/shared/types/cuisine';
export type { EnregistrerVentePosInput, CuisineVentePos };

export function listVentesPos(hotelId: number, limit = 100): CuisineVentePos[] {
  const rows = getDatabase().prepare(`
    SELECT v.*, r.nom AS recette_nom
    FROM cuisine_ventes_pos v
    JOIN cuisine_recettes r ON r.id = v.recette_id
    WHERE v.hotel_id = ?
    ORDER BY v.date_vente DESC, v.id DESC
    LIMIT ?
  `).all(hotelId, limit) as Record<string, unknown>[];
  return rows.map((r) => ({
    id: r.id as number,
    uuid: r.uuid as string,
    hotelId: r.hotel_id as number,
    recetteId: r.recette_id as number,
    recetteNom: r.recette_nom as string,
    quantite: r.quantite as number,
    montantTtc: (r.montant_ttc as number | null) ?? null,
    referenceTicket: (r.reference_ticket as string | null) ?? null,
    dateVente: r.date_vente as string,
    createdAt: r.created_at as string,
  }));
}

export function enregistrerVentePos(_actorUserId: number, _input: EnregistrerVentePosInput): CuisineVentePos {
  throw new Error(
    'Les ventes se font désormais via Points de vente (/pos). L\'onglet Ventes POS cuisine est désactivé pour éviter les doublons stock et compta.',
  );
}
