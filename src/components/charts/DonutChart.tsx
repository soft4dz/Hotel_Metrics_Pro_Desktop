import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { formatMoney } from '@/lib/formatters';
import { CHART, chartTooltipStyle } from '@/lib/chartTheme';
import type { ChartPoint } from '@/shared/types/dashboard';

interface DonutChartProps {
  data: ChartPoint[];
}

export function DonutChart({ data }: DonutChartProps) {
  const filtered = data.filter((d) => d.value > 0);
  if (filtered.length === 0) {
    return (
      <p className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Aucune donnée à afficher.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={filtered}
          dataKey="value"
          nameKey="label"
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={95}
          paddingAngle={2}
        >
          {filtered.map((_, i) => (
            <Cell key={i} fill={CHART.series[i % CHART.series.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v: number) => formatMoney(v)} contentStyle={chartTooltipStyle.contentStyle} />
        <Legend layout="vertical" align="right" verticalAlign="middle" iconSize={8} />
      </PieChart>
    </ResponsiveContainer>
  );
}
