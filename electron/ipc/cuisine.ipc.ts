import Electron from '../lib/electronApi';
import { wrapIpc } from './ipcHelpers';
import {
  listRecettes,
  getRecette,
  createRecette,
  updateRecette,
  upsertRecetteLigne,
  removeRecetteLigne,
  validerRecette,
  listOrdresProduction,
  createOrdreProduction,
  executerOrdreProduction,
} from '../services/cuisine-production.service';
import { listVentesPos, enregistrerVentePos } from '../services/cuisine-pos.service';
import type {
  CreateRecetteInput,
  UpsertRecetteLigneInput,
  CreateOrdreProductionInput,
} from '../../src/shared/types/cuisine';
import type { EnregistrerVentePosInput } from '../../src/shared/types/cuisine';
import * as quality from '../services/cuisine-quality.service';

export function registerCuisineIpc(): void {
  Electron.ipcMain.handle('cuisine:recettes:list', (event, hotelId: number) =>
    wrapIpc(event, () => listRecettes(hotelId)));
  Electron.ipcMain.handle('cuisine:recettes:get', (event, id: number) =>
    wrapIpc(event, () => getRecette(id)));
  Electron.ipcMain.handle('cuisine:recettes:create', (event, input: CreateRecetteInput) =>
    wrapIpc(event, (uid) => createRecette(uid, input)));
  Electron.ipcMain.handle('cuisine:recettes:update', (event, id: number, input: Partial<CreateRecetteInput>) =>
    wrapIpc(event, (uid) => updateRecette(uid, id, input)));
  Electron.ipcMain.handle('cuisine:recettes:ligne:upsert', (event, recetteId: number, input: UpsertRecetteLigneInput, ligneId?: number) =>
    wrapIpc(event, (uid) => upsertRecetteLigne(uid, recetteId, input, ligneId)));
  Electron.ipcMain.handle('cuisine:recettes:ligne:remove', (event, recetteId: number, ligneId: number) =>
    wrapIpc(event, (uid) => removeRecetteLigne(uid, recetteId, ligneId)));
  Electron.ipcMain.handle('cuisine:recettes:valider', (event, id: number) =>
    wrapIpc(event, (uid) => validerRecette(uid, id)));
  Electron.ipcMain.handle('cuisine:ordres:list', (event, hotelId: number) =>
    wrapIpc(event, () => listOrdresProduction(hotelId)));
  Electron.ipcMain.handle('cuisine:ordres:create', (event, input: CreateOrdreProductionInput) =>
    wrapIpc(event, (uid) => createOrdreProduction(uid, input)));
  Electron.ipcMain.handle('cuisine:ordres:executer', (event, id: number) =>
    wrapIpc(event, (uid) => executerOrdreProduction(uid, id)));
  Electron.ipcMain.handle('cuisine:pos:list', (event, hotelId: number) =>
    wrapIpc(event, () => listVentesPos(hotelId)));
  Electron.ipcMain.handle('cuisine:pos:vente', (event, input: EnregistrerVentePosInput) =>
    wrapIpc(event, (uid) => enregistrerVentePos(uid, input)));
  Electron.ipcMain.handle('cuisine:quality:dashboard',(e,hotelId:number,from:string,to:string)=>wrapIpc(e,uid=>quality.qualityDashboard(uid,hotelId,from,to)));
  Electron.ipcMain.handle('cuisine:haccp:plans',(e,hotelId:number)=>wrapIpc(e,uid=>quality.listHaccpPlans(uid,hotelId)));
  Electron.ipcMain.handle('cuisine:haccp:create',(e,input)=>wrapIpc(e,uid=>quality.createHaccpPlan(uid,input)));
  Electron.ipcMain.handle('cuisine:haccp:controls',(e,planId:number,from?:string,to?:string)=>wrapIpc(e,uid=>quality.planControls(uid,planId,from,to)));
  Electron.ipcMain.handle('cuisine:haccp:record',(e,input)=>wrapIpc(e,uid=>quality.recordHaccpControl(uid,input)));
  Electron.ipcMain.handle('cuisine:haccp:close',(e,id:number,verification:string)=>wrapIpc(e,uid=>quality.closeHaccpAction(uid,id,verification)));
  Electron.ipcMain.handle('cuisine:temperatures:equipment',(e,hotelId:number)=>wrapIpc(e,uid=>quality.listTemperatureEquipment(uid,hotelId)));
  Electron.ipcMain.handle('cuisine:temperatures:saveEquipment',(e,input)=>wrapIpc(e,uid=>quality.saveTemperatureEquipment(uid,input)));
  Electron.ipcMain.handle('cuisine:temperatures:record',(e,input)=>wrapIpc(e,uid=>quality.recordTemperature(uid,input)));
  Electron.ipcMain.handle('cuisine:allergens:list',e=>wrapIpc(e,()=>quality.listAllergens()));
  Electron.ipcMain.handle('cuisine:allergens:setProduct',(e,productId:number,items)=>wrapIpc(e,uid=>quality.setProductAllergens(uid,productId,items)));
  Electron.ipcMain.handle('cuisine:allergens:syncRecipe',(e,recipeId:number)=>wrapIpc(e,uid=>quality.syncRecipeAllergens(uid,recipeId)));
  Electron.ipcMain.handle('cuisine:allergens:recipe',(e,recipeId:number)=>wrapIpc(e,uid=>quality.recipeAllergens(uid,recipeId)));
  Electron.ipcMain.handle('cuisine:waste:record',(e,input)=>wrapIpc(e,uid=>quality.recordWaste(uid,input)));
  Electron.ipcMain.handle('cuisine:production:cost',(e,orderId:number)=>wrapIpc(e,uid=>quality.closeProductionCost(uid,orderId)));
  Electron.ipcMain.handle('cuisine:traceability',(e,hotelId:number,search:string)=>wrapIpc(e,uid=>quality.traceability(uid,hotelId,search)));
  Electron.ipcMain.handle('cuisine:menuEngineering',(e,hotelId:number,from:string,to:string)=>wrapIpc(e,uid=>quality.menuEngineering(uid,hotelId,from,to)));
}
