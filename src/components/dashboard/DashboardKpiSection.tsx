import { memo } from 'react';
import {
  AlertTriangle,
  Building2,
  Euro,
  Target,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { KpiCard } from '@/components/common/KpiCard';
import { formatMoney, formatPercent } from '@/lib/formatters';
import type { DashboardKpis } from '@/shared/types/dashboard';

interface DashboardKpiSectionProps {
  kpis: DashboardKpis;
}

function DashboardKpiSectionComponent({ kpis }: DashboardKpiSectionProps) {
  return (
    <div className="space-y-3">
      <section aria-labelledby="kpi-primary-heading">
        <h3 id="kpi-primary-heading" className="sr-only">Indicateurs principaux</h3>
        <div className="kpi-grid-primary">
          <KpiCard title="CA du jour"         value={formatMoney(kpis.caJour)}              icon={Euro}       accent="primary" />
          <KpiCard title="CA du mois"         value={formatMoney(kpis.caMois)}              icon={TrendingUp} accent="accent"  trend={kpis.variationCaPct} />
          <KpiCard title="CA annuel"          value={formatMoney(kpis.caAnnuel)}            icon={TrendingUp} accent="neutral" />
          <KpiCard title="Objectif mensuel"   value={formatMoney(kpis.objectifMois)}        icon={Target}     accent="neutral" />
          <KpiCard title="Taux réalisation"   value={formatPercent(kpis.tauxRealisation)}   icon={Target}     accent="success" />
        </div>
      </section>

      <section aria-labelledby="kpi-secondary-heading">
        <h3 id="kpi-secondary-heading" className="sr-only">Encaissements et saisies</h3>
        <div className="kpi-grid-secondary">
          <KpiCard title="Encaissements"      value={formatMoney(kpis.totalEncaissements)}  icon={Wallet}       accent="accent"  />
          <KpiCard title="Taux encaissement"  value={formatPercent(kpis.tauxEncaissement)}  icon={Wallet}       accent="neutral" />
          <KpiCard title="Écart obj. / réalisé" value={formatMoney(kpis.ecartObjectif)}    icon={Target}       accent={kpis.ecartObjectif < 0 ? 'warning' : 'success'} />
          <KpiCard title="Saisies réalisées"  value={String(kpis.saisiesRealisees)}         icon={Building2}    accent="neutral" />
          <KpiCard title="Saisies manquantes" value={String(kpis.saisiesManquantes)}        icon={AlertTriangle} accent={kpis.saisiesManquantes > 0 ? 'warning' : 'neutral'} />
        </div>
      </section>
    </div>
  );
}

export const DashboardKpiSection = memo(DashboardKpiSectionComponent);
