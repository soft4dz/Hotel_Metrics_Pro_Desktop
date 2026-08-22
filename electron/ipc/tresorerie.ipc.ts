import Electron from '../lib/electronApi';
import * as tresorerieService from '../services/tresorerie.service';
import * as advanced from '../services/tresorerie-advanced.service';
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

  Electron.ipcMain.handle('tresorerie:ordres:list',(event,hotelId?:number)=>wrapIpc(event,(actor)=>advanced.listPaymentOrders(actor,hotelId)));
  Electron.ipcMain.handle('tresorerie:ordres:create',(event,input)=>wrapIpc(event,(actor)=>advanced.createPaymentOrder(actor,input)));
  Electron.ipcMain.handle('tresorerie:ordres:decide',(event,id:number,approved:boolean)=>wrapIpc(event,(actor)=>advanced.decidePaymentOrder(actor,id,approved)));
  Electron.ipcMain.handle('tresorerie:ordres:execute',(event,id:number)=>wrapIpc(event,(actor)=>advanced.executePaymentOrder(actor,id)));
  Electron.ipcMain.handle('tresorerie:forecast:list',(event,hotelId:number,from:string,to:string)=>wrapIpc(event,(actor)=>advanced.listForecast(actor,hotelId,from,to)));
  Electron.ipcMain.handle('tresorerie:forecast:create',(event,input)=>wrapIpc(event,(actor)=>advanced.createForecast(actor,input)));
  Electron.ipcMain.handle('tresorerie:bank:import',(event,input)=>wrapIpc(event,(actor)=>advanced.importBankStatement(actor,input)));
  Electron.ipcMain.handle('tresorerie:bank:lines',(event,accountId:number)=>wrapIpc(event,(actor)=>advanced.listBankLines(actor,accountId)));
  Electron.ipcMain.handle('tresorerie:bank:suggest',(event,lineId:number)=>wrapIpc(event,(actor)=>advanced.suggestReconciliation(actor,lineId)));
  Electron.ipcMain.handle('tresorerie:bank:confirm',(event,input)=>wrapIpc(event,(actor)=>advanced.confirmReconciliation(actor,input)));
  Electron.ipcMain.handle('tresorerie:cost-centers:list',(event,hotelId:number)=>wrapIpc(event,(actor)=>advanced.listCostCenters(actor,hotelId)));
  Electron.ipcMain.handle('tresorerie:cost-centers:create',(event,input)=>wrapIpc(event,(actor)=>advanced.createCostCenter(actor,input)));
  Electron.ipcMain.handle('tresorerie:cost-centers:allocate',(event,input)=>wrapIpc(event,(actor)=>advanced.allocateCost(actor,input)));
  Electron.ipcMain.handle('tresorerie:analytics:report',(event,hotelId:number,from:string,to:string)=>wrapIpc(event,(actor)=>advanced.analyticalReport(actor,hotelId,from,to)));
}
