import { FINANCE_SOURCES } from './reports-sources.finance';
import { EXPLOITATION_SOURCES } from './reports-sources.exploitation';
import { RH_SOURCES } from './reports-sources.rh';
import type { SourceDef } from './reports-sources.types';

export const REPORT_SOURCES: Record<string, SourceDef> = {
  ...FINANCE_SOURCES,
  ...EXPLOITATION_SOURCES,
  ...RH_SOURCES,
};

export function getSourceCount(): number {
  return Object.keys(REPORT_SOURCES).length;
}

export function getSourcesByCategory(): Record<string, string[]> {
  const grouped: Record<string, string[]> = {};
  for (const src of Object.values(REPORT_SOURCES)) {
    if (!grouped[src.category]) grouped[src.category] = [];
    grouped[src.category].push(src.id);
  }
  return grouped;
}
