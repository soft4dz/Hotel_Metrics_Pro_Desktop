import Electron from '../lib/electronApi';
import { wrapIpc } from './ipcHelpers';
import * as rh from '../services/rh.service';
import type {
  CreateAbsenceInput,
  CreateContratInput,
  CreateDepartementInput,
  CreateEmployeInput,
  CreatePosteInput,
  CreateRecrutementInput,
  StatutAbsence,
  StatutRecrutement,
  UpsertPointageInput,
} from '../../src/shared/types/rh';

export function registerRhIpc(): void {
  Electron.ipcMain.handle('rh:dashboard', (event, dateDebut?: string, dateFin?: string) =>
    wrapIpc(event, (uid) => rh.getRhDashboard(uid, dateDebut, dateFin)));

  Electron.ipcMain.handle('rh:pendingAccountsCount', (event) =>
    wrapIpc(event, (uid) => rh.countPendingAccounts(uid)));

  Electron.ipcMain.handle('rh:monEspace', (event) =>
    wrapIpc(event, (uid) => rh.getMonEspace(uid)));

  Electron.ipcMain.handle('rh:departements:list', (event) =>
    wrapIpc(event, (uid) => rh.listDepartements(uid)));
  Electron.ipcMain.handle('rh:departements:create', (event, input: CreateDepartementInput) =>
    wrapIpc(event, (uid) => rh.createDepartement(uid, input)));

  Electron.ipcMain.handle('rh:postes:list', (event) =>
    wrapIpc(event, (uid) => rh.listPostes(uid)));
  Electron.ipcMain.handle('rh:postes:create', (event, input: CreatePosteInput) =>
    wrapIpc(event, (uid) => rh.createPoste(uid, input)));

  Electron.ipcMain.handle('rh:employes:list', (event, search?: string) =>
    wrapIpc(event, (uid) => rh.listEmployes(uid, search)));
  Electron.ipcMain.handle('rh:employes:get', (event, id: number) =>
    wrapIpc(event, (uid) => rh.getEmploye(uid, id)));
  Electron.ipcMain.handle('rh:employes:create', (event, input: CreateEmployeInput) =>
    wrapIpc(event, (uid) => rh.createEmploye(uid, input)));

  Electron.ipcMain.handle('rh:recrutements:list', (event, statut?: StatutRecrutement) =>
    wrapIpc(event, (uid) => rh.listRecrutements(uid, statut)));
  Electron.ipcMain.handle('rh:recrutements:create', (event, input: CreateRecrutementInput) =>
    wrapIpc(event, (uid) => rh.createRecrutement(uid, input)));
  Electron.ipcMain.handle('rh:recrutements:valider', (event, id: number) =>
    wrapIpc(event, (uid) => rh.validerRecrutement(uid, id)));
  Electron.ipcMain.handle('rh:recrutements:refuser', (event, id: number, motif?: string) =>
    wrapIpc(event, (uid) => rh.refuserRecrutement(uid, id, motif)));

  Electron.ipcMain.handle('rh:contrats:list', (event, employeId: number) =>
    wrapIpc(event, (uid) => rh.listContrats(uid, employeId)));
  Electron.ipcMain.handle('rh:contrats:create', (event, input: CreateContratInput) =>
    wrapIpc(event, (uid) => rh.createContrat(uid, input)));

  Electron.ipcMain.handle('rh:pointages:list', (event, dateDebut?: string, dateFin?: string, employeId?: number) =>
    wrapIpc(event, (uid) => rh.listPointages(uid, dateDebut, dateFin, employeId)));
  Electron.ipcMain.handle('rh:pointages:upsert', (event, input: UpsertPointageInput) =>
    wrapIpc(event, (uid) => rh.upsertPointage(uid, input)));
  Electron.ipcMain.handle('rh:pointages:soumettre', (event, id: number) =>
    wrapIpc(event, (uid) => rh.soumettrePointage(uid, id)));
  Electron.ipcMain.handle('rh:pointages:valider', (event, id: number, approuve: boolean) =>
    wrapIpc(event, (uid) => rh.validerPointage(uid, id, approuve)));

  Electron.ipcMain.handle('rh:absences:list', (event, statut?: StatutAbsence) =>
    wrapIpc(event, (uid) => rh.listAbsences(uid, statut)));
  Electron.ipcMain.handle('rh:absences:create', (event, input: CreateAbsenceInput) =>
    wrapIpc(event, (uid) => rh.createAbsence(uid, input)));
  Electron.ipcMain.handle('rh:absences:decider', (event, id: number, approuve: boolean) =>
    wrapIpc(event, (uid) => rh.deciderAbsence(uid, id, approuve)));
}
