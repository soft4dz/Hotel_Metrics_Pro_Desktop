import Electron from '../lib/electronApi';
import * as auditService from '../services/audit.service';
import { wrapIpc } from './ipcHelpers';

export function registerAuditIpc(): void {
  Electron.ipcMain.handle(
    'audit:list',
    (event, filters: auditService.AuditListFilters) =>
      wrapIpc(event, (actorUserId) => auditService.listAuditLogs(actorUserId, filters)),
  );
}
