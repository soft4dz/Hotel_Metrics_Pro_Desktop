import type { ReactNode } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { formatMoney, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { DashboardKpis } from '@/shared/types/dashboard';

interface DashboardHeroProps {
  periodeLabel: string;
  kpis: DashboardKpis;
  variationPct?: number;
  actions?: ReactNode;
  className?: string;
}

export function DashboardHero({ periodeLabel, kpis, variationPct, actions, className }: DashboardHeroProps) {
  const varPos = variationPct !== undefined && variationPct >= 0;

  return (
    <div
      className={cn(
        'dashboard-hero overflow-hidden rounded-[var(--radius)] border border-border border-l-4 border-l-primary p-4 shadow-card sm:p-5 lg:p-6',
        className,
      )}
      role="region"
      aria-label="Synthèse du chiffre d'affaires"
    >
      <div className="flex flex-col items-start justify-between gap-5 xl:flex-row xl:items-stretch">
        <div className="flex-1">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="section-label text-primary">Synthèse de direction</span>
            <span className="rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground">
              {periodeLabel}
            </span>
          </div>

          <p className="mb-1 font-mono text-3xl font-bold tabular-nums tracking-tight text-foreground sm:text-4xl lg:text-[2.75rem]">
            {formatMoney(kpis.caMois)}
          </p>
          <p className="mb-4 text-sm text-muted-foreground">
            Chiffre d'affaires consolidé du mois
          </p>

          <div className="flex flex-wrap items-center gap-3">
            {variationPct !== undefined && (
              <div
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold',
                  varPos
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-red-200 bg-red-50 text-red-700',
                )}
              >
                {varPos ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                {varPos ? '+' : ''}{variationPct} % VS M-1
              </div>
            )}
            {actions && <div className="flex gap-2">{actions}</div>}
          </div>
        </div>

        <div className="grid w-full grid-cols-2 overflow-hidden rounded-[var(--radius)] border border-border bg-background sm:grid-cols-4 xl:w-auto xl:min-w-[34rem]">
          <HeroStat
            value={formatPercent(kpis.tauxRealisation)}
            label="Objectif"
            highlight={kpis.tauxRealisation >= 100 ? 'success' : kpis.tauxRealisation >= 75 ? 'gold' : 'danger'}
          />
          <HeroStat
            value={formatPercent(kpis.tauxOccupation)}
            label="Occ. Globale"
            highlight={kpis.tauxOccupation >= 70 ? 'success' : 'gold'}
          />
          <HeroStat
            value={formatPercent(kpis.tauxEncaissement)}
            label="Encaissement"
            highlight={kpis.tauxEncaissement >= 80 ? 'success' : 'gold'}
          />
          <HeroStat
            value={String(kpis.saisiesManquantes)}
            label="Manquantes"
            highlight={kpis.saisiesManquantes > 0 ? 'danger' : undefined}
          />
        </div>
      </div>
    </div>
  );
}

function HeroStat({
  value,
  label,
  highlight,
}: {
  value: string;
  label: string;
  highlight?: 'success' | 'gold' | 'danger';
}) {
  return (
    <div className="flex min-h-24 flex-col justify-center border-b border-r border-border px-4 py-3 text-left last:border-r-0 sm:border-b-0">
      <p
        className={cn(
          'font-mono text-xl font-bold tabular-nums tracking-tight text-foreground',
          highlight === 'success' && 'text-emerald-700',
          highlight === 'gold'    && 'text-amber-700',
          highlight === 'danger'  && 'text-red-700',
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
