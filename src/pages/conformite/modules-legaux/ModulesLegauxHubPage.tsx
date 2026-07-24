import { useQuery } from '@tanstack/react-query';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import type { ModulesLegauxDashboard } from '@/shared/types/modules-legaux';

export function ModulesLegauxHubPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['modules-legaux-dashboard'],
    queryFn: async () => unwrapIpc(await ipcClient.modulesLegaux.dashboard()) as ModulesLegauxDashboard,
  });

  const cards = [
    { label: 'Immobilisations actives', value: data?.immobilisationsActives ?? 0 },
    { label: 'Amortissements à comptabiliser', value: data?.amortissementsPrevus ?? 0, warn: (data?.amortissementsPrevus ?? 0) > 0 },
    { label: 'Affiliés CASNOS actifs', value: data?.casnosAffiliesActifs ?? 0 },
    { label: 'Déclarations CASNOS en attente', value: data?.casnosDeclarationsEnAttente ?? 0 },
    { label: 'Inventaires en cours', value: data?.inventairesEnCours ?? 0 },
    { label: 'Inventaires avec écarts', value: data?.inventairesEcarts ?? 0, critical: (data?.inventairesEcarts ?? 0) > 0 },
  ];

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">{[...Array(6)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {cards.map((c) => (
            <div key={c.label} className={`rounded-xl border p-4 ${c.critical ? 'border-red-200 bg-red-50' : c.warn ? 'border-yellow-200 bg-yellow-50' : 'bg-card'}`}>
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="text-2xl font-bold mt-1">{c.value}</p>
            </div>
          ))}
        </div>
      )}
      <p className="text-sm text-muted-foreground">
        Les immobilisations génèrent des écritures d&apos;amortissement en journal OD.
        Les écarts d&apos;inventaire légal déclenchent un workflow de contrôle interne.
      </p>
    </div>
  );
}
