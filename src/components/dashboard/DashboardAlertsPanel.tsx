import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { DashboardAlerte } from '@/shared/types/dashboard';

interface DashboardAlertsPanelProps {
  alertes: DashboardAlerte[];
}

const niveauConfig = {
  information: {
    icon: Info,
    border: 'border-l-blue-400',
    bg: 'bg-blue-50/60',
    badge: 'muted' as const,
  },
  avertissement: {
    icon: AlertTriangle,
    border: 'border-l-amber-400',
    bg: 'bg-amber-50/60',
    badge: 'warning' as const,
  },
  critique: {
    icon: AlertCircle,
    border: 'border-l-red-400',
    bg: 'bg-red-50/60',
    badge: 'danger' as const,
  },
};

export function DashboardAlertsPanel({ alertes }: DashboardAlertsPanelProps) {
  if (alertes.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-emerald-200/70 bg-emerald-50/50 px-4 py-3.5 text-sm text-emerald-800">
        <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-emerald-500" strokeWidth={1.75} />
        Aucune alerte sur la période sélectionnée.
      </div>
    );
  }

  return (
    <ul className="space-y-2.5">
      {alertes.map((a) => {
        const cfg = niveauConfig[a.niveau];
        const Icon = cfg.icon;
        return (
          <li
            key={a.id}
            className={cn(
              'flex gap-3 rounded-lg border border-border/50 border-l-4 px-4 py-3 transition-shadow duration-200 hover:shadow-sm',
              cfg.border,
              cfg.bg,
            )}
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-foreground/60" strokeWidth={1.75} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[13px] font-semibold text-foreground">{a.type}</p>
                {a.hotelName && (
                  <span className="text-xs text-muted-foreground">— {a.hotelName}</span>
                )}
                <Badge variant={cfg.badge} className="text-[10px]">{a.niveau}</Badge>
                <Badge variant={a.resolu ? 'success' : 'muted'} className="text-[10px]">
                  {a.resolu ? 'Résolue' : 'Non résolue'}
                </Badge>
              </div>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{a.description}</p>
              <p className="mt-1.5 text-[11px] text-muted-foreground/70">{a.date}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
