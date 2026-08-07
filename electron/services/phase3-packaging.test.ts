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

vi.mock('./modules.service', () => ({
  setModuleEnabled: vi.fn(),
}));

describe('Phase 3 — Licence packaging', () => {
  beforeEach(() => {
    settings.clear();
    vi.resetModules();
  });

  it('génère et valide une clé RS-{edition}-{date}-{secteur}-{sig}', async () => {
    const svc = await import('./license.service');
    const key = svc.formatLicenseKey('PRO', '2027-12-31', 'commerce');
    expect(key).toMatch(/^RS-PRO-20271231-COMM-[A-F0-9]{8}$/);
    expect(svc.parseLicenseKey(key)?.edition).toBe('PRO');
    expect(svc.parseLicenseKey(key)?.businessSector).toBe('commerce');
    expect(svc.parseLicenseKey(`${key}x`)).toBeNull();
  });

  it('accepte les clés legacy sans secteur (défaut hôtel)', async () => {
    const svc = await import('./license.service');
    const key = svc.formatLicenseKey('PRO', '2027-12-31');
    expect(key).toMatch(/^RS-PRO-20271231-HOTL-[A-F0-9]{8}$/);
  });

  it('active une clé valide et retourne un statut actif', async () => {
    const svc = await import('./license.service');
    settings.set('company_name', 'EGT Test');
    const key = svc.formatLicenseKey('ENTERPRISE', '2028-06-30');
    const status = await svc.activateLicense(1, key);
    expect(status.state).toBe('active');
    expect(status.edition).toBe('ENTERPRISE');
    expect(status.expiresAt).toBe('2028-06-30');
    expect(status.readOnlyMode).toBe(false);
    expect(status.alertLevel).toBe('none');
    expect(status.businessSector).toBe('hotel');
    expect(settings.get('business_sector_locked')).toBe('1');
  });

  it('passe en lecture seule quand la licence est expirée', async () => {
    const svc = await import('./license.service');
    settings.set('license_edition', 'PRO');
    settings.set('license_expires_at', '2020-01-01');
    settings.set('license_activated_at', '2019-01-01T00:00:00.000Z');
    const status = svc.getLicenseStatus();
    expect(status.state).toBe('expired');
    expect(status.readOnlyMode).toBe(true);
    expect(status.alertLevel).toBe('expired');
    expect(() => svc.assertLicenseWritable()).toThrow(/lecture seule/i);
  });

  it('alerte J-7 quand expiration proche', async () => {
    const svc = await import('./license.service');
    const soon = new Date();
    soon.setDate(soon.getDate() + 5);
    const iso = soon.toISOString().slice(0, 10);
    settings.set('license_edition', 'PRO');
    settings.set('license_expires_at', iso);
    settings.set('license_activated_at', new Date().toISOString());
    const status = svc.getLicenseStatus();
    expect(status.alertLevel).toBe('urgent');
    expect(status.readOnlyMode).toBe(false);
  });

  it('refuse une clé expirée', async () => {
    const svc = await import('./license.service');
    const key = svc.formatLicenseKey('STANDARD', '2020-01-01');
    await expect(svc.activateLicense(1, key)).rejects.toThrow(/expiré/i);
  });
});
