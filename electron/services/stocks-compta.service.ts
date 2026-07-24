import { getDatabase } from '../database/sqlite';
import { genererEcritureVariationStock } from './comptabilite.service';
import { emitErpEvent } from './event-bus.service';

const SYSTEM_ACTOR_ID = 1;

export function postComptaForMouvement(mouvementId: number): number | null {
  const db = getDatabase();
  const row = db.prepare(`
    SELECT id, hotel_id, type_mouvement, quantite, prix_unitaire, montant, reference, motif, date_mouvement, ecriture_comptable_id
    FROM stock_mouvements WHERE id = ?
  `).get(mouvementId) as Record<string, unknown> | undefined;
  if (!row || row.ecriture_comptable_id) return (row?.ecriture_comptable_id as number | null) ?? null;

  const type = row.type_mouvement as string;
  if (!['entree', 'sortie', 'perte'].includes(type)) return null;

  const montant = Math.abs((row.montant as number | null) ?? ((row.prix_unitaire as number | null) ?? 0) * Math.abs(row.quantite as number));
  if (montant <= 0) return null;

  const ecriture = genererEcritureVariationStock(SYSTEM_ACTOR_ID, {
    mouvementId,
    hotelId: row.hotel_id as number,
    typeMouvement: type,
    montant,
    reference: (row.reference as string | null) ?? null,
    motif: (row.motif as string | null) ?? null,
    dateMouvement: row.date_mouvement as string,
  });

  if (ecriture) {
    db.prepare(`UPDATE stock_mouvements SET ecriture_comptable_id = ?, source_type = COALESCE(source_type, 'stocks'), source_id = COALESCE(source_id, ?) WHERE id = ?`)
      .run(ecriture.id, mouvementId, mouvementId);
    emitErpEvent({
      type: 'STOCK_COMPTA_POSTED',
      entiteType: 'stock_mouvement',
      entiteId: mouvementId,
      data: { ecritureId: ecriture.id, montant },
    });
    return ecriture.id;
  }
  return null;
}
