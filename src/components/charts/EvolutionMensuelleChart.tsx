import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatMoney } from '@/lib/formatters';
import { CHART, chartAxisTick, chartGrid, chartTooltipStyle } from '@/lib/chartTheme';
import type { EvolutionMensuellePoint } from '@/shared/types/dashboard';

interface EvolutionMensuelleChartProps {
  data: EvolutionMensuellePoint[];
}

export function EvolutionMensuelleChart({ data }: EvolutionMensuelleChartProps) {
  const hasData = data.some((d) => d.montant > 0);
  if (!hasData) {
    return (
      <p className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        Aucune donnée sur les 6 derniers mois.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid {...chartGrid} />
        <XAxis dataKey="label" tick={chartAxisTick} />
        <YAxis tick={chartAxisTick} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
        <Tooltip formatter={(v: number) => formatMoney(v)} contentStyle={chartTooltipStyle.contentStyle} />
        <Bar dataKey="montant" name="CA validé" fill={CHART.secondary} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
