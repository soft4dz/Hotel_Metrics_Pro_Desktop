import { useCallback, useEffect, useState } from 'react';
import { Ban, Loader2, RefreshCw } from 'lucide-react';
import { listRemoteLicenses, revokeRemoteLicense, type RemoteLicenseRow } from '@/lib/api';

interface RegistryTabProps {
  serverUrl: string;
  token: string | null;
}

export function RegistryTab({ serverUrl, token }: RegistryTabProps) {
  const [rows, setRows] = useState<RemoteLicenseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filterOrg, setFilterOrg] = useState('');
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      setRows(await listRemoteLicenses(serverUrl, token, filterOrg || undefined));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible.');
    } finally {
      setLoading(false);
    }
  }, [serverUrl, token, filterOrg]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRevoke = async (licenseKey: string) => {
    if (!token || !confirm(`Révoquer la licence ${licenseKey.slice(0, 24)}… ?`)) return;
    setBusyKey(licenseKey);
    try {
      await revokeRemoteLicense(serverUrl, token, { licenseKey, revokeAllActivations: true });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Révocation impossible.');
    } finally {
      setBusyKey(null);
    }
  };

  const handleRevokeActivation = async (activationId: number, machineId: string) => {
    if (!token || !confirm(`Révoquer uniquement le poste ${machineId} ?`)) return;
    setBusyKey(`activation:${activationId}`);
    try {
      await revokeRemoteLicense(serverUrl, token, { activationId });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Révocation du poste impossible.');
    } finally {
      setBusyKey(null);
    }
  };

  if (!token) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Connectez-vous au serveur (onglet Émission → mode serveur) pour consulter le registre central.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="block flex-1 min-w-[200px]">
          <span className="mb-1 block text-xs font-medium text-slate-600">Filtrer organisation</span>
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm uppercase"
            value={filterOrg}
            onChange={(e) => setFilterOrg(e.target.value.toUpperCase())}
            placeholder="ORG-ACME"
          />
        </label>
        <button
          type="button"
          disabled={loading}
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Actualiser
        </button>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {loading && rows.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
        </p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-500">Aucune licence enregistrée sur le serveur.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-900">{row.organizationCode} — {row.legalName}</p>
                  <p className="mt-1 font-mono text-xs text-slate-600">{row.licenseKey}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {row.edition} · {row.businessSector} · expire {row.expiresAt} ·{' '}
                    {row.activeActivations}/{row.maxActivations} poste(s)
                  </p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium uppercase ${
                  row.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                }`}
                >
                  {row.status}
                </span>
              </div>
              {row.activations.length > 0 && (
                <ul className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-xs text-slate-600">
                  {row.activations.map((a) => (
                    <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 font-mono">
                      <span>
                        {a.machineId}
                        {a.deviceLabel ? ` (${a.deviceLabel})` : ''}
                        {' · vu '}
                        {new Date(a.lastSeenAt).toLocaleString('fr-FR')}
                      </span>
                      <button
                        type="button"
                        disabled={busyKey === `activation:${a.id}`}
                        onClick={() => void handleRevokeActivation(a.id, a.machineId)}
                        className="font-sans text-red-600 hover:underline disabled:opacity-50"
                      >
                        Révoquer ce poste
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {row.status === 'active' && (
                <button
                  type="button"
                  disabled={busyKey === row.licenseKey}
                  onClick={() => void handleRevoke(row.licenseKey)}
                  className="mt-3 inline-flex items-center gap-1 text-xs text-red-600 hover:underline disabled:opacity-50"
                >
                  {busyKey === row.licenseKey ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Ban className="h-3.5 w-3.5" />
                  )}
                  Révoquer
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
