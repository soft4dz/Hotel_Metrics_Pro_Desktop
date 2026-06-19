import type { ReactNode } from 'react';
import { TrendingDown, TrendingUp, Sparkles } from 'lucide-react';
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
        'dashboard-hero relative overflow-hidden rounded-[var(--radius)] p-6 shadow-elevated lg:p-8',
        className,
      )}
      role="region"
      aria-label="Synthèse du chiffre d'affaires"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/20" aria-hidden />
      <div className="pointer-events-none absolute -right-20 -top-20 h-96 w-96 rounded-full bg-white/10 blur-3xl" aria-hidden />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

      <div className="relative flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
        <div className="flex-1">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-white/80" />
            <span className="text-xs font-semibold uppercase tracking-wider text-white/80">
              {periodeLabel}
            </span>
          </div>

          <p className="mb-2 font-mono text-4xl font-bold tracking-tight text-white drop-shadow-sm lg:text-5xl">
            {formatMoney(kpis.caMois)}
          </p>
          <p className="mb-4 text-sm font-medium text-white/70">
            Chiffre d'affaires global généré
          </p>

          <div className="flex flex-wrap items-center gap-3">
            {variationPct !== undefined && (
              <div
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold tracking-wide backdrop-blur-md',
                  varPos
                    ? 'border border-emerald-400/30 bg-emerald-500/15 text-emerald-200'
                    : 'border border-red-400/30 bg-red-500/15 text-red-200',
                )}
              >
                {varPos ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                {varPos ? '+' : ''}{variationPct} % VS M-1
              </div>
            )}
            {actions && <div className="flex gap-2">{actions}</div>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 rounded-[var(--radius)] border border-white/10 bg-white/5 p-4 backdrop-blur-sm sm:flex sm:gap-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
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
            last
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
  last = false,
}: {
  value: string;
  label: string;
  highlight?: 'success' | 'gold' | 'danger';
  last?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-col justify-center text-center sm:border-l sm:border-white/15 sm:px-6',
        last && 'sm:pr-0',
      )}
    >
      <p
        className={cn(
          'font-mono text-2xl font-bold tracking-tight',
          highlight === 'success' && 'text-emerald-300',
          highlight === 'gold'    && 'text-amber-300',
          highlight === 'danger'  && 'text-rose-300',
          !highlight              && 'text-white',
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/60">
        {label}
      </p>
    </div>
  );
}
