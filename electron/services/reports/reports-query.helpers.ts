import type { ReportFilters } from '../../../src/shared/types/reports';

export interface QueryBuildResult {
  sql: string;
  params: unknown[];
}

export function pickColumns(selectMap: Record<string, string>, columns: string[]): string {
  const selected = columns.length ? columns : Object.keys(selectMap);
  return selected.map((c) => selectMap[c]).filter(Boolean).join(', ');
}

export function applyHotelFilter(
  where: string[],
  params: unknown[],
  hotelIds: number[] | null,
  filters: ReportFilters,
  hotelColumn: string,
): void {
  if (hotelIds) {
    where.push(`${hotelColumn} IN (${hotelIds.map(() => '?').join(',')})`);
    params.push(...hotelIds);
  } else if (filters.hotelId) {
    where.push(`${hotelColumn} = ?`);
    params.push(filters.hotelId);
  }
}

export function applyDateFilter(
  where: string[],
  params: unknown[],
  filters: ReportFilters,
  dateColumn: string,
): void {
  if (filters.dateFrom) {
    where.push(`${dateColumn} >= ?`);
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    where.push(`${dateColumn} <= ?`);
    params.push(filters.dateTo);
  }
}

export function applyStatutFilter(
  where: string[],
  params: unknown[],
  filters: ReportFilters,
  statutColumn: string,
): void {
  if (filters.statut) {
    where.push(`${statutColumn} = ?`);
    params.push(filters.statut);
  }
}

export function applyCategorieFilter(
  where: string[],
  params: unknown[],
  filters: ReportFilters,
  categorieColumn: string,
): void {
  if (filters.categorie) {
    where.push(`${categorieColumn} = ?`);
    params.push(filters.categorie);
  }
}
