import Electron from '../lib/electronApi';
import { wrapIpc } from './ipcHelpers';
import type { CreateEquipementInput, CreateInterventionInput, UpdateInterventionInput } from '../services/maintenance.service';
import { listEquipements, createEquipement, listInterventions, createIntervention, updateIntervention, getMaintenanceStats } from '../services/maintenance.service';

export function registerMaintenanceIpc(): void {
  Electron.ipcMain.handle('maintenance:listEquipements', (event, hotelId: number) =>
    wrapIpc(event, () => listEquipements(hotelId)));
  Electron.ipcMain.handle('maintenance:createEquipement', (event, input: CreateEquipementInput) =>
    wrapIpc(event, () => createEquipement(input)));
  Electron.ipcMain.handle('maintenance:listInterventions', (event, hotelId: number, statut?: string) =>
    wrapIpc(event, () => listInterventions(hotelId, statut)));
  Electron.ipcMain.handle('maintenance:createIntervention', (event, input: CreateInterventionInput) =>
    wrapIpc(event, (uid) => createIntervention(uid, input)));
  Electron.ipcMain.handle('maintenance:updateIntervention', (event, id: number, input: UpdateInterventionInput) =>
    wrapIpc(event, () => updateIntervention(id, input)));
  Electron.ipcMain.handle('maintenance:stats', (event, hotelId: number) =>
    wrapIpc(event, () => getMaintenanceStats(hotelId)));
}
