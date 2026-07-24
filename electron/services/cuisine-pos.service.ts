import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { emitErpEvent } from './event-bus.service';
import { consommerStockRecette, getRecette } from './cuisine-production.service';

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

export function enregistrerVentePos(actorUserId: number, input: EnregistrerVentePosInput): CuisineVentePos {
  const recette = getRecette(input.recetteId);
  if (!recette || recette.statut !== 'valide') throw new Error('Recette validée requise pour vente POS.');
  if (input.quantite <= 0) throw new Error('Quantité invalide.');

  const db = getDatabase();
  const montant = input.montantTtc ?? (recette.prixVente ? recette.prixVente * input.quantite : null);
  const res = db.prepare(`
    INSERT INTO cuisine_ventes_pos (hotel_id, recette_id, quantite, montant_ttc, reference_ticket, date_vente, cree_par)
    VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id
  `).get(
    input.hotelId,
    input.recetteId,
    input.quantite,
    montant,
    input.referenceTicket ?? null,
    input.dateVente ?? new Date().toISOString().slice(0, 10),
    actorUserId,
  ) as { id: number };

  const ticketRef = input.referenceTicket ?? `POS-${res.id}`;
  consommerStockRecette(
    actorUserId,
    input.hotelId,
    input.recetteId,
    input.quantite,
    ticketRef,
    `Vente POS ${recette.nom} x${input.quantite}`,
    'cuisine_vente_pos',
    res.id,
  );

  writeAuditLog({
    userId: actorUserId,
    action: 'CREATE',
    module: 'cuisine',
    description: `Vente POS ${recette.nom} x${input.quantite}`,
    newValue: `pos:${res.id}`,
  });

  emitErpEvent({
    type: 'POS_SALE_RECORDED',
    entiteType: 'cuisine_vente_pos',
    entiteId: res.id,
    data: { hotelId: input.hotelId, recetteId: input.recetteId, quantite: input.quantite, montantTtc: montant },
  });

  return listVentesPos(input.hotelId).find((v) => v.id === res.id)!;
}
