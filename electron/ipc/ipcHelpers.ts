import type { IpcMainInvokeEvent } from 'electron';
import { logger } from '../utils/logger';
import { PermissionError } from '../services/permissions.service';
import { requireSessionUserId, SessionError } from '../services/session.service';
import { IpcValidationError } from './validation';

export type IpcErrorCode =
  | 'FORBIDDEN'
  | 'SESSION_EXPIRED'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'SERVER_ERROR';

export interface IpcErrorResult {
  ok: false;
  error: string;
  errorCode: IpcErrorCode;
}

export type IpcResult<T> = { ok: true; data: T } | IpcErrorResult;

function classifyError(err: Error): IpcErrorCode {
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
    const errorCode = classifyError(err);
    if (errorCode === 'SERVER_ERROR') {
      logger.error('Erreur IPC non gérée', err);
      return {
        ok: false,
        error: 'Une erreur interne est survenue. Consultez les journaux applicatifs.',
        errorCode,
      };
    }
    return { ok: false, error: err.message, errorCode };
  }

  logger.error('Erreur IPC inconnue', err);
  return {
    ok: false,
    error: 'Une erreur interne est survenue. Consultez les journaux applicatifs.',
    errorCode: 'SERVER_ERROR',
  };
}

/**
 * Résout l'acteur uniquement à partir d'une session authentifiée liée au
 * webContents appelant. Aucun compte administrateur implicite n'est autorisé,
 * y compris en développement.
 */
export function requireActor(event: IpcMainInvokeEvent): number {
  return requireSessionUserId(event.sender.id);
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
