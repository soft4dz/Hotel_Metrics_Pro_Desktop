import { useQuery } from '@tanstack/react-query';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import type { SifecDashboard } from '@/shared/types/sifec';

export function SifecHubPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['sifec-dashboard'],
    queryFn: async () => unwrapIpc(await ipcClient.sifec.dashboard()) as SifecDashboard,
  });

  const cards = [
    { label: 'En attente SIFEC', value: data?.enAttente ?? 0 },
    { label: 'Soumis', value: data?.soumis ?? 0 },
    { label: 'Acceptés DGI', value: data?.acceptes ?? 0, ok: true },
    { label: 'Rejetés', value: data?.rejetes ?? 0, warn: (data?.rejetes ?? 0) > 0 },
    { label: 'Erreurs', value: data?.erreurs ?? 0, critical: (data?.erreurs ?? 0) > 0 },
    { label: 'Mode connecteur', value: data?.mode ?? 'sandbox', text: true },
  ];

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {cards.map((c) => (
            <div
              key={c.label}
              className={`rounded-xl border p-4 ${c.critical ? 'border-red-200 bg-red-50' : c.warn ? 'border-yellow-200 bg-yellow-50' : c.ok ? 'border-green-200 bg-green-50' : 'bg-card'}`}
            >
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="text-2xl font-bold mt-1">{c.text ? String(c.value) : c.value}</p>
            </div>
          ))}
        </div>
      )}
      <p className="text-sm text-muted-foreground">
        Connecteur {data?.connectorActif ? 'actif' : 'inactif'} — mode {data?.mode ?? 'sandbox'}.
        En sandbox, les transmissions sont simulées localement pour certification.
        Le mode production nécessite les credentials API DGI officiels.
      </p>
    </div>
  );
}
