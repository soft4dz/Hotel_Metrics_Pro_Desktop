import Electron from '../lib/electronApi';
import * as objectifsService from '../services/objectifs.service';
import { wrapIpc } from './ipcHelpers';

export function registerObjectifsIpc(): void {
  Electron.ipcMain.handle(
    'objectifs:list',
    (event, filters: objectifsService.ObjectifFilters) =>
      wrapIpc(event, (actorUserId) => objectifsService.listObjectifs(actorUserId, filters)),
  );

  Electron.ipcMain.handle(
    'objectifs:get',
    (event, hotelId: number, annee: number, mois: number) =>
      wrapIpc(event, (actorUserId) => objectifsService.getObjectif(actorUserId, hotelId, annee, mois)),
  );

  Electron.ipcMain.handle(
    'objectifs:save',
    (event, input: objectifsService.SaveObjectifInput) =>
      wrapIpc(event, (actorUserId) => objectifsService.saveObjectif(actorUserId, input)),
  );
}
