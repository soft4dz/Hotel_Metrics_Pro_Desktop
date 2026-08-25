import { generateKeyPairSync } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { issueLicenseKey, parseLicenseKey } from './licenses.util';

const { privateKey, publicKey } = generateKeyPairSync('ed25519');
const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
const publicPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
const options = { publicKeys: { 'test-root': publicPem } };

function issue(organizationCode = 'ORG-ONE') {
  return issueLicenseKey({
    organizationCode,
    edition: 'ENTERPRISE',
    businessSector: 'hotel',
    expiresAt: '2030-12-31',
    maxActivations: 5,
    mode: 'remote',
    keyId: 'test-root',
  }, { privateKeyPem: privatePem });
}

describe('license V2 token', () => {
  it('produit une clé unique à chaque émission', () => {
    const first = issue();
    const second = issue();
    expect(first.licenseKey).not.toBe(second.licenseKey);
    expect(first.payload.licenseId).not.toBe(second.payload.licenseId);
  });

  it('lie cryptographiquement la licence à son organisation et à son quota', () => {
    const issued = issue('ORG-CLIENT');
    const parsed = parseLicenseKey(issued.licenseKey, options);
    expect(parsed?.organizationCode).toBe('ORG-CLIENT');
    expect(parsed?.maxActivations).toBe(5);
    expect(parsed?.mode).toBe('remote');
  });

  it('refuse une charge utile ou une signature altérée', () => {
    const issued = issue();
    const [prefix, payload, signature] = issued.licenseKey.split('.');
    const alteredPayload = `${payload[0] === 'A' ? 'B' : 'A'}${payload.slice(1)}`;
    const alteredSignature = `${signature[0] === 'A' ? 'B' : 'A'}${signature.slice(1)}`;
    expect(parseLicenseKey(`${prefix}.${alteredPayload}.${signature}`, options)).toBeNull();
    expect(parseLicenseKey(`${prefix}.${payload}.${alteredSignature}`, options)).toBeNull();
    expect(parseLicenseKey('RS-PRO-20301231-DEADBEEF', options)).toBeNull();
  });
});
