import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { EmplacementListItem } from '@/shared/types/portmaster';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Map } from 'lucide-react';

interface Props {
  emplacements: EmplacementListItem[];
}

const statusColors: Record<string, string> = {
  libre: 'bg-emerald-500 hover:bg-emerald-600',
  disponible: 'bg-emerald-500 hover:bg-emerald-600',
  occupe: 'bg-blue-500 hover:bg-blue-600',
  reserve: 'bg-amber-500 hover:bg-amber-600',
  bloque: 'bg-red-500 hover:bg-red-600',
  maintenance: 'bg-gray-500 hover:bg-gray-600',
};

export function VisualMooringPlan({ emplacements }: Props) {
  // Grouper par zone (ou par la première lettre du code si zone n'existe pas)
  const grouped = emplacements.reduce((acc, emp) => {
    // Si zone n'est pas dispo dans ListItem, on extrait du code (ex: "A-01" -> "A")
    const zoneName = emp.zone || (emp.code.includes('-') ? emp.code.split('-')[0] : 'Principal');
    if (!acc[zoneName]) acc[zoneName] = [];
    acc[zoneName].push(emp);
    return acc;
  }, {} as Record<string, EmplacementListItem[]>);

  // Trier les zones
  const zones = Object.keys(grouped).sort();

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Map className="h-5 w-5 shrink-0 text-primary" />
            Plan d&apos;amarrage
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">Vue d&apos;ensemble des bassins et quais</p>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1.5">
          {Object.entries(statusColors).slice(0, 4).map(([statut, color]) => (
            <div key={statut} className="flex items-center gap-1 text-[10px] sm:text-xs">
              <div className={cn('h-3 w-3 rounded-sm', color.split(' ')[0])} />
              <span className="capitalize">{statut}</span>
            </div>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-5 sm:space-y-8">
          {zones.map((zone) => (
            <div key={zone} className="rounded-lg border bg-slate-50/50 p-3 sm:p-4 dark:bg-slate-900/50">
              <h3 className="mb-3 flex flex-wrap items-center gap-2 text-base font-semibold sm:mb-4 sm:text-lg">
                Bassin / Zone {zone}
                <Badge variant="muted">{grouped[zone].length} places</Badge>
              </h3>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {grouped[zone].sort((a, b) => a.code.localeCompare(b.code)).map((emp) => (
                    <div
                      key={emp.id}
                      title={`${emp.code} — ${emp.statut}${emp.longueurMaxM ? ` — ${emp.longueurMaxM}m` : ''}`}
                      className={cn(
                        'flex h-12 w-9 items-center justify-center rounded border text-[10px] font-medium text-white shadow-sm transition-transform hover:scale-105 sm:h-14 sm:w-10 sm:text-xs',
                        statusColors[emp.statut] || 'bg-slate-400'
                      )}
                    >
                      {emp.code.split('-').pop() || emp.code}
                    </div>
                  ))}
                </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
