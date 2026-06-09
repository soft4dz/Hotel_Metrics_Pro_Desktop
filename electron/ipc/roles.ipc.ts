import Electron from '../lib/electronApi';
import * as rolesService from '../services/roles.service';
import { wrapIpc } from './ipcHelpers';

export function registerRolesIpc(): void {
  Electron.ipcMain.handle('roles:list', (event) =>
    wrapIpc(event, (actorUserId) => rolesService.listRoles(actorUserId)),
  );

  Electron.ipcMain.handle('roles:listForSelect', (event) =>
    wrapIpc(event, (actorUserId) => rolesService.listRolesForSelect(actorUserId)),
  );

  Electron.ipcMain.handle('roles:listPermissions', (event) =>
    wrapIpc(event, (actorUserId) => rolesService.listPermissions(actorUserId)),
  );

  Electron.ipcMain.handle(
    'roles:updatePermissions',
    (event, roleId: number, permissionCodes: string[]) =>
      wrapIpc(event, (actorUserId) =>
        rolesService.updateRolePermissions(actorUserId, roleId, permissionCodes),
      ),
  );
}
