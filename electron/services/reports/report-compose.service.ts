import { getDatabase } from '../../database/sqlite';

import type { ReportColumnDef, ReportComposition, ReportFilters } from '../../../src/shared/types/reports';

import { normalizeComposition } from '../../../src/shared/utils/reportComposition';

import { assertReportAccess, resolveHotelScope } from './reports-access';

import { userHasPermission } from '../permissions.service';

import { getActorContext, isGlobalAdminRole } from '../actorContext';

import {

  DIMENSION_MAP,

  MEASURE_MAP,

  SEMANTIC_DIMENSIONS,

  SEMANTIC_FACTS,

  SEMANTIC_MEASURES,

} from './report-semantic.model';



export interface SemanticFieldMeta {

  id: string;

  label: string;

  description: string;

  category: string;

  type: 'dimension' | 'measure';

  format?: string;

  compatibleFacts: string[];

}



const FALLBACK_JOIN_DIMS = ['dim_hotel', 'dim_hotel_code', 'dim_mois', 'dim_annee', 'dim_date_jour'] as const;



function canAccessFact(actorUserId: number, factId: string): boolean {

  const fact = SEMANTIC_FACTS[factId];

  if (!fact) return false;

  const actor = getActorContext(actorUserId);

  if (isGlobalAdminRole(actor.roleCode) || actor.roleCode === 'PDG') return true;

  return fact.permissions.some((p) => userHasPermission(actorUserId, p));

}



function dimensionsForFact(factId: string, allDimensionIds: string[]): string[] {

  return allDimensionIds.filter((dimId) => DIMENSION_MAP[dimId]?.facts.includes(factId));

}



function sharedJoinDimensions(factIds: string[], allDimensionIds: string[]): string[] {

  if (factIds.length === 0) return [];

  return allDimensionIds.filter((dimId) => {

    const dim = DIMENSION_MAP[dimId];

    return dim != null && factIds.every((fid) => dim.facts.includes(fid));

  });

}



function resolveJoinKeys(factA: string, factB: string, allDimensionIds: string[]): string[] {

  const shared = sharedJoinDimensions([factA, factB], allDimensionIds);

  if (shared.length > 0) return shared;

  for (const dimId of FALLBACK_JOIN_DIMS) {

    const dim = DIMENSION_MAP[dimId];

    if (dim?.facts.includes(factA) && dim.facts.includes(factB)) return [dimId];

  }

  return [];

}



function primaryFactForMeasure(mId: string, actorUserId: number): string | null {

  const m = MEASURE_MAP[mId];

  if (!m) return null;

  return m.facts.find((f) => canAccessFact(actorUserId, f)) ?? null;

}



export function listSemanticCatalog(actorUserId: number) {

  assertReportAccess(actorUserId);

  const dimensions = SEMANTIC_DIMENSIONS.map((d) => ({

    id: d.id, label: d.label, description: d.description, category: d.category,

    type: 'dimension' as const, facts: d.facts.filter((f) => canAccessFact(actorUserId, f)),

  })).filter((d) => d.facts.length > 0);



  const measures = SEMANTIC_MEASURES.map((m) => ({

    id: m.id, label: m.label, description: m.description, category: m.category,

    type: 'measure' as const, format: m.format,

    facts: m.facts.filter((f) => canAccessFact(actorUserId, f)),

  })).filter((m) => m.facts.length > 0);



  const facts = Object.values(SEMANTIC_FACTS)

    .filter((f) => canAccessFact(actorUserId, f.id))

    .map((f) => ({ id: f.id, label: f.label, description: f.description, category: f.category }));



  return { dimensions, measures, facts };

}



export function getCompatibleFields(

  actorUserId: number,

  selectedDimensions: string[],

  selectedMeasures: string[],

): { dimensions: SemanticFieldMeta[]; measures: SemanticFieldMeta[]; commonFacts: string[] } {

  assertReportAccess(actorUserId);

  const selectedDimSet = new Set(selectedDimensions);



  const dimensions = SEMANTIC_DIMENSIONS

    .filter((d) => !selectedDimSet.has(d.id))

    .filter((d) => d.facts.some((f) => canAccessFact(actorUserId, f)))

    .map((d) => ({

      id: d.id, label: d.label, description: d.description, category: d.category,

      type: 'dimension' as const,

      compatibleFacts: d.facts.filter((f) => canAccessFact(actorUserId, f)),

    }));



  const measures = SEMANTIC_MEASURES

    .filter((m) => !selectedMeasures.includes(m.id))

    .filter((m) => m.facts.some((f) => canAccessFact(actorUserId, f)))

    .map((m) => ({

      id: m.id, label: m.label, description: m.description, category: m.category,

      type: 'measure' as const, format: m.format,

      compatibleFacts: m.facts.filter((f) => canAccessFact(actorUserId, f)),

    }));



  const involvedFacts = new Set<string>();

  for (const d of selectedDimensions) {

    DIMENSION_MAP[d]?.facts.forEach((f) => { if (canAccessFact(actorUserId, f)) involvedFacts.add(f); });

  }

  for (const m of selectedMeasures) {

    const f = primaryFactForMeasure(m, actorUserId);

    if (f) involvedFacts.add(f);

  }



  return { dimensions, measures, commonFacts: [...involvedFacts] };

}



