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
    <div className="grid gap-3 xs:grid-cols-2 lg:grid-cols-4 lg:gap-4 2xl:gap-5">
      {kpis.map((kpi, index) => {
        const Icon = kpi.icon;
        return (
          <Card key={index} className="border-l-4" style={{ borderLeftColor: 'var(--primary)' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground sm:text-sm">{kpi.title}</CardTitle>
              <div className={cn('rounded-full p-1.5 sm:p-2', kpi.bgColor)}>
                <Icon className={cn('h-3.5 w-3.5 sm:h-4 sm:w-4', kpi.color)} />
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-xl font-bold sm:text-2xl 2xl:text-[1.75rem]">{kpi.value}</div>
              {kpi.subtext && (
                <p className="mt-1 text-[11px] text-muted-foreground sm:text-xs">
                  Taux d&apos;occupation : {kpi.subtext}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
