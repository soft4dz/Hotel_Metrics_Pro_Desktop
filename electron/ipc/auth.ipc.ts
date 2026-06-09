import Electron from '../lib/electronApi';
import * as authService from '../services/auth.service';
import {
  bindSession,
  clearWebContentsSession,
  createRememberToken,
  getSessionUserId,
  restoreRememberToken,
  revokeRememberToken,
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
      let sessionToken: string | undefined;
      if (payload.rememberMe) {
        sessionToken = createRememberToken(result.user.id);
      }

      return { ...result, sessionToken };
    },
  );

  Electron.ipcMain.handle(
    'auth:restore',
    (event, sessionToken: string): LoginIpcResult => {
      if (!sessionToken?.trim()) {
        return { success: false, error: 'Session invalide.' };
      }
      const userId = restoreRememberToken(event.sender.id, sessionToken.trim());
      if (!userId) {
        return { success: false, error: 'Session expirée. Veuillez vous reconnecter.' };
      }
      const user = authService.getUserById(userId);
      if (!user) {
        revokeRememberToken(sessionToken.trim());
        clearWebContentsSession(event.sender.id);
        return { success: false, error: 'Compte introuvable ou inactif.' };
      }
      return { success: true, user, sessionToken: sessionToken.trim() };
    },
  );

  Electron.ipcMain.handle('auth:logout', (event, sessionToken?: string): { ok: boolean } => {
    const userId = getSessionUserId(event.sender.id);
    if (userId) {
      const user = authService.getUserById(userId);
      if (user) authService.logout(user);
    }
    clearWebContentsSession(event.sender.id);
    if (sessionToken) revokeRememberToken(sessionToken);
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
