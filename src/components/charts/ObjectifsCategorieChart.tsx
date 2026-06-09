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
import type { CaParCategorie } from '@/shared/types/dashboard';

interface ObjectifsCategorieChartProps {
  data: CaParCategorie[];
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

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid {...chartGrid} />
        <XAxis dataKey="categorie" tick={chartAxisTick} />
        <YAxis tick={chartAxisTick} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
        <Tooltip formatter={(value: number) => formatMoney(value)} contentStyle={chartTooltipStyle.contentStyle} />
        <Legend />
        <Bar dataKey="realise" name="Réalisé" fill={CHART.primary} radius={[4, 4, 0, 0]} />
        <Bar dataKey="objectif" name="Objectif" fill={CHART.gold} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
