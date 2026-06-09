import { memo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CHART, chartAxisTick, chartGrid, chartTooltipStyle } from '@/lib/chartTheme';

interface EncaissementHotelChartProps {
  data: { label: string; value: number }[];
}

function EncaissementHotelChartComponent({ data }: EncaissementHotelChartProps) {
  if (!data.some((d) => d.value > 0)) {
    return <p className="py-12 text-center text-sm text-muted-foreground">Aucune donnée.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 48 }}>
        <CartesianGrid {...chartGrid} />
        <XAxis
          dataKey="label"
          tick={{ ...chartAxisTick, fontSize: 9 }}
          angle={-30}
          textAnchor="end"
          height={56}
        />
        <YAxis tick={chartAxisTick} domain={[0, 100]} />
        <Tooltip
          formatter={(v: number) => `${v} %`}
          contentStyle={chartTooltipStyle.contentStyle}
        />
        <Bar dataKey="value" name="Taux %" fill={CHART.accent} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export const EncaissementHotelChart = memo(EncaissementHotelChartComponent);
