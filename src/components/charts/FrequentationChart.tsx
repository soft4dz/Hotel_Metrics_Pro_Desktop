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
import type { FrequentationDto } from '@/shared/types/dashboard';

interface FrequentationChartProps {
  data: FrequentationDto;
}

export function FrequentationChart({ data }: FrequentationChartProps) {
  const chartData = [
    { label: 'Chambres', value: data.chambres },
    { label: 'Nuitées', value: data.nuitees },
    { label: 'Couverts', value: data.couverts },
  ];

  if (chartData.every((d) => d.value === 0)) {
    return (
      <p className="flex h-56 items-center justify-center text-sm text-muted-foreground">
        Aucune donnée de fréquentation sur la période.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid {...chartGrid} />
        <XAxis dataKey="label" tick={chartAxisTick} />
        <YAxis tick={chartAxisTick} />
        <Tooltip contentStyle={chartTooltipStyle.contentStyle} />
        <Bar dataKey="value" name="Volume" fill={CHART.accent} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
