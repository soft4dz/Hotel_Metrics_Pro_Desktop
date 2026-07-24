import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, RefreshCw, ShieldCheck } from 'lucide-react';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { notify } from '@/lib/toast';
import type { SystemHealthCheck } from '@/shared/types/phase2';
import { formatDateTime } from '@/lib/formatters';

const statutBadge = (s: string) =>
  ({
    ok: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    critical: 'bg-red-100 text-red-800',
  }[s] ?? 'bg-muted text-muted-foreground');

export default function SystemHealthPage() {
  const qc = useQueryClient();

  const { data: report, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['system-health'],
    queryFn: async () => unwrapIpc(await ipcClient.systemHealth.get()),
  });

  const gedCheck = useMutation({
    mutationFn: async () => unwrapIpc(await ipcClient.systemHealth.gedIntegrity(30)),
    onSuccess: (res) => {
      if (res.failed === 0) notify.success(`Intégrité GED OK (${res.ok}/${res.total})`);
      else notify.error(`${res.failed} archive(s) en échec sur ${res.total}`);
      void qc.invalidateQueries({ queryKey: ['system-health'] });
    },
    onError: () => notify.error('Contrôle intégrité GED impossible'),
  });

  const checks = (report?.checks ?? []) as SystemHealthCheck[];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Activity className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Santé système</h1>
            <p className="text-sm text-muted-foreground">
              Base de données, sauvegardes, synchronisation, GED et workflows
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 border rounded-lg px-4 py-2 text-sm hover:bg-muted/50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
          <button
            type="button"
            onClick={() => gedCheck.mutate()}
            disabled={gedCheck.isPending}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4" />
            Vérifier intégrité GED
          </button>
        </div>
      </div>

      {report && (
        <div className={`rounded-xl border p-4 ${statutBadge(report.overall)}`}>
          <p className="font-semibold">
            État global : {report.overall.toUpperCase()}
          </p>
          <p className="text-sm opacity-80 mt-1">
            Version {report.appVersion} — généré le {formatDateTime(report.generatedAt)}
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3">
          {checks.map((c) => (
            <div key={c.code} className="bg-card border rounded-xl p-4 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{c.libelle}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statutBadge(c.statut)}`}>
                    {c.statut}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{c.message}</p>
                {c.detail && (
                  <p className="text-xs text-muted-foreground mt-1 font-mono break-all">{c.detail}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
