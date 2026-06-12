import { getDatabase } from '../database/sqlite';
import {
  assertDashboardView,
  getActorContext,
  actorHasAllHotels,
  isGlobalAdminRole,
  resolveHotelId,
} from './actorContext';
import { userHasPermission } from './permissions.service';

const VALID_CA = `('valide', 'validated')`;
const MOIS_LABELS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

export interface DashboardFilters {
  dateDebut?: string;
  dateFin?: string;
  annee: number;
  mois?: number;
  hotelId?: number;
  rubriqueId?: number;
}

export interface DashboardKpis {
  caJour: number;
  caMois: number;
  caAnnuel: number;
  objectifMois: number;
  realiseMois: number;
  tauxRealisation: number;
  totalEncaissements: number;
  tauxEncaissement: number;
  ecartObjectif: number;
  saisiesRealisees: number;
  saisiesManquantes: number;
  periodeLabel: string;
  variationCaPct: number;
}

export interface HotelRubriqueRow {
  code: string;
  label: string;
  realise: number;
  pctTotal: number;
}

export interface HotelAnalyseRow {
  hotelId: number;
  hotelName: string;
  realise: number;
  objectif: number;
  tauxRealisation: number;
  encaissements: number;
  tauxEncaissement: number;
  ecartObjectif: number;
  statut: 'bon' | 'moyen' | 'critique';
  rubriques: HotelRubriqueRow[];
}

export interface RubriqueAnalyseRow {
  groupe: string;
  realise: number;
  pctTotal: number;
  objectif: number;
  tauxObjectif: number;
}

export interface ChartPoint {
  label: string;
  value: number;
  value2?: number;
}

export interface ObjectifRealisePoint {
  label: string;
  objectif: number;
  realise: number;
}

export interface FrequentationDto {
  chambres: number;
  nuitees: number;
  couverts: number;
}

export interface DashboardAlerte {
  id: string;
  type: string;
  hotelName: string | null;
  description: string;
  niveau: 'information' | 'avertissement' | 'critique';
  date: string;
  resolu: boolean;
}

export interface SaisieManquanteRow {
  hotelId: number;
  hotelName: string;
  dateAttendue: string;
}

export interface DerniereDeclarationRow {
  hotelName: string;
  dateJournal: string;
  montant: number;
  statut: string;
}

export interface DashboardAuditRow {
  id: number;
  userEmail: string | null;
  action: string;
  page: string | null;
  description: string;
  createdAt: string;
}

export interface CaJournalierPoint {
  date: string;
  label: string;
  montant: number;
}

export interface DashboardDto {
  kpis: DashboardKpis;
  parHotel: HotelAnalyseRow[];
  parRubrique: RubriqueAnalyseRow[];
  evolutionJournaliere: CaJournalierPoint[];
  evolutionMensuelle: ChartPoint[];
  caParHotel: ChartPoint[];
  repartitionRubrique: ChartPoint[];
  objectifVsRealise: ObjectifRealisePoint[];
  tauxEncaissementHotel: ChartPoint[];
  comparaisonAnnee: ChartPoint[];
  realisationVsObjectifMensuel: ObjectifRealisePoint[];
  frequentation: FrequentationDto;
  alertes: DashboardAlerte[];
  saisiesManquantes: SaisieManquanteRow[];
  dernieresDeclarations: DerniereDeclarationRow[];
  auditRecent: DashboardAuditRow[];
  canViewAudit: boolean;
  canExport: boolean;
  scopeHotelOnly: boolean;
}

function isConsolidatedRole(actor: ReturnType<typeof getActorContext>): boolean {
  return actorHasAllHotels(actor);
}

function hotelStatut(taux: number): HotelAnalyseRow['statut'] {
  if (taux >= 90) return 'bon';
  if (taux >= 70) return 'moyen';
  return 'critique';
}

