import type { ReportColumnDef } from '@/shared/types/reports';

function rowKey(row: Record<string, unknown>, dims: string[]): string {
  return dims.map((d) => String(row[d] ?? '—')).join('\0');
}

function colKey(row: Record<string, unknown>, dims: string[]): string {
  return dims.map((d) => String(row[d] ?? '—')).join('\0');
}

export interface CrosstabResult {
  columns: ReportColumnDef[];
  rows: Record<string, unknown>[];
}

/** Transforme un jeu plat en tableau croisé (lignes × colonnes × mesures) */
export function pivotToCrosstab(
  flatRows: Record<string, unknown>[],
  rowDims: string[],
  colDims: string[],
  measures: string[],
  labels: Map<string, string>,
): CrosstabResult {
  if (!colDims.length || !rowDims.length) {
    return { columns: [], rows: [] };
  }

  const colKeysSet = new Map<string, string>();
  for (const row of flatRows) {
    const ck = colKey(row, colDims);
    if (!colKeysSet.has(ck)) {
      colKeysSet.set(ck, colDims.map((d) => String(row[d] ?? '—')).join(' / '));
    }
  }
  const colKeys = [...colKeysSet.keys()];

  const pivotCols: ReportColumnDef[] = rowDims.map((id) => ({
    key: id,
    label: labels.get(id) ?? id,
    width: 22,
  }));

  for (const ck of colKeys) {
    const colLabel = colKeysSet.get(ck)!;
    for (const m of measures) {
      const key = `${ck}__${m}`;
      const mesLabel = labels.get(m) ?? m;
      pivotCols.push({
        key,
        label: measures.length > 1 ? `${colLabel} — ${mesLabel}` : colLabel,
        width: 14,
      });
    }
  }

  const rowMap = new Map<string, Record<string, unknown>>();

  for (const flat of flatRows) {
    const rk = rowKey(flat, rowDims);
    if (!rowMap.has(rk)) {
      const base: Record<string, unknown> = {};
      for (const d of rowDims) base[d] = flat[d];
      rowMap.set(rk, base);
    }
    const target = rowMap.get(rk)!;
    const ck = colKey(flat, colDims);
    for (const m of measures) {
      target[`${ck}__${m}`] = flat[m];
    }
  }

  return { columns: pivotCols, rows: [...rowMap.values()] };
}

/** Prépare les données pour un graphique Recharts */
export function toChartData(
  flatRows: Record<string, unknown>[],
  categoryDim: string,
  measures: string[],
): Array<Record<string, unknown>> {
  const grouped = new Map<string, Record<string, unknown>>();
  for (const row of flatRows) {
    const cat = String(row[categoryDim] ?? '—');
    if (!grouped.has(cat)) {
      grouped.set(cat, { name: cat });
    }
    const g = grouped.get(cat)!;
    for (const m of measures) {
      const prev = Number(g[m] ?? 0);
      g[m] = prev + Number(row[m] ?? 0);
    }
  }
  return [...grouped.values()];
}
