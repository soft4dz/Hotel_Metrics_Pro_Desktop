import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { getActorContext, actorCanAccessHotel, isGlobalAdminRole } from './actorContext';
import { createWorkflow, submitWorkflow, approveWorkflow, rejectWorkflow, findWorkflow } from './workflow.service';
import { createDecAlertIfMissing } from './dec-cockpit.service';

export type DailyClosureStatut = 'brouillon' | 'soumis' | 'valide_unite' | 'valide_dec' | 'refuse' | 'cloture';

export interface DailyClosureItem {
  id: number;
  rubrique: string;
  montant: number;
  sourceModule: string | null;
  observation: string | null;
}

export interface DailyClosure {
  id: number;
  hotelId: number;
  hotelName: string;
  dateJournal: string;
  statut: DailyClosureStatut;
  caDeclare: number;
  encaissementsTotal: number;
  creancesTotal: number;
  ecartCaisse: number;
  observations: string | null;
  reconciliationId: number | null;
  workflowId: number | null;
  items: DailyClosureItem[];
}

function mapClosure(row: Record<string, unknown>, items: DailyClosureItem[] = []): DailyClosure {
  return {
    id: Number(row.id),
    hotelId: Number(row.hotel_id),
    hotelName: String(row.hotel_name ?? ''),
    dateJournal: String(row.date_journal),
    statut: row.statut as DailyClosureStatut,
    caDeclare: Number(row.ca_declare ?? 0),
    encaissementsTotal: Number(row.encaissements_total ?? 0),
    creancesTotal: Number(row.creances_total ?? 0),
    ecartCaisse: Number(row.ecart_caisse ?? 0),
    observations: row.observations ? String(row.observations) : null,
    reconciliationId: row.reconciliation_id ? Number(row.reconciliation_id) : null,
    workflowId: row.workflow_id ? Number(row.workflow_id) : null,
    items,
  };
}

function getClosureById(id: number): DailyClosure {
  const db = getDatabase();
  const row = db.prepare(`
    SELECT dc.*, h.name as hotel_name FROM daily_closures dc
    INNER JOIN hotels h ON h.id = dc.hotel_id WHERE dc.id = ?
  `).get(id) as Record<string, unknown> | undefined;
  if (!row) throw new Error(`Clôture ${id} introuvable.`);
  const items = (db.prepare('SELECT * FROM daily_closure_items WHERE closure_id = ? ORDER BY id').all(id) as Record<string, unknown>[]).map((i) => ({
    id: Number(i.id), rubrique: String(i.rubrique), montant: Number(i.montant),
    sourceModule: i.source_module ? String(i.source_module) : null,
    observation: i.observation ? String(i.observation) : null,
  }));
  const wf = findWorkflow('cloture_journaliere', 'daily_closure', id);
  return mapClosure({ ...row, workflow_id: wf?.id ?? null }, items);
}

function assertHotelAccess(actorUserId: number, hotelId: number) {
  const actor = getActorContext(actorUserId);
  if (!actorCanAccessHotel(actor, hotelId)) throw new Error('Accès hôtel refusé.');
  return actor;
}

function assertNotLocked(statut: DailyClosureStatut) {
  if (statut === 'cloture') throw new Error('Clôture journalière verrouillée — modification interdite.');
}

export function createDailyClosure(actorUserId: number, hotelId: number, dateJournal: string): DailyClosure {
  assertHotelAccess(actorUserId, hotelId);
  const db = getDatabase();
  const existing = db.prepare('SELECT id FROM daily_closures WHERE hotel_id = ? AND date_journal = ?').get(hotelId, dateJournal) as { id: number } | undefined;
  if (existing) return getClosureById(existing.id);

  const r = db.prepare(`
    INSERT INTO daily_closures (hotel_id, date_journal, statut) VALUES (?, ?, 'brouillon')
  `).run(hotelId, dateJournal);
  const id = Number(r.lastInsertRowid);
  createWorkflow(actorUserId, { module: 'cloture_journaliere', entityType: 'daily_closure', entityId: id, hotelId });
  writeAuditLog({ userId: actorUserId, action: 'CREATE', module: 'cloture', description: `Clôture ${dateJournal} hôtel ${hotelId}` });
  return getClosureById(id);
}

