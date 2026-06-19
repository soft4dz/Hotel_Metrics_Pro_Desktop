import { memo } from 'react';
import {
  AlertTriangle,
  Building2,
  Euro,
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
    <div className="space-y-6">
      {/* 1. Performance Financière */}
      <section aria-labelledby="kpi-financier-heading">
        <h3 id="kpi-financier-heading" className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Wallet className="h-4 w-4" /> Performance Financière
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <KpiCard title="CA du jour"         value={formatMoney(kpis.caJour)}              icon={Euro}       accent="primary" />
          <KpiCard title="CA du mois"         value={formatMoney(kpis.caMois)}              icon={TrendingUp} accent="accent"  trend={kpis.variationCaPct} />
          <KpiCard title="CA annuel"          value={formatMoney(kpis.caAnnuel)}            icon={TrendingUp} accent="neutral" />
          <KpiCard title="Objectif mensuel"   value={formatMoney(kpis.objectifMois)}        icon={Target}     accent="neutral" />
          <KpiCard title="Taux réalisation"   value={formatPercent(kpis.tauxRealisation)}   icon={Target}     accent="success" />
        </div>
      </section>

      {/* 2. Indicateurs Hôteliers (Nouveau) */}
      <section aria-labelledby="kpi-hotelier-heading">
        <h3 id="kpi-hotelier-heading" className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <BedDouble className="h-4 w-4" /> Indicateurs Métiers (Hébergement & F&B)
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard title="Taux d'occupation"  value={formatPercent(kpis.tauxOccupation)}    icon={KeyRound}   accent="primary" />
          <KpiCard title="RevPAR"             value={formatMoney(kpis.revPAR)}              icon={BarChart4}  accent="gold" />
          <KpiCard title="Prix Moyen Chambre" value={formatMoney(kpis.adr)}                 icon={BedDouble}  accent="accent" />
          <KpiCard title="Prix Moyen Couvert" value={formatMoney(kpis.prixMoyenCouvert)}    icon={Utensils}   accent="neutral" />
        </div>
      </section>

      {/* 3. Opérations & Trésorerie */}
      <section aria-labelledby="kpi-operations-heading">
        <h3 id="kpi-operations-heading" className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Building2 className="h-4 w-4" /> Opérations & Trésorerie
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
