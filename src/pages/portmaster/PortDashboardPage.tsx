import { Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePortDashboard } from '@/hooks/usePortDashboard';
import { DashboardFiltersBar } from '@/components/dashboard/DashboardFiltersBar';
import { PortDashboardKpis } from '@/components/port/dashboard/PortDashboardKpis';
import { PortDashboardCharts } from '@/components/port/dashboard/PortDashboardCharts';
import { VisualMooringPlan } from '@/components/port/dashboard/VisualMooringPlan';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
export default function PortDashboardPage() {
  const {
    draftFilters,
    setDraftFilters,
    data,
    loading,
    error,
    applyFilters,
    resetFilters,
    reload,
  } = usePortDashboard();

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="m-4 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <div className="flex items-center gap-2 font-semibold">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Erreur de chargement
        </div>
        <p className="text-red-600">{error}</p>
        <button
          onClick={reload}
          className="mt-1 self-start rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50"
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <p className="text-sm text-muted-foreground">
          Période : {data.periodeLabel}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={reload}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualiser
          </Button>
          <Button>Exporter PDF</Button>
        </div>
      </div>

      <div className="mb-6">
        <DashboardFiltersBar
          filters={draftFilters}
          onChange={setDraftFilters}
          onApply={applyFilters}
          onReset={resetFilters}
          showHotelFilter={false}
          hideRubriqueFilter={true}
        />
      </div>

      <PortDashboardKpis data={data} />

      <PortDashboardCharts data={data} />

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <VisualMooringPlan emplacements={data.emplacements} />
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Alertes & Événements</CardTitle>
            </CardHeader>
            <CardContent>
              {data.alertes && data.alertes.length > 0 ? (
                <div className="space-y-4">
                  {data.alertes.slice(0, 5).map((alerte) => (
                    <div key={alerte.id} className="flex flex-col space-y-1 border-b pb-2 last:border-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{alerte.categorie}</span>
                        <Badge variant={alerte.severite === 'danger' ? 'danger' : 'muted'}>
                          {alerte.severite}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{alerte.message}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucune alerte en cours
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
