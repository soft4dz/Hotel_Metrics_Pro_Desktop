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
    border: 'border-l-blue-500',
    bg: 'bg-blue-50/80',
    badge: 'muted' as const,
  },
  avertissement: {
    icon: AlertTriangle,
    border: 'border-l-amber-500',
    bg: 'bg-amber-50/80',
    badge: 'warning' as const,
  },
  critique: {
    icon: AlertCircle,
    border: 'border-l-red-500',
    bg: 'bg-red-50/80',
    badge: 'danger' as const,
  },
};

export function DashboardAlertsPanel({ alertes }: DashboardAlertsPanelProps) {
  if (alertes.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-200/80 bg-emerald-50/50 px-4 py-4 text-sm text-emerald-800">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" strokeWidth={1.75} />
        Aucune alerte sur la période sélectionnée.
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {alertes.map((a) => {
        const cfg = niveauConfig[a.niveau];
        const Icon = cfg.icon;
        return (
          <li
            key={a.id}
            className={cn(
              'flex gap-3 rounded-xl border border-border/60 border-l-4 px-4 py-3 transition-shadow duration-200 hover:shadow-card',
              cfg.border,
              cfg.bg,
            )}
          >
            <Icon className="mt-0.5 h-5 w-5 shrink-0 text-foreground/70" strokeWidth={1.75} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-foreground">{a.type}</p>
                {a.hotelName && (
                  <span className="text-xs text-muted-foreground">— {a.hotelName}</span>
                )}
                <Badge variant={cfg.badge} className="text-[10px]">
                  {a.niveau}
                </Badge>
                <Badge variant={a.resolu ? 'success' : 'muted'} className="text-[10px]">
                  {a.resolu ? 'Résolue' : 'Non résolue'}
                </Badge>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{a.description}</p>
              <p className="mt-2 text-[11px] text-muted-foreground/80">{a.date}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
