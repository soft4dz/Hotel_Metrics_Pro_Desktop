import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockDb = { prepare: vi.fn() };

vi.mock('../database/sqlite', () => ({ getDatabase: () => mockDb }));

function chain(row?: unknown) {
  return {
    all: vi.fn(() => (Array.isArray(row) ? row : row ? [row] : [])),
    get: vi.fn(() => (Array.isArray(row) ? row[0] : row)),
    run: vi.fn(),
  };
}

describe('user-preferences.service', () => {
  beforeEach(() => {
    vi.resetModules();
    mockDb.prepare.mockReset();
  });

  it('retourne les valeurs par défaut si aucune préférence enregistrée', async () => {
    mockDb.prepare.mockImplementation((sql: string) => {
      if (sql.includes('SELECT ui_preferences_json')) return chain({ ui_preferences_json: null });
      return chain(undefined);
    });
    const svc = await import('./user-preferences.service');
    const prefs = svc.getUserUiPreferences(1);
    expect(prefs.layoutProfileId).toBe('standard');
    expect(prefs.sidebarCollapsed).toBe(false);
  });

  it('enregistre et relit un profil compact', async () => {
    let stored: string | null = null;
    mockDb.prepare.mockImplementation((sql: string) => {
      if (sql.includes('SELECT ui_preferences_json')) {
        return chain({ ui_preferences_json: stored });
      }
      if (sql.includes('UPDATE users SET ui_preferences_json')) {
        return {
          run: vi.fn((_json: string) => {
            stored = _json;
          }),
        };
      }
      return chain(undefined);
    });
    const svc = await import('./user-preferences.service');
    const saved = svc.saveUserUiPreferences(2, {
      layoutProfileId: 'compact',
      sidebarCollapsed: true,
      accentColor: 'slate',
      density: 'compact',
      notifPrefs: svc.getUserUiPreferences(2).notifPrefs,
    });
    expect(saved.layoutProfileId).toBe('compact');
    const loaded = svc.getUserUiPreferences(2);
    expect(loaded.sidebarCollapsed).toBe(true);
    expect(loaded.density).toBe('compact');
  });
});
