import { getDatabase } from '../database/sqlite';
import type { PosPointVenteType } from '../../src/shared/constants/posPointVenteTypes';
import { isAnnexPosType } from '../../src/shared/constants/posPointVenteTypes';

export interface PosAnnexCaTotals {
  totalVentes: number;
  nbOperations: number;
}

/** CA opérationnel des modules annexes (parking, plage, piscine) pour une journée. */
export function computeAnnexCaTotals(
  type: PosPointVenteType,
  hotelId: number,
  dateJournal: string,
): PosAnnexCaTotals {
  if (!isAnnexPosType(type)) return { totalVentes: 0, nbOperations: 0 };

  const db = getDatabase();

  if (type === 'parking') {
    const row = db.prepare(`
      SELECT COUNT(*) AS c, COALESCE(SUM(montant), 0) AS total
      FROM parking_tickets
      WHERE hotel_id = ? AND date(sortie_at) = ? AND statut = 'termine'
    `).get(hotelId, dateJournal) as { c: number; total: number };
    return {
      totalVentes: Math.round((row.total ?? 0) * 100) / 100,
      nbOperations: row.c ?? 0,
    };
  }

  const zone = type === 'piscine' ? 'piscine' : 'plage';
  const row = db.prepare(`
    SELECT COUNT(*) AS c, COALESCE(SUM(montant), 0) AS total
    FROM plage_entrees
    WHERE hotel_id = ? AND date_entree = ? AND zone = ?
  `).get(hotelId, dateJournal, zone) as { c: number; total: number };

  return {
    totalVentes: Math.round((row.total ?? 0) * 100) / 100,
    nbOperations: row.c ?? 0,
  };
}
