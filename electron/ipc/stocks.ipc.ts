import Electron from '../lib/electronApi';
import { wrapIpc } from './ipcHelpers';
import type { CreateProduitInput, CreateMouvementInput } from '../services/stocks.service';
import { listProduits, createProduit, getNiveaux, createMouvement, listCategories } from '../services/stocks.service';
import * as advanced from '../services/stocks-advanced.service';
import { assertAmount, assertArray, assertDateJournal, assertEnum, assertObject, assertPositiveInteger, assertText } from './validation';

export function registerStocksIpc(): void {
  Electron.ipcMain.handle('stocks:listProduits', (event) =>
    wrapIpc(event, () => listProduits()));
  Electron.ipcMain.handle('stocks:createProduit', (event, input: CreateProduitInput) =>
    wrapIpc(event, () => createProduit(input)));
  Electron.ipcMain.handle('stocks:getNiveaux', (event, hotelId: number) =>
    wrapIpc(event, () => getNiveaux(hotelId)));
  Electron.ipcMain.handle('stocks:createMouvement', (event, input: CreateMouvementInput) =>
    wrapIpc(event, (uid) => createMouvement(uid, input)));
  Electron.ipcMain.handle('stocks:listCategories', (event) =>
    wrapIpc(event, () => listCategories()));
  Electron.ipcMain.handle('stocks:magasins:list',(event,hotelId:unknown)=>wrapIpc(event,uid=>advanced.listMagasins(uid,assertPositiveInteger(hotelId,'hotelId'))));
  Electron.ipcMain.handle('stocks:magasins:create',(event,input:unknown)=>wrapIpc(event,uid=>{const o=assertObject<Record<string,unknown>>(input,'input');return advanced.createMagasin(uid,{hotelId:assertPositiveInteger(o.hotelId,'hotelId'),code:assertText(o.code,'code',{required:true,maxLength:30}),nom:assertText(o.nom,'nom',{required:true,maxLength:100}),type:assertEnum(o.type,'type',['principal','economat','cuisine','bar','maintenance','linge','autre'] as const),emplacement:o.emplacement?assertText(o.emplacement,'emplacement',{maxLength:200}):undefined,principal:o.principal===true});}));
  Electron.ipcMain.handle('stocks:magasins:niveaux',(event,hotelId:unknown)=>wrapIpc(event,uid=>advanced.listNiveauxMagasins(uid,assertPositiveInteger(hotelId,'hotelId'))));
  Electron.ipcMain.handle('stocks:lots:list',(event,hotelId:unknown,produitId?:unknown)=>wrapIpc(event,uid=>advanced.listLots(uid,assertPositiveInteger(hotelId,'hotelId'),produitId===undefined?undefined:assertPositiveInteger(produitId,'produitId'))));
  Electron.ipcMain.handle('stocks:lots:receive',(event,input:unknown)=>wrapIpc(event,uid=>{const o=assertObject<Record<string,unknown>>(input,'input');return advanced.receiveLot(uid,{magasinId:assertPositiveInteger(o.magasinId,'magasinId'),produitId:assertPositiveInteger(o.produitId,'produitId'),numeroLot:assertText(o.numeroLot,'numeroLot',{required:true,maxLength:100}),quantite:assertAmount(o.quantite,'quantite'),coutUnitaire:assertAmount(o.coutUnitaire,'coutUnitaire'),dateFabrication:o.dateFabrication?assertDateJournal(o.dateFabrication,'dateFabrication'):undefined,datePeremption:o.datePeremption?assertDateJournal(o.datePeremption,'datePeremption'):undefined,reference:o.reference?assertText(o.reference,'reference',{maxLength:100}):undefined});}));
  Electron.ipcMain.handle('stocks:lots:consumeFefo',(event,input:unknown)=>wrapIpc(event,uid=>{const o=assertObject<Record<string,unknown>>(input,'input');return advanced.consumeFefo(uid,{magasinId:assertPositiveInteger(o.magasinId,'magasinId'),produitId:assertPositiveInteger(o.produitId,'produitId'),quantite:assertAmount(o.quantite,'quantite'),motif:assertText(o.motif,'motif',{required:true,maxLength:500}),reference:o.reference?assertText(o.reference,'reference',{maxLength:100}):undefined});}));
  Electron.ipcMain.handle('stocks:transferts:list',(event,hotelId:unknown)=>wrapIpc(event,uid=>advanced.listTransferts(uid,assertPositiveInteger(hotelId,'hotelId'))));
  Electron.ipcMain.handle('stocks:transferts:create',(event,input:unknown)=>wrapIpc(event,uid=>{const o=assertObject<Record<string,unknown>>(input,'input');return advanced.createTransfert(uid,{sourceId:assertPositiveInteger(o.sourceId,'sourceId'),destinationId:assertPositiveInteger(o.destinationId,'destinationId'),dateTransfert:assertDateJournal(o.dateTransfert,'dateTransfert'),motif:o.motif?assertText(o.motif,'motif',{maxLength:500}):undefined,lignes:assertArray<unknown>(o.lignes,'lignes',1).map((raw,i)=>{const l=assertObject<Record<string,unknown>>(raw,`lignes[${i}]`);return{produitId:assertPositiveInteger(l.produitId,'produitId'),lotId:l.lotId===undefined?undefined:assertPositiveInteger(l.lotId,'lotId'),quantite:assertAmount(l.quantite,'quantite')}})});}));
  Electron.ipcMain.handle('stocks:transferts:validate',(event,id:unknown)=>wrapIpc(event,uid=>advanced.validateTransfert(uid,assertPositiveInteger(id,'id'))));
  Electron.ipcMain.handle('stocks:inventaires:list',(event,hotelId:unknown)=>wrapIpc(event,uid=>advanced.listInventaires(uid,assertPositiveInteger(hotelId,'hotelId'))));
  Electron.ipcMain.handle('stocks:inventaires:create',(event,input:unknown)=>wrapIpc(event,uid=>{const o=assertObject<Record<string,unknown>>(input,'input');return advanced.createInventaire(uid,assertPositiveInteger(o.magasinId,'magasinId'),assertDateJournal(o.dateInventaire,'dateInventaire'),o.observations?assertText(o.observations,'observations',{maxLength:1000}):undefined);}));
  Electron.ipcMain.handle('stocks:inventaires:lines',(event,id:unknown)=>wrapIpc(event,uid=>advanced.getInventoryLines(uid,assertPositiveInteger(id,'id'))));
  Electron.ipcMain.handle('stocks:inventaires:count',(event,inventaireId:unknown,produitId:unknown,quantite:unknown)=>wrapIpc(event,uid=>advanced.countInventoryLine(uid,assertPositiveInteger(inventaireId,'inventaireId'),assertPositiveInteger(produitId,'produitId'),assertAmount(quantite,'quantite'))));
  Electron.ipcMain.handle('stocks:inventaires:validate',(event,id:unknown)=>wrapIpc(event,uid=>advanced.validateInventory(uid,assertPositiveInteger(id,'id'))));
  Electron.ipcMain.handle('stocks:barcode',(event,hotelId:unknown,barcode:unknown)=>wrapIpc(event,uid=>advanced.findByBarcode(uid,assertPositiveInteger(hotelId,'hotelId'),assertText(barcode,'barcode',{required:true,maxLength:100}))));
}
