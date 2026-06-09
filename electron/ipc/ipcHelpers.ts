import type { IpcMainInvokeEvent } from 'electron';
import { PermissionError } from '../services/permissions.service';
import { requireSessionUserId, SessionError } from '../services/session.service';

export interface IpcErrorResult {
  ok: false;
  error: string;
}

export type IpcResult<T> = { ok: true; data: T } | IpcErrorResult;

export function requireActor(event: IpcMainInvokeEvent): number {
  return requireSessionUserId(event.sender.id);
}

export function wrapIpc<T>(event: IpcMainInvokeEvent, fn: (actorUserId: number) => T): IpcResult<T> {
  try {
    const actorUserId = requireActor(event);
    return { ok: true, data: fn(actorUserId) };
  } catch (err) {
    if (err instanceof PermissionError || err instanceof SessionError) {
      return { ok: false, error: err.message };
    }
    if (err instanceof Error) {
      return { ok: false, error: err.message };
    }
    return { ok: false, error: 'Erreur inconnue.' };
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
    if (err instanceof PermissionError || err instanceof SessionError) {
      return { ok: false, error: err.message };
    }
    if (err instanceof Error) {
      return { ok: false, error: err.message };
    }
    return { ok: false, error: 'Erreur inconnue.' };
  }
}

export function wrapIpcPublic<T>(fn: () => T): IpcResult<T> {
  try {
    return { ok: true, data: fn() };
  } catch (err) {
    if (err instanceof Error) {
      return { ok: false, error: err.message };
    }
    return { ok: false, error: 'Erreur inconnue.' };
  }
}

export async function wrapIpcPublicAsync<T>(fn: () => Promise<T> | T): Promise<IpcResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (err) {
    if (err instanceof Error) {
      return { ok: false, error: err.message };
    }
    return { ok: false, error: 'Erreur inconnue.' };
  }
}
