#!/usr/bin/env node
/**
 * Génère une clé de licence Raqmi System (usage éditeur / déploiement).
 * node scripts/generate-license-key.mjs PRO 2027-12-31
 */
import { createHmac } from 'node:crypto';

const LICENSE_SECRET = process.env.HMP_LICENSE_SECRET ?? 'raqmi-phase3-cert-v1-change-in-prod';
const EDITIONS = new Set(['STANDARD', 'PRO', 'ENTERPRISE']);

function sign(edition, expiryRaw) {
  return createHmac('sha256', LICENSE_SECRET)
    .update(`${edition}|${expiryRaw}`)
    .digest('hex')
    .slice(0, 8)
    .toUpperCase();
}

const edition = (process.argv[2] ?? '').toUpperCase();
const expiresAt = process.argv[3] ?? '';

if (!EDITIONS.has(edition)) {
  console.error('Usage: node scripts/generate-license-key.mjs <STANDARD|PRO|ENTERPRISE> <YYYY-MM-DD>');
  process.exit(1);
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(expiresAt)) {
  console.error('Date invalide — format YYYY-MM-DD attendu.');
  process.exit(1);
}

const expiryRaw = expiresAt.replace(/-/g, '');
const key = `RS-${edition}-${expiryRaw}-${sign(edition, expiryRaw)}`;

console.log('=== Clé de licence Raqmi System ===');
console.log(`Édition   : ${edition}`);
console.log(`Expiration: ${expiresAt}`);
console.log(`Clé       : ${key}`);
