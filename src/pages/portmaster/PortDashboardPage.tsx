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
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:p-5">
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
    <div className="port-dashboard-page page-stack">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground sm:text-sm">
          Période : <span className="font-medium text-foreground">{data.periodeLabel}</span>
        </p>
        <div className="flex w-full flex-col gap-2 xs:flex-row sm:w-auto">
          <Button variant="outline" onClick={reload} className="w-full xs:w-auto">
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualiser
          </Button>
          <Button className="w-full xs:w-auto">Exporter PDF</Button>
        </div>
      </div>

      <DashboardFiltersBar
        filters={draftFilters}
        onChange={setDraftFilters}
        onApply={applyFilters}
        onReset={resetFilters}
        showHotelFilter={false}
        hideRubriqueFilter={true}
      />

      <PortDashboardKpis data={data} />

      <PortDashboardCharts data={data} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3 xl:gap-6 2xl:gap-8">
        <div className="xl:col-span-2">
          <VisualMooringPlan emplacements={data.emplacements} />
        </div>
        <div className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">Alertes & Événements</CardTitle>
            </CardHeader>
            <CardContent>
              {data.alertes && data.alertes.length > 0 ? (
                <div className="space-y-3 sm:space-y-4">
                  {data.alertes.slice(0, 5).map((alerte) => (
                    <div
                      key={alerte.id}
                      className="flex flex-col space-y-1 border-b pb-2 last:border-0"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium">{alerte.categorie}</span>
                        <Badge variant={alerte.severite === 'danger' ? 'danger' : 'muted'}>
                          {alerte.severite}
                        </Badge>
                      </div>
                      <p className="text-xs leading-relaxed text-muted-foreground">{alerte.message}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">
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
