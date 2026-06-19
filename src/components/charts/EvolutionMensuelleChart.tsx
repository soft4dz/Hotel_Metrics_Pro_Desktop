import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
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

/** Moving average sur N points */
function movingAvg(data: number[], n = 3): (number | null)[] {
  return data.map((_, i) => {
    if (i < n - 1) return null;
    return data.slice(i - n + 1, i + 1).reduce((a, b) => a + b, 0) / n;
  });
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

  const avg = data.reduce((s, d) => s + d.montant, 0) / data.length;
  const trend = movingAvg(data.map((d) => d.montant), 3);

  const enriched = data.map((d, i) => ({ ...d, trend: trend[i] }));

  const barColor = (v: number) =>
    v >= avg * 1.1 ? CHART.success : v >= avg * 0.8 ? CHART.secondary : CHART.danger;

  return (
    <ResponsiveContainer width="100%" height={240}>
      <ComposedChart data={enriched} margin={{ top: 12, right: 16, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="gradBarEvo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART.secondary} stopOpacity={0.9} />
            <stop offset="100%" stopColor={CHART.primary} stopOpacity={0.7} />
          </linearGradient>
        </defs>

        <CartesianGrid {...chartGrid} />
        <XAxis dataKey="label" tick={chartAxisTick} />
        <YAxis tick={chartAxisTick} tickFormatter={(v) => `${Math.round(v / 1000)}k`} width={44} />

        <Tooltip
          formatter={(v: number, name: string) =>
            name === 'trend' ? [formatMoney(v), 'Tendance (moy. 3 mois)'] : [formatMoney(v), 'CA mensuel']
          }
          contentStyle={chartTooltipStyle.contentStyle}
        />

        <ReferenceLine y={avg} stroke={CHART.muted} strokeDasharray="4 3" strokeWidth={1} />

        <Bar dataKey="montant" name="CA mensuel" radius={[5, 5, 0, 0]} maxBarSize={48}>
          {enriched.map((d, i) => (
            <Cell key={i} fill={barColor(d.montant)} />
          ))}
        </Bar>

        <Line
          type="monotone"
          dataKey="trend"
          stroke={CHART.gold}
          strokeWidth={2}
          strokeDasharray="6 3"
          dot={false}
          connectNulls
          name="trend"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
