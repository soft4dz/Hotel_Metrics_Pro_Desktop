import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { getActorContext, actorCanAccessHotel } from './actorContext';
import { createAnomalie } from './anomalies.service';

export interface ChecklistTemplate {
  id: number;
  code: string;
  libelle: string;
  domaine: string;
  frequence: string;
  itemsCount: number;
}

export interface ChecklistRun {
  id: number;
  templateId: number;
  templateLibelle: string;
  hotelId: number | null;
  dateControle: string;
  statut: string;
  score: number | null;
  observation: string | null;
}

export interface ChecklistResultItem {
  itemId: number;
  libelle: string;
  criticite: string;
  statut: string;
  commentaire: string | null;
  preuvePath: string | null;
}

export function listChecklistTemplates(_actorUserId: number): ChecklistTemplate[] {
  return (getDatabase().prepare(`
    SELECT t.*, (SELECT COUNT(*) FROM control_checklist_items i WHERE i.template_id=t.id AND i.actif=1) as items_count
    FROM control_checklist_templates t WHERE t.actif=1 ORDER BY t.domaine, t.libelle
  `).all() as Record<string, unknown>[]).map((r) => ({
    id: Number(r.id), code: String(r.code), libelle: String(r.libelle), domaine: String(r.domaine),
    frequence: String(r.frequence), itemsCount: Number(r.items_count),
  }));
}

export function startChecklistRun(actorUserId: number, templateId: number, hotelId?: number): ChecklistRun {
  const actor = getActorContext(actorUserId);
  if (hotelId && !actorCanAccessHotel(actor, hotelId)) throw new Error('Accès hôtel refusé.');
  const db = getDatabase();
  const r = db.prepare(`
    INSERT INTO control_checklist_runs (template_id, hotel_id, date_controle, statut, controleur_user_id)
    VALUES (?, ?, date('now'), 'en_cours', ?)
  `).run(templateId, hotelId ?? null, actorUserId);
  const runId = Number(r.lastInsertRowid);
  const items = db.prepare(`SELECT id FROM control_checklist_items WHERE template_id=? AND actif=1`).all(templateId) as { id: number }[];
  const stmt = db.prepare(`INSERT INTO control_checklist_results (run_id, item_id, statut) VALUES (?, ?, 'na')`);
  for (const i of items) stmt.run(runId, i.id);
  return getChecklistRun(actorUserId, runId);
}

export function getChecklistRun(_actorUserId: number, runId: number): ChecklistRun {
  const row = getDatabase().prepare(`
    SELECT r.*, t.libelle as template_libelle FROM control_checklist_runs r
    INNER JOIN control_checklist_templates t ON t.id = r.template_id WHERE r.id = ?
  `).get(runId) as Record<string, unknown> | undefined;
  if (!row) throw new Error('Exécution checklist introuvable.');
  return {
    id: Number(row.id), templateId: Number(row.template_id), templateLibelle: String(row.template_libelle),
    hotelId: row.hotel_id ? Number(row.hotel_id) : null, dateControle: String(row.date_controle),
    statut: String(row.statut), score: row.score != null ? Number(row.score) : null,
    observation: row.observation ? String(row.observation) : null,
  };
}

export function getChecklistResults(_actorUserId: number, runId: number): ChecklistResultItem[] {
  return (getDatabase().prepare(`
    SELECT r.item_id, i.libelle, i.criticite, r.statut, r.commentaire, r.preuve_path
    FROM control_checklist_results r INNER JOIN control_checklist_items i ON i.id = r.item_id
    WHERE r.run_id = ? ORDER BY i.ordre, i.id
  `).all(runId) as Record<string, unknown>[]).map((r) => ({
    itemId: Number(r.item_id), libelle: String(r.libelle), criticite: String(r.criticite),
    statut: String(r.statut), commentaire: r.commentaire ? String(r.commentaire) : null,
    preuvePath: r.preuve_path ? String(r.preuve_path) : null,
  }));
}

export function updateChecklistResult(actorUserId: number, runId: number, itemId: number, input: { statut: string; commentaire?: string; preuvePath?: string }): void {
  getDatabase().prepare(`
    UPDATE control_checklist_results SET statut=?, commentaire=?, preuve_path=? WHERE run_id=? AND item_id=?
  `).run(input.statut, input.commentaire ?? null, input.preuvePath ?? null, runId, itemId);
  void actorUserId;
}

export function submitChecklistRun(actorUserId: number, runId: number): ChecklistRun {
  const run = getChecklistRun(actorUserId, runId);
  const results = getChecklistResults(actorUserId, runId);
  const evaluated = results.filter((r) => r.statut !== 'na');
  const conformes = evaluated.filter((r) => r.statut === 'conforme').length;
  const score = evaluated.length ? Math.round((conformes / evaluated.length) * 100) : 0;

  getDatabase().prepare(`
    UPDATE control_checklist_runs SET statut='soumis', score=?, updated_at=datetime('now') WHERE id=?
  `).run(score, runId);

  const nonConformes = results.filter((r) => r.statut === 'non_conforme');
  for (const nc of nonConformes) {
    createAnomalie(actorUserId, {
      hotelId: run.hotelId ?? undefined,
      titre: `Checklist NC : ${nc.libelle}`,
      description: nc.commentaire ?? 'Non-conformité checklist',
      categorie: 'qualite',
      severite: nc.criticite === 'critique' ? 'critique' : 'moyenne',
    });
  }

  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'checklist', description: `Checklist run #${runId} soumise — score ${score}%` });
  return getChecklistRun(actorUserId, runId);
}

export function listChecklistRuns(actorUserId: number, hotelId?: number): ChecklistRun[] {
  void actorUserId;
  const conds = ['1=1'];
  const params: unknown[] = [];
  if (hotelId) { conds.push('r.hotel_id = ?'); params.push(hotelId); }
  return (getDatabase().prepare(`
    SELECT r.*, t.libelle as template_libelle FROM control_checklist_runs r
    INNER JOIN control_checklist_templates t ON t.id = r.template_id
    WHERE ${conds.join(' AND ')} ORDER BY r.date_controle DESC LIMIT 50
  `).all(...params) as Record<string, unknown>[]).map((row) => ({
    id: Number(row.id), templateId: Number(row.template_id), templateLibelle: String(row.template_libelle),
    hotelId: row.hotel_id ? Number(row.hotel_id) : null, dateControle: String(row.date_controle),
    statut: String(row.statut), score: row.score != null ? Number(row.score) : null,
    observation: row.observation ? String(row.observation) : null,
  }));
}

export function getChecklistStats(actorUserId: number, hotelId?: number): { total: number; cloturees: number; tauxCloture: number } {
  void actorUserId;
  const cond = hotelId ? 'WHERE hotel_id=?' : '';
  const params = hotelId ? [hotelId] : [];
  const total = (getDatabase().prepare(`SELECT COUNT(*) as c FROM control_checklist_runs ${cond}`).get(...params) as { c: number }).c;
  const cloturees = (getDatabase().prepare(`SELECT COUNT(*) as c FROM control_checklist_runs ${cond ? cond + ' AND' : 'WHERE'} statut IN ('valide','cloture')`).get(...params) as { c: number }).c;
  return { total, cloturees, tauxCloture: total ? Math.round((cloturees / total) * 100) : 0 };
}
