import Electron from '../lib/electronApi';
import { wrapIpc } from './ipcHelpers';
import type {
  CreateHousekeepingTacheInput,
  StatutTacheHousekeeping,
  UpdateChecklistItemInput,
  UpdateHousekeepingTacheInput,
} from '../../src/shared/types/housekeeping';
import {
  createTache,
  getHousekeepingStats,
  listChecklistItems,
  listChambresMenageSansTache,
  listTaches,
  syncTachesFromChambresMenage,
  updateChecklistItem,
  updateTache,
} from '../services/housekeeping.service';
import * as advanced from '../services/housekeeping-advanced.service';

export function registerHousekeepingIpc(): void {
  Electron.ipcMain.handle('housekeeping:listTaches', (event, hotelId: number, statut?: StatutTacheHousekeeping, datePrevue?: string) =>
    wrapIpc(event, () => listTaches(hotelId, statut, datePrevue)));

  Electron.ipcMain.handle('housekeeping:createTache', (event, input: CreateHousekeepingTacheInput) =>
    wrapIpc(event, (uid) => createTache(uid, input)));

  Electron.ipcMain.handle('housekeeping:updateTache', (event, id: number, input: UpdateHousekeepingTacheInput) =>
    wrapIpc(event, (uid) => updateTache(uid, id, input)));

  Electron.ipcMain.handle('housekeeping:listChecklistItems', (event, tacheId: number) =>
    wrapIpc(event, () => listChecklistItems(tacheId)));

  Electron.ipcMain.handle('housekeeping:updateChecklistItem', (event, itemId: number, input: UpdateChecklistItemInput) =>
    wrapIpc(event, () => updateChecklistItem(itemId, input)));

  Electron.ipcMain.handle('housekeeping:stats', (event, hotelId: number) =>
    wrapIpc(event, () => getHousekeepingStats(hotelId)));

  Electron.ipcMain.handle('housekeeping:syncFromChambres', (event, hotelId: number) =>
    wrapIpc(event, (uid) => syncTachesFromChambresMenage(uid, hotelId)));

  Electron.ipcMain.handle('housekeeping:chambresMenageSansTache', (event, hotelId: number) =>
    wrapIpc(event, () => listChambresMenageSansTache(hotelId)));
  Electron.ipcMain.handle('housekeeping:mobile:planning',(event,hotelId:number,date:string,assigneeId?:number)=>wrapIpc(event,uid=>advanced.mobilePlanning(uid,hotelId,date,assigneeId)));
  Electron.ipcMain.handle('housekeeping:planning:balance',(event,hotelId:number,date:string,userIds:number[])=>wrapIpc(event,uid=>advanced.balanceDay(uid,hotelId,date,userIds)));
  Electron.ipcMain.handle('housekeeping:inspection:create',(event,input)=>wrapIpc(event,uid=>advanced.inspect(uid,input)));
  Electron.ipcMain.handle('housekeeping:photo:add',(event,input)=>wrapIpc(event,uid=>advanced.addPhoto(uid,input)));
  Electron.ipcMain.handle('housekeeping:minibar:record',(event,input)=>wrapIpc(event,uid=>advanced.recordMinibar(uid,input)));
  Electron.ipcMain.handle('housekeeping:linen:list',(event,hotelId:number)=>wrapIpc(event,uid=>advanced.listLinen(uid,hotelId)));
  Electron.ipcMain.handle('housekeeping:linen:save',(event,input)=>wrapIpc(event,uid=>advanced.saveLinenArticle(uid,input)));
  Electron.ipcMain.handle('housekeeping:linen:move',(event,input)=>wrapIpc(event,uid=>advanced.moveLinen(uid,input)));
  Electron.ipcMain.handle('housekeeping:lost-found:list',(event,hotelId:number)=>wrapIpc(event,uid=>advanced.listLostFound(uid,hotelId)));
  Electron.ipcMain.handle('housekeeping:lost-found:create',(event,input)=>wrapIpc(event,uid=>advanced.createLostFound(uid,input)));
  Electron.ipcMain.handle('housekeeping:lost-found:update',(event,id:number,input)=>wrapIpc(event,uid=>advanced.updateLostFound(uid,id,input)));
  Electron.ipcMain.handle('housekeeping:rooms:block',(event,input)=>wrapIpc(event,uid=>advanced.blockRoom(uid,input)));
  Electron.ipcMain.handle('housekeeping:rooms:release',(event,id:number)=>wrapIpc(event,uid=>advanced.releaseRoom(uid,id)));
  Electron.ipcMain.handle('housekeeping:advanced:dashboard',(event,hotelId:number,date:string)=>wrapIpc(event,uid=>advanced.advancedDashboard(uid,hotelId,date)));
}
