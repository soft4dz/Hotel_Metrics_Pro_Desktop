import { useQuery } from '@tanstack/react-query';
import { Database, FileSpreadsheet, BarChart3, History, Layers } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import type { ReportOverview } from '@/shared/types/reports';

export function ReportsHub() {
  const { data: overview } = useQuery({
    queryKey: ['reports-overview'],
    queryFn: async () => unwrapIpc(await ipcClient.reports.overview()) as ReportOverview,
  });

  if (!overview) return <p className="text-sm text-muted-foreground">Chargement du tableau de bord…</p>;

  const kpis = [
    { label: 'Sources disponibles', value: overview.accessibleSources, total: overview.totalSources, icon: Database, color: 'text-brand-turquoise' },
    { label: 'Rapports synthétiques', value: overview.accessibleKpis, icon: BarChart3, color: 'text-blue-500' },
    { label: 'Modèles sauvegardés', value: overview.savedTemplates, icon: FileSpreadsheet, color: 'text-emerald-500' },
    { label: 'Exports réalisés', value: overview.totalRuns, icon: History, color: 'text-orange-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="border-0 shadow-card">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className={`rounded-lg bg-muted p-3 ${k.color}`}>
                <k.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold">{k.value}{k.total ? <span className="text-sm font-normal text-muted-foreground"> / {k.total}</span> : null}</p>
                <p className="text-xs text-muted-foreground">{k.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {overview.lastRunAt && (
        <p className="text-sm text-muted-foreground">
          Dernier export : {new Date(overview.lastRunAt).toLocaleString('fr-FR')}
        </p>
      )}

      <Card className="border-0 shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="h-5 w-5" /> Couverture par domaine métier
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {overview.categories.map((cat) => (
              <div key={cat.name} className="rounded-lg border bg-muted/30 p-4">
                <p className="font-medium">{cat.name}</p>
                <div className="mt-2 flex gap-4 text-sm text-muted-foreground">
                  <span>{cat.sourceCount} source{cat.sourceCount > 1 ? 's' : ''} détaillée{cat.sourceCount > 1 ? 's' : ''}</span>
                  {cat.kpiCount > 0 && <span>{cat.kpiCount} synthèse{cat.kpiCount > 1 ? 's' : ''}</span>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-card bg-gradient-to-br from-brand-turquoise/5 to-transparent">
        <CardContent className="py-6">
          <h3 className="font-semibold">Comment créer un rapport ?</h3>
          <ol className="mt-3 space-y-2 text-sm text-muted-foreground list-decimal list-inside">
            <li>Parcourez le <strong>Catalogue</strong> pour choisir une source de données (30+ tables métier)</li>
            <li>Ou lancez un <strong>Rapport synthétique</strong> (KPI agrégés : CA, créances, pipeline…)</li>
            <li>Sélectionnez colonnes et filtres selon vos droits d&apos;accès hôtel</li>
            <li>Prévisualisez, exportez Excel ou enregistrez comme modèle réutilisable</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