interface Scope {
  dateSql: string;
  dateParams: unknown[];
  hotelId: number | undefined;
  hotelIds: number[] | undefined;
  rubriqueId: number | undefined;
  annee: number;
  mois: number | undefined;
  dateDebut?: string;
  dateFin?: string;
}

function buildScope(actor: ReturnType<typeof getActorContext>, filters: DashboardFilters): Scope {
  let hotelId = filters.hotelId;
  let hotelIds: number[] | undefined;

  if (!isConsolidatedRole(actor)) {
    if (hotelId) {
      hotelId = resolveHotelId(actor, hotelId);
    } else if (actor.hotelIds.length === 1) {
      hotelId = actor.hotelIds[0];
    } else if (actor.hotelIds.length > 1) {
      hotelIds = [...actor.hotelIds];
    }
  }

  const dateParams: unknown[] = [];
  let dateSql = '';
  if (filters.dateDebut && filters.dateFin) {
    dateSql = ' AND rj.date_journal >= ? AND rj.date_journal <= ?';
    dateParams.push(filters.dateDebut, filters.dateFin);
  } else if (filters.mois) {
    dateSql = ' AND rj.date_journal LIKE ?';
    dateParams.push(`${filters.annee}-${String(filters.mois).padStart(2, '0')}%`);
  } else {
    dateSql = ' AND rj.date_journal LIKE ?';
    dateParams.push(`${filters.annee}-%`);
  }

  return {
    dateSql,
    dateParams,
    hotelId,
    hotelIds,
    rubriqueId: filters.rubriqueId,
    annee: filters.annee,
    mois: filters.mois,
    dateDebut: filters.dateDebut,
    dateFin: filters.dateFin,
  };
}

function hotelFilterSql(scope: Scope, alias = 'rj'): { sql: string; params: unknown[] } {
  if (scope.hotelId) return { sql: ` AND ${alias}.hotel_id = ?`, params: [scope.hotelId] };
  if (scope.hotelIds?.length) {
    return {
      sql: ` AND ${alias}.hotel_id IN (${scope.hotelIds.map(() => '?').join(',')})`,
      params: [...scope.hotelIds],
    };
  }
  return { sql: '', params: [] };
}

function rubriqueFilterSql(scope: Scope): { sql: string; params: unknown[] } {
  if (scope.rubriqueId) return { sql: ' AND rj.rubrique_id = ?', params: [scope.rubriqueId] };
  return { sql: '', params: [] };
}

function sumCa(scope: Scope, extraSql = '', extraParams: unknown[] = []): number {
  const hf = hotelFilterSql(scope);
  const rf = rubriqueFilterSql(scope);
  const row = getDatabase()
    .prepare(
      `
    SELECT COALESCE(SUM(rj.montant), 0) AS t
    FROM recettes_journalieres rj
    WHERE rj.deleted_at IS NULL AND rj.statut IN ${VALID_CA}
    ${scope.dateSql}${hf.sql}${rf.sql}${extraSql}
  `,
    )
    .get(...scope.dateParams, ...hf.params, ...rf.params, ...extraParams) as { t: number };
  return row.t;
}

function sumEncaissements(scope: Scope, extraSql = '', extraParams: unknown[] = []): number {
  const hf = hotelFilterSql(scope);
  const rf = rubriqueFilterSql(scope);
  const row = getDatabase()
    .prepare(
      `
    SELECT COALESCE(SUM(daily_enc), 0) AS t FROM (
      SELECT rj.hotel_id, rj.date_journal, MAX(COALESCE(rj.encaissement_ht, 0)) AS daily_enc
      FROM recettes_journalieres rj
      WHERE rj.deleted_at IS NULL AND rj.statut IN ${VALID_CA}
      ${scope.dateSql}${hf.sql}${rf.sql}${extraSql}
      GROUP BY rj.hotel_id, rj.date_journal
    )
  `,
    )
    .get(...scope.dateParams, ...hf.params, ...rf.params, ...extraParams) as { t: number };
  return row.t;
}

