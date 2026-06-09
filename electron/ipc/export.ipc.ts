import Electron from '../lib/electronApi';
import * as exportService from '../services/export.service';
import type { DashboardFilters } from '../services/dashboard.service';
import { wrapIpcAsync } from './ipcHelpers';

export function registerExportIpc(): void {
  Electron.ipcMain.handle(
    'export:excel',
    (event, kind: exportService.ExportKind) =>
      wrapIpcAsync(event, (actorUserId) => exportService.exportExcel(actorUserId, kind)),
  );

  Electron.ipcMain.handle(
    'export:facturePdf',
    (event, factureId: number) =>
      wrapIpcAsync(event, (actorUserId) => exportService.exportFacturePdf(actorUserId, factureId)),
  );

  Electron.ipcMain.handle(
    'export:dashboardExcel',
    (event, filters: DashboardFilters) =>
      wrapIpcAsync(event, (actorUserId) => exportService.exportDashboardExcel(actorUserId, filters)),
  );

  Electron.ipcMain.handle(
    'export:dashboardPdf',
    (event, filters: DashboardFilters) =>
      wrapIpcAsync(event, (actorUserId) => exportService.exportDashboardPdf(actorUserId, filters)),
  );
}
