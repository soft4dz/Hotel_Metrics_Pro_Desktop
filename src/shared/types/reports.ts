export type ReportFormat = 'xlsx';

export const COMPOSED_REPORT_SOURCE = '__composed__';

export type ReportLayoutType = 'list' | 'crosstab' | 'chart';
export type ReportChartType = 'bar' | 'line' | 'pie';

export type ReportPromptType = 'hotel' | 'dateFrom' | 'dateTo' | 'year' | 'month';

/** Invite Cognos — paramètre demandé à l'exécution */
export interface ReportPrompt {
  id: string;
  type: ReportPromptType;
  label: string;
  required: boolean;
}

/** Rapport combiné style Cognos : lignes × colonnes × mesures */
export interface ReportComposition {
  /** @deprecated Utiliser `rows` */
  dimensions?: string[];
  rows: string[];
  columns: string[];
  measures: string[];
  layout?: ReportLayoutType;
  chartType?: ReportChartType;
  prompts?: ReportPrompt[];
}

export interface SemanticFieldOption {
  id: string;
  label: string;
  description: string;
  category: string;
  type: 'dimension' | 'measure';
  format?: string;
  facts?: string[];
}

export interface SemanticCatalog {
  dimensions: SemanticFieldOption[];
  measures: SemanticFieldOption[];
  facts: Array<{ id: string; label: string; description: string; category: string }>;
}

export interface CompatibleFieldsResult {
  dimensions: SemanticFieldOption[];
  measures: SemanticFieldOption[];
  commonFacts: string[];
}

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
  category?: string;
  icon?: string;
  columns: ReportColumnDef[];
  supportsDateFilter: boolean;
  supportsHotelFilter: boolean;
  supportsStatutFilter: boolean;
  supportsMoisFilter?: boolean;
  supportsPeriodeFilter?: boolean;
  supportsModuleFilter?: boolean;
  supportsCategorieFilter?: boolean;
  statutOptions?: Array<{ value: string; label: string }>;
  categorieOptions?: Array<{ value: string; label: string }>;
}

export interface KpiReportMeta {
  id: string;
  label: string;
  description: string;
  category: string;
  icon: string;
  columns: ReportColumnDef[];
}

export interface ReportFilters {
  hotelId?: number | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  statut?: string | null;
  categorie?: string | null;
  mois?: number | null;
  annee?: number | null;
  periode?: string | null;
  moduleFilter?: string | null;
  /** Rapport combiné (dimensions + mesures) */
  composition?: ReportComposition;
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
  columns?: string[];
  composition?: ReportComposition;
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
  summary?: Record<string, unknown> | null;
  description?: string;
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

export interface ReportCategoryStats {
  name: string;
  sourceCount: number;
  kpiCount: number;
}

export interface ReportOverview {
  totalSources: number;
  accessibleSources: number;
  accessibleKpis: number;
  savedTemplates: number;
  totalRuns: number;
  lastRunAt: string | null;
  categories: ReportCategoryStats[];
}

export interface ReportSourceCatalog {
  sources: ReportDataSourceMeta[];
  kpis: KpiReportMeta[];
  byCategory: Record<string, string[]>;
  categories: readonly string[];
}

export const REPORT_MODULE_LABELS: Record<string, string> = {
  recettes: 'Recettes', encaissements: 'Trésorerie', facturation: 'Facturation',
  hebergement: 'Hébergement', stocks: 'Stocks', achats: 'Achats',
  maintenance: 'Maintenance',
  anomalies: 'Anomalies', reclamations: 'Qualité', decisions: 'Décisions',
  ged: 'GED', commercial: 'Commercial', rh: 'RH', portmaster: 'PortMaster',
  audit: 'Audit', administration: 'Administration',
};
