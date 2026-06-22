import { lazy, Suspense, useCallback, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { SectionBlock } from '@/components/common/SectionBlock';
import { DashboardAlertsPanel } from '@/components/dashboard/DashboardAlertsPanel';
import { DashboardChartSkeleton } from '@/components/dashboard/DashboardChartSkeleton';
import { DashboardErrorBoundary } from '@/components/dashboard/DashboardErrorBoundary';
import { DashboardExportActions } from '@/components/dashboard/DashboardExportActions';
import { DashboardFiltersBar } from '@/components/dashboard/DashboardFiltersBar';
import { DashboardHero } from '@/components/dashboard/DashboardHero';
import { DashboardKpiSection } from '@/components/dashboard/DashboardKpiSection';
import { DashboardTablesSection } from '@/components/dashboard/DashboardTablesSection';
import { HotelAnalyseGrid } from '@/components/dashboard/HotelAnalyseGrid';
import { RubriqueBreakdown } from '@/components/dashboard/RubriqueBreakdown';
import { useDashboard } from '@/hooks/useDashboard';
import { useAuthStore } from '@/stores/auth.store';
import { canViewDashboard } from '@/shared/permissions';
import type { DashboardDto } from '@/shared/types/dashboard';

const DashboardChartsSection = lazy(() =>
  import('@/components/dashboard/DashboardChartsSection').then((module) => ({
    default: module.DashboardChartsSection,
  })),
);

interface DashboardBodyProps {
  data: DashboardDto;
  annee: number;
  onExportExcel: () => void;
  onExportPdf: () => void;
}

function DashboardBody({ data, annee, onExportExcel, onExportPdf }: DashboardBodyProps) {
  const exportActions = useMemo(
    () =>
      data.canExport ? (
        <DashboardExportActions onExcel={onExportExcel} onPdf={onExportPdf} />
      ) : null,
    [data.canExport, onExportExcel, onExportPdf],
  );

  return (
    <div className="page-stack">
      {/* Hero principal Premium */}
      <DashboardHero
        periodeLabel={data.kpis.periodeLabel}
        kpis={data.kpis}
        variationPct={data.kpis.variationCaPct}
        actions={exportActions}
      />

      {/* Nouveaux KPIs structurés */}
      <DashboardKpiSection kpis={data.kpis} />

      {/* Graphiques Principaux */}
      <Suspense
        fallback={
          <div className="grid gap-6 xl:grid-cols-2">
            <DashboardChartSkeleton />
            <DashboardChartSkeleton />
          </div>
        }
      >
        <DashboardChartsSection data={data} annee={annee} />
      </Suspense>

      {/* Répartition et Alertes (Côte à côte) */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 xl:grid-cols-3 xl:gap-4">
        <div className="xl:col-span-2">
          <SectionBlock
            title="Performance par unité"
            description="Vue détaillée des hôtels sur la période"
          >
            <HotelAnalyseGrid hotels={data.parHotel} />
          </SectionBlock>
        </div>
        <div className="space-y-3 sm:space-y-4">
          <SectionBlock
            title="Alertes intelligentes"
            description="Détection d'anomalies sur la période"
          >
            <DashboardAlertsPanel alertes={data.alertes} />
          </SectionBlock>
          <SectionBlock
            title="Répartition des revenus"
            description="Part du CA par activité (Hébergement, F&B...)"
          >
            <RubriqueBreakdown rows={data.parRubrique} />
          </SectionBlock>
        </div>
      </div>

      {/* Tables de synthèse */}
      <DashboardTablesSection data={data} />
    </div>
  );
}

export function DashboardGlobalPage() {
  const role = useAuthStore((s) => s.user?.role);
  const canView = canViewDashboard(role);

  const {
    draftFilters,
    setDraftFilters,
    appliedFilters,
    data,
    loading,
    error,
    exportMsg,
    applyFilters,
    resetFilters,
    exportExcel,
    exportPdf,
  } = useDashboard(canView);

  const handleExportExcel = useCallback(() => { void exportExcel(); }, [exportExcel]);
  const handleExportPdf   = useCallback(() => { void exportPdf(); }, [exportPdf]);

  const showHotelFilter = data ? !data.scopeHotelOnly : true;

  if (!canView) {
    return (
      <p className="rounded-xl border border-border/60 bg-white px-5 py-4 text-sm text-muted-foreground shadow-sm">
        Accès refusé au tableau de bord.
      </p>
    );
  }

  return (
    <DashboardErrorBoundary>
      <div className="dashboard-print w-full space-y-3 pb-4 sm:space-y-4 sm:pb-6">
        <div className="w-full print:hidden">
          <DashboardFiltersBar
            filters={draftFilters}
            onChange={setDraftFilters}
            onApply={applyFilters}
            onReset={resetFilters}
            showHotelFilter={showHotelFilter}
          />
        </div>

        {exportMsg && (
          <p className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary print:hidden shadow-sm">
            {exportMsg}
          </p>
        )}
        {error && (
          <p className="rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive shadow-sm">
            {error}
          </p>
        )}

        {loading ? (
          <div
            className="flex min-h-[420px] flex-col items-center justify-center gap-4 text-sm text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="animate-pulse">Génération des statistiques en cours...</p>
          </div>
        ) : data ? (
          <DashboardBody
            data={data}
            annee={appliedFilters.annee}
            onExportExcel={handleExportExcel}
            onExportPdf={handleExportPdf}
          />
        ) : null}
      </div>
    </DashboardErrorBoundary>
  );
}
