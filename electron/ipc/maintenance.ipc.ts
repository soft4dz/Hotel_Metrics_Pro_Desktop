import Electron from '../lib/electronApi';
import { wrapIpc } from './ipcHelpers';
import {
  INTERVENTION_PRIORITES,
  INTERVENTION_STATUTS,
  INTERVENTION_TYPES,
  listEquipements,
  createEquipement,
  listInterventions,
  createIntervention,
  updateIntervention,
  getMaintenanceStats,
} from '../services/maintenance.service';
import * as advanced from '../services/maintenance-advanced.service';
import { assertAmount, assertDateJournal, assertEnum, assertObject, assertPositiveInteger, assertText } from './validation';

function optionalDate(value: unknown, label: string): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  return assertDateJournal(value, label);
}

export function registerMaintenanceIpc(): void {
  Electron.ipcMain.handle('maintenance:listEquipements', (event, hotelId: unknown) =>
    wrapIpc(event, (uid) => listEquipements(uid, assertPositiveInteger(hotelId, 'hotelId'))));
  Electron.ipcMain.handle('maintenance:createEquipement', (event, input: unknown) =>
    wrapIpc(event, (uid) => {
      const o = assertObject<Record<string, unknown>>(input, 'input');
      return createEquipement(uid, {
        hotelId: assertPositiveInteger(o.hotelId, 'hotelId'),
        code: assertText(o.code, 'code', { required: true, maxLength: 50 }),
        designation: assertText(o.designation, 'designation', { required: true, maxLength: 200 }),
        categorie: o.categorie ? assertText(o.categorie, 'categorie', { maxLength: 50 }) : undefined,
        localisation: o.localisation ? assertText(o.localisation, 'localisation', { maxLength: 200 }) : undefined,
        marque: o.marque ? assertText(o.marque, 'marque', { maxLength: 100 }) : undefined,
        modele: o.modele ? assertText(o.modele, 'modele', { maxLength: 100 }) : undefined,
        numSerie: o.numSerie ? assertText(o.numSerie, 'numSerie', { maxLength: 100 }) : undefined,
        dateAchat: o.dateAchat ? assertDateJournal(o.dateAchat, 'dateAchat') : undefined,
        garantieFin: o.garantieFin ? assertDateJournal(o.garantieFin, 'garantieFin') : undefined,
      });
    }));
  Electron.ipcMain.handle('maintenance:listInterventions', (event, hotelId: unknown, statut?: unknown) =>
    wrapIpc(event, (uid) => listInterventions(
      uid,
      assertPositiveInteger(hotelId, 'hotelId'),
      statut ? assertEnum(statut, 'statut', INTERVENTION_STATUTS) : undefined,
    )));
  Electron.ipcMain.handle('maintenance:createIntervention', (event, input: unknown) =>
    wrapIpc(event, (uid) => {
      const o = assertObject<Record<string, unknown>>(input, 'input');
      return createIntervention(uid, {
        hotelId: assertPositiveInteger(o.hotelId, 'hotelId'),
        equipementId: o.equipementId != null ? assertPositiveInteger(o.equipementId, 'equipementId') : undefined,
        typeIntervention: o.typeIntervention ? assertEnum(o.typeIntervention, 'typeIntervention', INTERVENTION_TYPES) : undefined,
        titre: assertText(o.titre, 'titre', { required: true, maxLength: 200 }),
        description: o.description ? assertText(o.description, 'description', { maxLength: 3000 }) : undefined,
        priorite: o.priorite ? assertEnum(o.priorite, 'priorite', INTERVENTION_PRIORITES) : undefined,
        technicienId: o.technicienId != null ? assertPositiveInteger(o.technicienId, 'technicienId') : undefined,
        datePlanifiee: o.datePlanifiee ? assertDateJournal(o.datePlanifiee, 'datePlanifiee') : undefined,
      });
    }));
  Electron.ipcMain.handle('maintenance:updateIntervention', (event, id: unknown, input: unknown) =>
    wrapIpc(event, (uid) => {
      const o = assertObject<Record<string, unknown>>(input, 'input');
      return updateIntervention(uid, assertPositiveInteger(id, 'id'), {
        statut: o.statut !== undefined ? assertEnum(o.statut, 'statut', INTERVENTION_STATUTS) : undefined,
        technicienId: o.technicienId === null ? null : o.technicienId !== undefined ? assertPositiveInteger(o.technicienId, 'technicienId') : undefined,
        datePlanifiee: optionalDate(o.datePlanifiee, 'datePlanifiee'),
        dateDebut: optionalDate(o.dateDebut, 'dateDebut'),
        dateFin: optionalDate(o.dateFin, 'dateFin'),
        dureeHeures: o.dureeHeures === null ? null : o.dureeHeures !== undefined ? assertAmount(o.dureeHeures, 'dureeHeures') : undefined,
        coutPieces: o.coutPieces !== undefined ? assertAmount(o.coutPieces, 'coutPieces') : undefined,
        coutMainOeuvre: o.coutMainOeuvre !== undefined ? assertAmount(o.coutMainOeuvre, 'coutMainOeuvre') : undefined,
        rapport: o.rapport === null ? null : o.rapport !== undefined ? assertText(o.rapport, 'rapport', { maxLength: 5000 }) : undefined,
      });
    }));
  Electron.ipcMain.handle('maintenance:stats', (event, hotelId: unknown) =>
    wrapIpc(event, (uid) => getMaintenanceStats(uid, assertPositiveInteger(hotelId, 'hotelId'))));
  Electron.ipcMain.handle('maintenance:plans:list',(event,hotelId:number)=>wrapIpc(event,uid=>advanced.listPlans(uid,hotelId)));
  Electron.ipcMain.handle('maintenance:plans:create',(event,input)=>wrapIpc(event,uid=>advanced.createPlan(uid,input)));
  Electron.ipcMain.handle('maintenance:plans:generate',(event,through:string)=>wrapIpc(event,uid=>advanced.generateWorkOrders(uid,through)));
  Electron.ipcMain.handle('maintenance:sla:refresh',(event,hotelId:number)=>wrapIpc(event,uid=>advanced.refreshSla(uid,hotelId)));
  Electron.ipcMain.handle('maintenance:parts:consume',(event,input)=>wrapIpc(event,uid=>advanced.consumePart(uid,input)));
  Electron.ipcMain.handle('maintenance:labor:log',(event,input)=>wrapIpc(event,uid=>advanced.logLabor(uid,input)));
  Electron.ipcMain.handle('maintenance:contracts:list',(event,hotelId:number)=>wrapIpc(event,uid=>advanced.listContracts(uid,hotelId)));
  Electron.ipcMain.handle('maintenance:contracts:create',(event,input)=>wrapIpc(event,uid=>advanced.createContract(uid,input)));
  Electron.ipcMain.handle('maintenance:costs:report',(event,hotelId:number,from:string,to:string)=>wrapIpc(event,uid=>advanced.costReport(uid,hotelId,from,to)));
}
