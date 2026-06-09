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
import type { CaParHotel } from '@/shared/types/dashboard';

interface CaParHotelChartProps {
  data: CaParHotel[];
}

export function CaParHotelChart({ data }: CaParHotelChartProps) {
  if (data.length === 0) {
    return (
      <p className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Aucune donnée par hôtel.
      </p>
    );
  }

  const chartData = data.map((h) => ({
    name: h.hotelName.length > 14 ? `${h.hotelName.slice(0, 12)}…` : h.hotelName,
    realise: h.realise,
    objectif: h.objectif,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 48 }}>
        <CartesianGrid {...chartGrid} />
        <XAxis dataKey="name" tick={{ ...chartAxisTick, fontSize: 10 }} angle={-25} textAnchor="end" height={60} />
        <YAxis tick={chartAxisTick} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
        <Tooltip formatter={(value: number) => formatMoney(value)} contentStyle={chartTooltipStyle.contentStyle} />
        <Legend />
        <Bar dataKey="realise" name="Réalisé" fill={CHART.primary} radius={[4, 4, 0, 0]} />
        <Bar dataKey="objectif" name="Objectif" fill={CHART.gold} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
