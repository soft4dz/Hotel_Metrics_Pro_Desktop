import type { IpcMainInvokeEvent } from 'electron';
import { getDatabase } from '../database/sqlite';
import Electron from '../lib/electronApi';
import { PermissionError } from '../services/permissions.service';
import {
  bindSession,
  getSessionUserId,
  requireSessionUserId,
  SessionError,
} from '../services/session.service';
import { IpcValidationError } from './validation';

export type IpcErrorCode = 'FORBIDDEN' | 'SESSION_EXPIRED' | 'NOT_FOUND' | 'VALIDATION_ERROR' | 'LICENSE_READONLY' | 'SERVER_ERROR';

export interface IpcErrorResult {
  ok: false;
  error: string;
  errorCode: IpcErrorCode;
}

export type IpcResult<T> = { ok: true; data: T } | IpcErrorResult;

import { LicenseReadOnlyError } from '../services/license.service';

function classifyError(err: Error): IpcErrorCode {
  if (err instanceof LicenseReadOnlyError) return 'LICENSE_READONLY';
  if (err instanceof PermissionError) return 'FORBIDDEN';
  if (err instanceof SessionError) return 'SESSION_EXPIRED';
  if (err instanceof IpcValidationError) return 'VALIDATION_ERROR';
  if (err.message.toLowerCase().includes('introuvable')) return 'NOT_FOUND';
  return 'SERVER_ERROR';
}

function toIpcError(err: unknown): IpcErrorResult {
  if (err instanceof IpcValidationError) {
    return {
      ok: false,
      error: err.issues.length > 0 ? err.issues.join(' ; ') : err.message,
      errorCode: 'VALIDATION_ERROR',
    };
  }
  if (err instanceof Error) {
    return { ok: false, error: err.message, errorCode: classifyError(err) };
  }
  return { ok: false, error: 'Erreur inconnue.', errorCode: 'SERVER_ERROR' };
}

// Never infer a development mode from NODE_ENV: packaged Electron applications
// commonly leave it undefined. The shortcut must be both explicitly requested
// and impossible to enable in a packaged binary.
const DEV_AUTO_ADMIN_ACTOR =
  !Electron.app.isPackaged && process.env.HMP_DEV_AUTO_ADMIN === '1';

const DEV_ADMIN_EMAIL = 'admin@raqmi.local';

let cachedDevAdminUserId: number | null | undefined;

function resolveDevAdminUserId(): number | null {
  if (cachedDevAdminUserId !== undefined) return cachedDevAdminUserId;

  const db = getDatabase();
  const row = db
    .prepare(
      `SELECT id FROM users WHERE email = ? AND deleted_at IS NULL AND is_active = 1 LIMIT 1`,
    )
    .get(DEV_ADMIN_EMAIL) as { id: number } | undefined;

  cachedDevAdminUserId = row?.id ?? null;
  return cachedDevAdminUserId;
}

export function requireActor(event: IpcMainInvokeEvent): number {
  const webContentsId = event.sender.id;
  const sessionUserId = getSessionUserId(webContentsId);
  if (sessionUserId !== null) return sessionUserId;

  if (DEV_AUTO_ADMIN_ACTOR) {
    const adminId = resolveDevAdminUserId();
    if (adminId !== null) {
      bindSession(webContentsId, adminId);
      return adminId;
    }
  }

  return requireSessionUserId(webContentsId);
}

export function wrapIpc<T>(event: IpcMainInvokeEvent, fn: (actorUserId: number) => T): IpcResult<T> {
  try {
    const actorUserId = requireActor(event);
    return { ok: true, data: fn(actorUserId) };
  } catch (err) {
    return toIpcError(err);
  }
}

export async function wrapIpcAsync<T>(
  event: IpcMainInvokeEvent,
  fn: (actorUserId: number) => Promise<T> | T,
): Promise<IpcResult<T>> {
  try {
    const actorUserId = requireActor(event);
    const data = await fn(actorUserId);
    return { ok: true, data };
  } catch (err) {
    return toIpcError(err);
  }
}

export function wrapIpcPublic<T>(fn: () => T): IpcResult<T> {
  try {
    return { ok: true, data: fn() };
  } catch (err) {
    return toIpcError(err);
  }
}

export async function wrapIpcPublicAsync<T>(fn: () => Promise<T> | T): Promise<IpcResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (err) {
    return toIpcError(err);
  }
}
