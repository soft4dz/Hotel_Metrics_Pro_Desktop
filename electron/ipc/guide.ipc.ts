import Electron from '../lib/electronApi';
import * as guideService from '../services/guide.service';
import { wrapIpc } from './ipcHelpers';

export function registerGuideIpc(): void {
  Electron.ipcMain.handle('guide:list', (event) =>
    wrapIpc(event, () => guideService.listGuides()));

  Electron.ipcMain.handle('guide:get', (event, slug: string) =>
    wrapIpc(event, () => guideService.getGuide(slug)));

  Electron.ipcMain.handle('guide:search', (event, query: string) =>
    wrapIpc(event, () => guideService.searchGuides(query)));

  Electron.ipcMain.handle('guide:sections', (event) =>
    wrapIpc(event, () => guideService.getGuideSections()));

  Electron.ipcMain.handle('guide:suggested', (event) =>
    wrapIpc(event, (uid) => guideService.getSuggestedGuideSlug(uid)));

  Electron.ipcMain.handle('guide:roleProfiles', (event) =>
    wrapIpc(event, () => guideService.listRoleProfiles()));
}
