import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PortDashboardDto } from '@/shared/types/portmaster';
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  PieChart,
  Pie,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from 'recharts';
import { formatMoney } from '@/lib/formatters';
import { CHART, chartAxisTick, chartGrid, chartTooltipStyle } from '@/lib/chartTheme';

interface Props {
  data: PortDashboardDto;
}

const COLORS = [CHART.primary, CHART.secondary, CHART.accent, CHART.success, CHART.gold, CHART.muted];

export function PortDashboardCharts({ data }: Props) {
  const pieData = data.repartitionTypes.map((item) => ({
    name: item.type,
    value: item.count,
  }));

  const revenueAvg = data.revenueChart.length
    ? data.revenueChart.reduce((s, d) => s + d.caFacture, 0) / data.revenueChart.length
    : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">

      {/* Fusion : Area dégradé + Bars encaissements + Line CA + ReferenceLine moyenne */}
      <Card className="lg:col-span-4">
        <CardHeader>
          <CardTitle>Évolution des Revenus</CardTitle>
          <p className="text-xs text-muted-foreground">CA facturé (ligne) · Encaissements (barres)</p>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.revenueChart} margin={{ top: 12, right: 16, left: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradPortCA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART.primary} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={CHART.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid {...chartGrid} />
                <XAxis dataKey="mois" tick={chartAxisTick} />
                <YAxis
                  tick={chartAxisTick}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  width={44}
                />
                <Tooltip
                  formatter={(v: number, name: string) => [formatMoney(v), name]}
                  contentStyle={chartTooltipStyle.contentStyle}
                />
                <Legend />

                <ReferenceLine
                  y={revenueAvg}
                  stroke={CHART.gold}
                  strokeDasharray="5 3"
                  strokeWidth={1}
                  label={{ value: 'Moy.', position: 'insideTopLeft', fontSize: 9, fill: CHART.gold }}
                />

                {/* Area wash sous la courbe CA */}
                <Area
                  type="monotone"
                  dataKey="caFacture"
                  fill="url(#gradPortCA)"
                  stroke="none"
                  name="CA wash"
                  legendType="none"
                  isAnimationActive={false}
                />

                {/* Barres encaissements */}
                <Bar
                  dataKey="encaissements"
                  name="Encaissements"
                  fill={CHART.success}
                  opacity={0.75}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />

                {/* Ligne CA bold */}
                <Line
                  type="monotone"
                  dataKey="caFacture"
                  name="CA Facturé"
                  stroke={CHART.primary}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: CHART.primary, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Donut types de navires avec légende inline */}
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Types de Navires</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((_entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                        opacity={0.9}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number, name: string) => [`${v} navire(s)`, name]}
                    contentStyle={chartTooltipStyle.contentStyle}
                  />
                  <Legend
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    iconSize={8}
                    iconType="circle"
                    wrapperStyle={{ fontSize: 11 }}
                  />
                  {/* Centre SVG total */}
                  <text
                    x="50%"
                    y="46%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{ fontSize: 22, fontWeight: 700, fill: '#0F172A' }}
                  >
                    {pieData.reduce((s, d) => s + d.value, 0)}
                  </text>
                  <text
                    x="50%"
                    y="53%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{ fontSize: 10, fill: '#64748B' }}
                  >
                    navires
                  </text>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Aucune donnée
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
