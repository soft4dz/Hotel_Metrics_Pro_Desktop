import Electron from '../lib/electronApi';
import * as usersService from '../services/users.service';
import { wrapIpc } from './ipcHelpers';

export function registerUsersIpc(): void {
  Electron.ipcMain.handle('users:list', (event, search?: string) =>
    wrapIpc(event, (actorUserId) => usersService.listUsers(actorUserId, search)),
  );

  Electron.ipcMain.handle('users:get', (event, id: number) =>
    wrapIpc(event, (actorUserId) => usersService.getUser(actorUserId, id)),
  );

  Electron.ipcMain.handle(
    'users:create',
    (event, input: usersService.CreateUserInput) =>
      wrapIpc(event, (actorUserId) => usersService.createUser(actorUserId, input)),
  );

  Electron.ipcMain.handle(
    'users:update',
    (event, id: number, input: usersService.UpdateUserInput) =>
      wrapIpc(event, (actorUserId) => usersService.updateUser(actorUserId, id, input)),
  );

  Electron.ipcMain.handle(
    'users:deactivate',
    (event, id: number, reason: string) =>
      wrapIpc(event, (actorUserId) => {
        usersService.deactivateUser(actorUserId, id, reason);
        return true;
      }),
  );
}