function sumObjectif(scope: Scope): number {
  const db = getDatabase();
  const mois = scope.mois ?? new Date().getMonth() + 1;
  if (scope.hotelId) {
    const row = db
      .prepare(
        `
      SELECT COALESCE(SUM(
        objectif_hebergement + objectif_restauration + objectif_boissons + objectif_autres
      ), 0) AS t
      FROM objectifs o
      WHERE o.deleted_at IS NULL AND o.annee = ? AND o.mois = ? AND o.hotel_id = ?
    `,
      )
      .get(scope.annee, mois, scope.hotelId) as { t: number };
    return row.t;
  }
  const row = db
    .prepare(
      `
    SELECT COALESCE(SUM(
      objectif_hebergement + objectif_restauration + objectif_boissons + objectif_autres
    ), 0) AS t
    FROM objectifs o
    WHERE o.deleted_at IS NULL AND o.annee = ? AND o.mois = ?
  `,
    )
    .get(scope.annee, mois) as { t: number };
  return row.t;
}

function countDistinctSaisies(scope: Scope, validatedOnly: boolean): number {
  const hf = hotelFilterSql(scope);
  const statut = validatedOnly ? `AND rj.statut IN ${VALID_CA}` : '';
  const row = getDatabase()
    .prepare(
      `
    SELECT COUNT(DISTINCT rj.hotel_id || '|' || rj.date_journal) AS c
    FROM recettes_journalieres rj
    WHERE rj.deleted_at IS NULL ${statut}
    ${scope.dateSql}${hf.sql}
  `,
    )
    .get(...scope.dateParams, ...hf.params) as { c: number };
  return row.c;
}

function buildAlertes(input: {
  variationPct: number;
  tauxRealisation: number;
  tauxEncaissement: number;
  hotelsSansSaisie: string[];
  saisiesManquantes: number;
  realise: number;
  encaissements: number;
}): DashboardAlerte[] {
  const today = new Date().toISOString().slice(0, 10);
  const out: DashboardAlerte[] = [];
  if (input.variationPct <= -20) {
    out.push({
      id: 'ca-baisse',
      type: 'Baisse du CA',
      hotelName: null,
      description: `Baisse de ${Math.abs(input.variationPct).toFixed(1)} % vs période précédente.`,
      niveau: 'critique',
      date: today,
      resolu: false,
    });
  }
  if (input.tauxRealisation > 0 && input.tauxRealisation < 80) {
    out.push({
      id: 'objectif',
      type: 'Objectif non atteint',
      hotelName: null,
      description: `Taux de réalisation : ${input.tauxRealisation.toFixed(1)} %.`,
      niveau: input.tauxRealisation < 50 ? 'critique' : 'avertissement',
      date: today,
      resolu: false,
    });
  }
  for (const h of input.hotelsSansSaisie) {
    out.push({
      id: `sans-${h}`,
      type: 'Hôtel sans saisie',
      hotelName: h,
      description: 'Aucune déclaration sur la période.',
      niveau: 'avertissement',
      date: today,
      resolu: false,
    });
  }
  if (input.realise > 0 && Math.abs(input.realise - input.encaissements) / input.realise > 0.25) {
    out.push({
      id: 'ecart-enc',
      type: 'Écart CA / encaissement',
      hotelName: null,
      description: 'Écart anormal entre CA déclaré et encaissements.',
      niveau: 'avertissement',
      date: today,
      resolu: false,
    });
  }
  if (input.tauxEncaissement > 0 && input.tauxEncaissement < 60) {
    out.push({
      id: 'enc-faible',
      type: "Taux d'encaissement faible",
      hotelName: null,
      description: `${input.tauxEncaissement.toFixed(1)} %`,
      niveau: 'avertissement',
      date: today,
      resolu: false,
    });
  }
  if (input.saisiesManquantes > 0) {
    out.push({
      id: 'manquantes',
      type: 'Saisies manquantes',
      hotelName: null,
      description: `${input.saisiesManquantes} journée(s)-unité estimée(s) sans déclaration.`,
      niveau: 'information',
      date: today,
      resolu: false,
    });
  }
  const order = { critique: 0, avertissement: 1, information: 2 };
  return out.sort((a, b) => order[a.niveau] - order[b.niveau]);
}