function collectJoins(factId: string, dimensionIds: string[]): string[] {

  const joins = new Set<string>();

  for (const dimId of dimensionIds) {

    const dim = DIMENSION_MAP[dimId];

    const factJoins = dim?.joins[factId] ?? [];

    for (const j of factJoins) joins.add(j);

  }

  return [...joins];

}



function buildFactSubquery(

  factId: string,

  allDimensionIds: string[],

  measureIds: string[],

  filters: ReportFilters,

  hotelIds: number[] | null,

): { sql: string; params: unknown[] } {

  const fact = SEMANTIC_FACTS[factId];

  if (!fact) throw new Error(`Fait inconnu: ${factId}`);



  const factDims = dimensionsForFact(factId, allDimensionIds);

  const selectParts: string[] = [];

  const groupParts: string[] = [];



  for (const dimId of factDims) {

    const dim = DIMENSION_MAP[dimId];

    const sel = dim?.selectSql[factId];

    const grp = dim?.groupSql[factId];

    if (!sel || !grp) continue;

    selectParts.push(sel);

    groupParts.push(grp);

  }



  if (selectParts.length === 0 && measureIds.length > 0) {

    selectParts.push('1 AS _grain');

    groupParts.push('1');

  }



  for (const mId of measureIds) {

    const m = MEASURE_MAP[mId];

    const agg = m?.aggSql[factId];

    if (!agg) throw new Error(`Mesure « ${m?.label ?? mId} » indisponible sur ${fact.label}.`);

    selectParts.push(agg);

  }



  const joins = collectJoins(factId, factDims);

  const where = [...fact.baseWhere];

  const params: unknown[] = [];



  if (fact.hotelColumn && hotelIds) {

    where.push(`${fact.hotelColumn} IN (${hotelIds.map(() => '?').join(',')})`);

    params.push(...hotelIds);

  } else if (fact.hotelColumn && filters.hotelId) {

    where.push(`${fact.hotelColumn} = ?`);

    params.push(filters.hotelId);

  }



  if (fact.dateColumn) {

    if (filters.dateFrom) { where.push(`${fact.dateColumn} >= ?`); params.push(filters.dateFrom); }

    if (filters.dateTo) { where.push(`${fact.dateColumn} <= ?`); params.push(filters.dateTo); }

  }



  const groupClause = groupParts.length ? `GROUP BY ${groupParts.join(', ')}` : '';



  const sql = `

    SELECT ${selectParts.join(', ')}

    FROM ${fact.baseFrom} ${fact.baseAlias}

    ${joins.join('\n    ')}

    WHERE ${where.join(' AND ')}

    ${groupClause}

  `;



  return { sql, params };

}



function pickDimensionColumn(dimId: string, factIds: string[], allDimensionIds: string[]): string {

  for (let i = 0; i < factIds.length; i++) {

    if (dimensionsForFact(factIds[i], allDimensionIds).includes(dimId)) {

      return `sq${i}.${dimId}`;

    }

  }

  return `'—' AS ${dimId}`;

}



function buildMultiFactQuery(

  allDimensionIds: string[],

  measuresByFact: Map<string, string[]>,

  filters: ReportFilters,

  hotelIds: number[] | null,

): { sql: string; params: unknown[] } {

  const factIds = [...measuresByFact.keys()];

  const subqueries = factIds.map((fid) =>

    buildFactSubquery(fid, allDimensionIds, measuresByFact.get(fid)!, filters, hotelIds),

  );



  if (subqueries.length === 1) {

    const orderDims = dimensionsForFact(factIds[0], allDimensionIds);

    const order = orderDims.length ? ` ORDER BY ${orderDims.join(', ')}` : '';

    return { sql: `${subqueries[0].sql}${order}`, params: subqueries[0].params };

  }



  const base = subqueries[0];

  let joinSql = `(${base.sql}) sq0`;

  let allParams = [...base.params];



  const selectCols: string[] = [

    ...allDimensionIds.map((d) => pickDimensionColumn(d, factIds, allDimensionIds)),

    ...measuresByFact.get(factIds[0])!.map((m) => `sq0.${m}`),

  ];



  for (let i = 1; i < subqueries.length; i++) {

    const sq = subqueries[i];

    const alias = `sq${i}`;

    const joinKeys = resolveJoinKeys(factIds[0], factIds[i], allDimensionIds);

    const on = joinKeys.length > 0

      ? joinKeys.map((d) => `sq0.${d} = ${alias}.${d}`).join(' AND ')

      : '1=1';

    joinSql += ` LEFT JOIN (${sq.sql}) ${alias} ON ${on}`;

    allParams = [...allParams, ...sq.params];

    selectCols.push(...measuresByFact.get(factIds[i])!.map((m) => `${alias}.${m}`));

  }



  const orderDims = dimensionsForFact(factIds[0], allDimensionIds);

  const order = orderDims.length

    ? ` ORDER BY ${orderDims.map((d) => `sq0.${d}`).join(', ')}`

    : '';



  const sql = `SELECT ${selectCols.join(', ')} FROM ${joinSql}${order}`;

  return { sql, params: allParams };

}



