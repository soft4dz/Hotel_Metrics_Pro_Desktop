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
    <div className="space-y-5">
      {/* Hero principal */}
      <DashboardHero
        periodeLabel={data.kpis.periodeLabel}
        kpis={data.kpis}
        variationPct={data.kpis.variationCaPct}
        actions={exportActions}
      />

      {/* KPIs primaires + secondaires */}
      <DashboardKpiSection kpis={data.kpis} />

      {/* Analyse par hôtel */}
      <SectionBlock
        title="Analyse par hôtel"
        description="Performance par unité sur la période filtrée"
      >
        <HotelAnalyseGrid hotels={data.parHotel} />
      </SectionBlock>

      {/* Alertes + répartition rubrique */}
      <div className="grid gap-5 xl:grid-cols-2">
        <SectionBlock
          title="Alertes intelligentes"
          description="Détection automatique sur la période"
        >
          <DashboardAlertsPanel alertes={data.alertes} />
        </SectionBlock>
        <SectionBlock
          title="Répartition par rubrique"
          description="Part du CA par activité"
        >
          <RubriqueBreakdown rows={data.parRubrique} />
        </SectionBlock>
      </div>

      {/* Graphiques (lazy) */}
      <Suspense
        fallback={
          <div className="grid gap-5 xl:grid-cols-2">
            <DashboardChartSkeleton />
            <DashboardChartSkeleton />
          </div>
        }
      >
        <DashboardChartsSection data={data} annee={annee} />
      </Suspense>

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
      <div className="dashboard-print space-y-5">
        {/* Barre de filtres */}
        <div className="print:hidden">
          <DashboardFiltersBar
            filters={draftFilters}
            onChange={setDraftFilters}
            onApply={applyFilters}
            onReset={resetFilters}
            showHotelFilter={showHotelFilter}
          />
        </div>

        {exportMsg && (
          <p className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary print:hidden">
            {exportMsg}
          </p>
        )}
        {error && (
          <p className="rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}

        {loading ? (
          <div
            className="flex min-h-[420px] items-center justify-center gap-2.5 text-sm text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            Chargement du tableau de bord…
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
