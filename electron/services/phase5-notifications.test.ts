import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockDb = {
  prepare: vi.fn(),
};

vi.mock('../database/sqlite', () => ({
  getDatabase: () => mockDb,
}));

vi.mock('./audit.service', () => ({
  writeAuditLog: vi.fn(),
}));

describe('Phase 5 — notifications backend', () => {
  beforeEach(() => {
    vi.resetModules();
    mockDb.prepare.mockReset();
  });

  it('createNotification insère notification et delivery', async () => {
    mockDb.prepare.mockImplementation(() => ({
      run: vi.fn(() => ({ lastInsertRowid: 1 })),
      get: vi.fn(() => ({
        id: 1,
        user_id: 2,
        type: 'info',
        titre: 'Test',
        message: 'Message test',
        lien: null,
        lu: 0,
        created_at: '2026-01-01',
      })),
    }));
    const svc = await import('./notifications.service');
    const n = svc.createNotification({ userId: 2, type: 'info', titre: 'Test', message: 'Message test' });
    expect(n.titre).toBe('Test');
    expect(n.lu).toBe(false);
  });

  it('countUnreadNotifications retourne le total', async () => {
    mockDb.prepare.mockReturnValue({
      get: vi.fn(() => ({ c: 3 })),
    });
    const svc = await import('./notifications.service');
    expect(svc.countUnreadNotifications(1)).toBe(3);
  });
});
