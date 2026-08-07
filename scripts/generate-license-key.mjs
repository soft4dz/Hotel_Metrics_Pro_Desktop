#!/usr/bin/env node
/**
 * Génère une clé de licence Raqmi System (usage éditeur / déploiement).
 * node scripts/generate-license-key.mjs PRO 2027-12-31 commerce
 */
import { createHmac } from 'node:crypto';

const LICENSE_SECRET = process.env.HMP_LICENSE_SECRET ?? 'raqmi-phase3-cert-v1-change-in-prod';
const EDITIONS = new Set(['STANDARD', 'PRO', 'ENTERPRISE']);

const LICENSE_SECTOR_CODES = {
  HOTL: 'hotel',
  REST: 'restaurant',
  COMM: 'commerce',
  SERV: 'services',
  INDU: 'industrie',
  PORT: 'port',
  GENR: 'generic',
};

const SECTOR_ALIASES = {
  hotel: 'HOTL',
  hôtel: 'HOTL',
  hotl: 'HOTL',
  restaurant: 'REST',
  rest: 'REST',
  commerce: 'COMM',
  comm: 'COMM',
  services: 'SERV',
  serv: 'SERV',
  industrie: 'INDU',
  industry: 'INDU',
  indu: 'INDU',
  port: 'PORT',
  generic: 'GENR',
  genr: 'GENR',
  générique: 'GENR',
};

function sign(edition, expiryRaw, sectorCode) {
  const payload = sectorCode
    ? `${edition}|${expiryRaw}|${sectorCode}`
    : `${edition}|${expiryRaw}`;
  return createHmac('sha256', LICENSE_SECRET)
    .update(payload)
    .digest('hex')
    .slice(0, 8)
    .toUpperCase();
}

function resolveSectorCode(raw) {
  if (!raw) return 'HOTL';
  const upper = raw.trim().toUpperCase();
  if (LICENSE_SECTOR_CODES[upper]) return upper;
  const alias = SECTOR_ALIASES[raw.trim().toLowerCase()];
  if (alias) return alias;
  return null;
}

const edition = (process.argv[2] ?? '').toUpperCase();
const expiresAt = process.argv[3] ?? '';
const sectorArg = process.argv[4] ?? 'hotel';

if (!EDITIONS.has(edition)) {
  console.error('Usage: node scripts/generate-license-key.mjs <STANDARD|PRO|ENTERPRISE> <YYYY-MM-DD> [secteur]');
  console.error('Secteurs : hotel, restaurant, commerce, services, industrie, port, generic (ou code HOTL, REST, …)');
  process.exit(1);
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(expiresAt)) {
  console.error('Date invalide — format YYYY-MM-DD attendu.');
  process.exit(1);
}

const sectorCode = resolveSectorCode(sectorArg);
if (!sectorCode) {
  console.error(`Secteur inconnu : « ${sectorArg} »`);
  process.exit(1);
}

const expiryRaw = expiresAt.replace(/-/g, '');
const key = `RS-${edition}-${expiryRaw}-${sectorCode}-${sign(edition, expiryRaw, sectorCode)}`;
const sectorLabel = LICENSE_SECTOR_CODES[sectorCode];

console.log('=== Clé de licence Raqmi System ===');
console.log(`Édition   : ${edition}`);
console.log(`Expiration: ${expiresAt}`);
console.log(`Secteur   : ${sectorLabel} (${sectorCode})`);
console.log(`Clé       : ${key}`);
