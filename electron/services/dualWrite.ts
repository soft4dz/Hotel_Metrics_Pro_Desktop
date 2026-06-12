/**
 * Dual-write helper : écrit d'abord en SQLite (source de vérité locale),
 * puis tente en asynchrone vers l'API centrale.
 * L'écriture API n'est jamais bloquante — une erreur API ne remonte pas.
 */
import { api, ApiUnavailableError, isApiAvailable } from './apiClient';

type HttpMethod = 'post' | 'patch' | 'delete';

export async function dualWrite<T>(
  sqliteResult: T,
  method: HttpMethod,
  apiPath: string,
  apiBody?: unknown,
): Promise<T> {
  // Vérification non bloquante
  isApiAvailable().then(async (available) => {
    if (!available) return;
    try {
      if (method === 'post') await api.post(apiPath, apiBody);
      else if (method === 'patch') await api.patch(apiPath, apiBody);
      else if (method === 'delete') await api.delete(apiPath);
    } catch (err) {
      if (!(err instanceof ApiUnavailableError)) {
        console.warn(`[dual-write] API sync failed: ${method.toUpperCase()} ${apiPath}`, err);
      }
    }
  });

  return sqliteResult;
}
