import {
  Bar,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Legend,
  Line,
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

interface DeltaLabelProps {
  x?: number | string;
  y?: number | string;
  value?: number | string;
  [k: string]: unknown;
}

function DeltaLabel({ x, y, value }: DeltaLabelProps) {
  const xn = typeof x === 'string' ? parseFloat(x) : (x ?? 0);
  const yn = typeof y === 'string' ? parseFloat(y) : (y ?? 0);
  const val = typeof value === 'string' ? parseFloat(value) : value;
  if (val === undefined || val === null) return null;
  const isPos = val >= 0;
  return (
    <text
      x={xn}
      y={yn - 6}
      textAnchor="middle"
      fontSize={9}
      fontWeight={600}
      fill={isPos ? CHART.success : CHART.danger}
    >
      {isPos ? '+' : ''}{val.toFixed(1)}%
    </text>
  );
}

export function YearCompareChart({ data, yearN, yearNm1 }: YearCompareChartProps) {
  const chartData = data.map((d) => {
    const n1 = d.value2 ?? 0;
    const n = d.value;
    const delta = n1 > 0 ? ((n - n1) / n1) * 100 : null;
    return { label: d.label, anneeN: n, anneeNm1: n1, delta };
  });

  if (!chartData.some((d) => d.anneeN > 0 || d.anneeNm1 > 0)) {
    return (
      <p className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Aucune comparaison disponible.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={chartData} margin={{ top: 28, right: 16, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="gradNm1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART.muted} stopOpacity={0.5} />
            <stop offset="100%" stopColor={CHART.muted} stopOpacity={0.2} />
          </linearGradient>
        </defs>

        <CartesianGrid {...chartGrid} />
        <XAxis dataKey="label" tick={chartAxisTick} />
        <YAxis tick={chartAxisTick} tickFormatter={(v) => `${Math.round(v / 1000)}k`} width={44} />

        <Tooltip
          formatter={(v: number, name: string) => [formatMoney(v), name]}
          contentStyle={chartTooltipStyle.contentStyle}
        />
        <Legend />

        {/* Barres N-1 en arrière-plan, semi-transparentes */}
        <Bar
          dataKey="anneeNm1"
          name={String(yearNm1)}
          fill="url(#gradNm1)"
          stroke={CHART.muted}
          strokeWidth={1}
          radius={[4, 4, 0, 0]}
          maxBarSize={40}
        />

        {/* Ligne année N en surimpression */}
        <Line
          type="monotone"
          dataKey="anneeN"
          name={String(yearN)}
          stroke={CHART.primary}
          strokeWidth={3}
          dot={{ r: 4, fill: CHART.primary, strokeWidth: 0 }}
          activeDot={{ r: 6 }}
        >
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <LabelList dataKey="delta" content={DeltaLabel as any} />
        </Line>
      </ComposedChart>
    </ResponsiveContainer>
  );
}
