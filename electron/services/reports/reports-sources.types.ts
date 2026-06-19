import type { ReportDataSourceMeta, ReportFilters } from '../../../src/shared/types/reports';
import type { QueryBuildResult } from './reports-query.helpers';

export interface SourceDefPartial extends ReportDataSourceMeta {
  permissions: string[];
  icon?: string;
  category: string;
  supportsMoisFilter?: boolean;
  supportsModuleFilter?: boolean;
  supportsCategorieFilter?: boolean;
  categorieOptions?: Array<{ value: string; label: string }>;
  buildQuery: (
    columns: string[],
    filters: ReportFilters,
    hotelIds: number[] | null,
  ) => QueryBuildResult;
}

export type SourceDef = SourceDefPartial;

export const REPORT_CATEGORIES = [
  'Finance',
  'Exploitation',
  'Ressources humaines',
  'PortMaster',
  'Contrôle',
  'Commercial',
  'Système',
] as const;

export type ReportCategory = (typeof REPORT_CATEGORIES)[number];
