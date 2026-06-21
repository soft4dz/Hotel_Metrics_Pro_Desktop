/**
 * Dual-write helper : écrit d'abord en SQLite (source de vérité locale),
 * puis tente en asynchrone vers l'API centrale avec retry.
 * L'écriture API n'est jamais bloquante — une erreur API ne remonte pas.
 */
import { api, ApiUnavailableError, isApiAvailable } from './apiClient';

type HttpMethod = 'post' | 'patch' | 'delete';

const RETRY_DELAYS_MS = [0, 750, 2_500];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pushToApi(method: HttpMethod, apiPath: string, apiBody?: unknown): Promise<void> {
  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt++) {
    await sleep(RETRY_DELAYS_MS[attempt] ?? 0);
    try {
      if (method === 'post') await api.post(apiPath, apiBody);
      else if (method === 'patch') await api.patch(apiPath, apiBody);
      else if (method === 'delete') await api.delete(apiPath);
      return;
    } catch (err) {
      if (err instanceof ApiUnavailableError) return;
      const isLast = attempt === RETRY_DELAYS_MS.length - 1;
      if (isLast) {
        console.warn(
          `[dual-write] API sync failed after ${RETRY_DELAYS_MS.length} attempt(s): ${method.toUpperCase()} ${apiPath}`,
          err,
        );
      }
    }
  }
}

export async function dualWrite<T>(
  sqliteResult: T,
  method: HttpMethod,
  apiPath: string,
  apiBody?: unknown,
): Promise<T> {
  void isApiAvailable().then(async (available) => {
    if (!available) return;
    await pushToApi(method, apiPath, apiBody);
  });

  return sqliteResult;
}
