import {
  Area,
  Brush,
  CartesianGrid,
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

  const avg = data.reduce((s, d) => s + d.montant, 0) / data.length;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data} margin={{ top: 12, right: 16, left: 8, bottom: 24 }}>
        <defs>
          <linearGradient id="gradCaEvo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART.primary} stopOpacity={0.18} />
            <stop offset="90%" stopColor={CHART.primary} stopOpacity={0} />
          </linearGradient>
        </defs>

        <CartesianGrid {...chartGrid} />
        <XAxis dataKey="label" tick={chartAxisTick} />
        <YAxis tick={chartAxisTick} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} width={48} />

        <Tooltip
          formatter={(value: number) => [formatMoney(value), 'CA journalier']}
          labelFormatter={(_, payload) => {
            const p = payload?.[0]?.payload as CaJournalierPoint | undefined;
            return p?.date ?? '';
          }}
          contentStyle={chartTooltipStyle.contentStyle}
        />

        <ReferenceLine
          y={avg}
          stroke={CHART.gold}
          strokeDasharray="5 3"
          strokeWidth={1.5}
          label={{ value: `Moy. ${formatMoney(avg)}`, position: 'insideTopRight', fontSize: 10, fill: CHART.gold }}
        />

        <Area
          type="monotone"
          dataKey="montant"
          fill="url(#gradCaEvo)"
          stroke="none"
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="montant"
          stroke={CHART.primary}
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 5, strokeWidth: 0, fill: CHART.primary }}
        />

        {data.length > 14 && (
          <Brush
            dataKey="label"
            height={20}
            stroke={CHART.muted}
            fill="#F8FAFC"
            travellerWidth={6}
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
