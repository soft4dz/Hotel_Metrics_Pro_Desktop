import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import Electron from '../lib/electronApi';
import { getDatabase } from '../database/sqlite';
import { getActorContext, isGlobalAdminRole } from './actorContext';
import { assertPermission, userHasPermission } from './permissions.service';
import type {
  CreateReportTemplateInput,
  ReportColumnDef,
  ReportDataSourceMeta,
  ReportExportResult,
  ReportFilters,
  ReportFormat,
  ReportPreviewResult,
  ReportRunHistory,
  ReportTemplate,
  UpdateReportTemplateInput,
} from '../../src/shared/types/reports';

const require = createRequire(import.meta.url);

const PREVIEW_LIMIT = 50;
const EXPORT_LIMIT = 10000;

interface SourceDef extends ReportDataSourceMeta {
  permissions: string[];
  dateColumn?: string;
  hotelColumn?: string;
  statutColumn?: string;
  buildQuery: (selectedColumns: string[], filters: ReportFilters, hotelIds: number[] | null) => {
    sql: string;
    params: unknown[];
  };
}

const REPORT_SOURCES: Record<string, SourceDef> = {
  recettes_journalieres: {
    id: 'recettes_journalieres',
    label: 'Recettes journalières',
    description: 'Lignes de recettes par hôtel, date et rubrique',
    module: 'recettes',
    permissions: ['recettes.saisie', 'recettes.validate', 'reports.export'],
    supportsDateFilter: true,
    supportsHotelFilter: true,
    supportsStatutFilter: true,
    statutOptions: [
      { value: 'validated', label: 'Validée' },
      { value: 'draft', label: 'Brouillon' },
    ],
    dateColumn: 'rj.date_journal',
    hotelColumn: 'rj.hotel_id',
    statutColumn: 'rj.statut',
    columns: [
      { key: 'hotel', label: 'Hôtel', width: 24 },
      { key: 'date_journal', label: 'Date', width: 12 },
      { key: 'rubrique', label: 'Rubrique', width: 20 },
      { key: 'montant', label: 'Montant', width: 14 },
      { key: 'statut', label: 'Statut', width: 12 },
      { key: 'chambres', label: 'Chambres', width: 10 },
      { key: 'nuitees', label: 'Nuitées', width: 10 },
      { key: 'observation', label: 'Observation', width: 30 },
    ],
    buildQuery(columns, filters, hotelIds) {
      const selectMap: Record<string, string> = {
        hotel: 'h.name AS hotel',
        date_journal: 'rj.date_journal',
        rubrique: 'rub.label AS rubrique',
        montant: 'rj.montant',
        statut: 'rj.statut',
        chambres: 'rj.chambres',
        nuitees: 'rj.nuitees',
        observation: 'rj.observation',
      };
      const selected = columns.length ? columns : Object.keys(selectMap);
      const select = selected.map((c) => selectMap[c]).filter(Boolean).join(', ');
      const where = ['rj.deleted_at IS NULL'];
      const params: unknown[] = [];
      if (hotelIds) {
        where.push(`rj.hotel_id IN (${hotelIds.map(() => '?').join(',')})`);
        params.push(...hotelIds);
      } else if (filters.hotelId) {
        where.push('rj.hotel_id = ?');
        params.push(filters.hotelId);
      }
      if (filters.dateFrom) {
        where.push('rj.date_journal >= ?');
        params.push(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.push('rj.date_journal <= ?');
        params.push(filters.dateTo);
      }
      if (filters.statut) {
        where.push('rj.statut = ?');
        params.push(filters.statut);
      }
      return {
        sql: `
          SELECT ${select}
          FROM recettes_journalieres rj
          INNER JOIN hotels h ON h.id = rj.hotel_id
          INNER JOIN rubriques rub ON rub.id = rj.rubrique_id
          WHERE ${where.join(' AND ')}
          ORDER BY rj.date_journal DESC
        `,
        params,
      };
    },
  },
  encaissements: {
    id: 'encaissements',
    label: 'Encaissements',
    description: 'Encaissements et trésorerie par hôtel',
    module: 'encaissements',
    permissions: ['recettes.saisie', 'recettes.validate', 'reports.export'],
    supportsDateFilter: true,
    supportsHotelFilter: true,
    supportsStatutFilter: true,
    statutOptions: [
      { value: 'en_attente', label: 'En attente' },
      { value: 'valide', label: 'Validé' },
      { value: 'annule', label: 'Annulé' },
    ],
    dateColumn: 'e.date_encaissement',
    hotelColumn: 'e.hotel_id',
    statutColumn: 'e.statut',
    columns: [
      { key: 'hotel', label: 'Hôtel', width: 24 },
      { key: 'date_encaissement', label: 'Date', width: 12 },
      { key: 'montant', label: 'Montant', width: 14 },
      { key: 'mode', label: 'Mode', width: 12 },
      { key: 'reference', label: 'Référence', width: 18 },
      { key: 'description', label: 'Description', width: 28 },
      { key: 'statut', label: 'Statut', width: 12 },
    ],
    buildQuery(columns, filters, hotelIds) {
      const selectMap: Record<string, string> = {
        hotel: 'h.name AS hotel',
        date_encaissement: 'e.date_encaissement',
        montant: 'e.montant',
        mode: 'e.mode',
        reference: 'e.reference',
        description: 'e.description',
        statut: 'e.statut',
      };
      const selected = columns.length ? columns : Object.keys(selectMap);
      const select = selected.map((c) => selectMap[c]).filter(Boolean).join(', ');
      const where = ['e.deleted_at IS NULL'];
      const params: unknown[] = [];
      if (hotelIds) {
        where.push(`e.hotel_id IN (${hotelIds.map(() => '?').join(',')})`);
        params.push(...hotelIds);
      } else if (filters.hotelId) {
        where.push('e.hotel_id = ?');
        params.push(filters.hotelId);
      }
      if (filters.dateFrom) {
        where.push('e.date_encaissement >= ?');
        params.push(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.push('e.date_encaissement <= ?');
        params.push(filters.dateTo);
      }
      if (filters.statut) {
        where.push('e.statut = ?');
        params.push(filters.statut);
      }
      return {
        sql: `
          SELECT ${select}
          FROM encaissements e
          INNER JOIN hotels h ON h.id = e.hotel_id
          WHERE ${where.join(' AND ')}
          ORDER BY e.date_encaissement DESC
        `,
        params,
      };
    },
  },
  anomalies: {
    id: 'anomalies',
    label: 'Journal des anomalies',
    description: 'Anomalies opérationnelles signalées',
    module: 'anomalies',
    permissions: ['audit.read', 'reports.export'],
    supportsDateFilter: true,
    supportsHotelFilter: true,
    supportsStatutFilter: true,
    statutOptions: [
      { value: 'ouverte', label: 'Ouverte' },
      { value: 'en_cours', label: 'En cours' },
      { value: 'resolue', label: 'Résolue' },
      { value: 'fermee', label: 'Fermée' },
    ],
    dateColumn: 'a.date_signalement',
    hotelColumn: 'a.hotel_id',
    statutColumn: 'a.statut',
    columns: [
      { key: 'hotel', label: 'Hôtel', width: 22 },
      { key: 'titre', label: 'Titre', width: 28 },
      { key: 'categorie', label: 'Catégorie', width: 14 },
      { key: 'severite', label: 'Sévérité', width: 12 },
      { key: 'statut', label: 'Statut', width: 12 },
      { key: 'date_signalement', label: 'Date signalement', width: 14 },
      { key: 'signale_par', label: 'Signalé par', width: 20 },
    ],
    buildQuery(columns, filters, hotelIds) {
      const selectMap: Record<string, string> = {
        hotel: 'h.name AS hotel',
        titre: 'a.titre',
        categorie: 'a.categorie',
        severite: 'a.severite',
        statut: 'a.statut',
        date_signalement: 'a.date_signalement',
        signale_par: 'us.full_name AS signale_par',
      };
      const selected = columns.length ? columns : Object.keys(selectMap);
      const select = selected.map((c) => selectMap[c]).filter(Boolean).join(', ');
      const where: string[] = ['1=1'];
      const params: unknown[] = [];
      if (hotelIds) {
        where.push(`a.hotel_id IN (${hotelIds.map(() => '?').join(',')})`);
        params.push(...hotelIds);
      } else if (filters.hotelId) {
        where.push('a.hotel_id = ?');
        params.push(filters.hotelId);
      }
      if (filters.dateFrom) {
        where.push('a.date_signalement >= ?');
        params.push(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.push('a.date_signalement <= ?');
        params.push(filters.dateTo);
      }
      if (filters.statut) {
        where.push('a.statut = ?');
        params.push(filters.statut);
      }
      return {
        sql: `
          SELECT ${select}
          FROM anomalies a
          LEFT JOIN hotels h ON h.id = a.hotel_id
          LEFT JOIN users us ON us.id = a.signale_par
          WHERE ${where.join(' AND ')}
          ORDER BY a.created_at DESC
        `,
        params,
      };
    },
  },
  port_factures: {
    id: 'port_factures',
    label: 'Factures portuaires',
    description: 'Factures PortMaster avec encaissements',
    module: 'portmaster',
    permissions: ['portmaster.full', 'reports.export'],
    supportsDateFilter: true,
    supportsHotelFilter: false,
    supportsStatutFilter: true,
    statutOptions: [
      { value: 'brouillon', label: 'Brouillon' },
      { value: 'emise', label: 'Émise' },
      { value: 'payee', label: 'Payée' },
      { value: 'annulee', label: 'Annulée' },
    ],
    dateColumn: 'f.date_facture',
    statutColumn: 'f.statut',
    columns: [
      { key: 'numero', label: 'N° facture', width: 18 },
      { key: 'client', label: 'Client', width: 28 },
      { key: 'date_facture', label: 'Date', width: 12 },
      { key: 'montant_ttc', label: 'TTC', width: 14 },
      { key: 'paye', label: 'Payé', width: 14 },
      { key: 'reste', label: 'Reste', width: 14 },
      { key: 'statut', label: 'Statut', width: 12 },
    ],
    buildQuery(columns, filters, _hotelIds) {
      const payeSub = `(SELECT COALESCE(SUM(pe.montant), 0) FROM port_encaissements pe WHERE pe.facture_id = f.id AND COALESCE(pe.statut, 'valide') = 'valide')`;
      const selectMap: Record<string, string> = {
        numero: 'f.numero',
        client: `COALESCE(c.raison_sociale, c.prenom || ' ' || c.nom) AS client`,
        date_facture: 'f.date_facture',
        montant_ttc: 'f.montant_ttc',
        paye: `${payeSub} AS paye`,
        reste: `(f.montant_ttc - ${payeSub}) AS reste`,
        statut: 'f.statut',
      };
      const selected = columns.length ? columns : Object.keys(selectMap);
      const select = selected.map((c) => selectMap[c]).filter(Boolean).join(', ');
      const where = ['f.deleted_at IS NULL'];
      const params: unknown[] = [];
      if (filters.dateFrom) {
        where.push('f.date_facture >= ?');
        params.push(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.push('f.date_facture <= ?');
        params.push(filters.dateTo);
      }
      if (filters.statut) {
        where.push('f.statut = ?');
        params.push(filters.statut);
      }
      return {
        sql: `
          SELECT ${select}
          FROM port_factures f
          INNER JOIN port_clients c ON c.id = f.client_id
          WHERE ${where.join(' AND ')}
          ORDER BY f.date_facture DESC
        `,
        params,
      };
    },
  },
};

function assertReportAccess(actorUserId: number) {
  const actor = getActorContext(actorUserId);
  if (
    userHasPermission(actorUserId, 'reports.create') ||
    userHasPermission(actorUserId, 'reports.export') ||
    isGlobalAdminRole(actor.roleCode) ||
    actor.roleCode === 'PDG' ||
    actor.roleCode === 'COMPTABILITE'
  ) {
    return actor;
  }
  assertPermission(actorUserId, 'reports.create');
  return actor;
}

function canAccessSource(actorUserId: number, sourceId: string): boolean {
  const source = REPORT_SOURCES[sourceId];
  if (!source) return false;
  const actor = getActorContext(actorUserId);
  if (isGlobalAdminRole(actor.roleCode)) return true;
  if (actor.roleCode === 'PDG' || actor.roleCode === 'COMPTABILITE' || actor.roleCode === 'AUDIT_INTERNE') {
    return true;
  }
  if (userHasPermission(actorUserId, 'portmaster.full') && source.module === 'portmaster') {
    return true;
  }
  return source.permissions.some((p) => userHasPermission(actorUserId, p));
}

function resolveHotelScope(actorUserId: number, filters: ReportFilters): number[] | null {
  const actor = getActorContext(actorUserId);
  if (actor.allHotelsAccess) {
    if (filters.hotelId) return [filters.hotelId];
    return null;
  }
  if (filters.hotelId) {
    if (!actor.hotelIds.includes(filters.hotelId)) {
      throw new Error('Accès refusé à cet hôtel.');
    }
    return [filters.hotelId];
  }
  if (actor.hotelIds.length === 0) throw new Error('Aucun hôtel assigné.');
  return actor.hotelIds;
}

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function mapTemplate(row: Record<string, unknown>): ReportTemplate {
  return {
    id: row.id as number,
    uuid: row.uuid as string,
    name: row.name as string,
    description: row.description as string | null,
    dataSource: row.data_source as string,
    columns: parseJson<string[]>(row.columns_json as string, []),
    filters: parseJson<ReportFilters>(row.filters_json as string, {}),
    format: (row.format as ReportFormat) || 'xlsx',
    isShared: Boolean(row.is_shared),
    hotelId: row.hotel_id as number | null,
    createdBy: row.created_by as number,
    createdByName: row.created_by_name as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function listReportDataSources(actorUserId: number): ReportDataSourceMeta[] {
  assertReportAccess(actorUserId);
  return Object.values(REPORT_SOURCES)
    .filter((s) => canAccessSource(actorUserId, s.id))
    .map(({ permissions: _p, buildQuery: _q, dateColumn: _d, hotelColumn: _h, statutColumn: _s, ...meta }) => meta);
}

export function listReportTemplates(actorUserId: number): ReportTemplate[] {
  const actor = assertReportAccess(actorUserId);
  const db = getDatabase();
  const rows = db
    .prepare(
      `
    SELECT t.*, u.full_name AS created_by_name
    FROM report_templates t
    LEFT JOIN users u ON u.id = t.created_by
    WHERE t.deleted_at IS NULL
      AND (t.created_by = ? OR t.is_shared = 1)
    ORDER BY t.updated_at DESC
  `,
    )
    .all(actor.userId) as Record<string, unknown>[];
  return rows
    .filter((r) => canAccessSource(actorUserId, r.data_source as string))
    .map(mapTemplate);
}

export function getReportTemplate(actorUserId: number, id: number): ReportTemplate | null {
  assertReportAccess(actorUserId);
  const db = getDatabase();
  const row = db
    .prepare(
      `
    SELECT t.*, u.full_name AS created_by_name
    FROM report_templates t
    LEFT JOIN users u ON u.id = t.created_by
    WHERE t.id = ? AND t.deleted_at IS NULL
  `,
    )
    .get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  const template = mapTemplate(row);
  const actor = getActorContext(actorUserId);
  if (template.createdBy !== actor.userId && !template.isShared) {
    throw new Error('Accès refusé à ce modèle de rapport.');
  }
  if (!canAccessSource(actorUserId, template.dataSource)) {
    throw new Error('Source de données non autorisée.');
  }
  return template;
}

export function createReportTemplate(actorUserId: number, input: CreateReportTemplateInput): ReportTemplate {
  const actor = assertReportAccess(actorUserId);
  if (!REPORT_SOURCES[input.dataSource]) throw new Error('Source de données invalide.');
  if (!canAccessSource(actorUserId, input.dataSource)) {
    throw new Error('Vous n\'avez pas accès à cette source de données.');
  }
  const source = REPORT_SOURCES[input.dataSource];
  const validColumns = input.columns.filter((c) => source.columns.some((col) => col.key === c));
  if (validColumns.length === 0) {
    throw new Error('Sélectionnez au moins une colonne valide.');
  }

  const db = getDatabase();
  const result = db
    .prepare(
      `
    INSERT INTO report_templates (name, description, data_source, columns_json, filters_json, format, is_shared, hotel_id, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
    )
    .run(
      input.name.trim(),
      input.description?.trim() || null,
      input.dataSource,
      JSON.stringify(validColumns),
      JSON.stringify(input.filters ?? {}),
      input.format ?? 'xlsx',
      input.isShared ? 1 : 0,
      input.hotelId ?? null,
      actor.userId,
    );
  const created = getReportTemplate(actorUserId, Number(result.lastInsertRowid));
  if (!created) throw new Error('Erreur création du modèle.');
  return created;
}

export function updateReportTemplate(
  actorUserId: number,
  id: number,
  input: UpdateReportTemplateInput,
): ReportTemplate {
  const existing = getReportTemplate(actorUserId, id);
  if (!existing) throw new Error('Modèle introuvable.');
  const actor = getActorContext(actorUserId);
  if (existing.createdBy !== actor.userId && !isGlobalAdminRole(actor.roleCode)) {
    throw new Error('Seul le créateur ou un administrateur peut modifier ce modèle.');
  }

  const source = REPORT_SOURCES[existing.dataSource];
  const columns = input.columns
    ? input.columns.filter((c) => source.columns.some((col) => col.key === c))
    : existing.columns;
  if (columns.length === 0) throw new Error('Sélectionnez au moins une colonne valide.');

  const db = getDatabase();
  db.prepare(
    `
    UPDATE report_templates SET
      name = ?, description = ?, columns_json = ?, filters_json = ?,
      format = ?, is_shared = ?, hotel_id = ?, updated_at = datetime('now')
    WHERE id = ?
  `,
  ).run(
    input.name?.trim() ?? existing.name,
    input.description !== undefined ? (input.description?.trim() || null) : existing.description,
    JSON.stringify(columns),
    JSON.stringify(input.filters ?? existing.filters),
    input.format ?? existing.format,
    input.isShared !== undefined ? (input.isShared ? 1 : 0) : (existing.isShared ? 1 : 0),
    input.hotelId !== undefined ? input.hotelId : existing.hotelId,
    id,
  );
  return getReportTemplate(actorUserId, id)!;
}

export function deleteReportTemplate(actorUserId: number, id: number): void {
  const existing = getReportTemplate(actorUserId, id);
  if (!existing) throw new Error('Modèle introuvable.');
  const actor = getActorContext(actorUserId);
  if (existing.createdBy !== actor.userId && !isGlobalAdminRole(actor.roleCode)) {
    throw new Error('Seul le créateur ou un administrateur peut supprimer ce modèle.');
  }
  getDatabase()
    .prepare(`UPDATE report_templates SET deleted_at = datetime('now') WHERE id = ?`)
    .run(id);
}

function fetchReportData(
  actorUserId: number,
  dataSource: string,
  columns: string[],
  filters: ReportFilters,
  limit?: number,
): { rows: Record<string, unknown>[]; columnDefs: ReportColumnDef[]; totalRows: number } {
  if (!canAccessSource(actorUserId, dataSource)) {
    throw new Error('Source de données non autorisée.');
  }
  const source = REPORT_SOURCES[dataSource];
  const hotelIds = source.supportsHotelFilter ? resolveHotelScope(actorUserId, filters) : null;
  const { sql, params } = source.buildQuery(columns, filters, hotelIds);
  const db = getDatabase();

  const countSql = `SELECT COUNT(*) AS c FROM (${sql})`;
  const totalRows = (db.prepare(countSql).get(...params) as { c: number }).c;

  const limitedSql = limit ? `${sql} LIMIT ?` : sql;
  const limitedParams = limit ? [...params, limit] : params;
  const rows = db.prepare(limitedSql).all(...limitedParams) as Record<string, unknown>[];

  const columnDefs = source.columns.filter((c) => columns.includes(c.key));
  return { rows, columnDefs, totalRows };
}

export function previewReport(
  actorUserId: number,
  dataSource: string,
  columns: string[],
  filters: ReportFilters = {},
): ReportPreviewResult {
  assertReportAccess(actorUserId);
  const { rows, columnDefs, totalRows } = fetchReportData(
    actorUserId,
    dataSource,
    columns,
    filters,
    PREVIEW_LIMIT + 1,
  );
  const truncated = rows.length > PREVIEW_LIMIT;
  return {
    columns: columnDefs,
    rows: truncated ? rows.slice(0, PREVIEW_LIMIT) : rows,
    totalRows,
    truncated,
  };
}

async function loadExcelJS() {
  const mod = require('exceljs') as { default?: typeof import('exceljs') } & typeof import('exceljs');
  return ('default' in mod && mod.default ? mod.default : mod) as typeof import('exceljs');
}

export async function exportReportTemplate(
  actorUserId: number,
  templateId: number,
): Promise<ReportExportResult> {
  assertReportAccess(actorUserId);
  const template = getReportTemplate(actorUserId, templateId);
  if (!template) throw new Error('Modèle introuvable.');

  const { rows, columnDefs, totalRows } = fetchReportData(
    actorUserId,
    template.dataSource,
    template.columns,
    template.filters,
    EXPORT_LIMIT,
  );

  const ExcelJS = await loadExcelJS();
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet('Rapport');
  sheet.columns = columnDefs.map((c) => ({ header: c.label, key: c.key, width: c.width ?? 16 }));
  for (const row of rows) {
    sheet.addRow(row);
  }

  const buffer = Buffer.from(await wb.xlsx.writeBuffer());
  const safeName = template.name.replace(/[^\w\-àâäéèêëïîôùûüç\s]/gi, '').trim().replace(/\s+/g, '_');
  const { canceled, filePath } = await Electron.dialog.showSaveDialog({
    defaultPath: `rapport_${safeName || 'export'}.xlsx`,
    filters: [{ name: 'Excel', extensions: ['xlsx'] }],
  });
  if (canceled || !filePath) {
    return { ok: false, message: 'Export annulé.' };
  }
  writeFileSync(filePath, buffer);

  getDatabase()
    .prepare(
      `
    INSERT INTO report_runs (template_id, run_by, row_count, file_path, status)
    VALUES (?, ?, ?, ?, 'success')
  `,
    )
    .run(templateId, actorUserId, rows.length, filePath);

  return {
    ok: true,
    filePath,
    rowCount: rows.length,
    message: totalRows > EXPORT_LIMIT ? `Export limité à ${EXPORT_LIMIT} lignes sur ${totalRows}.` : undefined,
  };
}

export async function exportAdHocReport(
  actorUserId: number,
  dataSource: string,
  columns: string[],
  filters: ReportFilters = {},
  name = 'rapport',
): Promise<ReportExportResult> {
  assertReportAccess(actorUserId);
  const { rows, columnDefs, totalRows } = fetchReportData(
    actorUserId,
    dataSource,
    columns,
    filters,
    EXPORT_LIMIT,
  );

  const ExcelJS = await loadExcelJS();
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet('Rapport');
  sheet.columns = columnDefs.map((c) => ({ header: c.label, key: c.key, width: c.width ?? 16 }));
  for (const row of rows) {
    sheet.addRow(row);
  }

  const buffer = Buffer.from(await wb.xlsx.writeBuffer());
  const safeName = name.replace(/[^\w\-àâäéèêëïîôùûüç\s]/gi, '').trim().replace(/\s+/g, '_');
  const { canceled, filePath } = await Electron.dialog.showSaveDialog({
    defaultPath: `${safeName || 'rapport'}.xlsx`,
    filters: [{ name: 'Excel', extensions: ['xlsx'] }],
  });
  if (canceled || !filePath) {
    return { ok: false, message: 'Export annulé.' };
  }
  writeFileSync(filePath, buffer);
  return {
    ok: true,
    filePath,
    rowCount: rows.length,
    message: totalRows > EXPORT_LIMIT ? `Export limité à ${EXPORT_LIMIT} lignes sur ${totalRows}.` : undefined,
  };
}

export function listReportRuns(actorUserId: number, limit = 20): ReportRunHistory[] {
  assertReportAccess(actorUserId);
  const actor = getActorContext(actorUserId);
  const db = getDatabase();
  const rows = db
    .prepare(
      `
    SELECT r.id, r.template_id, t.name AS template_name, u.full_name AS run_by_name,
           r.row_count, r.file_path, r.status, r.executed_at
    FROM report_runs r
    INNER JOIN report_templates t ON t.id = r.template_id
    LEFT JOIN users u ON u.id = r.run_by
    WHERE r.run_by = ? OR t.is_shared = 1 OR t.created_by = ?
    ORDER BY r.executed_at DESC
    LIMIT ?
  `,
    )
    .all(actor.userId, actor.userId, limit) as Record<string, unknown>[];

  return rows.map((r) => ({
    id: r.id as number,
    templateId: r.template_id as number,
    templateName: r.template_name as string,
    runByName: r.run_by_name as string | null,
    rowCount: r.row_count as number,
    filePath: r.file_path as string | null,
    status: r.status as string,
    executedAt: r.executed_at as string,
  }));
}
