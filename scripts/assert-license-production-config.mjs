import { createPublicKey } from 'node:crypto';

if (process.env.HMP_LICENSE_BYPASS) {
  throw new Error('HMP_LICENSE_BYPASS est interdit pour un installateur de production.');
}
if (process.env.HMP_LICENSE_PRIVATE_KEY) {
  throw new Error('La clé privée de licence ne doit jamais être présente pendant le build de l’ERP client.');
}

const raw = process.env.HMP_LICENSE_PUBLIC_KEYS;
if (!raw) throw new Error('HMP_LICENSE_PUBLIC_KEYS est requis pour construire un installateur commercial.');

let keys;
try {
  keys = JSON.parse(raw);
} catch {
  throw new Error('HMP_LICENSE_PUBLIC_KEYS doit être un objet JSON.');
}
if (!keys || typeof keys !== 'object' || Array.isArray(keys) || Object.keys(keys).length === 0) {
  throw new Error('Au moins une clé publique Ed25519 de confiance est requise.');
}
for (const [keyId, pem] of Object.entries(keys)) {
  if (!/^[A-Za-z0-9._-]{3,64}$/.test(keyId) || typeof pem !== 'string') {
    throw new Error(`Configuration de clé publique invalide: ${keyId}`);
  }
  const key = createPublicKey(pem.replace(/\\n/g, '\n'));
  if (key.asymmetricKeyType !== 'ed25519') throw new Error(`${keyId} n’est pas une clé Ed25519.`);
}
console.log(`Configuration licence production: ${Object.keys(keys).length} clé(s) publique(s) valide(s).`);
