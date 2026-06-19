import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatMoney } from '@/lib/formatters';
import { CHART, chartAxisTick, chartGrid, chartTooltipStyle } from '@/lib/chartTheme';
import type { CaParHotel } from '@/shared/types/dashboard';

interface CaParHotelChartProps {
  data: CaParHotel[];
}

interface PerfLabelProps {
  x?: number | string;
  y?: number | string;
  width?: number | string;
  index?: number;
  data: { taux: number | null }[];
  [k: string]: unknown;
}

function PerfLabel({ x, y, width, index = 0, data }: PerfLabelProps) {
  const xn = typeof x === 'string' ? parseFloat(x) : (x ?? 0);
  const yn = typeof y === 'string' ? parseFloat(y) : (y ?? 0);
  const wn = typeof width === 'string' ? parseFloat(width) : (width ?? 0);
  const taux = data[index]?.taux;
  if (taux === null || taux === undefined) return null;
  const color = taux >= 100 ? CHART.success : taux >= 80 ? CHART.gold : CHART.danger;
  return (
    <text x={xn + wn / 2} y={yn - 5} textAnchor="middle" fontSize={9} fontWeight={700} fill={color}>
      {taux.toFixed(0)}%
    </text>
  );
}

export function CaParHotelChart({ data }: CaParHotelChartProps) {
  if (data.length === 0) {
    return (
      <p className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Aucune donnée par hôtel.
      </p>
    );
  }

  const enriched = data.map((h) => ({
    name: h.hotelName.length > 14 ? `${h.hotelName.slice(0, 12)}…` : h.hotelName,
    realise: h.realise,
    objectif: h.objectif,
    taux: h.objectif > 0 ? Math.round((h.realise / h.objectif) * 100) : null,
  }));

  const barColor = (taux: number | null) =>
    taux === null ? CHART.muted
    : taux >= 100 ? CHART.success
    : taux >= 80  ? CHART.secondary
    : CHART.danger;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={enriched} margin={{ top: 24, right: 16, left: 8, bottom: 48 }}>
        <defs>
          <linearGradient id="gradObjectif" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART.gold} stopOpacity={0.3} />
            <stop offset="100%" stopColor={CHART.gold} stopOpacity={0.08} />
          </linearGradient>
        </defs>

        <CartesianGrid {...chartGrid} />
        <XAxis
          dataKey="name"
          tick={{ ...chartAxisTick, fontSize: 10 }}
          angle={-25}
          textAnchor="end"
          height={60}
        />
        <YAxis tick={chartAxisTick} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} width={44} />

        <Tooltip
          formatter={(value: number, name: string) => [formatMoney(value), name]}
          contentStyle={chartTooltipStyle.contentStyle}
        />

        {/* Objectif en fond translucide */}
        <Bar dataKey="objectif" name="Objectif" fill="url(#gradObjectif)" stroke={CHART.gold} strokeWidth={1} radius={[4, 4, 0, 0]} maxBarSize={36} />

        {/* Réalisé color-codé par performance */}
        <Bar dataKey="realise" name="Réalisé" radius={[4, 4, 0, 0]} maxBarSize={28}>
          {enriched.map((d, i) => (
            <Cell key={i} fill={barColor(d.taux)} />
          ))}
          <LabelList content={(props) => <PerfLabel {...props} data={enriched} />} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
