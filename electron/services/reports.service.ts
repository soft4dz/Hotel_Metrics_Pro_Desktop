import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import Electron from '../lib/electronApi';
import { getDatabase } from '../database/sqlite';
import { getActorContext, isGlobalAdminRole } from './actorContext';
import type {
  CreateReportTemplateInput,
  ReportColumnDef,
  ReportDataSourceMeta,
  ReportExportResult,
  ReportFilters,
  ReportFormat,
  ReportOverview,
  ReportPreviewResult,
  ReportRunHistory,
  ReportSourceCatalog,
  ReportTemplate,
  UpdateReportTemplateInput,
} from '../../src/shared/types/reports';
import { REPORT_SOURCES, getSourceCount, getSourcesByCategory } from './reports/reports-sources.registry';
import { assertReportAccess, canAccessSource, resolveHotelScope } from './reports/reports-access';
import { KPI_REPORTS, listKpiReports, runKpiReport } from './reports/reports-kpis.service';
import { REPORT_CATEGORIES } from './reports/reports-sources.types';
import {
  COMPOSED_REPORT_SOURCE,
  type ReportComposition,
} from '../../src/shared/types/reports';
import { compositionFieldKeys } from '../../src/shared/utils/reportComposition';
import {
  describeComposition,
  executeComposedReport,
  getCompatibleFields,
  listSemanticCatalog,
  validateComposition,
} from './reports/report-compose.service';

const require = createRequire(import.meta.url);
const PREVIEW_LIMIT = 100;
const EXPORT_LIMIT = 25000;