export function getDashboard(actorUserId: number, filters: DashboardFilters): DashboardDto {
  const actor = getActorContext(actorUserId);
  assertDashboardView(actor);

  const db = getDatabase();
  const scope = buildScope(actor, filters);
  const today = new Date().toISOString().slice(0, 10);
  const moisRef = scope.mois ?? new Date().getMonth() + 1;

  const realiseMois = sumCa(scope);
  const caJour = sumCa(scope, ' AND rj.date_journal = ?', [today]);

  const annuelScope: Scope = {
    ...scope,
    dateSql: ' AND rj.date_journal LIKE ?',
    dateParams: [`${filters.annee}-%`],
    mois: undefined,
  };
  const caAnnuel = sumCa(annuelScope);

  const objectifMois = sumObjectif(scope);
  const totalEncaissements = sumEncaissements(scope);
  const tauxRealisation =
    objectifMois > 0 ? Math.round((realiseMois / objectifMois) * 1000) / 10 : 0;
  const tauxEncaissement =
    realiseMois > 0 ? Math.round((totalEncaissements / realiseMois) * 1000) / 10 : 0;

  const prevMois = moisRef === 1 ? 12 : moisRef - 1;
  const prevAnnee = moisRef === 1 ? filters.annee - 1 : filters.annee;
  const prevScope: Scope = {
    ...scope,
    dateSql: ' AND rj.date_journal LIKE ?',
    dateParams: [`${prevAnnee}-${String(prevMois).padStart(2, '0')}%`],
    annee: prevAnnee,
    mois: prevMois,
  };
  const caPrev = sumCa(prevScope);
  const variationCaPct =
    caPrev > 0 ? Math.round(((realiseMois - caPrev) / caPrev) * 1000) / 10 : 0;

  const hotelCount = db
    .prepare(
      `SELECT COUNT(*) AS c FROM hotels h WHERE h.is_active = 1 AND h.deleted_at IS NULL${
        scope.hotelId ? ' AND h.id = ?' : ''
      }`,
    )
    .get(...(scope.hotelId ? [scope.hotelId] : [])) as { c: number };

  const saisiesRealisees = countDistinctSaisies(scope, true);
  const daysInPeriod = scope.dateDebut && scope.dateFin
    ? Math.max(1, Math.ceil((new Date(scope.dateFin).getTime() - new Date(scope.dateDebut).getTime()) / 86400000) + 1)
    : scope.mois
      ? new Date(filters.annee, moisRef, 0).getDate()
      : 365;
  const saisiesManquantes = Math.max(0, daysInPeriod * hotelCount.c - saisiesRealisees);

  const periodeLabel =
    scope.dateDebut && scope.dateFin
      ? `${scope.dateDebut} → ${scope.dateFin}`
      : scope.mois
        ? `${MOIS_LABELS[moisRef - 1]} ${filters.annee}`
        : `Année ${filters.annee}`;

  const kpis: DashboardKpis = {
    caJour,
    caMois: realiseMois,
    caAnnuel,
    objectifMois,
    realiseMois,
    tauxRealisation,
    totalEncaissements,
    tauxEncaissement,
    ecartObjectif: realiseMois - objectifMois,
    saisiesRealisees,
    saisiesManquantes,
    periodeLabel,
    variationCaPct,
  };

  const hotels = db
    .prepare(
      `
    SELECT h.id, h.name FROM hotels h
    WHERE h.is_active = 1 AND h.deleted_at IS NULL
    ${scope.hotelId ? 'AND h.id = ?' : ''}
    ORDER BY h.name
  `,
    )
    .all(...(scope.hotelId ? [scope.hotelId] : [])) as Array<{ id: number; name: string }>;

  const parHotel: HotelAnalyseRow[] = [];
  const hotelsSansSaisie: string[] = [];

  for (const h of hotels) {
    const hScope: Scope = { ...scope, hotelId: h.id };
    const realise = sumCa(hScope);
    const encaissements = sumEncaissements(hScope);
    const objectif = sumObjectif({ ...hScope, mois: moisRef });
    const tauxR = objectif > 0 ? Math.round((realise / objectif) * 1000) / 10 : 0;
    const tauxE = realise > 0 ? Math.round((encaissements / realise) * 1000) / 10 : 0;

    if (realise === 0) hotelsSansSaisie.push(h.name);

    parHotel.push({
      hotelId: h.id,
      hotelName: h.name,
      realise,
      objectif,
      tauxRealisation: tauxR,
      encaissements,
      tauxEncaissement: tauxE,
      ecartObjectif: realise - objectif,
      statut: hotelStatut(tauxR),
      rubriques: [],
    });
  }

  // ── Rubrique breakdown per hotel (one bulk query) ───────────────────
  const rubParHotelRows = db
    .prepare(
      `
    SELECT
      rj.hotel_id,
      rub.code  AS rub_code,
      rub.label AS rub_label,
      COALESCE(SUM(rj.montant), 0) AS realise
    FROM recettes_journalieres rj
    INNER JOIN rubriques rub ON rub.id = rj.rubrique_id
    WHERE rj.deleted_at IS NULL AND rj.statut IN ${VALID_CA}
    ${scope.dateSql}${scope.hotelId ? ' AND rj.hotel_id = ?' : ''}
    GROUP BY rj.hotel_id, rub.code
    ORDER BY rj.hotel_id, realise DESC
  `,
    )
    .all(
      ...scope.dateParams,
      ...(scope.hotelId ? [scope.hotelId] : []),
    ) as Array<{ hotel_id: number; rub_code: string; rub_label: string; realise: number }>;

  const rubByHotel = new Map<number, Array<{ code: string; label: string; realise: number }>>();
  for (const row of rubParHotelRows) {
    if (!rubByHotel.has(row.hotel_id)) rubByHotel.set(row.hotel_id, []);
    rubByHotel.get(row.hotel_id)!.push({ code: row.rub_code, label: row.rub_label, realise: row.realise });
  }

  for (const h of parHotel) {
    const rows = rubByHotel.get(h.hotelId) ?? [];
    const total = h.realise || 1;
    h.rubriques = rows
      .filter((r) => r.realise > 0)
      .map((r) => ({
        code:     r.code,
        label:    r.label,
        realise:  r.realise,
        pctTotal: Math.round((r.realise / total) * 1000) / 10,
      }));
  }

  const hf = hotelFilterSql(scope);
  const rf = rubriqueFilterSql(scope);

  const rubriqueRows = db
    .prepare(
      `
    SELECT
      CASE
        WHEN rub.code = 'HEBERGEMENT' THEN 'Hébergement'
        WHEN rub.code = 'RESTAURATION' THEN 'Restauration'
        WHEN rub.code = 'BOISSONS' THEN 'Boissons'
        WHEN rub.code = 'LOCATIONS' THEN 'Location espaces'
        WHEN rub.code = 'PORT' THEN 'Port / Marina'
        ELSE 'Autres prestations'
      END AS groupe,
      COALESCE(SUM(rj.montant), 0) AS realise
    FROM recettes_journalieres rj
    INNER JOIN rubriques rub ON rub.id = rj.rubrique_id
    WHERE rj.deleted_at IS NULL AND rj.statut IN ${VALID_CA}
    ${scope.dateSql}${hf.sql}${rf.sql}
    GROUP BY groupe
    ORDER BY realise DESC
  `,
    )
    .all(...scope.dateParams, ...hf.params, ...rf.params) as Array<{ groupe: string; realise: number }>;

  const totalRub = rubriqueRows.reduce((s, r) => s + r.realise, 0) || 1;
  const objCat = db
    .prepare(
      `
    SELECT
      COALESCE(SUM(objectif_hebergement), 0) AS hebergement,
      COALESCE(SUM(objectif_restauration), 0) AS restauration,
      COALESCE(SUM(objectif_boissons), 0) AS boissons,
      COALESCE(SUM(objectif_autres), 0) AS autres
    FROM objectifs o
    WHERE o.deleted_at IS NULL AND o.annee = ? AND o.mois = ?
    ${scope.hotelId ? 'AND o.hotel_id = ?' : ''}
  `,
    )
    .get(scope.annee, moisRef, ...(scope.hotelId ? [scope.hotelId] : [])) as {
      hebergement: number;
      restauration: number;
      boissons: number;
      autres: number;
    };

  const objectifMap: Record<string, number> = {
    Hébergement: objCat.hebergement,
    Restauration: objCat.restauration,
    Boissons: objCat.boissons,
    'Location espaces': 0,
    'Port / Marina': 0,
    'Autres prestations': objCat.autres,
  };

  const parRubrique: RubriqueAnalyseRow[] = rubriqueRows.map((r) => ({
    groupe: r.groupe,
    realise: r.realise,
    pctTotal: Math.round((r.realise / totalRub) * 1000) / 10,
    objectif: objectifMap[r.groupe] ?? 0,
    tauxObjectif:
      (objectifMap[r.groupe] ?? 0) > 0
        ? Math.round((r.realise / (objectifMap[r.groupe] ?? 1)) * 1000) / 10
        : 0,
  }));

  const dailyRows = db
    .prepare(
      `
    SELECT rj.date_journal AS dateJournal, COALESCE(SUM(rj.montant), 0) AS montant
    FROM recettes_journalieres rj
    WHERE rj.deleted_at IS NULL AND rj.statut IN ${VALID_CA}
    ${scope.dateSql}${hf.sql}${rf.sql}
    GROUP BY rj.date_journal ORDER BY rj.date_journal
  `,
    )
    .all(...scope.dateParams, ...hf.params, ...rf.params) as Array<{
      dateJournal: string;
      montant: number;
    }>;

  const evolutionJournaliere: CaJournalierPoint[] = dailyRows.map((d) => ({
    date: d.dateJournal,
    label: d.dateJournal.slice(8, 10),
    montant: d.montant,
  }));

  const evolutionMensuelle: ChartPoint[] = [];
  for (let m = 1; m <= 12; m++) {
    const mScope: Scope = {
      ...scope,
      dateSql: ' AND rj.date_journal LIKE ?',
      dateParams: [`${filters.annee}-${String(m).padStart(2, '0')}%`],
      mois: m,
    };
    evolutionMensuelle.push({
      label: MOIS_LABELS[m - 1]!.slice(0, 3),
      value: sumCa(mScope),
    });
  }

  const comparaisonAnnee = evolutionMensuelle.map((pt, i) => {
    const m = i + 1;
    const mScope: Scope = {
      ...scope,
      dateSql: ' AND rj.date_journal LIKE ?',
      dateParams: [`${filters.annee - 1}-${String(m).padStart(2, '0')}%`],
      annee: filters.annee - 1,
      mois: m,
    };
    return { label: pt.label, value: pt.value, value2: sumCa(mScope) };
  });

  const realisationVsObjectifMensuel: ObjectifRealisePoint[] = evolutionMensuelle.map((pt, i) => {
    const m = i + 1;
    const objScope = { ...scope, mois: m };
    return {
      label: pt.label,
      objectif: sumObjectif(objScope),
      realise: pt.value,
    };
  });

  const freqRow = db
    .prepare(
      `
    SELECT
      COALESCE(SUM(daily_ch), 0) AS chambres,
      COALESCE(SUM(daily_nu), 0) AS nuitees,
      COALESCE(SUM(daily_co), 0) AS couverts
    FROM (
      SELECT rj.hotel_id, rj.date_journal,
        MAX(COALESCE(rj.chambres, 0)) AS daily_ch,
        MAX(COALESCE(rj.nuitees, 0)) AS daily_nu,
        MAX(COALESCE(rj.couverts, 0)) AS daily_co
      FROM recettes_journalieres rj
      WHERE rj.deleted_at IS NULL AND rj.statut IN ${VALID_CA}
      ${scope.dateSql}${hf.sql}${rf.sql}
      GROUP BY rj.hotel_id, rj.date_journal
    )
  `,
    )
    .get(...scope.dateParams, ...hf.params, ...rf.params) as {
      chambres: number;
      nuitees: number;
      couverts: number;
    };

  const alertes = buildAlertes({
    variationPct: variationCaPct,
    tauxRealisation,
    tauxEncaissement,
    hotelsSansSaisie,
    saisiesManquantes,
    realise: realiseMois,
    encaissements: totalEncaissements,
  });

  const saisiesManquantesList: SaisieManquanteRow[] = hotelsSansSaisie.map((name) => {
    const h = hotels.find((x) => x.name === name)!;
    return {
      hotelId: h.id,
      hotelName: name,
      dateAttendue: scope.dateFin ?? today,
    };
  });

  const dernieresDeclarations = db
    .prepare(
      `
    SELECT h.name AS hotelName, rj.date_journal AS dateJournal,
           COALESCE(SUM(rj.montant), 0) AS montant, MAX(rj.statut) AS statut
    FROM recettes_journalieres rj
    INNER JOIN hotels h ON h.id = rj.hotel_id
    WHERE rj.deleted_at IS NULL ${scope.dateSql}${hf.sql}${rf.sql}
    GROUP BY h.id, rj.date_journal
    ORDER BY rj.date_journal DESC
    LIMIT 15
  `,
    )
    .all(...scope.dateParams, ...hf.params, ...rf.params) as DerniereDeclarationRow[];

  const canViewAudit =
    userHasPermission(actorUserId, 'audit.read') || isGlobalAdminRole(actor.roleCode);
  const canExport =
    userHasPermission(actorUserId, 'reports.export') || isConsolidatedRole(actor);

  let auditRecent: DashboardAuditRow[] = [];
  if (canViewAudit) {
    auditRecent = db
      .prepare(
        `
      SELECT id, user_email AS userEmail, action, page, description, created_at AS createdAt
      FROM audit_log ORDER BY created_at DESC LIMIT 10
    `,
      )
      .all() as DashboardAuditRow[];
  }

  return {
    kpis,
    parHotel,
    parRubrique,
    evolutionJournaliere,
    evolutionMensuelle,
    caParHotel: parHotel.map((h) => ({ label: h.hotelName, value: h.realise })),
    repartitionRubrique: parRubrique.map((r) => ({ label: r.groupe, value: r.realise })),
    objectifVsRealise: parHotel.map((h) => ({
      label: h.hotelName,
      objectif: h.objectif,
      realise: h.realise,
    })),
    tauxEncaissementHotel: parHotel.map((h) => ({
      label: h.hotelName,
      value: h.tauxEncaissement,
    })),
    comparaisonAnnee,
    realisationVsObjectifMensuel,
    frequentation: {
      chambres: freqRow.chambres,
      nuitees: freqRow.nuitees,
      couverts: freqRow.couverts,
    },
    alertes,
    saisiesManquantes: saisiesManquantesList,
    dernieresDeclarations,
    auditRecent,
    canViewAudit,
    canExport,
    scopeHotelOnly: !isConsolidatedRole(actor),
  };
}
