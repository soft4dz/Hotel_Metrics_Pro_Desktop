import Electron from '../lib/electronApi';
import * as authService from '../services/auth.service';
import {
  bindSession,
  clearWebContentsSession,
  getSessionUserId,
} from '../services/session.service';

export interface LoginIpcResult extends authService.LoginResult {
  sessionToken?: string;
}

export function registerAuthIpc(): void {
  Electron.ipcMain.handle(
    'auth:login',
    (event, payload: { email: string; password: string; rememberMe?: boolean }): LoginIpcResult => {
      const result = authService.login(payload.email, payload.password);
      if (!result.success || !result.user) {
        return result;
      }

      bindSession(event.sender.id, result.user.id);

      // La persistance de session reste volontairement désactivée tant qu'un
      // stockage chiffré lié au poste (DPAPI/safeStorage) n'est pas déployé.
      return result;
    },
  );

  Electron.ipcMain.handle('auth:restore', (): LoginIpcResult => ({
    success: false,
    error: 'La restauration automatique de session est désactivée pour des raisons de sécurité.',
  }));

  Electron.ipcMain.handle('auth:logout', (event): { ok: boolean } => {
    const userId = getSessionUserId(event.sender.id);
    if (userId) {
      const user = authService.getUserById(userId);
      if (user) authService.logout(user);
    }
    clearWebContentsSession(event.sender.id);
    return { ok: true };
  });

  Electron.ipcMain.handle('auth:getCurrentUser', (event): authService.AuthUserDto | null => {
    const userId = getSessionUserId(event.sender.id);
    if (!userId) return null;
    return authService.getUserById(userId);
  });

  Electron.ipcMain.handle('auth:getProfile', (event) => {
    const userId = getSessionUserId(event.sender.id);
    if (!userId) return null;
    return authService.getUserProfile(userId);
  });

  Electron.ipcMain.handle(
    'auth:changePassword',
    (event, payload: { currentPassword: string; newPassword: string }) => {
      const userId = getSessionUserId(event.sender.id);
      if (!userId) {
        return { success: false, error: 'Session expirée.' };
      }
      return authService.changePassword(userId, payload.currentPassword, payload.newPassword);
    },
  );
}
