export type ReportFormat = 'xlsx';

export interface ReportColumnDef {
  key: string;
  label: string;
  width?: number;
}

export interface ReportDataSourceMeta {
  id: string;
  label: string;
  description: string;
  module: string;
  columns: ReportColumnDef[];
  supportsDateFilter: boolean;
  supportsHotelFilter: boolean;
  supportsStatutFilter: boolean;
  statutOptions?: Array<{ value: string; label: string }>;
}

export interface ReportFilters {
  hotelId?: number | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  statut?: string | null;
}

export interface ReportTemplate {
  id: number;
  uuid: string;
  name: string;
  description: string | null;
  dataSource: string;
  columns: string[];
  filters: ReportFilters;
  format: ReportFormat;
  isShared: boolean;
  hotelId: number | null;
  createdBy: number;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReportTemplateInput {
  name: string;
  description?: string | null;
  dataSource: string;
  columns: string[];
  filters?: ReportFilters;
  format?: ReportFormat;
  isShared?: boolean;
  hotelId?: number | null;
}

export interface UpdateReportTemplateInput {
  name?: string;
  description?: string | null;
  columns?: string[];
  filters?: ReportFilters;
  format?: ReportFormat;
  isShared?: boolean;
  hotelId?: number | null;
}

export interface ReportPreviewResult {
  columns: ReportColumnDef[];
  rows: Record<string, unknown>[];
  totalRows: number;
  truncated: boolean;
}

export interface ReportExportResult {
  ok: boolean;
  filePath?: string;
  message?: string;
  rowCount?: number;
}

export interface ReportRunHistory {
  id: number;
  templateId: number;
  templateName: string;
  runByName: string | null;
  rowCount: number;
  filePath: string | null;
  status: string;
  executedAt: string;
}
