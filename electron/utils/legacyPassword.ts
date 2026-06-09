import { createHash } from 'node:crypto';
import { bcrypt } from './bcrypt';

const BCRYPT_PREFIX = /^\$2[aby]\$/;
const MD5_HEX = /^[a-f0-9]{32}$/i;
const MD5_STORED_PREFIX = 'md5$';

/** Mot de passe temporaire si le dump legacy n'a pas de hash (import). */
export const LEGACY_IMPORT_TEMP_PASSWORD = 'Import@Reset2026!';

/** Extrait le hash / mot de passe depuis une ligne INSERT users du dump MySQL. */
export function legacyPasswordRawFromRow(row: Record<string, string>): string {
  return (
    row.password ??
    row.password_hash ??
    row.mot_de_passe ??
    row.passwd ??
    row.mdp ??
    ''
  ).trim();
}

/** Convertit $2y$ (PHP) en $2a$ pour bcryptjs. */
export function normalizeBcryptHashForCompare(hash: string): string {
  if (hash.startsWith('$2y$')) {
    return `$2a$${hash.slice(4)}`;
  }
  return hash;
}

/**
 * Normalise un hash legacy vers le format stocké en SQLite.
 * - bcrypt ($2a/$2b/$2y) : conservé ($2y → $2a)
 * - MD5 hex : préfixe md5$ pour vérification à la connexion
 * - texte clair (ancien système) : bcrypt du texte
 * - vide : bcrypt du mot de passe temporaire d'import
 */
export function normalizeLegacyPasswordHash(raw: string): string {
  const value = raw?.trim() ?? '';
  if (!value) {
    return bcrypt.hashSync(LEGACY_IMPORT_TEMP_PASSWORD, 12);
  }
  if (BCRYPT_PREFIX.test(value)) {
    return normalizeBcryptHashForCompare(value);
  }
  if (MD5_HEX.test(value)) {
    return `${MD5_STORED_PREFIX}${value.toLowerCase()}`;
  }
  return bcrypt.hashSync(value, 12);
}

/** Vérifie le mot de passe saisi contre le hash stocké (bcrypt, md5 legacy, import bcrypt). */
export function verifyStoredPassword(password: string, storedHash: string): boolean {
  if (!password || !storedHash) return false;

  if (storedHash.startsWith(MD5_STORED_PREFIX)) {
    const expected = storedHash.slice(MD5_STORED_PREFIX.length);
    const actual = createHash('md5').update(password).digest('hex');
    return actual === expected;
  }

  if (BCRYPT_PREFIX.test(storedHash)) {
    const hash = normalizeBcryptHashForCompare(storedHash);
    if (bcrypt.compareSync(password, hash)) return true;
    // Import incorrect : bcrypt d'une empreinte MD5 (ancienne version)
    const md5 = createHash('md5').update(password).digest('hex');
    if (bcrypt.compareSync(md5, hash)) return true;
    return false;
  }

  return bcrypt.compareSync(password, storedHash);
}
