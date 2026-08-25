#!/usr/bin/env node
import { generateKeyPairSync } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const keyId = process.argv[2] ?? 'raqmi-root-2026';
if (!/^[A-Za-z0-9._-]{3,64}$/.test(keyId)) throw new Error('Identifiant de clé invalide.');

const outputDir = resolve(process.cwd(), '.license-keys');
mkdirSync(outputDir, { recursive: true, mode: 0o700 });
const privatePath = resolve(outputDir, `${keyId}.private.pem`);
const publicPath = resolve(outputDir, `${keyId}.public.pem`);
const mapPath = resolve(outputDir, 'public-keys.json');
if ([privatePath, publicPath].some((path) => existsSync(path))) {
  throw new Error(`Une configuration ${keyId} existe déjà. Choisissez un nouvel identifiant de rotation.`);
}
let publicKeys = {};
if (existsSync(mapPath)) {
  try {
    publicKeys = JSON.parse(readFileSync(mapPath, 'utf8'));
  } catch {
    throw new Error('Le fichier public-keys.json existant est invalide.');
  }
}
if (Object.prototype.hasOwnProperty.call(publicKeys, keyId)) {
  throw new Error(`La clé publique ${keyId} existe déjà.`);
}
const { privateKey, publicKey } = generateKeyPairSync('ed25519');
const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
const publicPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
writeFileSync(privatePath, privatePem, { mode: 0o600, flag: 'wx' });
writeFileSync(publicPath, publicPem, { mode: 0o644, flag: 'wx' });
writeFileSync(
  mapPath,
  `${JSON.stringify({ ...publicKeys, [keyId]: publicPem }, null, 2)}\n`,
  { mode: 0o644 },
);

console.log(`Clés Ed25519 générées dans ${outputDir}`);
console.log('Conservez le fichier *.private.pem hors du dépôt et sauvegardez-le dans un coffre-fort.');
console.log('Configurez HMP_LICENSE_PRIVATE_KEY sur le serveur et embarquez public-keys.json au build ERP.');
