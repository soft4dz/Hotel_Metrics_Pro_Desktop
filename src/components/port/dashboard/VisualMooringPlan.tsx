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
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Map className="h-5 w-5 text-primary" />
            Plan d'amarrage
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Vue d'ensemble des bassins et quais</p>
        </div>
        <div className="flex gap-2">
          {Object.entries(statusColors).slice(0, 4).map(([statut, color]) => (
            <div key={statut} className="flex items-center gap-1 text-xs">
              <div className={cn('w-3 h-3 rounded-sm', color.split(' ')[0])} />
              <span className="capitalize">{statut}</span>
            </div>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {zones.map((zone) => (
            <div key={zone} className="border rounded-lg p-4 bg-slate-50/50 dark:bg-slate-900/50">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                Bassin / Zone {zone}
                <Badge variant="muted">{grouped[zone].length} places</Badge>
              </h3>
              <div className="flex flex-wrap gap-2">
                  {grouped[zone].sort((a, b) => a.code.localeCompare(b.code)).map((emp) => (
                    <div
                      key={emp.id}
                      title={`${emp.code} — ${emp.statut}${emp.longueurMaxM ? ` — ${emp.longueurMaxM}m` : ''}`}
                      className={cn(
                        'w-10 h-14 rounded border flex items-center justify-center text-xs font-medium text-white shadow-sm cursor-help transition-transform hover:scale-105',
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
