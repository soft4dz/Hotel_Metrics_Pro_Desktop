import Electron from '../lib/electronApi';
import * as rubriquesService from '../services/rubriques.service';
import { wrapIpc } from './ipcHelpers';

export function registerRubriquesIpc(): void {
  Electron.ipcMain.handle('rubriques:list', (event) =>
    wrapIpc(event, (actorUserId) => rubriquesService.listRubriques(actorUserId)),
  );

  Electron.ipcMain.handle(
    'rubriques:create',
    (event, input: rubriquesService.CreateRubriqueInput) =>
      wrapIpc(event, (actorUserId) => rubriquesService.createRubrique(actorUserId, input)),
  );

  Electron.ipcMain.handle(
    'rubriques:update',
    (event, id: number, input: rubriquesService.UpdateRubriqueInput) =>
      wrapIpc(event, (actorUserId) => rubriquesService.updateRubrique(actorUserId, id, input)),
  );

  Electron.ipcMain.handle('rubriques:delete', (event, id: number) =>
    wrapIpc(event, (actorUserId) => rubriquesService.deleteRubrique(actorUserId, id)),
  );

  Electron.ipcMain.handle(
    'rubriques:reorder',
    (event, items: rubriquesService.ReorderRubriqueItem[]) =>
      wrapIpc(event, (actorUserId) => rubriquesService.reorderRubriques(actorUserId, items)),
  );
}