function parseJson<T>(raw: string, fallback: T): T {
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

function mapTemplate(row: Record<string, unknown>): ReportTemplate {
  return {
    id: row.id as number, uuid: row.uuid as string, name: row.name as string,
    description: row.description as string | null, dataSource: row.data_source as string,
    columns: parseJson<string[]>(row.columns_json as string, []),
    filters: parseJson<ReportFilters>(row.filters_json as string, {}),
    format: (row.format as ReportFormat) || 'xlsx', isShared: Boolean(row.is_shared),
    hotelId: row.hotel_id as number | null, createdBy: row.created_by as number,
    createdByName: row.created_by_name as string | null,
    createdAt: row.created_at as string, updatedAt: row.updated_at as string,
  };
}

function stripSourceMeta(s: typeof REPORT_SOURCES[string]): ReportDataSourceMeta {
  const { permissions: _p, buildQuery: _q, icon: _i, category: _c, ...meta } = s;
  return meta;
}

export function getReportsOverview(actorUserId: number): ReportOverview {
  assertReportAccess(actorUserId);
  const db = getDatabase();
  const actor = getActorContext(actorUserId);
  const accessibleSources = Object.values(REPORT_SOURCES).filter((s) => canAccessSource(actorUserId, s.id));
  const accessibleKpis = listKpiReports(actorUserId);

  const templates = db.prepare(`
    SELECT COUNT(*) AS c FROM report_templates WHERE deleted_at IS NULL AND (created_by = ? OR is_shared = 1)
  `).get(actor.userId) as { c: number };

  const runs = db.prepare(`
    SELECT COUNT(*) AS c FROM report_runs WHERE run_by = ?
  `).get(actor.userId) as { c: number };

  const lastRun = db.prepare(`
    SELECT executed_at FROM report_runs WHERE run_by = ? ORDER BY executed_at DESC LIMIT 1
  `).get(actor.userId) as { executed_at: string } | undefined;

  return {
    totalSources: getSourceCount(),
    accessibleSources: accessibleSources.length,
    accessibleKpis: accessibleKpis.length,
    savedTemplates: templates.c,
    totalRuns: runs.c,
    lastRunAt: lastRun?.executed_at ?? null,
    categories: REPORT_CATEGORIES.map((cat) => ({
      name: cat,
      sourceCount: accessibleSources.filter((s) => s.category === cat).length,
      kpiCount: accessibleKpis.filter((k) => k.category === cat).length,
    })).filter((c) => c.sourceCount > 0 || c.kpiCount > 0),
  };
}

export function listReportSourceCatalog(actorUserId: number): ReportSourceCatalog {
  assertReportAccess(actorUserId);
  const sources = Object.values(REPORT_SOURCES)
    .filter((s) => canAccessSource(actorUserId, s.id))
    .map((s) => ({ ...stripSourceMeta(s), category: s.category, icon: s.icon ?? 'database' }));

  const kpis = listKpiReports(actorUserId);
  const byCategory = getSourcesByCategory();

  return { sources, kpis, byCategory, categories: REPORT_CATEGORIES };
}

export function listReportDataSources(actorUserId: number): ReportDataSourceMeta[] {
  assertReportAccess(actorUserId);
  return Object.values(REPORT_SOURCES)
    .filter((s) => canAccessSource(actorUserId, s.id))
    .map(stripSourceMeta);
}

export function listReportTemplates(actorUserId: number): ReportTemplate[] {
  const actor = assertReportAccess(actorUserId);
  const rows = getDatabase().prepare(`
    SELECT t.*, u.full_name AS created_by_name FROM report_templates t
    LEFT JOIN users u ON u.id = t.created_by
    WHERE t.deleted_at IS NULL AND (t.created_by = ? OR t.is_shared = 1)
    ORDER BY t.updated_at DESC
  `).all(actor.userId) as Record<string, unknown>[];
  return rows.filter((r) => canAccessSource(actorUserId, r.data_source as string)).map(mapTemplate);
}

export function getReportTemplate(actorUserId: number, id: number): ReportTemplate | null {
  assertReportAccess(actorUserId);
  const row = getDatabase().prepare(`
    SELECT t.*, u.full_name AS created_by_name FROM report_templates t
    LEFT JOIN users u ON u.id = t.created_by WHERE t.id = ? AND t.deleted_at IS NULL
  `).get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  const template = mapTemplate(row);
  const actor = getActorContext(actorUserId);
  if (template.createdBy !== actor.userId && !template.isShared) throw new Error('Accès refusé à ce modèle.');
  if (template.dataSource !== COMPOSED_REPORT_SOURCE && !canAccessSource(actorUserId, template.dataSource)) {
    throw new Error('Source non autorisée.');
  }
  return template;
}

export function listSemanticCatalogForUser(actorUserId: number) {
  return listSemanticCatalog(actorUserId);
}

export function getCompatibleSemanticFields(
  actorUserId: number,
  dimensions: string[],
  measures: string[],
) {
  return getCompatibleFields(actorUserId, dimensions, measures);
}

export function previewComposedReport(
  actorUserId: number,
  composition: ReportComposition,
  filters: ReportFilters = {},
): ReportPreviewResult {
  assertReportAccess(actorUserId);
  const err = validateComposition(composition);
  if (err) throw new Error(err);
  const { rows, columns, totalRows } = executeComposedReport(actorUserId, composition, filters, PREVIEW_LIMIT + 1);
  const truncated = rows.length > PREVIEW_LIMIT;
  const displayRows = truncated ? rows.slice(0, PREVIEW_LIMIT) : rows;
  return {
    columns, rows: displayRows, totalRows, truncated,
    summary: computeSummary(displayRows, columns),
    description: describeComposition(composition),
  };
}

export async function exportComposedReport(
  actorUserId: number,
  composition: ReportComposition,
  filters: ReportFilters = {},
  name = 'rapport_combine',
): Promise<ReportExportResult> {
  assertReportAccess(actorUserId);
  const err = validateComposition(composition);
  if (err) throw new Error(err);
  const { rows, columns, totalRows } = executeComposedReport(actorUserId, composition, filters, EXPORT_LIMIT);
  const result = await writeExcel(columns, rows, name, computeSummary(rows, columns));
  if (totalRows > EXPORT_LIMIT) result.message = `Limité à ${EXPORT_LIMIT} lignes sur ${totalRows}.`;
  return result;
}

export function createReportTemplate(actorUserId: number, input: CreateReportTemplateInput): ReportTemplate {
  const actor = assertReportAccess(actorUserId);

  if (input.dataSource === COMPOSED_REPORT_SOURCE || input.composition) {
    const composition = input.composition ?? input.filters?.composition;
    if (!composition) throw new Error('Composition requise pour un rapport combiné.');
    const err = validateComposition(composition);
    if (err) throw new Error(err);
    const filters = { ...(input.filters ?? {}), composition };
    const columns = compositionFieldKeys(composition);
    const result = getDatabase().prepare(`
      INSERT INTO report_templates (name, description, data_source, columns_json, filters_json, format, is_shared, hotel_id, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      input.name.trim(), input.description?.trim() || null, COMPOSED_REPORT_SOURCE,
      JSON.stringify(columns), JSON.stringify(filters),
      input.format ?? 'xlsx', input.isShared ? 1 : 0, input.hotelId ?? null, actor.userId,
    );
    return getReportTemplate(actorUserId, Number(result.lastInsertRowid))!;
  }

  const source = REPORT_SOURCES[input.dataSource];
  if (!source) throw new Error('Source invalide.');
  if (!canAccessSource(actorUserId, input.dataSource)) throw new Error('Accès source refusé.');
  const validColumns = (input.columns ?? []).filter((c) => source.columns.some((col) => col.key === c));
  if (validColumns.length === 0) throw new Error('Colonnes invalides.');

  const result = getDatabase().prepare(`
    INSERT INTO report_templates (name, description, data_source, columns_json, filters_json, format, is_shared, hotel_id, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.name.trim(), input.description?.trim() || null, input.dataSource,
    JSON.stringify(validColumns), JSON.stringify(input.filters ?? {}),
    input.format ?? 'xlsx', input.isShared ? 1 : 0, input.hotelId ?? null, actor.userId,
  );
  return getReportTemplate(actorUserId, Number(result.lastInsertRowid))!;
}

export function duplicateReportTemplate(actorUserId: number, id: number, newName?: string): ReportTemplate {
  const existing = getReportTemplate(actorUserId, id);
  if (!existing) throw new Error('Modèle introuvable.');
  return createReportTemplate(actorUserId, {
    name: newName?.trim() || `${existing.name} (copie)`,
    description: existing.description,
    dataSource: existing.dataSource,
    columns: existing.dataSource === COMPOSED_REPORT_SOURCE ? undefined : existing.columns,
    composition: existing.filters.composition,
    filters: existing.filters,
    format: existing.format,
    isShared: false,
    hotelId: existing.hotelId,
  });
}

export function updateReportTemplate(actorUserId: number, id: number, input: UpdateReportTemplateInput): ReportTemplate {
  const existing = getReportTemplate(actorUserId, id);
  if (!existing) throw new Error('Modèle introuvable.');
  const actor = getActorContext(actorUserId);
  if (existing.createdBy !== actor.userId && !isGlobalAdminRole(actor.roleCode)) {
    throw new Error('Modification non autorisée.');
  }
  if (existing.dataSource === COMPOSED_REPORT_SOURCE) {
    const composition = input.filters?.composition ?? existing.filters.composition;
    if (!composition) throw new Error('Composition manquante.');
    const filters = { ...(input.filters ?? existing.filters), composition };
    const columns = compositionFieldKeys(composition);
    getDatabase().prepare(`
      UPDATE report_templates SET name=?, description=?, columns_json=?, filters_json=?, format=?, is_shared=?, hotel_id=?, updated_at=datetime('now') WHERE id=?
    `).run(
      input.name?.trim() ?? existing.name,
      input.description !== undefined ? (input.description?.trim() || null) : existing.description,
      JSON.stringify(columns), JSON.stringify(filters),
      input.format ?? existing.format,
      input.isShared !== undefined ? (input.isShared ? 1 : 0) : (existing.isShared ? 1 : 0),
      input.hotelId !== undefined ? input.hotelId : existing.hotelId, id,
    );
    return getReportTemplate(actorUserId, id)!;
  }

  const source = REPORT_SOURCES[existing.dataSource];
  if (!source) throw new Error('Source invalide.');
  const columns = input.columns?.filter((c) => source.columns.some((col) => col.key === c)) ?? existing.columns;
  getDatabase().prepare(`
    UPDATE report_templates SET name=?, description=?, columns_json=?, filters_json=?, format=?, is_shared=?, hotel_id=?, updated_at=datetime('now') WHERE id=?
  `).run(
    input.name?.trim() ?? existing.name,
    input.description !== undefined ? (input.description?.trim() || null) : existing.description,
    JSON.stringify(columns), JSON.stringify(input.filters ?? existing.filters),
    input.format ?? existing.format,
    input.isShared !== undefined ? (input.isShared ? 1 : 0) : (existing.isShared ? 1 : 0),
    input.hotelId !== undefined ? input.hotelId : existing.hotelId, id,
  );
  return getReportTemplate(actorUserId, id)!;
}

export function deleteReportTemplate(actorUserId: number, id: number): void {
  const existing = getReportTemplate(actorUserId, id);
  if (!existing) throw new Error('Modèle introuvable.');
  const actor = getActorContext(actorUserId);
  if (existing.createdBy !== actor.userId && !isGlobalAdminRole(actor.roleCode)) throw new Error('Suppression non autorisée.');
  getDatabase().prepare(`UPDATE report_templates SET deleted_at = datetime('now') WHERE id = ?`).run(id);
}

function fetchReportData(actorUserId: number, dataSource: string, columns: string[], filters: ReportFilters, limit?: number) {
  if (!canAccessSource(actorUserId, dataSource)) throw new Error('Source non autorisée.');
  const source = REPORT_SOURCES[dataSource];
  const hotelIds = source.supportsHotelFilter ? resolveHotelScope(actorUserId, filters) : null;
  const { sql, params } = source.buildQuery(columns, filters, hotelIds);
  const db = getDatabase();
  const totalRows = (db.prepare(`SELECT COUNT(*) AS c FROM (${sql})`).get(...params) as { c: number }).c;
  const limitedSql = limit ? `${sql} LIMIT ?` : sql;
  const rows = db.prepare(limitedSql).all(...(limit ? [...params, limit] : params)) as Record<string, unknown>[];
  const columnDefs = source.columns.filter((c) => columns.includes(c.key));
  return { rows, columnDefs, totalRows };
}

function computeSummary(rows: Record<string, unknown>[], columns: ReportColumnDef[]): Record<string, unknown> | null {
  const numericKeys = columns.filter((c) =>
    rows.length > 0 && typeof rows[0][c.key] === 'number',
  ).map((c) => c.key);
  if (numericKeys.length === 0) return null;
  const summary: Record<string, unknown> = {};
  for (const col of columns) {
    if (numericKeys.includes(col.key)) {
      summary[col.key] = Math.round(rows.reduce((s, r) => s + (Number(r[col.key]) || 0), 0) * 100) / 100;
    } else if (col.key === columns[0]?.key) {
      summary[col.key] = `TOTAL (${rows.length} lignes)`;
    } else {
      summary[col.key] = '';
    }
  }
  return summary;
}

export function previewReport(actorUserId: number, dataSource: string, columns: string[], filters: ReportFilters = {}): ReportPreviewResult {
  assertReportAccess(actorUserId);
  const { rows, columnDefs, totalRows } = fetchReportData(actorUserId, dataSource, columns, filters, PREVIEW_LIMIT + 1);
  const truncated = rows.length > PREVIEW_LIMIT;
  const displayRows = truncated ? rows.slice(0, PREVIEW_LIMIT) : rows;
  return {
    columns: columnDefs, rows: displayRows, totalRows, truncated,
    summary: computeSummary(displayRows, columnDefs),
  };
}

export function previewKpiReport(actorUserId: number, kpiId: string, filters: ReportFilters = {}): ReportPreviewResult {
  assertReportAccess(actorUserId);
  const { columns, rows } = runKpiReport(actorUserId, kpiId, filters);
  return { columns, rows, totalRows: rows.length, truncated: false, summary: computeSummary(rows, columns) };
}

async function loadExcelJS() {
  const mod = require('exceljs') as { default?: typeof import('exceljs') } & typeof import('exceljs');
  return ('default' in mod && mod.default ? mod.default : mod) as typeof import('exceljs');
}

async function writeExcel(
  columnDefs: ReportColumnDef[],
  rows: Record<string, unknown>[],
  defaultName: string,
  summary?: Record<string, unknown> | null,
): Promise<ReportExportResult> {
  const ExcelJS = await loadExcelJS();
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Raqmi System';
  const sheet = wb.addWorksheet('Rapport');
  sheet.columns = columnDefs.map((c) => ({ header: c.label, key: c.key, width: c.width ?? 16 }));
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  for (const row of rows) sheet.addRow(row);
  if (summary) {
    const totalRow = sheet.addRow(summary);
    totalRow.font = { bold: true };
  }
  const buffer = Buffer.from(await wb.xlsx.writeBuffer());
  const safeName = defaultName.replace(/[^\w\-àâäéèêëïîôùûüç\s]/gi, '').trim().replace(/\s+/g, '_');
  const { canceled, filePath } = await Electron.dialog.showSaveDialog({
    defaultPath: `${safeName || 'rapport'}.xlsx`,
    filters: [{ name: 'Excel', extensions: ['xlsx'] }],
  });
  if (canceled || !filePath) return { ok: false, message: 'Export annulé.' };
  writeFileSync(filePath, buffer);
  return { ok: true, filePath, rowCount: rows.length };
}

export async function exportReportTemplate(actorUserId: number, templateId: number): Promise<ReportExportResult> {
  const template = getReportTemplate(actorUserId, templateId);
  if (!template) throw new Error('Modèle introuvable.');

  if (template.dataSource === COMPOSED_REPORT_SOURCE && template.filters.composition) {
    const result = await exportComposedReport(actorUserId, template.filters.composition, template.filters, template.name);
    if (result.ok) {
      getDatabase().prepare(`INSERT INTO report_runs (template_id, run_by, row_count, file_path, status) VALUES (?, ?, ?, ?, 'success')`)
        .run(templateId, actorUserId, result.rowCount ?? 0, result.filePath ?? null);
    }
    return result;
  }

  const { rows, columnDefs, totalRows } = fetchReportData(actorUserId, template.dataSource, template.columns, template.filters, EXPORT_LIMIT);
  const result = await writeExcel(columnDefs, rows, `rapport_${template.name}`, computeSummary(rows, columnDefs));
  if (result.ok) {
    getDatabase().prepare(`INSERT INTO report_runs (template_id, run_by, row_count, file_path, status) VALUES (?, ?, ?, ?, 'success')`)
      .run(templateId, actorUserId, rows.length, result.filePath ?? null);
    if (totalRows > EXPORT_LIMIT) result.message = `Limité à ${EXPORT_LIMIT} lignes sur ${totalRows}.`;
  }
  return result;
}

export async function exportAdHocReport(actorUserId: number, dataSource: string, columns: string[], filters: ReportFilters = {}, name = 'rapport'): Promise<ReportExportResult> {
  assertReportAccess(actorUserId);
  const { rows, columnDefs, totalRows } = fetchReportData(actorUserId, dataSource, columns, filters, EXPORT_LIMIT);
  const result = await writeExcel(columnDefs, rows, name, computeSummary(rows, columnDefs));
  if (totalRows > EXPORT_LIMIT) result.message = `Limité à ${EXPORT_LIMIT} lignes sur ${totalRows}.`;
  return result;
}

export async function exportKpiReport(actorUserId: number, kpiId: string, filters: ReportFilters = {}): Promise<ReportExportResult> {
  assertReportAccess(actorUserId);
  const kpi = KPI_REPORTS.find((k) => k.id === kpiId);
  if (!kpi) throw new Error('KPI inconnu.');
  const { columns, rows } = runKpiReport(actorUserId, kpiId, filters);
  return writeExcel(columns, rows, `kpi_${kpi.label}`, computeSummary(rows, columns));
}

export function listReportRuns(actorUserId: number, limit = 30): ReportRunHistory[] {
  assertReportAccess(actorUserId);
  const actor = getActorContext(actorUserId);
  const rows = getDatabase().prepare(`
    SELECT r.id, r.template_id, t.name AS template_name, u.full_name AS run_by_name,
           r.row_count, r.file_path, r.status, r.executed_at
    FROM report_runs r INNER JOIN report_templates t ON t.id = r.template_id
    LEFT JOIN users u ON u.id = r.run_by
    WHERE r.run_by = ? OR t.is_shared = 1 OR t.created_by = ?
    ORDER BY r.executed_at DESC LIMIT ?
  `).all(actor.userId, actor.userId, limit) as Record<string, unknown>[];
  return rows.map((r) => ({
    id: r.id as number, templateId: r.template_id as number, templateName: r.template_name as string,
    runByName: r.run_by_name as string | null, rowCount: r.row_count as number,
    filePath: r.file_path as string | null, status: r.status as string, executedAt: r.executed_at as string,
  }));
}
