import Electron from '../lib/electronApi';

import * as databaseService from '../services/database.service';

import { wrapIpc, wrapIpcAsync } from './ipcHelpers';



export function registerDatabaseIpc(): void {

  Electron.ipcMain.handle('database:getInfo', (event) =>

    wrapIpc(event, (actorUserId) => databaseService.getDatabaseInfo(actorUserId)),

  );



  Electron.ipcMain.handle('database:integrityCheck', (event) =>

    wrapIpc(event, (actorUserId) => databaseService.runIntegrityCheck(actorUserId)),

  );



  Electron.ipcMain.handle('database:vacuum', (event) =>

    wrapIpc(event, (actorUserId) => databaseService.runVacuum(actorUserId)),

  );



  Electron.ipcMain.handle('database:pickImportFile', (event) =>

    wrapIpcAsync(event, (actorUserId) => databaseService.pickLegacyImportFile(actorUserId)),

  );



  Electron.ipcMain.handle('database:importLegacy', (event, filePath: string) =>

    wrapIpc(event, (actorUserId) => databaseService.importLegacyFromFile(actorUserId, filePath)),

  );

}


