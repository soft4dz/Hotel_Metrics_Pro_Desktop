import type { WorkflowInstance, WorkflowStatut } from '../../src/shared/types/phase2';
import type {
  WorkflowApprovalMode,
  WorkflowProcedureDto,
  WorkflowProcedureStepDto,
  WorkflowProcedureTriggerType,
  WorkflowPendingContext,
} from '../../src/shared/types/workflowProcedure';
import { getDatabase } from '../database/sqlite';
import { getActorContext, isGlobalAdminRole } from './actorContext';
import { userHasPermission } from './permissions.service';
import { writeAuditLog } from './audit.service';

function readSetting(key: string, fallback = ''): string {
  const row = getDatabase()
    .prepare(`SELECT value FROM app_settings WHERE key = ?`)
    .get(key) as { value: string } | undefined;
  return row?.value?.trim() ?? fallback;
}

function parseJsonArray(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function mapProcedure(row: Record<string, unknown>, steps: WorkflowProcedureStepDto[]): WorkflowProcedureDto {
  return {
    id: Number(row.id),
    code: String(row.code),
    module: String(row.module),
    entityType: String(row.entity_type),
    label: String(row.label),
    description: row.description ? String(row.description) : null,
    enabled: Boolean(row.enabled),
    hotelId: row.hotel_id ? Number(row.hotel_id) : null,
    triggerType: row.trigger_type as WorkflowProcedureTriggerType,
    triggerConfig: row.trigger_config_json ? JSON.parse(String(row.trigger_config_json)) : {},
    autoSubmit: Boolean(row.auto_submit),
    approvalMode: row.approval_mode as WorkflowApprovalMode,
    moduleRoute: row.module_route ? String(row.module_route) : null,
    sortOrder: Number(row.sort_order ?? 0),
    steps,
  };
}

function mapStep(row: Record<string, unknown>): WorkflowProcedureStepDto {
  return {
    id: Number(row.id),
    procedureId: Number(row.procedure_id),
    stepOrder: Number(row.step_order),
    stepCode: String(row.step_code),
    label: String(row.label),
    targetStatut: String(row.target_statut) as WorkflowStatut,
    approverRoles: parseJsonArray(row.approver_roles_json as string),
    approverPermissions: parseJsonArray(row.approver_permissions_json as string),
    slaHours: row.sla_hours != null ? Number(row.sla_hours) : null,
    moduleAction: row.module_action ? String(row.module_action) : null,
  };
}

function loadSteps(procedureId: number): WorkflowProcedureStepDto[] {
  return (getDatabase()
    .prepare(`SELECT * FROM workflow_procedure_steps WHERE procedure_id = ? ORDER BY step_order`)
    .all(procedureId) as Record<string, unknown>[]).map(mapStep);
}

export function listWorkflowProcedures(actorUserId: number): WorkflowProcedureDto[] {
  assertWorkflowAdmin(actorUserId);
  const rows = getDatabase()
    .prepare(`SELECT * FROM workflow_procedures ORDER BY sort_order, label`)
    .all() as Record<string, unknown>[];
  return rows.map((r) => mapProcedure(r, loadSteps(Number(r.id))));
}

export function getWorkflowProcedureByCode(code: string): WorkflowProcedureDto | null {
  const row = getDatabase()
    .prepare(`SELECT * FROM workflow_procedures WHERE code = ? AND enabled = 1`)
    .get(code) as Record<string, unknown> | undefined;
  if (!row) return null;
  return mapProcedure(row, loadSteps(Number(row.id)));
}

export function resolveProcedureForEntity(
  module: string,
  entityType: string,
  hotelId?: number | null,
): WorkflowProcedureDto | null {
  const rows = getDatabase()
    .prepare(`
      SELECT * FROM workflow_procedures
      WHERE module = ? AND entity_type = ? AND enabled = 1
      ORDER BY CASE WHEN hotel_id IS ? THEN 0 WHEN hotel_id IS NULL THEN 1 ELSE 2 END, sort_order
    `)
    .all(module, entityType, hotelId ?? null) as Record<string, unknown>[];

  const match = rows.find((r) => r.hotel_id == null || Number(r.hotel_id) === hotelId);
  if (!match) return null;
  return mapProcedure(match, loadSteps(Number(match.id)));
}

export interface WorkflowTriggerContext {
  amountTtc?: number;
  clientType?: string | null;
  ecartAmount?: number;
  gravite?: string;
  transmissionFailed?: boolean;
}

export function evaluateProcedureTrigger(procedure: WorkflowProcedureDto, ctx: WorkflowTriggerContext): boolean {
  const cfg = procedure.triggerConfig ?? {};
  switch (procedure.triggerType) {
    case 'always':
      return true;
    case 'manual':
      return false;
    case 'amount_threshold': {
      const key = String(cfg.settingKey ?? '');
      const def = Number(cfg.defaultAmount ?? 0);
      const seuil = key ? Number(readSetting(key, String(def))) : def;
      return (ctx.amountTtc ?? 0) > seuil;
    }
    case 'amount_or_client_type': {
      const key = String(cfg.settingKey ?? '');
      const def = Number(cfg.defaultAmount ?? 0);
      const seuil = key ? Number(readSetting(key, String(def))) : def;
      const types = Array.isArray(cfg.clientTypes) ? cfg.clientTypes.map(String) : ['entreprise'];
      return (ctx.amountTtc ?? 0) > seuil || (ctx.clientType != null && types.includes(ctx.clientType));
    }
    case 'ecart_detected':
      return Math.abs(ctx.ecartAmount ?? 0) >= Number(cfg.minEcart ?? 0.01);
    case 'gravite_incident': {
      const levels = Array.isArray(cfg.levels) ? cfg.levels.map(String) : ['grave', 'critique'];
      return ctx.gravite != null && levels.includes(ctx.gravite);
    }
    case 'transmission_echec':
      return Boolean(ctx.transmissionFailed);
    default:
      return false;
  }
}

export function getCompletedStepCount(workflow: WorkflowInstance): number {
  if (['valide', 'valide_dec', 'cloture'].includes(workflow.statut)) {
    return workflow.niveauValidation;
  }
  if (workflow.statut === 'valide_unite') return 1;
  if (workflow.statut === 'en_validation') return workflow.niveauValidation;
  if (workflow.statut === 'soumis') return 0;
  return 0;
}

export function getCurrentStep(
  procedure: WorkflowProcedureDto,
  workflow: WorkflowInstance,
): WorkflowProcedureStepDto | null {
  if (!procedure.steps.length) return null;
  if (['refuse', 'annule', 'cloture', 'valide'].includes(workflow.statut) && workflow.completedAt) {
    return null;
  }
  const idx = Math.min(Math.max(workflow.niveauValidation, 0), procedure.steps.length - 1);
  if (workflow.statut === 'soumis' || workflow.statut === 'en_validation' || workflow.statut === 'valide_unite') {
    const byStatut = procedure.steps.find((s) => s.targetStatut === workflow.statut);
    if (byStatut) return byStatut;
    return procedure.steps[idx] ?? procedure.steps[0];
  }
  if (workflow.statut === 'valide_dec') {
    return procedure.steps.find((s) => s.stepOrder > 2) ?? procedure.steps[procedure.steps.length - 1];
  }
  return procedure.steps[0];
}

export function getNextStep(
  procedure: WorkflowProcedureDto,
  workflow: WorkflowInstance,
): WorkflowProcedureStepDto | null {
  const current = getCurrentStep(procedure, workflow);
  if (!current) return null;
  return procedure.steps.find((s) => s.stepOrder === current.stepOrder + 1) ?? null;
}

export function resolveApprovalTargetStatut(
  procedure: WorkflowProcedureDto,
  workflow: WorkflowInstance,
): WorkflowStatut {
  const current = getCurrentStep(procedure, workflow);
  if (!current) {
    return (procedure.steps[procedure.steps.length - 1]?.targetStatut ?? 'valide') as WorkflowStatut;
  }
  return current.targetStatut as WorkflowStatut;
}

export function canActorApproveStep(
  actorUserId: number,
  procedure: WorkflowProcedureDto,
  workflow: WorkflowInstance,
): boolean {
  const actor = getActorContext(actorUserId);
  if (isGlobalAdminRole(actor.roleCode)) return true;

  const step = getCurrentStep(procedure, workflow);
  if (!step) return false;

  if (step.approverRoles.includes(actor.roleCode)) return true;
  return step.approverPermissions.some((p) => userHasPermission(actorUserId, p));
}

export function getWorkflowPendingContext(
  actorUserId: number,
  workflow: WorkflowInstance,
): WorkflowPendingContext {
  const procedure = resolveProcedureForEntity(workflow.module, workflow.entityType, workflow.hotelId);
  if (!procedure) {
    return {
      workflowId: workflow.id,
      procedureCode: null,
      procedureLabel: workflow.module,
      currentStepLabel: 'Approbation',
      stepIndex: 1,
      stepTotal: 1,
      canApprove: true,
      canReject: true,
      approvalMode: 'hub',
      moduleRoute: null,
      hint: null,
    };
  }

  const step = getCurrentStep(procedure, workflow);
  const stepIndex = step?.stepOrder ?? 1;
  const canApprove = step ? canActorApproveStep(actorUserId, procedure, workflow) : false;
  const hubAllowed = procedure.approvalMode !== 'module_only';

  return {
    workflowId: workflow.id,
    procedureCode: procedure.code,
    procedureLabel: procedure.label,
    currentStepLabel: step?.label ?? 'Terminé',
    stepIndex,
    stepTotal: procedure.steps.length,
    canApprove: canApprove && hubAllowed,
    canReject: canApprove && hubAllowed,
    approvalMode: procedure.approvalMode,
    moduleRoute: procedure.moduleRoute,
    hint:
      procedure.approvalMode === 'module_only'
        ? 'Cette procédure se traite dans l\'écran métier dédié.'
        : step?.moduleAction
          ? 'L\'approbation met à jour l\'enregistrement métier automatiquement.'
          : null,
  };
}

export interface UpdateWorkflowProcedureInput {
  enabled?: boolean;
  label?: string;
  description?: string;
  autoSubmit?: boolean;
  triggerConfig?: Record<string, unknown>;
}

export function updateWorkflowProcedure(
  actorUserId: number,
  code: string,
  input: UpdateWorkflowProcedureInput,
): WorkflowProcedureDto {
  assertWorkflowAdmin(actorUserId);
  const row = getDatabase()
    .prepare(`SELECT * FROM workflow_procedures WHERE code = ?`)
    .get(code) as Record<string, unknown> | undefined;
  if (!row) throw new Error('Procédure introuvable.');

  const db = getDatabase();
  db.prepare(`
    UPDATE workflow_procedures SET
      enabled = COALESCE(?, enabled),
      label = COALESCE(?, label),
      description = COALESCE(?, description),
      auto_submit = COALESCE(?, auto_submit),
      trigger_config_json = COALESCE(?, trigger_config_json),
      updated_at = datetime('now')
    WHERE code = ?
  `).run(
    input.enabled != null ? (input.enabled ? 1 : 0) : null,
    input.label?.trim() || null,
    input.description?.trim() || null,
    input.autoSubmit != null ? (input.autoSubmit ? 1 : 0) : null,
    input.triggerConfig ? JSON.stringify(input.triggerConfig) : null,
    code,
  );

  writeAuditLog({
    userId: actorUserId,
    action: 'UPDATE',
    module: 'workflow',
    description: `Procédure workflow ${code} mise à jour`,
  });

  return mapProcedure(
    getDatabase().prepare(`SELECT * FROM workflow_procedures WHERE code = ?`).get(code) as Record<string, unknown>,
    loadSteps(Number(row.id)),
  );
}

export interface UpdateWorkflowStepInput {
  label?: string;
  approverRoles?: string[];
  approverPermissions?: string[];
  slaHours?: number | null;
}

export function updateWorkflowProcedureStep(
  actorUserId: number,
  stepId: number,
  input: UpdateWorkflowStepInput,
): WorkflowProcedureStepDto {
  assertWorkflowAdmin(actorUserId);
  const row = getDatabase()
    .prepare(`SELECT * FROM workflow_procedure_steps WHERE id = ?`)
    .get(stepId) as Record<string, unknown> | undefined;
  if (!row) throw new Error('Étape introuvable.');

  getDatabase().prepare(`
    UPDATE workflow_procedure_steps SET
      label = COALESCE(?, label),
      approver_roles_json = COALESCE(?, approver_roles_json),
      approver_permissions_json = COALESCE(?, approver_permissions_json),
      sla_hours = ?
    WHERE id = ?
  `).run(
    input.label?.trim() || null,
    input.approverRoles ? JSON.stringify(input.approverRoles) : null,
    input.approverPermissions ? JSON.stringify(input.approverPermissions) : null,
    input.slaHours ?? row.sla_hours,
    stepId,
  );

  writeAuditLog({
    userId: actorUserId,
    action: 'UPDATE',
    module: 'workflow',
    description: `Étape workflow #${stepId} mise à jour`,
  });

  return mapStep(getDatabase().prepare(`SELECT * FROM workflow_procedure_steps WHERE id = ?`).get(stepId) as Record<string, unknown>);
}

function assertWorkflowAdmin(actorUserId: number): void {
  const actor = getActorContext(actorUserId);
  if (isGlobalAdminRole(actor.roleCode) || actor.roleCode === 'PDG') return;
  if (!userHasPermission(actorUserId, 'users.manage')) {
    throw new Error('Accès réservé à l\'administration.');
  }
}

export function isWorkflowApproved(procedure: WorkflowProcedureDto | null, workflow: WorkflowInstance | null): boolean {
  if (!workflow) return false;
  if (!procedure) {
    return ['valide', 'valide_dec', 'cloture'].includes(workflow.statut);
  }
  const finalStatut = procedure.steps[procedure.steps.length - 1]?.targetStatut ?? 'valide';
  return workflow.statut === finalStatut;
}
