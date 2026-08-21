import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { getActorContext, actorCanAccessHotel, isGlobalAdminRole } from './actorContext';
import { createAnomalie } from './anomalies.service';
import { createDecAlertIfMissing } from './dec-cockpit.service';
import { assertWorkflowApprovalAllowed, createWorkflow, submitWorkflow, syncWorkflowStatutOnly } from './workflow.service';

export type ReconciliationStatut = 'a_controler' | 'equilibre' | 'ecart_justifie' | 'ecart_non_justifie' | 'valide';

export interface FinanceReconciliation {
  id: number;
  hotelId: number;
  hotelName: string;
  dateJournal: string;
  caDeclare: number;
  montantEspeces: number;
  montantTpe: number;
  montantVirement: number;
  montantCheque: number;
  montantCreance: number;
  totalRapproche: number;
  ecart: number;
  statut: ReconciliationStatut;
  justification: string | null;
}

function mapRec(row: Record<string, unknown>): FinanceReconciliation {
  return {
    id: Number(row.id),
    hotelId: Number(row.hotel_id),
    hotelName: String(row.hotel_name ?? ''),
    dateJournal: String(row.date_journal),
    caDeclare: Number(row.ca_declare ?? 0),
    montantEspeces: Number(row.montant_especes ?? 0),
    montantTpe: Number(row.montant_tpe ?? 0),
    montantVirement: Number(row.montant_virement ?? 0),
    montantCheque: Number(row.montant_cheque ?? 0),
    montantCreance: Number(row.montant_creance ?? 0),
    totalRapproche: Number(row.total_rapproche ?? 0),
    ecart: Number(row.ecart ?? 0),
    statut: row.statut as ReconciliationStatut,
    justification: row.justification ? String(row.justification) : null,
  };
}

function getRecById(id: number): FinanceReconciliation {
  const row = getDatabase().prepare(`
    SELECT r.*, h.name as hotel_name FROM finance_reconciliations r
    INNER JOIN hotels h ON h.id = r.hotel_id WHERE r.id = ?
  `).get(id) as Record<string, unknown> | undefined;
  if (!row) throw new Error(`Rapprochement ${id} introuvable.`);
  return mapRec(row);
}

export function createReconciliation(actorUserId: number, hotelId: number, dateJournal: string): FinanceReconciliation {
  if (!actorCanAccessHotel(getActorContext(actorUserId), hotelId)) throw new Error('Accès refusé.');
  const db = getDatabase();
  const existing = db.prepare('SELECT id FROM finance_reconciliations WHERE hotel_id=? AND date_journal=?').get(hotelId, dateJournal) as { id: number } | undefined;
  if (existing) return getRecById(existing.id);
  const r = db.prepare(`INSERT INTO finance_reconciliations (hotel_id, date_journal) VALUES (?, ?)`).run(hotelId, dateJournal);
  const id = Number(r.lastInsertRowid);
  createWorkflow(actorUserId, { module: 'rapprochement', entityType: 'finance_reconciliation', entityId: id, hotelId });
  return getRecById(id);
}

export function prefillReconciliation(actorUserId: number, id: number): FinanceReconciliation {
  const rec = getRecById(id);
  if (!actorCanAccessHotel(getActorContext(actorUserId), rec.hotelId)) throw new Error('Accès refusé.');
  const db = getDatabase();

  const ca = (db.prepare(`
    SELECT COALESCE(SUM(montant),0) as t FROM recettes_journalieres WHERE hotel_id=? AND date_journal=? AND deleted_at IS NULL
  `).get(rec.hotelId, rec.dateJournal) as { t: number }).t;

  const modes = db.prepare(`
    SELECT mode, COALESCE(SUM(montant),0) as t FROM encaissements
    WHERE hotel_id=? AND date_encaissement=? AND statut='confirme' AND deleted_at IS NULL GROUP BY mode
  `).all(rec.hotelId, rec.dateJournal) as { mode: string; t: number }[];

  const byMode = Object.fromEntries(modes.map((m) => [m.mode, m.t]));
  const especes = byMode.especes ?? 0;
  const tpe = byMode.carte ?? 0;
  const virement = byMode.virement ?? 0;
  const cheque = byMode.cheque ?? 0;

  const creance = (db.prepare(`
    SELECT COALESCE(SUM(montant_restant),0) as t FROM global_creances
    WHERE hotel_id=? AND date_piece=? AND statut IN ('ouverte','partielle')
  `).get(rec.hotelId, rec.dateJournal) as { t: number }).t;

  const total = Math.round((especes + tpe + virement + cheque + creance) * 100) / 100;
  const ecart = Math.round((ca - total) * 100) / 100;
  const statut: ReconciliationStatut = Math.abs(ecart) < 0.01 ? 'equilibre' : 'a_controler';

  db.prepare(`
    UPDATE finance_reconciliations SET ca_declare=?, montant_especes=?, montant_tpe=?, montant_virement=?,
      montant_cheque=?, montant_creance=?, total_rapproche=?, ecart=?, statut=?, updated_at=datetime('now') WHERE id=?
  `).run(ca, especes, tpe, virement, cheque, creance, total, ecart, statut, id);

  return getRecById(id);
}

