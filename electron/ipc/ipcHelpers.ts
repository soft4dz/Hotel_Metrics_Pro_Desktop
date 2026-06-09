import type { IpcMainInvokeEvent } from 'electron';
import { getDatabase } from '../database/sqlite';
import { PermissionError } from '../services/permissions.service';
import {
  bindSession,
  getSessionUserId,
  requireSessionUserId,
  SessionError,
} from '../services/session.service';

export interface IpcErrorResult {
  ok: false;
  error: string;
}

export type IpcResult<T> = { ok: true; data: T } | IpcErrorResult;

/** Patch dev temporaire — mettre à false pour exiger une session IPC. */
const DEV_AUTO_ADMIN_ACTOR = true;

const DEV_ADMIN_EMAIL = 'admin@hotelmetrics.local';

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
