import type { ReportComposition, ReportLayoutType, ReportChartType, ReportPrompt } from '../types/reports';

export interface NormalizedComposition {
  rows: string[];
  columns: string[];
  measures: string[];
  allDimensions: string[];
  layout: ReportLayoutType;
  chartType: ReportChartType;
  prompts: ReportPrompt[];
}

/** Unifie l'ancien format `dimensions` et le modèle Cognos rows/columns */
export function normalizeComposition(composition: ReportComposition): NormalizedComposition {
  const rows = composition.rows?.length
    ? composition.rows
    : (composition.dimensions ?? []);
  const columns = composition.columns ?? [];
  const measures = composition.measures ?? [];
  return {
    rows,
    columns,
    measures,
    allDimensions: [...rows, ...columns],
    layout: composition.layout ?? 'list',
    chartType: composition.chartType ?? 'bar',
    prompts: composition.prompts ?? [],
  };
}

export function compositionFieldKeys(c: ReportComposition): string[] {
  const n = normalizeComposition(c);
  return [...n.allDimensions, ...n.measures];
}
