import { createHash, randomBytes } from 'node:crypto';
import { hostname } from 'node:os';
import { getDatabase } from '../database/sqlite';

const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

interface SessionRecord {
  userId: number;
  expiresAt: number;
}

/** Session active liée à une fenêtre (webContents.id). */
const webContentsSessions = new Map<number, SessionRecord>();

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
  getDatabase().prepare(`
    DELETE FROM auth_remember_tokens
    WHERE expires_at <= datetime('now') OR revoked_at IS NOT NULL
  `).run();
}

function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
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
  const token = randomBytes(32).toString('base64url');
  getDatabase().prepare(`
    INSERT INTO auth_remember_tokens (token_hash, user_id, machine_id, expires_at)
    VALUES (?, ?, ?, datetime('now', '+30 days'))
  `).run(tokenHash(token), userId, hostname());
  return token;
}

export interface RestoredRememberSession {
  userId: number;
  sessionToken: string;
}

export function restoreRememberToken(webContentsId: number, token: string): RestoredRememberSession | null {
  purgeExpired();
  const hash = tokenHash(token);
  const row = getDatabase().prepare(`
    SELECT user_id FROM auth_remember_tokens
    WHERE token_hash=? AND revoked_at IS NULL AND expires_at > datetime('now')
  `).get(hash) as { user_id: number } | undefined;
  if (!row) {
    return null;
  }

  // Rotation à chaque restauration : un ancien jeton copié ne reste pas réutilisable.
  const nextToken = getDatabase().transaction(() => {
    getDatabase().prepare(`
      UPDATE auth_remember_tokens SET revoked_at=datetime('now'), last_used_at=datetime('now')
      WHERE token_hash=?
    `).run(hash);
    return createRememberToken(row.user_id);
  })();
  bindSession(webContentsId, row.user_id);
  return { userId: row.user_id, sessionToken: nextToken };
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
  getDatabase().prepare(`
    UPDATE auth_remember_tokens SET revoked_at=datetime('now')
    WHERE token_hash=? AND revoked_at IS NULL
  `).run(tokenHash(token));
}
