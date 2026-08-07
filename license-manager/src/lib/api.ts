import type { BusinessSectorId, LicenseEdition } from './sectors';

const TOKEN_KEY = 'raqmi-license-manager-token';
const SERVER_KEY = 'raqmi-license-manager-server';

export function getSavedServerUrl(): string {
  return localStorage.getItem(SERVER_KEY) ?? 'http://localhost:3001/api/v1';
}

export function saveServerUrl(url: string): void {
  localStorage.setItem(SERVER_KEY, url.trim().replace(/\/+$/, ''));
}

export function getSavedToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function saveToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export async function login(
  serverUrl: string,
  email: string,
  password: string,
): Promise<{ accessToken: string }> {
  const base = serverUrl.trim().replace(/\/+$/, '');
  const res = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = (await res.json()) as { accessToken?: string; message?: string };
  if (!res.ok || !body.accessToken) {
    throw new Error(body.message ?? `Connexion refusée (${res.status})`);
  }
  return { accessToken: body.accessToken };
}

export interface RemoteIssueInput {
  organizationCode: string;
  legalName: string;
  edition: LicenseEdition;
  expiresAt: string;
  businessSector: BusinessSectorId;
  maxActivations?: number;
}

export interface RemoteIssueResult {
  licenseKey: string;
  organizationCode: string;
  edition: LicenseEdition;
  expiresAt: string;
  businessSector: BusinessSectorId;
}

export async function issueRemoteLicense(
  serverUrl: string,
  token: string,
  input: RemoteIssueInput,
): Promise<RemoteIssueResult> {
  const base = serverUrl.trim().replace(/\/+$/, '');
  const res = await fetch(`${base}/licenses/admin/issue`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });
  const body = (await res.json()) as RemoteIssueResult & { message?: string };
  if (!res.ok || !body.licenseKey) {
    throw new Error(body.message ?? `Émission refusée (${res.status})`);
  }
  return body;
}

export async function probeServer(serverUrl: string): Promise<boolean> {
  try {
    const base = serverUrl.trim().replace(/\/+$/, '');
    const res = await fetch(`${base}/licenses/health`, { headers: { Accept: 'application/json' } });
    return res.ok;
  } catch {
    return false;
  }
}

async function authFetch<T>(serverUrl: string, token: string, path: string, init?: RequestInit): Promise<T> {
  const base = serverUrl.trim().replace(/\/+$/, '');
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  const body = (await res.json()) as T & { message?: string };
  if (!res.ok) {
    throw new Error(body.message ?? `Erreur API (${res.status})`);
  }
  return body;
}

export interface RemoteLicenseRow {
  id: number;
  licenseKey: string;
  organizationCode: string;
  legalName: string;
  edition: LicenseEdition;
  businessSector: BusinessSectorId;
  expiresAt: string;
  maxActivations: number;
  activeActivations: number;
  status: string;
  activations: Array<{
    id: number;
    machineId: string;
    deviceLabel: string | null;
    lastSeenAt: string;
  }>;
}

export function listRemoteLicenses(serverUrl: string, token: string, organizationCode?: string) {
  const qs = organizationCode?.trim() ? `?organizationCode=${encodeURIComponent(organizationCode.trim())}` : '';
  return authFetch<RemoteLicenseRow[]>(serverUrl, token, `/licenses/admin/licenses${qs}`);
}

export function revokeRemoteLicense(
  serverUrl: string,
  token: string,
  input: { licenseKey?: string; activationId?: number; revokeAllActivations?: boolean },
) {
  return authFetch<{ ok: boolean; message: string }>(serverUrl, token, '/licenses/admin/revoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}
