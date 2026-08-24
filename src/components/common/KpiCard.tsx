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
  primary: 'text-primary',
  accent:  'text-accent',
  success: 'text-emerald-700',
  warning: 'text-orange-700',
  danger:  'text-destructive',
  neutral: 'text-muted-foreground',
  gold:    'text-amber-700',
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
    <div className="metric-card flex min-h-[8.25rem] flex-col justify-between">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className={cn(
            'flex min-w-0 items-center gap-2',
            iconTone[accent],
          )}>
            <Icon className="h-4 w-4 shrink-0" strokeWidth={1.8} />
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {title}
            </p>
          </div>
          {trend !== undefined && (
            <div
              data-testid="trend"
              className={cn(
                'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold',
                trendPositive
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-red-200 bg-red-50 text-red-700',
              )}
            >
              {trendPositive ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" />
              )}
              {trendPositive ? '+' : ''}{trend}%
            </div>
          )}
        </div>

        <div>
          <p className="font-mono text-2xl font-bold tabular-nums tracking-tight text-foreground sm:text-[1.55rem]">
            {value}
          </p>
          {subtitle && (
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export const KpiCard = memo(KpiCardComponent);
