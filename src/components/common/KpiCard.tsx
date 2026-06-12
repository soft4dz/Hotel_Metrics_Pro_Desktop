import { memo } from 'react';
import { type LucideIcon, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: number;
  accent?: 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'neutral' | 'gold';
  /** Alias legacy — préférer `accent` */
  variant?: 'default' | 'accent' | 'success' | 'warning' | 'danger';
}

const variantMap = {
  default: 'primary',
  accent: 'accent',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
} as const;

const iconTone = {
  primary: 'bg-primary/10 text-primary',
  accent:  'bg-cyan-500/10 text-cyan-600',
  success: 'bg-emerald-500/10 text-emerald-600',
  warning: 'bg-orange-500/10 text-orange-600',
  danger:  'bg-red-500/10 text-red-600',
  neutral: 'bg-slate-100 text-slate-500',
  gold:    'bg-amber-500/10 text-amber-600',
};

function KpiCardComponent({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  accent: accentProp,
  variant,
}: KpiCardProps) {
  const accent = accentProp ?? (variant ? variantMap[variant] : 'neutral');
  const trendPositive = trend !== undefined && trend >= 0;

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border/60 bg-white p-5 shadow-sm transition-all duration-200 hover:border-primary/20 hover:shadow-md motion-reduce:transition-none">
      <div className="flex items-start justify-between gap-3">
        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', iconTone[accent])}>
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        </div>
        {trend !== undefined && (
          <div
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
              trendPositive
                ? 'bg-emerald-50 text-emerald-600'
                : 'bg-red-50 text-red-600',
            )}
          >
            {trendPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {trendPositive ? '+' : ''}{trend}%
          </div>
        )}
      </div>

      <p className="mt-4 truncate font-mono text-[1.65rem] font-bold tabular-nums tracking-tight text-foreground">
        {value}
      </p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
        {title}
      </p>
      {subtitle && (
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}

export const KpiCard = memo(KpiCardComponent);
