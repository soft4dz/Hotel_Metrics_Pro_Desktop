import Electron from '../lib/electronApi';
import { importLegacyDatabase } from '../database/importLegacyData';
import { wrapIpc } from './ipcHelpers';

export function registerImportIpc(): void {
  Electron.ipcMain.handle('import:legacy', (event, filePath: string) =>
    wrapIpc(event, () => importLegacyDatabase(filePath)),
  );
}
