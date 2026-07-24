import { useQuery } from '@tanstack/react-query';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import type { RgpdDashboard } from '@/shared/types/rgpd';

export function RgpdHubPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['rgpd-dashboard'],
    queryFn: async () => unwrapIpc(await ipcClient.rgpd.dashboard()) as RgpdDashboard,
  });

  const cards = [
    { label: 'Traitements actifs', value: data?.traitementsActifs ?? 0 },
    { label: 'Consentements actifs', value: data?.consentementsActifs ?? 0 },
    { label: 'Demandes en cours', value: data?.demandesEnCours ?? 0, warn: (data?.demandesEnRetard ?? 0) > 0 },
    { label: 'Demandes en retard', value: data?.demandesEnRetard ?? 0, critical: (data?.demandesEnRetard ?? 0) > 0 },
    { label: 'Incidents ouverts', value: data?.incidentsOuverts ?? 0 },
    { label: 'Incidents critiques', value: data?.incidentsCritiques ?? 0, critical: (data?.incidentsCritiques ?? 0) > 0 },
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
              className={`rounded-xl border p-4 ${c.critical ? 'border-red-200 bg-red-50' : c.warn ? 'border-yellow-200 bg-yellow-50' : 'bg-card'}`}
            >
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="text-2xl font-bold mt-1">{c.value}</p>
            </div>
          ))}
        </div>
      )}
      <p className="text-sm text-muted-foreground">
        Délai réglementaire de réponse aux demandes d&apos;exercice des droits : 30 jours calendaires (Loi 18-07).
        Les incidents graves doivent faire l&apos;objet d&apos;une évaluation de notification à l&apos;ANPDP.
      </p>
    </div>
  );
}
