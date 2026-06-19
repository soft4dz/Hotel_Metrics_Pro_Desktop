import { useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Sector, Tooltip } from 'recharts';
import { formatMoney } from '@/lib/formatters';
import { CHART, chartTooltipStyle } from '@/lib/chartTheme';
import type { ChartPoint } from '@/shared/types/dashboard';

interface DonutChartProps {
  data: ChartPoint[];
}

// Secteur actif animé
function ActiveShape(props: Record<string, unknown>) {
  const {
    cx, cy,
    innerRadius, outerRadius,
    startAngle, endAngle,
    fill, payload,
  } = props as {
    cx: number; cy: number;
    innerRadius: number; outerRadius: number;
    startAngle: number; endAngle: number;
    fill: string;
    payload: ChartPoint;
  };

  return (
    <g>
      <Sector
        cx={cx} cy={cy}
        innerRadius={innerRadius}
        outerRadius={(outerRadius as number) + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.95}
      />
      <Sector
        cx={cx} cy={cy}
        innerRadius={(outerRadius as number) + 12}
        outerRadius={(outerRadius as number) + 15}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.4}
      />
      <text
        x={cx} y={cy - 10}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={11}
        fill="#64748B"
      >
        {(payload.label ?? '').length > 16
          ? `${(payload.label ?? '').slice(0, 14)}…`
          : payload.label}
      </text>
      <text
        x={cx} y={cy + 10}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={14}
        fontWeight={700}
        fill="#0F172A"
      >
        {formatMoney(payload.value)}
      </text>
    </g>
  );
}

// Légende custom compacte
function CustomLegend({ data, total }: { data: ChartPoint[]; total: number }) {
  return (
    <div className="flex flex-col gap-1.5 pl-2 min-w-0">
      {data.map((d, i) => {
        const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : '0.0';
        return (
          <div key={i} className="flex items-center gap-2 text-xs min-w-0">
            <span
              className="shrink-0 h-2.5 w-2.5 rounded-full"
              style={{ background: CHART.series[i % CHART.series.length] }}
            />
            <span className="truncate text-slate-600">{d.label}</span>
            <span className="ml-auto shrink-0 font-semibold text-slate-800">{pct}%</span>
          </div>
        );
      })}
    </div>
  );
}

export function DonutChart({ data }: DonutChartProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const filtered = data.filter((d) => d.value > 0);

  if (filtered.length === 0) {
    return (
      <p className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Aucune donnée à afficher.
      </p>
    );
  }

  const total = filtered.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex items-center gap-4">
      <div className="shrink-0" style={{ width: 220, height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={filtered}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={62}
              outerRadius={88}
              paddingAngle={3}
              activeIndex={activeIndex}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              activeShape={ActiveShape as any}
              onMouseEnter={(_, index) => setActiveIndex(index)}
            >
              {filtered.map((_, i) => (
                <Cell
                  key={i}
                  fill={CHART.series[i % CHART.series.length]}
                  opacity={i === activeIndex ? 1 : 0.75}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: number) => formatMoney(v)}
              contentStyle={chartTooltipStyle.contentStyle}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Total</p>
        <p className="text-xl font-bold text-slate-900 mb-3">{formatMoney(total)}</p>
        <CustomLegend data={filtered} total={total} />
      </div>
    </div>
  );
}
