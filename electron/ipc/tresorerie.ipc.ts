import Electron from '../lib/electronApi';
import * as tresorerieService from '../services/tresorerie.service';
import { wrapIpc } from './ipcHelpers';

export function registerTresorerieIpc(): void {
  // Dashboard
  Electron.ipcMain.handle('tresorerie:dashboard', (event, hotelId?: number) =>
    wrapIpc(event, (actorUserId) => tresorerieService.getDashboard(actorUserId, hotelId)),
  );

  // Encaissements
  Electron.ipcMain.handle('tresorerie:encaissements:list', (event, filters: tresorerieService.EncaissementFilters) =>
    wrapIpc(event, (actorUserId) => tresorerieService.listEncaissements(actorUserId, filters)),
  );

  Electron.ipcMain.handle('tresorerie:encaissements:create', (event, input: tresorerieService.CreateEncaissementInput) =>
    wrapIpc(event, (actorUserId) => tresorerieService.createEncaissement(actorUserId, input)),
  );

  Electron.ipcMain.handle('tresorerie:encaissements:update', (event, id: number, input: Partial<tresorerieService.CreateEncaissementInput>) =>
    wrapIpc(event, (actorUserId) => tresorerieService.updateEncaissement(actorUserId, id, input)),
  );

  Electron.ipcMain.handle('tresorerie:encaissements:confirmer', (event, id: number) =>
    wrapIpc(event, (actorUserId) => tresorerieService.confirmerEncaissement(actorUserId, id)),
  );

  Electron.ipcMain.handle('tresorerie:encaissements:rejeter', (event, id: number, motif: string) =>
    wrapIpc(event, (actorUserId) => tresorerieService.rejeterEncaissement(actorUserId, id, motif)),
  );

  Electron.ipcMain.handle('tresorerie:encaissements:delete', (event, id: number) =>
    wrapIpc(event, (actorUserId) => tresorerieService.deleteEncaissement(actorUserId, id)),
  );

  // Comptes bancaires
  Electron.ipcMain.handle('tresorerie:comptes:list', (event, hotelId?: number) =>
    wrapIpc(event, (actorUserId) => tresorerieService.listComptesBancaires(actorUserId, hotelId)),
  );

  Electron.ipcMain.handle('tresorerie:comptes:create', (event, input: tresorerieService.CreateCompteInput) =>
    wrapIpc(event, (actorUserId) => tresorerieService.createCompteBancaire(actorUserId, input)),
  );

  Electron.ipcMain.handle('tresorerie:comptes:update', (event, id: number, input: Partial<tresorerieService.CreateCompteInput>) =>
    wrapIpc(event, (actorUserId) => tresorerieService.updateCompteBancaire(actorUserId, id, input)),
  );

  Electron.ipcMain.handle('tresorerie:comptes:delete', (event, id: number) =>
    wrapIpc(event, (actorUserId) => tresorerieService.deleteCompteBancaire(actorUserId, id)),
  );

  // Journal de caisse
  Electron.ipcMain.handle('tresorerie:caisse:list', (event, hotelId: number, dateDebut: string, dateFin: string) =>
    wrapIpc(event, (actorUserId) => tresorerieService.getJournalCaisse(actorUserId, hotelId, dateDebut, dateFin)),
  );

  Electron.ipcMain.handle('tresorerie:caisse:add', (event, input: tresorerieService.AddCaisseInput) =>
    wrapIpc(event, (actorUserId) => tresorerieService.addOperationCaisse(actorUserId, input)),
  );

  Electron.ipcMain.handle('tresorerie:caisse:delete', (event, id: number) =>
    wrapIpc(event, (actorUserId) => tresorerieService.deleteOperationCaisse(actorUserId, id)),
  );
}
