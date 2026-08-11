import Electron from '../lib/electronApi';
import { listDemoAccountsForLogin } from '../database/profileSeed';
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

type LoginPayload = {
  email: string;
  password: string;
  rememberMe?: boolean;
};

type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseLoginPayload(value: unknown): LoginPayload | null {
  if (!isRecord(value)) return null;
  const email = typeof value.email === 'string' ? value.email.trim() : '';
  const password = typeof value.password === 'string' ? value.password : '';
  if (!email || email.length > 254 || !email.includes('@')) return null;
  if (!password || password.length > 256) return null;
  if (value.rememberMe !== undefined && typeof value.rememberMe !== 'boolean') return null;
  return { email, password, rememberMe: value.rememberMe as boolean | undefined };
}

function parseChangePasswordPayload(value: unknown): ChangePasswordPayload | null {
  if (!isRecord(value)) return null;
  const currentPassword =
    typeof value.currentPassword === 'string' ? value.currentPassword : '';
  const newPassword = typeof value.newPassword === 'string' ? value.newPassword : '';
  if (!currentPassword || currentPassword.length > 256) return null;
  if (!newPassword || newPassword.length > 256) return null;
  return { currentPassword, newPassword };
}

function parseSessionToken(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const token = value.trim();
  return token && token.length <= 512 ? token : null;
}

export function registerAuthIpc(): void {
  Electron.ipcMain.handle('auth:listDemoAccounts', () => listDemoAccountsForLogin());

  Electron.ipcMain.handle(
    'auth:login',
    (event, rawPayload: unknown): LoginIpcResult => {
      const payload = parseLoginPayload(rawPayload);
      if (!payload) {
        return { success: false, error: 'Identifiants invalides.' };
      }

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
    (event, rawSessionToken: unknown): LoginIpcResult => {
      const sessionToken = parseSessionToken(rawSessionToken);
      if (!sessionToken) {
        return { success: false, error: 'Session invalide.' };
      }
      const userId = restoreRememberToken(event.sender.id, sessionToken);
      if (!userId) {
        return { success: false, error: 'Session expirée. Veuillez vous reconnecter.' };
      }
      const user = authService.getUserById(userId);
      if (!user) {
        revokeRememberToken(sessionToken);
        clearWebContentsSession(event.sender.id);
        return { success: false, error: 'Compte introuvable ou inactif.' };
      }
      return { success: true, user, sessionToken };
    },
  );

  Electron.ipcMain.handle('auth:logout', (event, rawSessionToken?: unknown): { ok: boolean } => {
    const userId = getSessionUserId(event.sender.id);
    if (userId) {
      const user = authService.getUserById(userId);
      if (user) authService.logout(user);
    }
    clearWebContentsSession(event.sender.id);
    const sessionToken = parseSessionToken(rawSessionToken);
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
    (event, rawPayload: unknown) => {
      const userId = getSessionUserId(event.sender.id);
      if (!userId) {
        return { success: false, error: 'Session expirée.' };
      }
      const payload = parseChangePasswordPayload(rawPayload);
      if (!payload) {
        return { success: false, error: 'Données de mot de passe invalides.' };
      }
      return authService.changePassword(
        userId,
        payload.currentPassword,
        payload.newPassword,
      );
    },
  );
}