export function justifyReconciliation(actorUserId: number, id: number, justification: string): FinanceReconciliation {
  const rec = getRecById(id);
  if (!justification?.trim()) throw new Error('Justification obligatoire.');
  const statut: ReconciliationStatut = Math.abs(rec.ecart) < 0.01 ? 'equilibre' : 'ecart_justifie';
  getDatabase().prepare(`
    UPDATE finance_reconciliations SET justification=?, statut=?, controle_by=?, controle_at=datetime('now'), updated_at=datetime('now') WHERE id=?
  `).run(justification, statut, actorUserId, id);
  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'rapprochement', description: `Rapprochement #${id} justifié` });
  return getRecById(id);
}

export function validateReconciliation(actorUserId: number, id: number, opts?: { syncWorkflow?: boolean }): FinanceReconciliation {
  const actor = getActorContext(actorUserId);
  if (!isGlobalAdminRole(actor.roleCode)) throw new Error('Validation DEC/admin requise.');
  const rec = getRecById(id);
  const wf = getDatabase().prepare(`
    SELECT id FROM workflow_instances WHERE module='rapprochement' AND entity_type='finance_reconciliation' AND entity_id=?
  `).get(id) as { id: number } | undefined;
  if (wf && opts?.syncWorkflow !== false) assertWorkflowApprovalAllowed(actorUserId, wf.id);

  if (rec.statut === 'a_controler' && Math.abs(rec.ecart) >= 0.01) {
    getDatabase().prepare(`
      UPDATE finance_reconciliations SET statut='ecart_non_justifie', updated_at=datetime('now') WHERE id=?
    `).run(id);
    createAnomalie(actorUserId, {
      hotelId: rec.hotelId,
      titre: `Écart rapprochement ${rec.dateJournal}`,
      description: `Écart de ${rec.ecart} DA non justifié.`,
      categorie: 'finance',
      severite: 'elevee',
    });
    createDecAlertIfMissing({
      sourceModule: 'rapprochement', hotelId: rec.hotelId, severity: 'critical',
      titre: `Écart financier non justifié — ${rec.dateJournal}`,
      description: `Écart ${rec.ecart} DA sur rapprochement.`,
    });
    throw new Error('Écart non justifié — anomalie créée.');
  }

  getDatabase().prepare(`
    UPDATE finance_reconciliations SET statut='valide', controle_by=?, controle_at=datetime('now'), updated_at=datetime('now') WHERE id=?
  `).run(actorUserId, id);

  if (wf && opts?.syncWorkflow !== false) syncWorkflowStatutOnly(actorUserId, wf.id, 'valide');

  dbLinkClosure(id);
  return getRecById(id);
}

function dbLinkClosure(reconciliationId: number): void {
  const rec = getRecById(reconciliationId);
  getDatabase().prepare(`
    UPDATE daily_closures SET reconciliation_id=?, updated_at=datetime('now')
    WHERE hotel_id=? AND date_journal=? AND reconciliation_id IS NULL
  `).run(reconciliationId, rec.hotelId, rec.dateJournal);
}

export function listReconciliations(actorUserId: number, hotelId?: number, dateDebut?: string, dateFin?: string): FinanceReconciliation[] {
  const actor = getActorContext(actorUserId);
  const conds = ['1=1'];
  const params: unknown[] = [];
  if (hotelId) { conds.push('r.hotel_id = ?'); params.push(hotelId); }
  if (dateDebut) { conds.push('r.date_journal >= ?'); params.push(dateDebut); }
  if (dateFin) { conds.push('r.date_journal <= ?'); params.push(dateFin); }
  if (!isGlobalAdminRole(actor.roleCode) && actor.hotelIds.length) {
    conds.push(`r.hotel_id IN (${actor.hotelIds.map(() => '?').join(',')})`);
    params.push(...actor.hotelIds);
  }
  return (getDatabase().prepare(`
    SELECT r.*, h.name as hotel_name FROM finance_reconciliations r
    INNER JOIN hotels h ON h.id = r.hotel_id WHERE ${conds.join(' AND ')} ORDER BY r.date_journal DESC LIMIT 100
  `).all(...params) as Record<string, unknown>[]).map(mapRec);
}

export function submitReconciliation(actorUserId: number, id: number): FinanceReconciliation {
  const wfRow = getDatabase().prepare(`
    SELECT id FROM workflow_instances WHERE module='rapprochement' AND entity_type='finance_reconciliation' AND entity_id=?
  `).get(id) as { id: number } | undefined;
  if (wfRow) submitWorkflow(actorUserId, wfRow.id);
  return getRecById(id);
}
