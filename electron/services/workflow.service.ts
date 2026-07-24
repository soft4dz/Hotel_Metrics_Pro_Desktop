import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { getActorContext, isGlobalAdminRole } from './actorContext';

export type WorkflowStatut =
  | 'brouillon'
  | 'soumis'
  | 'en_validation'
  | 'valide'
  | 'valide_unite'
  | 'valide_dec'
  | 'refuse'
  | 'cloture'
  | 'annule';

export interface WorkflowInstance {
  id: number;
  module: string;
  entityType: string;
  entityId: number;
  hotelId: number | null;
  statut: WorkflowStatut;
  priorite: string;
  niveauValidation: number;
  demandeurUserId: number | null;
  validateurUserId: number | null;
  motifRefus: string | null;
  commentaire: string | null;
  submittedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface WorkflowHistoryEntry {
  id: number;
  workflowId: number;
  action: string;
  ancienStatut: string | null;
  nouveauStatut: string | null;
  actorUserId: number | null;
  actorNom: string | null;
  motif: string | null;
  commentaire: string | null;
  createdAt: string;
}

export interface CreateWorkflowInput {
  module: string;
  entityType: string;
  entityId: number;
  hotelId?: number;
  priorite?: 'basse' | 'normale' | 'haute' | 'critique';
  commentaire?: string;
}

export interface WorkflowFilters {
  module?: string;
  statut?: WorkflowStatut | WorkflowStatut[];
  hotelId?: number;
  pendingOnly?: boolean;
}

function mapWorkflow(row: Record<string, unknown>): WorkflowInstance {
  return {
    id: Number(row.id),
    module: String(row.module),
    entityType: String(row.entity_type),
    entityId: Number(row.entity_id),
    hotelId: row.hotel_id ? Number(row.hotel_id) : null,
    statut: row.statut as WorkflowStatut,
    priorite: String(row.priorite ?? 'normale'),
    niveauValidation: Number(row.niveau_validation ?? 0),
    demandeurUserId: row.demandeur_user_id ? Number(row.demandeur_user_id) : null,
    validateurUserId: row.validateur_user_id ? Number(row.validateur_user_id) : null,
    motifRefus: row.motif_refus ? String(row.motif_refus) : null,
    commentaire: row.commentaire ? String(row.commentaire) : null,
    submittedAt: row.submitted_at ? String(row.submitted_at) : null,
    completedAt: row.completed_at ? String(row.completed_at) : null,
    createdAt: String(row.created_at),
  };
}

function appendHistory(
  workflowId: number,
  action: string,
  ancien: string | null,
  nouveau: string | null,
  actorUserId: number,
  motif?: string,
  commentaire?: string,
): void {
  getDatabase().prepare(`
    INSERT INTO workflow_history (workflow_id, action, ancien_statut, nouveau_statut, actor_user_id, motif, commentaire)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(workflowId, action, ancien, nouveau, actorUserId, motif ?? null, commentaire ?? null);
}

function getWorkflowById(id: number): WorkflowInstance {
  const row = getDatabase().prepare('SELECT * FROM workflow_instances WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!row) throw new Error(`Workflow ${id} introuvable.`);
  return mapWorkflow(row);
}

export function createWorkflow(actorUserId: number, input: CreateWorkflowInput): WorkflowInstance {
  const db = getDatabase();
  const existing = db.prepare(`
    SELECT id FROM workflow_instances WHERE module = ? AND entity_type = ? AND entity_id = ?
  `).get(input.module, input.entityType, input.entityId) as { id: number } | undefined;

  if (existing) return getWorkflowById(existing.id);

  const r = db.prepare(`
    INSERT INTO workflow_instances (module, entity_type, entity_id, hotel_id, statut, priorite, demandeur_user_id, commentaire)
    VALUES (?, ?, ?, ?, 'brouillon', ?, ?, ?)
  `).run(input.module, input.entityType, input.entityId, input.hotelId ?? null, input.priorite ?? 'normale', actorUserId, input.commentaire ?? null);

  const wf = getWorkflowById(Number(r.lastInsertRowid));
  appendHistory(wf.id, 'create', null, 'brouillon', actorUserId, undefined, input.commentaire);
  writeAuditLog({ userId: actorUserId, action: 'CREATE', module: 'workflow', description: `Workflow ${input.module}/${input.entityType}#${input.entityId}` });
  return wf;
}

export function submitWorkflow(actorUserId: number, workflowId: number, commentaire?: string): WorkflowInstance {
  const wf = getWorkflowById(workflowId);
  if (!['brouillon', 'refuse'].includes(wf.statut)) throw new Error(`Soumission impossible depuis statut ${wf.statut}.`);
  const db = getDatabase();
  db.prepare(`
    UPDATE workflow_instances SET statut='soumis', submitted_at=datetime('now'), demandeur_user_id=?, commentaire=COALESCE(?, commentaire), updated_at=datetime('now')
    WHERE id=?
  `).run(actorUserId, commentaire ?? null, workflowId);
  appendHistory(workflowId, 'submit', wf.statut, 'soumis', actorUserId, undefined, commentaire);
  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'workflow', description: `Workflow #${workflowId} soumis` });
  return getWorkflowById(workflowId);
}

