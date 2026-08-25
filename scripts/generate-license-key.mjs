#!/usr/bin/env node
/** Émission offline V2 liée à un poste. */
import { createPrivateKey, randomUUID, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';

const EDITIONS = new Set(['STANDARD', 'PRO', 'ENTERPRISE']);
const SECTORS = new Set(['hotel', 'restaurant', 'commerce', 'services', 'industrie', 'port', 'generic']);

function loadPrivateKey() {
  const raw = process.env.HMP_LICENSE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const file = process.env.HMP_LICENSE_PRIVATE_KEY_FILE;
  const pem = raw?.trim() || (file ? readFileSync(file, 'utf8').trim() : '');
  if (!pem) throw new Error('HMP_LICENSE_PRIVATE_KEY ou HMP_LICENSE_PRIVATE_KEY_FILE est requis.');
  const key = createPrivateKey(pem);
  if (key.asymmetricKeyType !== 'ed25519') throw new Error('La clé privée doit être de type Ed25519.');
  return key;
}

const edition = (process.argv[2] ?? '').toUpperCase();
const expiresAt = process.argv[3] ?? '';
const businessSector = (process.argv[4] ?? '').toLowerCase();
const organizationCode = (process.argv[5] ?? '').toUpperCase();
const machineId = (process.argv[6] ?? '').toUpperCase();
const keyId = process.env.HMP_LICENSE_KEY_ID ?? 'raqmi-root-2026';

const expiry = new Date(`${expiresAt}T23:59:59.999Z`);
if (
  !EDITIONS.has(edition) ||
  !/^\d{4}-\d{2}-\d{2}$/.test(expiresAt) ||
  Number.isNaN(expiry.getTime()) ||
  expiry.toISOString().slice(0, 10) !== expiresAt ||
  expiry.getTime() < Date.now() ||
  !SECTORS.has(businessSector)
) {
  throw new Error('Usage: <STANDARD|PRO|ENTERPRISE> <YYYY-MM-DD> <secteur> <organisation> <machineId>');
}
if (!/^[A-Z0-9][A-Z0-9_-]{2,63}$/.test(organizationCode)) throw new Error('Organisation invalide.');
if (!/^[A-Z0-9][A-Z0-9_-]{7,127}$/.test(machineId)) throw new Error('Identifiant poste invalide.');
if (!/^[A-Za-z0-9._-]{3,64}$/.test(keyId)) throw new Error('HMP_LICENSE_KEY_ID invalide.');

const payload = {
  v: 2,
  licenseId: randomUUID(),
  product: 'raqmi-system',
  organizationCode,
  edition,
  businessSector,
  issuedAt: new Date().toISOString(),
  expiresAt,
  maxActivations: 1,
  mode: 'offline',
  machineId,
  keyId,
};
const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
const signature = sign(null, Buffer.from(encoded, 'ascii'), loadPrivateKey()).toString('base64url');

console.log(`Licence ID : ${payload.licenseId}`);
console.log(`Organisation: ${organizationCode}`);
console.log(`Poste       : ${machineId}`);
console.log(`Clé V2      : RS2.${encoded}.${signature}`);
