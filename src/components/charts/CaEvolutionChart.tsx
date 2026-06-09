import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatMoney } from '@/lib/formatters';
import { CHART, chartAxisTick, chartGrid, chartTooltipStyle } from '@/lib/chartTheme';
import type { CaJournalierPoint } from '@/shared/types/dashboard';

interface CaEvolutionChartProps {
  data: CaJournalierPoint[];
}

export function CaEvolutionChart({ data }: CaEvolutionChartProps) {
  if (data.length === 0) {
    return (
      <p className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Aucune recette validée sur cette période.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid {...chartGrid} />
        <XAxis dataKey="label" tick={chartAxisTick} />
        <YAxis tick={chartAxisTick} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
        <Tooltip
          formatter={(value: number) => [formatMoney(value), 'CA']}
          labelFormatter={(_, payload) => {
            const p = payload?.[0]?.payload as CaJournalierPoint | undefined;
            return p?.date ?? '';
          }}
          contentStyle={chartTooltipStyle.contentStyle}
        />
        <Line
          type="monotone"
          dataKey="montant"
          stroke={CHART.primary}
          strokeWidth={2.5}
          dot={{ r: 3, fill: CHART.primary, strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
