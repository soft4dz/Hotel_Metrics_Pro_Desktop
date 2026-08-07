import {
  closeDailyClosure,
  rejectDailyClosure,
  validateDailyClosureDec,
  validateDailyClosureUnit,
} from './daily-closure.service';
import { validateReconciliation } from './finance-reconciliation.service';

const HANDLERS: Record<string, (actorUserId: number, entityId: number, motif?: string) => void> = {
  'cloture.validateUnit': (uid, id) => {
    validateDailyClosureUnit(uid, id, { syncWorkflow: false });
  },
  'cloture.validateDec': (uid, id) => {
    validateDailyClosureDec(uid, id, { syncWorkflow: false });
  },
  'cloture.close': (uid, id) => {
    closeDailyClosure(uid, id, { syncWorkflow: false });
  },
  'cloture.reject': (uid, id, motif) => {
    rejectDailyClosure(uid, id, motif ?? 'Refus workflow', { syncWorkflow: false });
  },
  'rapprochement.validate': (uid, id) => {
    validateReconciliation(uid, id, { syncWorkflow: false });
  },
};

export function executeWorkflowModuleAction(
  action: string,
  actorUserId: number,
  entityId: number,
  motif?: string,
): void {
  const handler = HANDLERS[action];
  if (!handler) return;
  handler(actorUserId, entityId, motif);
}

export function listWorkflowModuleActions(): string[] {
  return Object.keys(HANDLERS);
}
