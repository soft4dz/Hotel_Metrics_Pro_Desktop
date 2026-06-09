/** Validation URL API de synchronisation (anti-SSRF) */

const BLOCKED_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '[::1]',
  'metadata.google.internal',
]);

function isPrivateIp(hostname: string): boolean {
  if (/^10\./.test(hostname)) return true;
  if (/^192\.168\./.test(hostname)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) return true;
  if (/^169\.254\./.test(hostname)) return true;
  if (/^127\./.test(hostname)) return true;
  return false;
}

export function validateSyncApiUrl(raw: string, allowLocalDev = true): string {
  const trimmed = raw.trim().replace(/\/$/, '');
  if (!trimmed) {
    throw new Error('URL API requise.');
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error('URL API invalide.');
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Protocole non autorisé (http/https uniquement).');
  }

  const host = url.hostname.toLowerCase();
  const isLocal = host === '127.0.0.1' || host === 'localhost' || host === '[::1]';

  if (isLocal) {
    if (!allowLocalDev) {
      throw new Error('URL locale non autorisée en production.');
    }
    return trimmed;
  }

  if (url.protocol !== 'https:') {
    throw new Error('HTTPS obligatoire pour les serveurs distants.');
  }

  if (BLOCKED_HOSTS.has(host) || isPrivateIp(host)) {
    throw new Error('Hôte réseau privé ou réservé non autorisé.');
  }

  return trimmed;
}
