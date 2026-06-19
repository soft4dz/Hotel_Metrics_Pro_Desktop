import Electron from '../lib/electronApi';
import { wrapIpc, wrapIpcAsync } from './ipcHelpers';
import type {
  CreateReportTemplateInput,
  ReportFilters,
  UpdateReportTemplateInput,
} from '../../src/shared/types/reports';
import * as reportsService from '../services/reports.service';

export function registerReportsIpc(): void {
  Electron.ipcMain.handle('reports:semanticCatalog', (event) =>
    wrapIpc(event, (uid) => reportsService.listSemanticCatalogForUser(uid)));

  Electron.ipcMain.handle(
    'reports:compatibleFields',
    (event, dimensions: string[], measures: string[]) =>
      wrapIpc(event, (uid) => reportsService.getCompatibleSemanticFields(uid, dimensions, measures)),
  );

  Electron.ipcMain.handle(
    'reports:previewComposed',
    (event, composition: import('../../src/shared/types/reports').ReportComposition, filters?: ReportFilters) =>
      wrapIpc(event, (uid) => reportsService.previewComposedReport(uid, composition, filters ?? {})),
  );

  Electron.ipcMain.handle(
    'reports:exportComposed',
    (event, composition: import('../../src/shared/types/reports').ReportComposition, filters?: ReportFilters, name?: string) =>
      wrapIpcAsync(event, (uid) => reportsService.exportComposedReport(uid, composition, filters ?? {}, name)),
  );

  Electron.ipcMain.handle('reports:overview', (event) =>
    wrapIpc(event, (uid) => reportsService.getReportsOverview(uid)));

  Electron.ipcMain.handle('reports:catalog', (event) =>
    wrapIpc(event, (uid) => reportsService.listReportSourceCatalog(uid)));

  Electron.ipcMain.handle('reports:listSources', (event) =>
    wrapIpc(event, (uid) => reportsService.listReportDataSources(uid)));

  Electron.ipcMain.handle('reports:listTemplates', (event) =>
    wrapIpc(event, (uid) => reportsService.listReportTemplates(uid)));

  Electron.ipcMain.handle('reports:getTemplate', (event, id: number) =>
    wrapIpc(event, (uid) => reportsService.getReportTemplate(uid, id)));

  Electron.ipcMain.handle('reports:createTemplate', (event, input: CreateReportTemplateInput) =>
    wrapIpc(event, (uid) => reportsService.createReportTemplate(uid, input)));

  Electron.ipcMain.handle('reports:updateTemplate', (event, id: number, input: UpdateReportTemplateInput) =>
    wrapIpc(event, (uid) => reportsService.updateReportTemplate(uid, id, input)));

  Electron.ipcMain.handle('reports:duplicateTemplate', (event, id: number, newName?: string) =>
    wrapIpc(event, (uid) => reportsService.duplicateReportTemplate(uid, id, newName)));

  Electron.ipcMain.handle('reports:deleteTemplate', (event, id: number) =>
    wrapIpc(event, (uid) => { reportsService.deleteReportTemplate(uid, id); return true; }));

  Electron.ipcMain.handle(
    'reports:preview',
    (event, dataSource: string, columns: string[], filters?: ReportFilters) =>
      wrapIpc(event, (uid) => reportsService.previewReport(uid, dataSource, columns, filters ?? {})),
  );

  Electron.ipcMain.handle(
    'reports:previewKpi',
    (event, kpiId: string, filters?: ReportFilters) =>
      wrapIpc(event, (uid) => reportsService.previewKpiReport(uid, kpiId, filters ?? {})),
  );

  Electron.ipcMain.handle('reports:exportTemplate', (event, templateId: number) =>
    wrapIpcAsync(event, (uid) => reportsService.exportReportTemplate(uid, templateId)));

  Electron.ipcMain.handle(
    'reports:exportAdHoc',
    (event, dataSource: string, columns: string[], filters?: ReportFilters, name?: string) =>
      wrapIpcAsync(event, (uid) => reportsService.exportAdHocReport(uid, dataSource, columns, filters ?? {}, name)),
  );

  Electron.ipcMain.handle(
    'reports:exportKpi',
    (event, kpiId: string, filters?: ReportFilters) =>
      wrapIpcAsync(event, (uid) => reportsService.exportKpiReport(uid, kpiId, filters ?? {})),
  );

  Electron.ipcMain.handle('reports:listRuns', (event, limit?: number) =>
    wrapIpc(event, (uid) => reportsService.listReportRuns(uid, limit)));
}
