import { randomUUID } from 'node:crypto';

const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const REMEMBER_TTL_MS = 30 * 24 * 60 * 60 * 1000;

interface SessionRecord {
  userId: number;
  expiresAt: number;
}

/** Session active liée à une fenêtre (webContents.id). */
const webContentsSessions = new Map<number, SessionRecord>();

/** Jetons « mémoriser la session » persistés côté renderer. */
const rememberTokens = new Map<string, SessionRecord>();

export class SessionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SessionError';
  }
}

function isExpired(record: SessionRecord): boolean {
  return Date.now() > record.expiresAt;
}

function purgeExpired(): void {
  for (const [id, record] of webContentsSessions) {
    if (isExpired(record)) webContentsSessions.delete(id);
  }
  for (const [token, record] of rememberTokens) {
    if (isExpired(record)) rememberTokens.delete(token);
  }
}

export function bindSession(webContentsId: number, userId: number): void {
  purgeExpired();
  webContentsSessions.set(webContentsId, {
    userId,
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
}

export function createRememberToken(userId: number): string {
  purgeExpired();
  const token = randomUUID();
  rememberTokens.set(token, {
    userId,
    expiresAt: Date.now() + REMEMBER_TTL_MS,
  });
  return token;
}

export function restoreRememberToken(webContentsId: number, token: string): number | null {
  purgeExpired();
  const record = rememberTokens.get(token);
  if (!record || isExpired(record)) {
    rememberTokens.delete(token);
    return null;
  }
  bindSession(webContentsId, record.userId);
  return record.userId;
}

export function getSessionUserId(webContentsId: number): number | null {
  purgeExpired();
  const record = webContentsSessions.get(webContentsId);
  if (!record || isExpired(record)) {
    webContentsSessions.delete(webContentsId);
    return null;
  }
  return record.userId;
}

export function requireSessionUserId(webContentsId: number): number {
  const userId = getSessionUserId(webContentsId);
  if (userId === null) {
    throw new SessionError('Session expirée ou non authentifié.');
  }
  return userId;
}

export function clearWebContentsSession(webContentsId: number): void {
  webContentsSessions.delete(webContentsId);
}

export function revokeRememberToken(token: string): void {
  rememberTokens.delete(token);
}
