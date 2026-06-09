/**
 * API Electron via import namespace (imports nommés multiples depuis 'electron' cassent le chargement ESM).
 */
import * as Electron from 'electron';

export default Electron;

export type { IpcMainInvokeEvent, BrowserWindow as ElectronBrowserWindow } from 'electron';
