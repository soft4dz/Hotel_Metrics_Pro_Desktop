import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatMoney } from '@/lib/formatters';
import { Anchor, Euro, AlertCircle } from 'lucide-react';
import type { PortDashboardDto } from '@/shared/types/portmaster';
import { cn } from '@/lib/utils';

interface Props {
  data: PortDashboardDto;
}

export function PortDashboardKpis({ data }: Props) {
  const kpis = [
    {
      title: 'CA Facturé',
      value: formatMoney(data.caFacture),
      icon: Euro,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Encaissements',
      value: formatMoney(data.encaissementsRealises),
      icon: Euro,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
    },
    {
      title: 'Créances',
      value: formatMoney(data.creancesClients),
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
    {
      title: 'Occupation',
      value: `${data.emplacementsOccupes} / ${data.emplacementsTotal}`,
      subtext: `${((data.emplacementsOccupes / (data.emplacementsTotal || 1)) * 100).toFixed(1)}%`,
      icon: Anchor,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi, index) => {
        const Icon = kpi.icon;
        return (
          <Card key={index} className="border-l-4" style={{ borderLeftColor: 'var(--primary)' }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.title}</CardTitle>
              <div className={cn('p-2 rounded-full', kpi.bgColor)}>
                <Icon className={cn('h-4 w-4', kpi.color)} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              {kpi.subtext && (
                <p className="text-xs text-muted-foreground mt-1">Taux d'occupation : {kpi.subtext}</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
