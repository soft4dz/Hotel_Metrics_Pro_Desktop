import { memo } from 'react';
import {
  AlertTriangle,
  Banknote,
  Building2,
  Target,
  TrendingUp,
  Wallet,
  BedDouble,
  Utensils,
  KeyRound,
  BarChart4,
} from 'lucide-react';
import { KpiCard } from '@/components/common/KpiCard';
import { formatMoney, formatPercent } from '@/lib/formatters';
import type { DashboardKpis } from '@/shared/types/dashboard';

interface DashboardKpiSectionProps {
  kpis: DashboardKpis;
}

function DashboardKpiSectionComponent({ kpis }: DashboardKpiSectionProps) {
  return (
    <div className="space-y-3 sm:space-y-4">
      <section aria-labelledby="kpi-metier-heading">
        <h3 id="kpi-metier-heading" className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-xs">
          <BedDouble className="h-3.5 w-3.5" /> Performance métier
        </h3>
        <div className="grid gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
          <KpiCard title="CA du jour"          value={formatMoney(kpis.caJour)}             icon={Banknote}   accent="primary" />
          <KpiCard title="Taux d'occupation"  value={formatPercent(kpis.tauxOccupation)}    icon={KeyRound}   accent="primary" />
          <KpiCard title="RevPAR"             value={formatMoney(kpis.revPAR)}              icon={BarChart4}  accent="gold" />
          <KpiCard title="Prix Moyen Chambre" value={formatMoney(kpis.adr)}                 icon={BedDouble}  accent="accent" />
        </div>
      </section>

      <section aria-labelledby="kpi-control-heading">
        <h3 id="kpi-control-heading" className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-xs">
          <Building2 className="h-3.5 w-3.5" /> Cadre financier et qualité des données
        </h3>
        <div className="kpi-grid-secondary">
          <KpiCard title="CA annuel"          value={formatMoney(kpis.caAnnuel)}            icon={TrendingUp}   accent="neutral" />
          <KpiCard title="Objectif mensuel"   value={formatMoney(kpis.objectifMois)}        icon={Target}       accent="neutral" />
          <KpiCard title="Encaissements"      value={formatMoney(kpis.totalEncaissements)}  icon={Wallet}       accent="accent"  />
          <KpiCard title="Écart obj. / réalisé" value={formatMoney(kpis.ecartObjectif)}    icon={Target}       accent={kpis.ecartObjectif < 0 ? 'warning' : 'success'} />
          <KpiCard title="Prix moyen couvert" value={formatMoney(kpis.prixMoyenCouvert)}    icon={Utensils}     accent="neutral" />
          <KpiCard title="Saisies manquantes" value={String(kpis.saisiesManquantes)}        icon={AlertTriangle} accent={kpis.saisiesManquantes > 0 ? 'warning' : 'neutral'} />
        </div>
      </section>
    </div>
  );
}

export const DashboardKpiSection = memo(DashboardKpiSectionComponent);
