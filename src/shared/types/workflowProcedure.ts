export type WorkflowProcedureTriggerType =
  | 'manual'
  | 'always'
  | 'amount_threshold'
  | 'amount_or_client_type'
  | 'ecart_detected'
  | 'gravite_incident'
  | 'transmission_echec';

export type WorkflowApprovalMode = 'hub' | 'module_only' | 'hybrid';

export interface WorkflowProcedureStepDto {
  id: number;
  procedureId: number;
  stepOrder: number;
  stepCode: string;
  label: string;
  targetStatut: string;
  approverRoles: string[];
  approverPermissions: string[];
  slaHours: number | null;
  moduleAction: string | null;
}

export interface WorkflowProcedureDto {
  id: number;
  code: string;
  module: string;
  entityType: string;
  label: string;
  description: string | null;
  enabled: boolean;
  hotelId: number | null;
  triggerType: WorkflowProcedureTriggerType;
  triggerConfig: Record<string, unknown>;
  autoSubmit: boolean;
  approvalMode: WorkflowApprovalMode;
  moduleRoute: string | null;
  sortOrder: number;
  steps: WorkflowProcedureStepDto[];
}

export interface WorkflowPendingContext {
  workflowId: number;
  procedureCode: string | null;
  procedureLabel: string;
  currentStepLabel: string;
  stepIndex: number;
  stepTotal: number;
  canApprove: boolean;
  canReject: boolean;
  approvalMode: WorkflowApprovalMode;
  moduleRoute: string | null;
  hint: string | null;
}

export interface WorkflowPendingItem {
  workflow: import('./phase2').WorkflowInstance;
  context: WorkflowPendingContext;
}

export interface UpdateWorkflowProcedureInput {
  enabled?: boolean;
  label?: string;
  description?: string;
  autoSubmit?: boolean;
  triggerConfig?: Record<string, unknown>;
}

export interface UpdateWorkflowStepInput {
  label?: string;
  approverRoles?: string[];
  approverPermissions?: string[];
  slaHours?: number | null;
}
