import Electron from '../lib/electronApi';
import { wrapIpc } from './ipcHelpers';
import * as svc from '../services/notifications.service';
import { assertObject, assertPositiveInteger, assertText } from './validation';

export function registerNotificationsIpc(): void {
  Electron.ipcMain.handle('notifications:list', (event, unreadOnly?: boolean, limit?: number) =>
    wrapIpc(event, (uid) => svc.listNotifications(uid, Boolean(unreadOnly), limit ?? 50)));

  Electron.ipcMain.handle('notifications:countUnread', (event) =>
    wrapIpc(event, (uid) => svc.countUnreadNotifications(uid)));

  Electron.ipcMain.handle('notifications:markRead', (event, id: unknown) =>
    wrapIpc(event, (uid) => svc.markNotificationRead(uid, assertPositiveInteger(id, 'id'))));

  Electron.ipcMain.handle('notifications:markAllRead', (event) =>
    wrapIpc(event, (uid) => svc.markAllNotificationsRead(uid)));

  Electron.ipcMain.handle('notifications:getRules', (event) =>
    wrapIpc(event, () => svc.getNotificationRules()));

  Electron.ipcMain.handle('notifications:updateRule', (event, input: unknown) =>
    wrapIpc(event, (uid) => {
      const o = assertObject<Record<string, unknown>>(input, 'input');
      return svc.updateNotificationRule(
        uid,
        assertText(o.code, 'code', { required: true, maxLength: 50 }),
        Boolean(o.actif),
      );
    }));

  Electron.ipcMain.handle('notifications:generateSystem', (event) =>
    wrapIpc(event, (uid) => svc.generateSystemNotifications(uid)));
}
