import Electron from '../lib/electronApi';
import * as dashboardService from '../services/dashboard.service';
import { wrapIpc } from './ipcHelpers';

export function registerDashboardIpc(): void {
  Electron.ipcMain.handle(
    'dashboard:get',
    (event, filters: dashboardService.DashboardFilters) =>
      wrapIpc(event, (actorUserId) => dashboardService.getDashboard(actorUserId, filters)),
  );
}
