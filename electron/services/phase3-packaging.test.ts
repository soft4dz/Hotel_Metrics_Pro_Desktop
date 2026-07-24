import { describe, it, expect, beforeEach, vi } from 'vitest';

const settings = new Map<string, string>();

vi.mock('../lib/electronApi', () => ({
  default: {
    app: {
      isPackaged: true,
      getPath: () => 'C:\\Users\\Test\\AppData\\hotel-metrics-pro-desktop',
    },
  },
}));

vi.mock('../database/sqlite', () => ({
  getDatabase: () => ({
    prepare: vi.fn((sql: string) => ({
      get: (key?: string) => {
        if (sql.includes('app_settings') && sql.includes('WHERE key')) {
          const value = settings.get(String(key));
          return value !== undefined ? { value } : undefined;
        }
        return undefined;
      },
      run: (...args: unknown[]) => {
        if (sql.includes('INSERT OR REPLACE INTO app_settings')) {
          settings.set(String(args[0]), String(args[1]));
        }
      },
    })),
  }),
}));

vi.mock('./audit.service', () => ({
  writeAuditLog: vi.fn(),
}));

vi.mock('./actorContext', () => ({
  getActorContext: () => ({ roleCode: 'super_admin' }),
  isGlobalAdminRole: () => true,
}));

vi.mock('./permissions.service', () => ({
  assertPermission: vi.fn(),
  userHasPermission: () => true,
}));

describe('Phase 3 — Licence packaging', () => {
  beforeEach(() => {
    settings.clear();
    vi.resetModules();
  });

  it('génère et valide une clé RS-{edition}-{date}-{sig}', async () => {
    const svc = await import('./license.service');
    const key = svc.formatLicenseKey('PRO', '2027-12-31');
    expect(key).toMatch(/^RS-PRO-20271231-[A-F0-9]{8}$/);
    expect(svc.parseLicenseKey(key)?.edition).toBe('PRO');
    expect(svc.parseLicenseKey(`${key}x`)).toBeNull();
  });

  it('active une clé valide et retourne un statut actif', async () => {
    const svc = await import('./license.service');
    settings.set('company_name', 'EGT Test');
    const key = svc.formatLicenseKey('ENTERPRISE', '2028-06-30');
    const status = svc.activateLicense(1, key);
    expect(status.state).toBe('active');
    expect(status.edition).toBe('ENTERPRISE');
    expect(status.expiresAt).toBe('2028-06-30');
  });

  it('refuse une clé expirée', async () => {
    const svc = await import('./license.service');
    const key = svc.formatLicenseKey('STANDARD', '2020-01-01');
    expect(() => svc.activateLicense(1, key)).toThrow(/expiré/i);
  });
});
