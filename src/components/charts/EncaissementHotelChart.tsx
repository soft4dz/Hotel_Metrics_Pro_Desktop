import { memo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CHART, chartAxisTick, chartGrid, chartTooltipStyle } from '@/lib/chartTheme';

interface EncaissementHotelChartProps {
  data: { label: string; value: number }[];
}

function barFill(v: number): string {
  if (v >= 90) return CHART.success;
  if (v >= 70) return CHART.secondary;
  if (v >= 50) return CHART.warning;
  return CHART.danger;
}

function EncaissementHotelChartComponent({ data }: EncaissementHotelChartProps) {
  if (!data.some((d) => d.value > 0)) {
    return <p className="py-12 text-center text-sm text-muted-foreground">Aucune donnée.</p>;
  }

  const avg = data.reduce((s, d) => s + d.value, 0) / data.length;

  return (
    <ResponsiveContainer width="100%" height={270}>
      <BarChart data={data} margin={{ top: 20, right: 16, left: 0, bottom: 52 }}>
        <defs>
          {data.map((_, i) => (
            <linearGradient key={i} id={`gradEnc${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={barFill(data[i].value)} stopOpacity={1} />
              <stop offset="100%" stopColor={barFill(data[i].value)} stopOpacity={0.6} />
            </linearGradient>
          ))}
        </defs>

        <CartesianGrid {...chartGrid} />
        <XAxis
          dataKey="label"
          tick={{ ...chartAxisTick, fontSize: 9 }}
          angle={-30}
          textAnchor="end"
          height={56}
        />
        <YAxis tick={chartAxisTick} domain={[0, 100]} tickFormatter={(v) => `${v}%`} width={36} />

        <ReferenceLine
          y={avg}
          stroke={CHART.muted}
          strokeDasharray="4 3"
          label={{ value: `Moy. ${avg.toFixed(0)}%`, position: 'insideTopRight', fontSize: 9, fill: CHART.muted }}
        />

        <Tooltip
          formatter={(v: number) => [`${v} %`, 'Taux encaissement']}
          contentStyle={chartTooltipStyle.contentStyle}
        />

        <Bar dataKey="value" name="Taux %" radius={[5, 5, 0, 0]} maxBarSize={48}>
          {data.map((_d, i) => (
            <Cell key={i} fill={`url(#gradEnc${i})`} />
          ))}
          <LabelList
            dataKey="value"
            position="top"
            formatter={(v: number) => `${v}%`}
            style={{ fontSize: 9, fontWeight: 700, fill: '#475569' }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export const EncaissementHotelChart = memo(EncaissementHotelChartComponent);
