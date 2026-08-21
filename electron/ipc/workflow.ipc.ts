import Electron from '../lib/electronApi';
import { wrapIpc } from './ipcHelpers';
import * as svc from '../services/workflow.service';
import * as proc from '../services/workflow-procedure.service';
import { assertPositiveInteger, assertText } from './validation';

export function registerWorkflowIpc(): void {
  Electron.ipcMain.handle('workflow:create', (event, input: svc.CreateWorkflowInput) =>
    wrapIpc(event, (uid) => svc.createWorkflow(uid, input)));

  Electron.ipcMain.handle('workflow:submit', (event, workflowId: number, commentaire?: string) =>
    wrapIpc(event, (uid) => svc.submitWorkflow(uid, assertPositiveInteger(workflowId, 'workflowId'), commentaire)));

  Electron.ipcMain.handle('workflow:approve', (event, workflowId: number, statut?: svc.WorkflowStatut, commentaire?: string) =>
    wrapIpc(event, (uid) => svc.approveWorkflow(uid, assertPositiveInteger(workflowId, 'workflowId'), statut, commentaire)));

  Electron.ipcMain.handle('workflow:reject', (event, workflowId: number, motif: string) =>
    wrapIpc(event, (uid) => {
      assertText(motif, 'motif', { required: true });
      return svc.rejectWorkflow(uid, assertPositiveInteger(workflowId, 'workflowId'), motif);
    }));

  Electron.ipcMain.handle('workflow:history', (event, workflowId: number) =>
    wrapIpc(event, (uid) => svc.getWorkflowHistory(uid, assertPositiveInteger(workflowId, 'workflowId'))));

  Electron.ipcMain.handle('workflow:listPending', (event, filters?: svc.WorkflowFilters) =>
    wrapIpc(event, (uid) => svc.listPendingWorkflows(uid, filters ?? {})));

  Electron.ipcMain.handle('workflow:listPendingWithContext', (event, filters?: svc.WorkflowFilters) =>
    wrapIpc(event, (uid) => svc.listPendingWorkflowsWithContext(uid, filters ?? {})));

  Electron.ipcMain.handle('workflow:find', (event, module: string, entityType: string, entityId: unknown) =>
    wrapIpc(event, (uid) => svc.findWorkflowForActor(uid, module, entityType, assertPositiveInteger(entityId, 'entityId'))));

  Electron.ipcMain.handle('workflowProcedures:list', (event) =>
    wrapIpc(event, (uid) => proc.listWorkflowProcedures(uid)));

  Electron.ipcMain.handle('workflowProcedures:update', (event, code: string, input: proc.UpdateWorkflowProcedureInput) =>
    wrapIpc(event, (uid) => proc.updateWorkflowProcedure(uid, code, input)));

  Electron.ipcMain.handle('workflowProcedures:updateStep', (event, stepId: number, input: proc.UpdateWorkflowStepInput) =>
    wrapIpc(event, (uid) => proc.updateWorkflowProcedureStep(uid, assertPositiveInteger(stepId, 'stepId'), input)));
}
