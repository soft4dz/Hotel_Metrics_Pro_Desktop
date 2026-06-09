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

const accentBar = {
  primary: 'bg-primary',
  accent: 'bg-brand-turquoise',
  gold: 'bg-brand-gold',
  success: 'bg-brand-success',
  warning: 'bg-brand-warning',
  danger: 'bg-brand-danger',
  neutral: 'bg-slate-300',
};

const iconTone = {
  primary: 'bg-primary/10 text-primary',
  accent: 'bg-cyan-500/10 text-brand-turquoise',
  success: 'bg-emerald-500/10 text-brand-success',
  warning: 'bg-orange-500/10 text-brand-warning',
  danger: 'bg-red-500/10 text-brand-danger',
  neutral: 'bg-slate-100 text-slate-600',
  gold: 'bg-amber-500/10 text-brand-gold',
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
  const accent =
    accentProp ?? (variant ? variantMap[variant] : 'neutral');
  const trendPositive = trend !== undefined && trend >= 0;

  return (
    <div className="app-surface group relative overflow-hidden p-5 transition-all duration-200 hover:border-primary/15 hover:shadow-elevated motion-reduce:transition-none">
      <div className={cn('absolute inset-y-0 left-0 w-1', accentBar[accent])} />
      <div className="flex items-start justify-between gap-3 pl-2">
        <div className="min-w-0 flex-1">
          <p className="section-label">{title}</p>
          <p className="mt-2 truncate font-mono text-2xl font-semibold tabular-nums tracking-tight text-foreground">
            {value}
          </p>
          {subtitle && (
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{subtitle}</p>
          )}
          {trend !== undefined && (
            <div
              className={cn(
                'mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                trendPositive
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-red-50 text-red-700',
              )}
            >
              {trendPositive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {trendPositive ? '+' : ''}
              {trend} %
            </div>
          )}
        </div>
        <div className={cn('shrink-0 rounded-xl p-2.5', iconTone[accent])}>
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </div>
      </div>
    </div>
  );
}

export const KpiCard = memo(KpiCardComponent);
