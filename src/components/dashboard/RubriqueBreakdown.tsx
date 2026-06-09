import { formatMoney, formatPercent } from '@/lib/formatters';
import { CHART } from '@/lib/chartTheme';
import type { RubriqueAnalyseRow } from '@/shared/types/dashboard';

interface RubriqueBreakdownProps {
  rows: RubriqueAnalyseRow[];
}

const BAR_COLORS = CHART.series;

export function RubriqueBreakdown({ rows }: RubriqueBreakdownProps) {
  if (rows.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">Aucune rubrique sur la période.</p>
    );
  }

  const max = Math.max(...rows.map((r) => r.realise), 1);

  return (
    <ul className="space-y-4">
      {rows.map((r, i) => (
        <li key={r.groupe}>
          <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-sm font-medium text-foreground">{r.groupe}</span>
            <div className="flex items-center gap-3 text-xs tabular-nums">
              <span className="font-mono font-semibold text-foreground">{formatMoney(r.realise)}</span>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
                {formatPercent(r.pctTotal)}
              </span>
              {r.objectif > 0 && (
                <span className="text-muted-foreground">Obj. {formatPercent(r.tauxObjectif)}</span>
              )}
            </div>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full transition-all duration-500 motion-reduce:transition-none"
              style={{
                width: `${(r.realise / max) * 100}%`,
                backgroundColor: BAR_COLORS[i % BAR_COLORS.length],
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
