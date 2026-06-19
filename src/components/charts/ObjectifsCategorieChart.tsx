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
import { CHART, chartAxisTick, chartTooltipStyle } from '@/lib/chartTheme';
import type { CaParCategorie } from '@/shared/types/dashboard';

interface ObjectifsCategorieChartProps {
  data: CaParCategorie[];
}

interface TauxLabelProps {
  x?: number | string;
  y?: number | string;
  width?: number | string;
  value?: number | string;
  [k: string]: unknown;
}

function TauxLabel({ x, y, width, value }: TauxLabelProps) {
  const xn = typeof x === 'string' ? parseFloat(x) : (x ?? 0);
  const yn = typeof y === 'string' ? parseFloat(y) : (y ?? 0);
  const wn = typeof width === 'string' ? parseFloat(width) : (width ?? 0);
  const val = typeof value === 'string' ? parseFloat(value) : value;
  if (val === undefined || val === null) return null;
  const isGood = val >= 100;
  return (
    <text
      x={xn + wn + 6}
      y={yn + 10}
      fontSize={10}
      fontWeight={700}
      fill={isGood ? CHART.success : val >= 75 ? CHART.warning : CHART.danger}
    >
      {val.toFixed(0)}%
    </text>
  );
}

export function ObjectifsCategorieChart({ data }: ObjectifsCategorieChartProps) {
  const hasData = data.some((d) => d.objectif > 0 || d.realise > 0);
  if (!hasData) {
    return (
      <p className="flex h-56 items-center justify-center text-sm text-muted-foreground">
        Aucun objectif ou réalisation par catégorie.
      </p>
    );
  }

  const enriched = data.map((d) => ({
    ...d,
    taux: d.objectif > 0 ? Math.round((d.realise / d.objectif) * 100) : null,
  }));

  const barColorRealise = (taux: number | null) => {
    if (taux === null) return CHART.muted;
    return taux >= 100 ? CHART.success : taux >= 75 ? CHART.secondary : CHART.danger;
  };

  return (
    <ResponsiveContainer width="100%" height={260}>
      {/* Layout vertical = barres horizontales */}
      <BarChart
        layout="vertical"
        data={enriched}
        margin={{ top: 8, right: 64, left: 8, bottom: 0 }}
      >
        <CartesianGrid horizontal={false} stroke={CHART.grid} strokeDasharray="3 3" />
        <XAxis
          type="number"
          tick={chartAxisTick}
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
        />
        <YAxis
          type="category"
          dataKey="categorie"
          tick={{ ...chartAxisTick, fontSize: 10 }}
          width={80}
        />
        <Tooltip
          formatter={(v: number, name: string) => [formatMoney(v), name]}
          contentStyle={chartTooltipStyle.contentStyle}
        />

        {/* Objectif en fond, semi-transparent */}
        <Bar dataKey="objectif" name="Objectif" radius={[0, 4, 4, 0]} maxBarSize={12} opacity={0.25}>
          {enriched.map((_, i) => <Cell key={i} fill={CHART.gold} />)}
        </Bar>

        {/* Réalisé en premier plan, color-codé */}
        <Bar dataKey="realise" name="Réalisé" radius={[0, 4, 4, 0]} maxBarSize={18}>
          {enriched.map((d, i) => (
            <Cell key={i} fill={barColorRealise(d.taux)} />
          ))}
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <LabelList dataKey="taux" content={TauxLabel as any} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
