import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => {
  const tokens = new Map<string, { userId: number; revoked: boolean }>();
  const db = {
    prepare: vi.fn((sql: string) => ({
      run: vi.fn((...args: unknown[]) => {
        if (sql.includes('INSERT INTO auth_remember_tokens')) {
          tokens.set(String(args[0]), { userId: Number(args[1]), revoked: false });
        } else if (sql.includes('UPDATE auth_remember_tokens SET revoked_at')) {
          const row = tokens.get(String(args[0]));
          if (row) row.revoked = true;
        }
        return { changes: 1 };
      }),
      get: vi.fn((hash: string) => {
        if (!sql.includes('SELECT user_id FROM auth_remember_tokens')) return undefined;
        const row = tokens.get(hash);
        return row && !row.revoked ? { user_id: row.userId } : undefined;
      }),
    })),
    transaction: vi.fn((fn: () => unknown) => fn),
  };
  return { db, tokens };
});

vi.mock('../database/sqlite', () => ({ getDatabase: () => state.db }));

import {
  createRememberToken,
  getSessionUserId,
  restoreRememberToken,
  revokeRememberToken,
} from './session.service';

describe('remember sessions', () => {
  beforeEach(() => {
    state.tokens.clear();
    state.db.prepare.mockClear();
  });

  it('stocke seulement le hash du jeton persistant', () => {
    const token = createRememberToken(7);
    const hash = createHash('sha256').update(token).digest('hex');

    expect(token.length).toBeGreaterThanOrEqual(40);
    expect(state.tokens.has(token)).toBe(false);
    expect(state.tokens.get(hash)).toEqual({ userId: 7, revoked: false });
  });

  it('restaure la session puis fait tourner le jeton', () => {
    const first = createRememberToken(9);
    const restored = restoreRememberToken(123, first);

    expect(restored?.userId).toBe(9);
    expect(restored?.sessionToken).not.toBe(first);
    expect(getSessionUserId(123)).toBe(9);
    expect(restoreRememberToken(124, first)).toBeNull();
  });

  it('refuse un jeton révoqué', () => {
    const token = createRememberToken(11);
    revokeRememberToken(token);
    expect(restoreRememberToken(200, token)).toBeNull();
  });
});
