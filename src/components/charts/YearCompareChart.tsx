import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatMoney } from '@/lib/formatters';
import { CHART, chartAxisTick, chartGrid, chartTooltipStyle } from '@/lib/chartTheme';
import type { ChartPoint } from '@/shared/types/dashboard';

interface YearCompareChartProps {
  data: ChartPoint[];
  yearN: number;
  yearNm1: number;
}

export function YearCompareChart({ data, yearN, yearNm1 }: YearCompareChartProps) {
  const chartData = data.map((d) => ({
    label: d.label,
    anneeN: d.value,
    anneeNm1: d.value2 ?? 0,
  }));

  if (!chartData.some((d) => d.anneeN > 0 || d.anneeNm1 > 0)) {
    return (
      <p className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Aucune comparaison disponible.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid {...chartGrid} />
        <XAxis dataKey="label" tick={chartAxisTick} />
        <YAxis tick={chartAxisTick} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
        <Tooltip formatter={(v: number) => formatMoney(v)} contentStyle={chartTooltipStyle.contentStyle} />
        <Legend />
        <Bar dataKey="anneeN" name={String(yearN)} fill={CHART.primary} radius={[4, 4, 0, 0]} />
        <Bar dataKey="anneeNm1" name={String(yearNm1)} fill={CHART.muted} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