export function prefillDailyClosure(actorUserId: number, closureId: number): DailyClosure {
  const closure = getClosureById(closureId);
  assertHotelAccess(actorUserId, closure.hotelId);
  assertNotLocked(closure.statut);
  const db = getDatabase();

  const recettes = db.prepare(`
    SELECT COALESCE(SUM(montant), 0) as total FROM recettes_journalieres
    WHERE hotel_id = ? AND date_journal = ? AND deleted_at IS NULL
  `).get(closure.hotelId, closure.dateJournal) as { total: number };

  const encaissements = db.prepare(`
    SELECT COALESCE(SUM(montant), 0) as total FROM encaissements
    WHERE hotel_id = ? AND date_encaissement = ? AND statut = 'confirme' AND deleted_at IS NULL
  `).get(closure.hotelId, closure.dateJournal) as { total: number };

  const creances = db.prepare(`
    SELECT COALESCE(SUM(montant_restant), 0) as total FROM global_creances
    WHERE hotel_id = ? AND date_piece = ? AND statut IN ('ouverte','partielle')
  `).get(closure.hotelId, closure.dateJournal) as { total: number };

  const ca = recettes.total ?? 0;
  const enc = encaissements.total ?? 0;
  const cre = creances.total ?? 0;
  const ecart = Math.round((ca - enc - cre) * 100) / 100;

  db.prepare(`
    UPDATE daily_closures SET ca_declare=?, encaissements_total=?, creances_total=?, ecart_caisse=?, updated_at=datetime('now')
    WHERE id=?
  `).run(ca, enc, cre, ecart, closureId);

  db.prepare('DELETE FROM daily_closure_items WHERE closure_id = ?').run(closureId);
  const stmt = db.prepare(`INSERT INTO daily_closure_items (closure_id, rubrique, montant, source_module) VALUES (?, ?, ?, ?)`);
  stmt.run(closureId, 'CA déclaré', ca, 'recettes');
  stmt.run(closureId, 'Encaissements', enc, 'tresorerie');
  stmt.run(closureId, 'Créances jour', cre, 'creances');
  stmt.run(closureId, 'Écart', ecart, 'calcul');

  return getClosureById(closureId);
}

export function submitDailyClosure(actorUserId: number, closureId: number): DailyClosure {
  const c = getClosureById(closureId);
  assertNotLocked(c.statut);
  if (c.statut !== 'brouillon' && c.statut !== 'refuse') throw new Error('Soumission impossible.');
  const db = getDatabase();
  db.prepare(`UPDATE daily_closures SET statut='soumis', submitted_by=?, submitted_at=datetime('now'), updated_at=datetime('now') WHERE id=?`).run(actorUserId, closureId);
  const wf = findWorkflow('cloture_journaliere', 'daily_closure', closureId);
  if (wf) submitWorkflow(actorUserId, wf.id);
  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'cloture', description: `Clôture #${closureId} soumise` });
  return getClosureById(closureId);
}

export function validateDailyClosureUnit(actorUserId: number, closureId: number): DailyClosure {
  const c = getClosureById(closureId);
  if (c.statut !== 'soumis') throw new Error('Validation unité : statut soumis requis.');
  getDatabase().prepare(`
    UPDATE daily_closures SET statut='valide_unite', validated_unite_by=?, validated_unite_at=datetime('now'), updated_at=datetime('now') WHERE id=?
  `).run(actorUserId, closureId);
  const wf = findWorkflow('cloture_journaliere', 'daily_closure', closureId);
  if (wf) approveWorkflow(actorUserId, wf.id, 'valide_unite');
  return getClosureById(closureId);
}

export function validateDailyClosureDec(actorUserId: number, closureId: number): DailyClosure {
  const actor = getActorContext(actorUserId);
  if (!isGlobalAdminRole(actor.roleCode)) throw new Error('Validation DEC réservée aux administrateurs.');
  const c = getClosureById(closureId);
  if (c.statut !== 'valide_unite') throw new Error('Validation DEC : statut validé unité requis.');
  getDatabase().prepare(`
    UPDATE daily_closures SET statut='valide_dec', validated_dec_by=?, validated_dec_at=datetime('now'), updated_at=datetime('now') WHERE id=?
  `).run(actorUserId, closureId);
  const wf = findWorkflow('cloture_journaliere', 'daily_closure', closureId);
  if (wf) approveWorkflow(actorUserId, wf.id, 'valide_dec');
  return getClosureById(closureId);
}

