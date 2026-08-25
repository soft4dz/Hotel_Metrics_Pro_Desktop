import { generateKeyPairSync, verify } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { formatLicenseKey } from './licenseCrypto';

const { privateKey, publicKey } = generateKeyPairSync('ed25519');
const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();

describe('License Manager offline signer', () => {
  it('émet un jeton V2 vérifiable et lié au poste', async () => {
    const issued = await formatLicenseKey({
      organizationCode: 'ORG-PORTAIL',
      edition: 'STANDARD',
      expiresAt: '2030-12-31',
      businessSector: 'services',
      maxActivations: 1,
      machineId: 'ABCDEF1234567890',
      keyId: 'test-root',
    }, privatePem);
    const [prefix, payload, signature] = issued.licenseKey.split('.');
    expect(prefix).toBe('RS2');
    expect(issued.payload.organizationCode).toBe('ORG-PORTAIL');
    expect(issued.payload.machineId).toBe('ABCDEF1234567890');
    expect(verify(
      null,
      Buffer.from(payload, 'ascii'),
      publicKey,
      Buffer.from(signature, 'base64url'),
    )).toBe(true);
  });

  it('refuse une expiration passée ou un quota offline supérieur à un poste', async () => {
    const base = {
      organizationCode: 'ORG-PORTAIL',
      edition: 'STANDARD' as const,
      businessSector: 'services' as const,
      machineId: 'ABCDEF1234567890',
      keyId: 'test-root',
    };
    await expect(formatLicenseKey({ ...base, expiresAt: '2020-01-01', maxActivations: 1 }, privatePem))
      .rejects.toThrow(/future/i);
    await expect(formatLicenseKey({ ...base, expiresAt: '2030-12-31', maxActivations: 2 }, privatePem))
      .rejects.toThrow(/un seul poste/i);
  });
});
