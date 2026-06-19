import Electron from '../lib/electronApi';
import { wrapIpc } from './ipcHelpers';
import type { CreateTicketInput } from '../services/parking.service';
import { getConfig, saveConfig, listTickets, entreeVehicule, sortieVehicule, getParkingStats } from '../services/parking.service';

export function registerParkingIpc(): void {
  Electron.ipcMain.handle('parking:getConfig', (event, hotelId: number) =>
    wrapIpc(event, () => getConfig(hotelId)));
  Electron.ipcMain.handle('parking:saveConfig', (event, hotelId: number, input: Partial<Parameters<typeof saveConfig>[1]>) =>
    wrapIpc(event, () => saveConfig(hotelId, input)));
  Electron.ipcMain.handle('parking:listTickets', (event, hotelId: number, statut?: string) =>
    wrapIpc(event, () => listTickets(hotelId, statut)));
  Electron.ipcMain.handle('parking:entree', (event, input: CreateTicketInput) =>
    wrapIpc(event, () => entreeVehicule(input)));
  Electron.ipcMain.handle('parking:sortie', (event, ticketId: number) =>
    wrapIpc(event, () => sortieVehicule(ticketId)));
  Electron.ipcMain.handle('parking:stats', (event, hotelId: number) =>
    wrapIpc(event, () => getParkingStats(hotelId)));
}