export function rejectDailyClosure(actorUserId: number, closureId: number, motif: string): DailyClosure {
  getDatabase().prepare(`
    UPDATE daily_closures SET statut='refuse', observations=?, updated_at=datetime('now') WHERE id=?
  `).run(motif, closureId);
  const wf = findWorkflow('cloture_journaliere', 'daily_closure', closureId);
  if (wf) rejectWorkflow(actorUserId, wf.id, motif);
  return getClosureById(closureId);
}

export function closeDailyClosure(actorUserId: number, closureId: number): DailyClosure {
  const c = getClosureById(closureId);
  if (c.statut !== 'valide_dec') throw new Error('Clôture finale : validation DEC requise.');
  getDatabase().prepare(`
    UPDATE daily_closures SET statut='cloture', closed_at=datetime('now'), updated_at=datetime('now') WHERE id=?
  `).run(closureId);
  const wf = findWorkflow('cloture_journaliere', 'daily_closure', closureId);
  if (wf) approveWorkflow(actorUserId, wf.id, 'cloture');
  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'cloture', description: `Clôture #${closureId} clôturée définitivement` });
  return getClosureById(closureId);
}

export function listDailyClosures(actorUserId: number, hotelId?: number, dateDebut?: string, dateFin?: string): DailyClosure[] {
  const actor = getActorContext(actorUserId);
  const conds = ['1=1'];
  const params: unknown[] = [];
  if (hotelId) { conds.push('dc.hotel_id = ?'); params.push(hotelId); }
  else if (!isGlobalAdminRole(actor.roleCode) && actor.hotelIds.length) {
    conds.push(`dc.hotel_id IN (${actor.hotelIds.map(() => '?').join(',')})`);
    params.push(...actor.hotelIds);
  }
  if (dateDebut) { conds.push('dc.date_journal >= ?'); params.push(dateDebut); }
  if (dateFin) { conds.push('dc.date_journal <= ?'); params.push(dateFin); }

  const rows = getDatabase().prepare(`
    SELECT dc.*, h.name as hotel_name FROM daily_closures dc
    INNER JOIN hotels h ON h.id = dc.hotel_id WHERE ${conds.join(' AND ')} ORDER BY dc.date_journal DESC LIMIT 100
  `).all(...params) as Record<string, unknown>[];
  return rows.map((r) => getClosureById(Number(r.id)));
}

/** Hook cockpit : alerte si unité non clôturée après 09h30 */
export function checkClosureDeadlineAlerts(actorUserId: number, dateJournal?: string): number {
  void actorUserId;
  const date = dateJournal ?? new Date().toISOString().slice(0, 10);
  const now = new Date();
  const deadline = new Date(`${date}T09:30:00`);
  if (now < deadline) return 0;

  const db = getDatabase();
  const hotels = db.prepare('SELECT id, name FROM hotels WHERE deleted_at IS NULL').all() as { id: number; name: string }[];
  let count = 0;
  for (const h of hotels) {
    const closed = db.prepare(`
      SELECT id FROM daily_closures WHERE hotel_id=? AND date_journal=? AND statut IN ('valide_dec','cloture')
    `).get(h.id, date);
    if (!closed) {
      createDecAlertIfMissing({
        sourceModule: 'cloture_journaliere', hotelId: h.id, severity: 'warning',
        titre: `Clôture non effectuée — ${h.name}`,
        description: `Unité ${h.name} : clôture journalière du ${date} absente après 09h30.`,
      });
      count += 1;
    }
  }
  return count;
}

export function isDateJournalLocked(hotelId: number, dateJournal: string): boolean {
  const row = getDatabase().prepare(`
    SELECT statut FROM daily_closures WHERE hotel_id=? AND date_journal=? AND statut='cloture'
  `).get(hotelId, dateJournal);
  return Boolean(row);
}
