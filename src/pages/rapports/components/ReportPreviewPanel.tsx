import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { CHART, chartAxisTick, chartGrid, chartTooltipStyle } from '@/lib/chartTheme';
import type { ReportChartType, ReportColumnDef, ReportPreviewResult, ReportComposition } from '@/shared/types/reports';
import { normalizeComposition } from '@/shared/utils/reportComposition';
import { pivotToCrosstab, toChartData } from '../utils/reportPivot';

interface ReportPreviewPanelProps {
  preview: ReportPreviewResult | null;
  composition: ReportComposition;
  labels: Map<string, string>;
  structureLabel: string;
}

const PIE_COLORS = [CHART.primary, CHART.secondary, CHART.accent, '#94a3b8', '#f59e0b'];

export function ReportPreviewPanel({ preview, composition, labels, structureLabel }: ReportPreviewPanelProps) {
  const norm = normalizeComposition(composition);
  const layout = norm.layout;

  if (!preview) {
    return (
      <p className="text-sm text-muted-foreground">
        Glissez des champs depuis le package, choisissez le type de rapport (liste, croisé, graphique), puis prévisualisez.
      </p>
    );
  }

  if (preview.rows.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune donnée pour ces critères.</p>;
  }

  let columns = preview.columns;
  let rows = preview.rows;

  if (layout === 'crosstab' && norm.rows.length && norm.columns.length) {
    const pivoted = pivotToCrosstab(preview.rows, norm.rows, norm.columns, norm.measures, labels);
    columns = pivoted.columns;
    rows = pivoted.rows;
  }

  if (layout === 'chart') {
    return (
      <ChartPreview
        flatRows={preview.rows}
        rowDims={norm.rows}
        measures={norm.measures}
        chartType={norm.chartType}
        labels={labels}
        description={preview.description ?? structureLabel}
        totalRows={preview.totalRows}
        truncated={preview.truncated}
        displayCount={preview.rows.length}
      />
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        {preview.description ?? structureLabel} — {preview.totalRows} ligne(s)
        {preview.truncated ? ` (aperçu ${preview.rows.length})` : ''}
      </p>
      <DataTable columns={columns} rows={rows} summary={preview.summary} />
    </div>
  );
}

function DataTable({
  columns,
  rows,
  summary,
}: {
  columns: ReportColumnDef[];
  rows: Record<string, unknown>[];
  summary?: Record<string, unknown> | null;
}) {
  return (
    <div className="overflow-x-auto max-h-[65vh]">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-background z-10">
          <tr className="border-b">
            {columns.map((c) => (
              <th key={c.key} className="px-2 py-1.5 text-left font-medium whitespace-nowrap bg-muted/40">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-muted/30 hover:bg-muted/20">
              {columns.map((c) => (
                <td key={c.key} className="px-2 py-1 whitespace-nowrap tabular-nums">
                  {formatCell(row[c.key])}
                </td>
              ))}
            </tr>
          ))}
          {summary && (
            <tr className="bg-primary/5 font-semibold">
              {columns.map((c) => (
                <td key={c.key} className="px-2 py-1.5">{formatCell(summary[c.key])}</td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function formatCell(v: unknown): string {
  if (v == null || v === '') return '—';
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
  return String(v);
}

function ChartPreview({
  flatRows,
  rowDims,
  measures,
  chartType,
  labels,
  description,
  totalRows,
  truncated,
  displayCount,
}: {
  flatRows: Record<string, unknown>[];
  rowDims: string[];
  measures: string[];
  chartType: ReportChartType;
  labels: Map<string, string>;
  description: string;
  totalRows: number;
  truncated: boolean;
  displayCount: number;
}) {
  const categoryDim = rowDims[0] ?? Object.keys(flatRows[0] ?? {})[0];
  const data = toChartData(flatRows, categoryDim, measures);

  if (!data.length) {
    return <p className="text-sm text-muted-foreground">Données insuffisantes pour le graphique.</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        {description} — {totalRows} ligne(s){truncated ? ` (graphique sur ${displayCount})` : ''}
      </p>
      <ResponsiveContainer width="100%" height={320}>
        {chartType === 'line' ? (
          <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 24 }}>
            <CartesianGrid {...chartGrid} />
            <XAxis dataKey="name" tick={chartAxisTick} />
            <YAxis tick={chartAxisTick} width={48} />
            <Tooltip contentStyle={chartTooltipStyle} />
            <Legend />
            {measures.map((m, i) => (
              <Line key={m} type="monotone" dataKey={m} name={labels.get(m) ?? m} stroke={PIE_COLORS[i % PIE_COLORS.length]} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        ) : chartType === 'pie' && measures[0] ? (
          <PieChart>
            <Pie data={data} dataKey={measures[0]} nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
              {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={chartTooltipStyle} />
            <Legend />
          </PieChart>
        ) : (
          <BarChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 24 }}>
            <CartesianGrid {...chartGrid} />
            <XAxis dataKey="name" tick={chartAxisTick} />
            <YAxis tick={chartAxisTick} width={48} />
            <Tooltip contentStyle={chartTooltipStyle} />
            <Legend />
            {measures.map((m, i) => (
              <Bar key={m} dataKey={m} name={labels.get(m) ?? m} fill={PIE_COLORS[i % PIE_COLORS.length]} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
