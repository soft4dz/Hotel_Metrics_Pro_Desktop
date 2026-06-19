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
  accent:  'bg-accent/10 text-accent',
  success: 'bg-emerald-500/10 text-emerald-600',
  warning: 'bg-orange-500/10 text-orange-600',
  danger:  'bg-destructive/10 text-destructive',
  neutral: 'bg-muted text-muted-foreground',
  gold:    'bg-gold/10 text-gold',
};

const borderTone = {
  primary: 'hover:border-primary/30 hover:ring-1 hover:ring-primary/20',
  accent:  'hover:border-accent/30 hover:ring-1 hover:ring-accent/20',
  success: 'hover:border-emerald-500/30 hover:ring-1 hover:ring-emerald-500/20',
  warning: 'hover:border-orange-500/30 hover:ring-1 hover:ring-orange-500/20',
  danger:  'hover:border-destructive/30 hover:ring-1 hover:ring-destructive/20',
  neutral: 'hover:border-border',
  gold:    'hover:border-gold/30 hover:ring-1 hover:ring-gold/20',
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
    <div className={cn('metric-card group relative flex flex-col justify-between', borderTone[accent])}>
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius)] transition-transform duration-200 group-hover:scale-105 motion-reduce:scale-100',
            iconTone[accent],
          )}>
            <Icon className="h-5 w-5" strokeWidth={2} />
          </div>
          {trend !== undefined && (
            <div
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold transition-colors',
                trendPositive
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-red-50 text-red-700',
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
          <p className="font-mono text-3xl font-bold tabular-nums tracking-tight text-foreground">
            {value}
          </p>
          <p className="mt-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
          {subtitle && (
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export const KpiCard = memo(KpiCardComponent);
