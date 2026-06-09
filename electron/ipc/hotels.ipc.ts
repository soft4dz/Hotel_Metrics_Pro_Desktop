import Electron from '../lib/electronApi';
import * as hotelsService from '../services/hotels.service';
import { wrapIpc, wrapIpcAsync } from './ipcHelpers';

export function registerHotelsIpc(): void {
  Electron.ipcMain.handle('hotels:list', (event) =>
    wrapIpc(event, (actorUserId) => hotelsService.listHotels(actorUserId)),
  );

  Electron.ipcMain.handle('hotels:get', (event, id: number) =>
    wrapIpc(event, (actorUserId) => hotelsService.getHotel(actorUserId, id)),
  );

  Electron.ipcMain.handle(
    'hotels:create',
    (event, input: hotelsService.CreateHotelInput) =>
      wrapIpc(event, (actorUserId) => hotelsService.createHotel(actorUserId, input)),
  );

  Electron.ipcMain.handle(
    'hotels:update',
    (event, id: number, input: hotelsService.UpdateHotelInput) =>
      wrapIpc(event, (actorUserId) => hotelsService.updateHotel(actorUserId, id, input)),
  );

  Electron.ipcMain.handle('hotels:pickLogo', (event, hotelId: number) =>
    wrapIpcAsync(event, (actorUserId) => hotelsService.setHotelLogoFromPicker(actorUserId, hotelId)),
  );

  Electron.ipcMain.handle('hotels:removeLogo', (event, hotelId: number) =>
    wrapIpc(event, (actorUserId) => hotelsService.removeHotelLogo(actorUserId, hotelId)),
  );

  Electron.ipcMain.handle(
    'hotels:deactivate',
    (event, id: number, reason: string) =>
      wrapIpc(event, (actorUserId) => {
        hotelsService.deactivateHotel(actorUserId, id, reason);
        return true;
      }),
  );
}
