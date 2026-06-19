import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import type { ModePaiement } from './tresorerie.service';

/** Crée un encaissement en attente lors de la validation d'une recette journalière (idempotent). */
export function syncEncaissementRecetteJour(
  actorUserId: number,
  hotelId: number,
  dateJournal: string,
): number | null {
  const db = getDatabase();
  const agg = db.prepare(`
    SELECT COALESCE(MAX(encaissement_ht), 0) AS encHt,
           COALESCE(SUM(montant), 0) AS total,
           MIN(id) AS firstId
    FROM recettes_journalieres
    WHERE hotel_id = ? AND date_journal = ? AND deleted_at IS NULL AND statut = 'valide'
  `).get(hotelId, dateJournal) as { encHt: number; total: number; firstId: number | null };

  const montant = Math.round((agg.encHt > 0 ? agg.encHt : agg.total) * 100) / 100;
  if (montant <= 0 || agg.firstId == null) return null;

  const reference = `RECETTE-${hotelId}-${dateJournal}`;
  const existing = db.prepare(`
    SELECT id FROM encaissements WHERE reference = ? AND deleted_at IS NULL
  `).get(reference) as { id: number } | undefined;
  if (existing) return existing.id;

  const description = `Recette journalière ${dateJournal}`;
  const result = db.prepare(`
    INSERT INTO encaissements
      (hotel_id, date_encaissement, montant, mode, reference, description, statut, recette_id, created_by)
    VALUES (?, ?, ?, 'especes', ?, ?, 'en_attente', ?, ?)
  `).run(hotelId, dateJournal, montant, reference, description, agg.firstId, actorUserId);

  const id = Number(result.lastInsertRowid);
  writeAuditLog({
    userId: actorUserId,
    action: 'CREATE',
    module: 'encaissements',
    description: `Encaissement auto recette ${dateJournal} — ${montant} DA`,
  });
  return id;
}

/** Crée un encaissement en attente lors d'un paiement facture (idempotent). */
export function syncEncaissementFacturePaiement(
  actorUserId: number,
  hotelId: number,
  factureNumero: string,
  factureId: number,
  paiementId: number,
  datePaiement: string,
  montant: number,
  mode: ModePaiement,
  reference?: string | null,
): number | null {
  const db = getDatabase();
  const ref = reference?.trim() || `FACTURE-${factureId}-PMT-${paiementId}`;
  const existing = db.prepare(`
    SELECT id FROM encaissements WHERE reference = ? AND deleted_at IS NULL
  `).get(ref) as { id: number } | undefined;
  if (existing) return existing.id;

  const description = `Paiement facture ${factureNumero}`;
  const result = db.prepare(`
    INSERT INTO encaissements
      (hotel_id, date_encaissement, montant, mode, reference, description, statut, created_by)
    VALUES (?, ?, ?, ?, ?, ?, 'en_attente', ?)
  `).run(hotelId, datePaiement, montant, mode, ref, description, actorUserId);

  const id = Number(result.lastInsertRowid);
  writeAuditLog({
    userId: actorUserId,
    action: 'CREATE',
    module: 'encaissements',
    description: `Encaissement auto facture ${factureNumero} — ${montant} DA`,
  });
  return id;
}
