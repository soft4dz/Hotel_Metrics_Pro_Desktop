import { RadialBar, RadialBarChart, ResponsiveContainer, Tooltip } from 'recharts';
import { CHART } from '@/lib/chartTheme';
import type { FrequentationDto } from '@/shared/types/dashboard';


interface FrequentationChartProps {
  data: FrequentationDto;
}

const METRICS = [
  { key: 'couverts',  label: 'Couverts',  color: CHART.accent,   icon: '🍽️' },
  { key: 'nuitees',   label: 'Nuitées',   color: CHART.secondary, icon: '🌙' },
  { key: 'chambres',  label: 'Chambres',  color: CHART.primary,  icon: '🛏️' },
] as const;

export function FrequentationChart({ data }: FrequentationChartProps) {
  const total = data.chambres + data.nuitees + data.couverts;

  if (total === 0) {
    return (
      <p className="flex h-56 items-center justify-center text-sm text-muted-foreground">
        Aucune donnée de fréquentation sur la période.
      </p>
    );
  }

  // Normalisation : chaque valeur entre 10% et 100% pour affichage radial
  const maxVal = Math.max(data.chambres, data.nuitees, data.couverts, 1);
  const radialData = METRICS.map((m) => ({
    name: m.label,
    value: Math.max(10, Math.round((data[m.key] / maxVal) * 100)),
    raw: data[m.key],
    fill: m.color,
  }));

  return (
    <div className="flex items-center gap-6">
      {/* Radial chart */}
      <div className="shrink-0" style={{ width: 200, height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            innerRadius="28%"
            outerRadius="95%"
            barSize={14}
            data={radialData}
            startAngle={90}
            endAngle={-270}
          >
            <RadialBar
              dataKey="value"
              cornerRadius={8}
              background={{ fill: '#F1F5F9' }}
            />
            <Tooltip
              formatter={(_v: unknown, _name: unknown, props: { payload?: { raw?: number; name?: string } }) =>
                [`${props.payload?.raw ?? 0}`, props.payload?.name ?? '']
              }
              contentStyle={{
                borderRadius: '10px',
                border: '1px solid #E2E8F0',
                fontSize: '12px',
              }}
            />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>

      {/* Légende avec valeurs absolues */}
      <div className="flex flex-col gap-4 flex-1">
        {METRICS.map((m) => {
          const val = data[m.key];
          const pct = Math.round((val / maxVal) * 100);
          return (
            <div key={m.key} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium text-slate-700">
                  <span>{m.icon}</span> {m.label}
                </span>
                <span className="font-bold text-slate-900">{val.toLocaleString('fr-DZ')}</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, background: m.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
