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
        'relative overflow-hidden rounded-2xl p-6 text-white shadow-elevated lg:p-7',
        '[background:linear-gradient(135deg,#1E40AF_0%,#2563EB_55%,#3B82F6_100%)]',
        className,
      )}
    >
      {/* Decorative glows */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full bg-white/10 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-16 left-1/4 h-48 w-48 rounded-full bg-blue-300/20 blur-3xl" aria-hidden />

      <div className="relative flex flex-wrap items-center justify-between gap-6">
        {/* Left — CA + badge */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55">
            {periodeLabel}
          </p>
          <p className="mt-1.5 font-mono text-[2rem] font-bold leading-tight tracking-tight lg:text-[2.4rem]">
            {formatMoney(kpis.caMois)}
          </p>
          <p className="mt-1.5 text-sm text-white/60">
            Chiffre d'affaires réalisé · {kpis.saisiesRealisees} saisies
          </p>
          {variationPct !== undefined && (
            <div
              className={cn(
                'mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] font-semibold',
                varPos
                  ? 'border-emerald-400/30 bg-emerald-500/20 text-emerald-300'
                  : 'border-red-400/30 bg-red-500/20 text-red-300',
              )}
            >
              {varPos
                ? <TrendingUp className="h-3.5 w-3.5" />
                : <TrendingDown className="h-3.5 w-3.5" />}
              {varPos ? '+' : ''}{variationPct} % vs mois précédent
            </div>
          )}
          {actions && <div className="mt-4 flex flex-wrap gap-2">{actions}</div>}
        </div>

        {/* Right — stats grid */}
        <div className="flex items-stretch gap-0">
          <HeroStat
            value={formatPercent(kpis.tauxRealisation)}
            label="Objectif"
            highlight={kpis.tauxRealisation >= 100 ? 'success' : kpis.tauxRealisation >= 75 ? 'gold' : 'danger'}
          />
          <HeroStat
            value={formatPercent(kpis.tauxEncaissement)}
            label="Encaissement"
            highlight={kpis.tauxEncaissement >= 80 ? 'success' : 'gold'}
          />
          <HeroStat
            value={String(kpis.saisiesRealisees)}
            label="Saisies"
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
        'border-l border-white/[0.12] px-6 text-center',
        last && 'pr-0',
      )}
    >
      <p
        className={cn(
          'font-mono text-[1.35rem] font-bold leading-tight',
          highlight === 'success' && 'text-emerald-300',
          highlight === 'gold'    && 'text-amber-300',
          highlight === 'danger'  && 'text-red-300',
          !highlight              && 'text-white',
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.09em] text-white/50">
        {label}
      </p>
    </div>
  );
}
