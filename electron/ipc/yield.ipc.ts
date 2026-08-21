import Electron from '../lib/electronApi';
import { wrapIpc } from './ipcHelpers';
import * as svc from '../services/yield.service';
import type {
  CreateYieldRuleInput, UpdateYieldRuleInput,
  ComputeYieldSuggestionsInput, ApplyYieldSuggestionsInput,
} from '../../src/shared/types/yield';

export function registerYieldIpc(): void {
  Electron.ipcMain.handle('yield:listRules', (e, hotelId?: number) =>
    wrapIpc(e, (uid) => svc.listYieldRules(uid, hotelId)));
  Electron.ipcMain.handle('yield:createRule', (e, input: CreateYieldRuleInput) =>
    wrapIpc(e, (uid) => svc.createYieldRule(uid, input)));
  Electron.ipcMain.handle('yield:updateRule', (e, id: number, input: UpdateYieldRuleInput) =>
    wrapIpc(e, (uid) => svc.updateYieldRule(uid, id, input)));
  Electron.ipcMain.handle('yield:toggleRule', (e, id: number, actif: boolean) =>
    wrapIpc(e, (uid) => svc.toggleYieldRule(uid, id, actif)));
  Electron.ipcMain.handle('yield:deleteRule', (e, id: number) =>
    wrapIpc(e, (uid) => svc.deleteYieldRule(uid, id)));
  Electron.ipcMain.handle('yield:computeSuggestions', (e, input: ComputeYieldSuggestionsInput) =>
    wrapIpc(e, (uid) => svc.computeYieldSuggestions(uid, input)));
  Electron.ipcMain.handle('yield:applySuggestions', (e, input: ApplyYieldSuggestionsInput) =>
    wrapIpc(e, (uid) => svc.applyYieldSuggestions(uid, input)));
}
