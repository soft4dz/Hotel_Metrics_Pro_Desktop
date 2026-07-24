import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { notify } from '@/lib/toast';
import { useHotelsList } from '@/hooks/useHotelsList';
import type { DecAlert, DecWidgetData } from '@/shared/types/phase2';
import { Gauge, AlertTriangle, X } from 'lucide-react';

const levelColor = (level: string) =>
  ({ normal: 'border-green-200 bg-green-50', warning: 'border-yellow-200 bg-yellow-50', critical: 'border-red-200 bg-red-50' }[level] ?? 'border-border bg-card');

const severityColor = (s: string) =>
  ({ info: 'text-blue-600', warning: 'text-yellow-600', critical: 'text-red-600' }[s] ?? 'text-muted-foreground');

export default function DecCockpitPage() {
  const qc = useQueryClient();
  const { hotels, defaultHotelId } = useHotelsList();
  const [hotelId, setHotelId] = useState<number | undefined>(defaultHotelId || undefined);

  const { data: cockpit, isLoading } = useQuery({
    queryKey: ['dec-cockpit', hotelId],
    queryFn: async () => unwrapIpc(await ipcClient.decCockpit.get(hotelId)),
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ['dec-alerts'],
    queryFn: async () => unwrapIpc(await ipcClient.decCockpit.listAlerts('ouverte')) as DecAlert[],
  });

  const closeAlert = useMutation({
    mutationFn: async (alertId: number) => unwrapIpc(await ipcClient.decCockpit.closeAlert(alertId)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dec-alerts'] });
      qc.invalidateQueries({ queryKey: ['dec-cockpit'] });
      notify.success('Alerte clôturée');
    },
    onError: () => notify.error('Erreur clôture alerte'),
  });

  const widgets = (cockpit?.widgets ?? []) as DecWidgetData[];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Gauge className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Cockpit DEC</h1>
          <p className="text-sm text-muted-foreground">Indicateurs et alertes de contrôle</p>
        </div>
      </div>

      <select
        value={hotelId ?? ''}
        onChange={(e) => setHotelId(e.target.value ? Number(e.target.value) : undefined)}
        className="border rounded-lg px-3 py-2 text-sm bg-background"
      >
        <option value="">Tous les hôtels</option>
        {hotels.map((h) => (
          <option key={h.id} value={h.id}>{h.name}</option>
        ))}
      </select>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {widgets.map((w) => (
            <div key={w.code} className={`border rounded-xl p-4 ${levelColor(w.level)}`}>
              <p className="text-xs text-muted-foreground">{w.domaine}</p>
              <p className="text-sm font-medium mt-1">{w.libelle}</p>
              <p className="text-2xl font-bold mt-2">{w.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Alertes ouvertes
        </h2>
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune alerte ouverte.</p>
        ) : (
          alerts.map((a) => (
            <div key={a.id} className="bg-card border rounded-xl p-4 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`w-4 h-4 ${severityColor(a.severity)}`} />
                  <span className="font-semibold text-sm">{a.titre}</span>
                </div>
                {a.description && <p className="text-sm text-muted-foreground mt-1">{a.description}</p>}
                <div className="text-xs text-muted-foreground mt-1">
                  {a.hotelName && <span>{a.hotelName} · </span>}
                  {a.sourceModule}
                </div>
              </div>
              <button
                onClick={() => closeAlert.mutate(a.id)}
                disabled={closeAlert.isPending}
                className="shrink-0 flex items-center gap-1 text-xs border px-3 py-1.5 rounded-lg hover:bg-muted"
              >
                <X className="w-3 h-3" /> Clôturer
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
