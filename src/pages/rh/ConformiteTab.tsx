import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, Scale } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { formatMoney } from '@/lib/formatters';
import type { RhConformiteDashboard, RhConformiteSuiviItem } from '@/shared/types/rh';

export function ConformiteTab() {
  const [data, setData] = useState<RhConformiteDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(unwrapIpc(await ipcClient.rh.getConformiteDashboard()));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const syncConges = async () => {
    setSyncing(true);
    try {
      const n = unwrapIpc(await ipcClient.rh.syncCongesLegaux());
      alert(`Congés légaux synchronisés pour ${n} employé(s) (loi 90-11 : 2,5 j/mois).`);
      void load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSyncing(false);
    }
  };

  const marquerFait = async (row: RhConformiteSuiviItem) => {
    try {
      unwrapIpc(await ipcClient.rh.updateConformiteSuivi(row.employeId, row.code, 'fait', {
        dateRealisation: new Date().toISOString().slice(0, 10),
      }));
      void load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const suiviColumns: Column<RhConformiteSuiviItem>[] = [
    { key: 'employeNom', header: 'Employé', render: (r) => r.employeNom },
    { key: 'libelle', header: 'Élément', render: (r) => r.libelle },
    {
      key: 'statut',
      header: 'Statut',
      render: (r) => <Badge variant="muted">{r.statut}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      render: (r) =>
        r.statut !== 'fait' ? (
          <Button size="sm" variant="outline" onClick={() => void marquerFait(r)}>
            Marquer fait
          </Button>
        ) : null,
    },
  ];

  if (loading && !data) {
    return <p className="text-sm text-muted-foreground">Chargement…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Conformité Algérie
          </h2>
          <p className="text-sm text-muted-foreground">
            CNAS, ANEM, SMIG ({formatMoney(data?.smig ?? 0)}), dossiers administratifs
          </p>
        </div>
        <Button onClick={() => void syncConges()} disabled={syncing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
          Sync congés 90-11
        </Button>
      </div>

      {data?.alertes.length ? (
        <div className="space-y-2">
          {data.alertes.map((a, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm"
            >
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              <span>{a.message}</span>
              <Badge variant={a.niveau === 'critique' ? 'danger' : 'warning'}>{a.niveau}</Badge>
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi label="Sans NSS" value={data?.sansNss ?? 0} />
        <Kpi label="Sans NIN" value={data?.sansNin ?? 0} />
        <Kpi label="ANEM en retard" value={data?.anemEnRetard ?? 0} />
        <Kpi label="Sous SMIG" value={data?.sousSmig ?? 0} />
        <Kpi label="Dossiers incomplets" value={data?.dossiersIncomplets ?? 0} />
      </div>

      <div>
        <h3 className="text-sm font-medium mb-2">Suivi conformité</h3>
        <DataTable
          columns={suiviColumns}
          data={data?.suivi ?? []}
          keyExtractor={(r) => `${r.employeId}-${r.code}`}
          emptyMessage="Aucun élément en attente."
        />
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
