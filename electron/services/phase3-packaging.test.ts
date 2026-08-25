import { generateKeyPairSync } from 'node:crypto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { issueLicenseKey } from '../../server/src/modules/licenses/licenses.util';

const settings = new Map<string, string>();
const { privateKey, publicKey } = generateKeyPairSync('ed25519');
const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
const publicPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
process.env.HMP_LICENSE_TEST_PUBLIC_KEYS = JSON.stringify({ 'test-root': publicPem });

vi.mock('../lib/electronApi', () => ({
  default: {
    app: { isPackaged: true },
    safeStorage: {
      isEncryptionAvailable: () => true,
      encryptString: (value: string) => Buffer.from(value, 'utf8'),
      decryptString: (value: Buffer) => value.toString('utf8'),
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

vi.mock('./audit.service', () => ({ writeAuditLog: vi.fn() }));
vi.mock('./actorContext', () => ({
  getActorContext: () => ({ roleCode: 'super_admin' }),
  isGlobalAdminRole: () => true,
}));
vi.mock('./permissions.service', () => ({
  assertPermission: vi.fn(),
  userHasPermission: () => true,
}));
vi.mock('./modules.service', () => ({ setModuleEnabled: vi.fn() }));

function futureDate(days = 365): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function offlineKey(machineId: string, expiresAt = futureDate()) {
  return issueLicenseKey({
    organizationCode: 'ORG-TEST',
    edition: 'PRO',
    expiresAt,
    businessSector: 'commerce',
    maxActivations: 1,
    mode: 'offline',
    machineId,
    keyId: 'test-root',
  }, { privateKeyPem: privatePem }).licenseKey;
}

describe('Licence V2 — sécurité packaging', () => {
  beforeEach(() => {
    settings.clear();
    settings.set('license_mode', 'offline');
    vi.resetModules();
  });

  it('valide une signature Ed25519 et refuse toute altération', async () => {
    const svc = await import('./license.service');
    const key = offlineKey(svc.getMachineFingerprint());
    expect(svc.parseLicenseKey(key)?.organizationCode).toBe('ORG-TEST');
    expect(svc.parseLicenseKey(`${key}x`)).toBeNull();
  });

  it('active une licence liée au poste et applique le pack signé', async () => {
    const svc = await import('./license.service');
    const status = await svc.activateLicense(1, offlineKey(svc.getMachineFingerprint()));
    expect(status.state).toBe('active');
    expect(status.edition).toBe('PRO');
    expect(status.businessSector).toBe('commerce');
    expect(status.organizationCode).toBe('ORG-TEST');
    expect(settings.get('business_sector_locked')).toBe('1');
    expect(settings.get('license_key_value')).toMatch(/^safe:/);
  });

  it('refuse une licence offline émise pour un autre poste', async () => {
    const svc = await import('./license.service');
    await expect(svc.activateLicense(1, offlineKey('OTHERPC12345678'))).rejects.toThrow(/autre poste/i);
  });

  it('ignore une expiration modifiée dans SQLite et relit le jeton signé', async () => {
    const svc = await import('./license.service');
    const signedExpiry = futureDate(20);
    await svc.activateLicense(1, offlineKey(svc.getMachineFingerprint(), signedExpiry));
    settings.set('license_expires_at', '2099-12-31');
    const status = svc.getLicenseStatus();
    expect(status.expiresAt).toBe(signedExpiry);
    expect(settings.get('license_expires_at')).toBe(signedExpiry);
  });

  it('passe en lecture seule quand la licence signée est expirée', async () => {
    const svc = await import('./license.service');
    const expired = issueLicenseKey({
      organizationCode: 'ORG-TEST',
      edition: 'PRO',
      expiresAt: '2020-01-01',
      businessSector: 'commerce',
      maxActivations: 1,
      mode: 'offline',
      machineId: svc.getMachineFingerprint(),
      keyId: 'test-root',
    }, { privateKeyPem: privatePem }).licenseKey;
    await expect(svc.activateLicense(1, expired)).rejects.toThrow(/expiré/i);
  });

  it('n’autorise aucun bypass par variable d’environnement en application packagée', async () => {
    process.env.HMP_LICENSE_BYPASS = '1';
    const svc = await import('./license.service');
    const status = svc.getLicenseStatus();
    expect(status.state).not.toBe('development');
    delete process.env.HMP_LICENSE_BYPASS;
  });
});
