/**
 * Client HTTP léger vers l'API NestJS centrale.
 * Si l'API n'est pas joignable, toutes les méthodes lancent ApiUnavailableError
 * et l'appelant bascule sur SQLite.
 */

export class ApiUnavailableError extends Error {
  constructor() { super('API centrale non disponible'); }
}

const API_URL = process.env.CENTRAL_API_URL ?? 'http://localhost:3001/api/v1';
const TIMEOUT_MS = 3000;

let _token: string | null = null;
let _apiAvailable: boolean | null = null;
let _lastProbe = 0;
const PROBE_TTL = 30_000;

export function setApiToken(token: string) { _token = token; }
export function clearApiToken() { _token = null; }

export async function isApiAvailable(): Promise<boolean> {
  const now = Date.now();
  if (_apiAvailable !== null && now - _lastProbe < PROBE_TTL) return _apiAvailable;

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'OPTIONS',
      signal: ctrl.signal,
    });
    clearTimeout(t);
    _apiAvailable = res.status < 500;
  } catch {
    _apiAvailable = false;
  }
  _lastProbe = now;
  return _apiAvailable;
}

export function forceApiUnavailable() {
  _apiAvailable = false;
  _lastProbe = Date.now();
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (!(await isApiAvailable())) throw new ApiUnavailableError();

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(_token ? { Authorization: `Bearer ${_token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });

    clearTimeout(t);

    if (res.status === 401) { clearApiToken(); throw new ApiUnavailableError(); }
    if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
    return res.json() as Promise<T>;
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      _apiAvailable = false;
      throw new ApiUnavailableError();
    }
    throw err;
  }
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};