export function buildComposedQuery(

  actorUserId: number,

  composition: ReportComposition,

  filters: ReportFilters = {},

): { sql: string; params: unknown[]; columns: ReportColumnDef[] } {

  assertReportAccess(actorUserId);



  const { measures, allDimensions } = normalizeComposition(composition);

  if (allDimensions.length === 0) throw new Error('Ajoutez au moins une dimension (lignes ou colonnes).');

  if (measures.length === 0) throw new Error('Ajoutez au moins une mesure.');



  for (const dimId of allDimensions) {

    if (!DIMENSION_MAP[dimId]) throw new Error(`Dimension inconnue : ${dimId}`);

  }

  for (const mId of measures) {

    if (!MEASURE_MAP[mId]) throw new Error(`Mesure inconnue : ${mId}`);

    if (!primaryFactForMeasure(mId, actorUserId)) {

      throw new Error(`Mesure « ${MEASURE_MAP[mId]!.label} » : accès refusé ou indisponible.`);

    }

  }



  const hotelIds = resolveHotelScope(actorUserId, filters);



  const measuresByFact = new Map<string, string[]>();

  for (const mId of measures) {

    const factId = primaryFactForMeasure(mId, actorUserId)!;

    if (!measuresByFact.has(factId)) measuresByFact.set(factId, []);

    measuresByFact.get(factId)!.push(mId);

  }



  const sortedFacts = [...measuresByFact.entries()].sort(
    (a, b) => dimensionsForFact(b[0], allDimensions).length - dimensionsForFact(a[0], allDimensions).length,
  );
  const orderedMeasuresByFact = new Map(sortedFacts);

  const { sql, params } = buildMultiFactQuery(allDimensions, orderedMeasuresByFact, filters, hotelIds);



  const columnDefs: ReportColumnDef[] = [

    ...allDimensions.map((id) => ({ key: id, label: DIMENSION_MAP[id]!.label, width: 22 })),

    ...measures.map((id) => ({ key: id, label: MEASURE_MAP[id]!.label, width: 14 })),

  ];



  return { sql, params, columns: columnDefs };

}



export function executeComposedReport(

  actorUserId: number,

  composition: ReportComposition,

  filters: ReportFilters = {},

  limit?: number,

) {

  const { sql, params, columns } = buildComposedQuery(actorUserId, composition, filters);

  const db = getDatabase();

  const totalRows = (db.prepare(`SELECT COUNT(*) AS c FROM (${sql})`).get(...params) as { c: number }).c;

  const limitedSql = limit ? `${sql} LIMIT ?` : sql;

  const rows = db.prepare(limitedSql).all(...(limit ? [...params, limit] : params)) as Record<string, unknown>[];

  return { rows, columns, totalRows };

}



export function validateComposition(composition: ReportComposition): string | null {

  const { rows, columns, measures, allDimensions, layout } = normalizeComposition(composition);

  if (allDimensions.length === 0) return 'Sélectionnez au moins une dimension (lignes ou colonnes).';

  if (measures.length === 0) return 'Sélectionnez au moins une mesure.';

  if (layout === 'crosstab' && (rows.length === 0 || columns.length === 0)) {

    return 'Tableau croisé : placez des dimensions en lignes ET en colonnes.';

  }

  for (const dimId of allDimensions) {

    if (!DIMENSION_MAP[dimId]) return `Dimension inconnue : ${dimId}`;

  }

  for (const mId of measures) {

    if (!MEASURE_MAP[mId]) return `Mesure inconnue : ${mId}`;

  }

  return null;

}



export function describeComposition(composition: ReportComposition): string {

  const { rows, columns, measures, layout } = normalizeComposition(composition);

  const mesLabels = measures.map((id) => MEASURE_MAP[id]?.label ?? id);

  const layoutLabel = layout === 'crosstab' ? 'Croisé' : layout === 'chart' ? 'Graphique' : 'Liste';

  const rowPart = rows.length ? `Lignes : ${rows.map((id) => DIMENSION_MAP[id]?.label ?? id).join(' → ')}` : '';

  const colPart = columns.length ? `Colonnes : ${columns.map((id) => DIMENSION_MAP[id]?.label ?? id).join(' × ')}` : '';

  return `[${layoutLabel}] ${[rowPart, colPart].filter(Boolean).join(' | ')} | Mesures : ${mesLabels.join(', ')}`;

}