export function approveWorkflow(actorUserId: number, workflowId: number, nouveauStatut: WorkflowStatut = 'valide', commentaire?: string): WorkflowInstance {
  const wf = getWorkflowById(workflowId);
  if (!['soumis', 'en_validation', 'valide_unite'].includes(wf.statut)) {
    throw new Error(`Approbation impossible depuis statut ${wf.statut}.`);
  }
  const db = getDatabase();
  const completed = ['valide', 'valide_dec', 'cloture'].includes(nouveauStatut);
  db.prepare(`
    UPDATE workflow_instances SET statut=?, validateur_user_id=?, niveau_validation=niveau_validation+1,
      completed_at=${completed ? "datetime('now')" : 'completed_at'}, commentaire=COALESCE(?, commentaire), updated_at=datetime('now')
    WHERE id=?
  `).run(nouveauStatut, actorUserId, commentaire ?? null, workflowId);
  appendHistory(workflowId, 'approve', wf.statut, nouveauStatut, actorUserId, undefined, commentaire);
  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'workflow', description: `Workflow #${workflowId} → ${nouveauStatut}` });
  return getWorkflowById(workflowId);
}

export function rejectWorkflow(actorUserId: number, workflowId: number, motif: string): WorkflowInstance {
  if (!motif?.trim()) throw new Error('Motif de refus obligatoire.');
  const wf = getWorkflowById(workflowId);
  if (['refuse', 'cloture', 'annule'].includes(wf.statut)) throw new Error('Workflow déjà terminé.');
  getDatabase().prepare(`
    UPDATE workflow_instances SET statut='refuse', motif_refus=?, validateur_user_id=?, completed_at=datetime('now'), updated_at=datetime('now')
    WHERE id=?
  `).run(motif, actorUserId, workflowId);
  appendHistory(workflowId, 'reject', wf.statut, 'refuse', actorUserId, motif);
  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'workflow', description: `Workflow #${workflowId} refusé : ${motif}` });
  return getWorkflowById(workflowId);
}

export function getWorkflowHistory(actorUserId: number, workflowId: number): WorkflowHistoryEntry[] {
  void actorUserId;
  return (getDatabase().prepare(`
    SELECT h.*, u.full_name as actor_nom
    FROM workflow_history h LEFT JOIN users u ON u.id = h.actor_user_id
    WHERE h.workflow_id = ? ORDER BY h.created_at, h.id
  `).all(workflowId) as Record<string, unknown>[]).map((r) => ({
    id: Number(r.id),
    workflowId: Number(r.workflow_id),
    action: String(r.action),
    ancienStatut: r.ancien_statut ? String(r.ancien_statut) : null,
    nouveauStatut: r.nouveau_statut ? String(r.nouveau_statut) : null,
    actorUserId: r.actor_user_id ? Number(r.actor_user_id) : null,
    actorNom: r.actor_nom ? String(r.actor_nom) : null,
    motif: r.motif ? String(r.motif) : null,
    commentaire: r.commentaire ? String(r.commentaire) : null,
    createdAt: String(r.created_at),
  }));
}

export function listPendingWorkflows(actorUserId: number, filters: WorkflowFilters = {}): WorkflowInstance[] {
  const actor = getActorContext(actorUserId);
  const db = getDatabase();
  const conds: string[] = [];
  const params: unknown[] = [];

  if (filters.pendingOnly !== false) {
    conds.push(`statut IN ('soumis','en_validation','valide_unite')`);
  }
  if (filters.module) { conds.push('module = ?'); params.push(filters.module); }
  if (filters.hotelId) { conds.push('hotel_id = ?'); params.push(filters.hotelId); }
  if (filters.statut) {
    const stats = Array.isArray(filters.statut) ? filters.statut : [filters.statut];
    conds.push(`statut IN (${stats.map(() => '?').join(',')})`);
    params.push(...stats);
  }
  if (!isGlobalAdminRole(actor.roleCode) && actor.hotelIds.length > 0) {
    conds.push(`(hotel_id IS NULL OR hotel_id IN (${actor.hotelIds.map(() => '?').join(',')}))`);
    params.push(...actor.hotelIds);
  }

  const where = conds.length ? conds.join(' AND ') : '1=1';
  return (db.prepare(`SELECT * FROM workflow_instances WHERE ${where} ORDER BY updated_at DESC LIMIT 200`).all(...params) as Record<string, unknown>[]).map(mapWorkflow);
}

export function findWorkflow(module: string, entityType: string, entityId: number): WorkflowInstance | null {
  const row = getDatabase().prepare(`
    SELECT * FROM workflow_instances WHERE module = ? AND entity_type = ? AND entity_id = ?
  `).get(module, entityType, entityId) as Record<string, unknown> | undefined;
  return row ? mapWorkflow(row) : null;
}

export function syncEntityStatutFromWorkflow(module: string, entityType: string, entityId: number, statut: WorkflowStatut): void {
  const wf = findWorkflow(module, entityType, entityId);
  if (wf && wf.statut !== statut) {
    getDatabase().prepare(`UPDATE workflow_instances SET statut=?, updated_at=datetime('now') WHERE id=?`).run(statut, wf.id);
  }
}
