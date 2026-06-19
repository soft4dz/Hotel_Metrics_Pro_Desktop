import { getDatabase } from '../../database/sqlite';
import type { ReportColumnDef, ReportFilters } from '../../../src/shared/types/reports';
import { getActorContext } from '../actorContext';
import { assertReportAccess, resolveHotelScope } from './reports-access';

export interface KpiReportDef {
  id: string;
  label: string;
  description: string;
  category: string;
  icon: string;
  columns: ReportColumnDef[];
  permissions: string[];
}

export const KPI_REPORTS: KpiReportDef[] = [
  {
    id: 'kpi_ca_par_hotel', label: 'CA par hôtel', category: 'Finance',
    description: 'Chiffre d\'affaires total par hôtel sur la période',
    icon: 'bar-chart', permissions: ['recettes.saisie', 'recettes.validate', 'reports.export'],
    columns: [
      { key: 'hotel', label: 'Hôtel', width: 28 }, { key: 'nb_lignes', label: 'Nb lignes', width: 10 },
      { key: 'ca_total', label: 'CA total (DZD)', width: 16 }, { key: 'nuitees', label: 'Nuitées', width: 10 },
      { key: 'couverts', label: 'Couverts', width: 10 },
    ],
  },
  {
    id: 'kpi_ca_par_rubrique', label: 'CA par rubrique', category: 'Finance',
    description: 'Ventilation du CA par rubrique d\'activité',
    icon: 'pie-chart', permissions: ['recettes.saisie', 'recettes.validate', 'reports.export'],
    columns: [
      { key: 'rubrique', label: 'Rubrique', width: 24 }, { key: 'ca_total', label: 'CA total (DZD)', width: 16 },
      { key: 'part_pct', label: 'Part %', width: 10 },
    ],
  },
  {
    id: 'kpi_objectifs_realise', label: 'Objectifs vs réalisé', category: 'Finance',
    description: 'Taux de réalisation des objectifs mensuels par hôtel',
    icon: 'target', permissions: ['recettes.saisie', 'recettes.validate', 'reports.export'],
    columns: [
      { key: 'hotel', label: 'Hôtel', width: 22 }, { key: 'periode', label: 'Période', width: 12 },
      { key: 'objectif', label: 'Objectif', width: 14 }, { key: 'realise', label: 'Réalisé', width: 14 },
      { key: 'ecart', label: 'Écart', width: 12 }, { key: 'taux_pct', label: 'Taux %', width: 10 },
    ],
  },
  {
    id: 'kpi_creances_clients', label: 'Top créances clients', category: 'Finance',
    description: 'Factures impayées classées par reste dû',
    icon: 'alert-circle', permissions: ['reports.export'],
    columns: [
      { key: 'client', label: 'Client', width: 28 }, { key: 'hotel', label: 'Hôtel', width: 20 },
      { key: 'nb_factures', label: 'Nb factures', width: 10 }, { key: 'total_ttc', label: 'Total TTC', width: 14 },
      { key: 'total_paye', label: 'Payé', width: 14 }, { key: 'reste_du', label: 'Reste dû', width: 14 },
    ],
  },
  {
    id: 'kpi_encaissements_mode', label: 'Encaissements par mode', category: 'Finance',
    description: 'Répartition des encaissements par mode de paiement',
    icon: 'wallet', permissions: ['recettes.saisie', 'recettes.validate', 'reports.export'],
    columns: [
      { key: 'mode', label: 'Mode', width: 16 }, { key: 'nb', label: 'Nb opérations', width: 12 },
      { key: 'montant_total', label: 'Montant total', width: 16 },
    ],
  },
  {
    id: 'kpi_reservations_canal', label: 'Réservations par canal', category: 'Exploitation',
    description: 'Performance des canaux de distribution (Booking, direct, etc.)',
    icon: 'globe', permissions: ['reports.export'],
    columns: [
      { key: 'source', label: 'Canal', width: 16 }, { key: 'nb_reservations', label: 'Réservations', width: 12 },
      { key: 'nuitees', label: 'Nuitées', width: 10 }, { key: 'ca_total', label: 'CA total', width: 14 },
      { key: 'panier_moyen', label: 'Panier moyen', width: 14 },
    ],
  },
  {
    id: 'kpi_occupation_chambres', label: 'État parc chambres', category: 'Exploitation',
    description: 'Répartition des chambres par statut par hôtel',
    icon: 'bed', permissions: ['reports.export'],
    columns: [
      { key: 'hotel', label: 'Hôtel', width: 22 }, { key: 'total', label: 'Total', width: 8 },
      { key: 'libres', label: 'Libres', width: 8 }, { key: 'occupees', label: 'Occupées', width: 8 },
      { key: 'hors_service', label: 'H.S.', width: 8 }, { key: 'taux_occ_pct', label: 'Taux occ. %', width: 12 },
    ],
  },
  {
    id: 'kpi_pipeline_commercial', label: 'Pipeline commercial', category: 'Commercial',
    description: 'Opportunités par statut avec montants pondérés',
    icon: 'trending-up', permissions: ['reports.export'],
    columns: [
      { key: 'statut', label: 'Statut', width: 16 }, { key: 'nb', label: 'Nb opportunités', width: 12 },
      { key: 'montant_estime', label: 'Montant estimé', width: 16 }, { key: 'montant_pondere', label: 'Montant pondéré', width: 16 },
    ],
  },
  {
    id: 'kpi_qualite_reclamations', label: 'Synthèse réclamations', category: 'Contrôle',
    description: 'Réclamations par catégorie et statut avec satisfaction moyenne',
    icon: 'star', permissions: ['reports.export'],
    columns: [
      { key: 'categorie', label: 'Catégorie', width: 16 }, { key: 'statut', label: 'Statut', width: 12 },
      { key: 'nb', label: 'Nombre', width: 8 }, { key: 'satisfaction_moy', label: 'Satisfaction moy.', width: 14 },
    ],
  },
  {
    id: 'kpi_couts_maintenance', label: 'Coûts maintenance', category: 'Exploitation',
    description: 'Coûts interventions par hôtel et catégorie d\'équipement',
    icon: 'wrench', permissions: ['reports.export'],
    columns: [
      { key: 'hotel', label: 'Hôtel', width: 22 }, { key: 'categorie', label: 'Catégorie', width: 14 },
      { key: 'nb_interventions', label: 'Interventions', width: 12 },
      { key: 'cout_pieces', label: 'Coût pièces', width: 14 }, { key: 'cout_mo', label: 'Coût MO', width: 14 },
      { key: 'cout_total', label: 'Coût total', width: 14 },
    ],
  },
  {
    id: 'kpi_stock_alertes', label: 'Stocks sous seuil', category: 'Exploitation',
    description: 'Produits en alerte ou rupture par hôtel',
    icon: 'package', permissions: ['reports.export'],
    columns: [
      { key: 'hotel', label: 'Hôtel', width: 22 }, { key: 'code', label: 'Code', width: 12 },
      { key: 'designation', label: 'Produit', width: 28 }, { key: 'quantite', label: 'Stock', width: 10 },
      { key: 'seuil', label: 'Seuil', width: 10 }, { key: 'manquant', label: 'Manquant', width: 10 },
    ],
  },
  {
    id: 'kpi_effectif_rh', label: 'Effectif par hôtel', category: 'Ressources humaines',
    description: 'Répartition des employés actifs par unité et département',
    icon: 'users', permissions: ['rh.manage', 'rh.team', 'reports.export'],
    columns: [
      { key: 'hotel', label: 'Hôtel', width: 22 }, { key: 'departement', label: 'Département', width: 20 },
      { key: 'effectif', label: 'Effectif', width: 10 },
    ],
  },
  {
    id: 'kpi_masse_salariale', label: 'Masse salariale', category: 'Ressources humaines',
    description: 'Totaux paie par période (brut, net, charges)',
    icon: 'banknote', permissions: ['rh.manage', 'reports.export'],
    columns: [
      { key: 'periode', label: 'Période', width: 10 }, { key: 'nb_bulletins', label: 'Bulletins', width: 10 },
      { key: 'brut_total', label: 'Brut total', width: 14 }, { key: 'net_total', label: 'Net total', width: 14 },
      { key: 'charges_total', label: 'Charges', width: 14 },
    ],
  },
  {
    id: 'kpi_parking_plage', label: 'Recettes annexes', category: 'Exploitation',
    description: 'CA parking et plage/piscine par hôtel',
    icon: 'car', permissions: ['reports.export'],
    columns: [
      { key: 'hotel', label: 'Hôtel', width: 22 }, { key: 'module', label: 'Module', width: 14 },
      { key: 'nb_operations', label: 'Opérations', width: 12 }, { key: 'ca_total', label: 'CA total', width: 14 },
    ],
  },
];

import { userHasPermission } from '../permissions.service';

function canAccessKpi(actorUserId: number, kpi: KpiReportDef): boolean {
  const actor = getActorContext(actorUserId);
  if (actor.roleCode === 'SUPERADMIN' || actor.roleCode === 'ADMIN_DEC' || actor.roleCode === 'PDG') return true;
  return kpi.permissions.some((p) => userHasPermission(actorUserId, p));
}

export function listKpiReports(actorUserId: number): KpiReportDef[] {
  assertReportAccess(actorUserId);
  return KPI_REPORTS.filter((k) => canAccessKpi(actorUserId, k));
}

export function runKpiReport(
  actorUserId: number,
  kpiId: string,
  filters: ReportFilters = {},
): { columns: ReportColumnDef[]; rows: Record<string, unknown>[] } {
  assertReportAccess(actorUserId);
  const kpi = KPI_REPORTS.find((k) => k.id === kpiId);
  if (!kpi || !canAccessKpi(actorUserId, kpi)) throw new Error('Rapport KPI non autorisé.');

  const db = getDatabase();
  const hotelIds = resolveHotelScope(actorUserId, filters);
  const hotelCond = hotelIds ? `AND rj.hotel_id IN (${hotelIds.map(() => '?').join(',')})` : '';
  const hotelCondE = hotelIds ? `AND e.hotel_id IN (${hotelIds.map(() => '?').join(',')})` : '';
  const hotelCondF = hotelIds ? `AND f.hotel_id IN (${hotelIds.map(() => '?').join(',')})` : '';
  const hotelCondR = hotelIds ? `AND r.hotel_id IN (${hotelIds.map(() => '?').join(',')})` : '';
  const hotelCondCh = hotelIds ? `AND ch.hotel_id IN (${hotelIds.map(() => '?').join(',')})` : '';
  const hotelCondO = hotelIds ? `AND o.hotel_id IN (${hotelIds.map(() => '?').join(',')})` : '';
  const hotelCondRec = hotelIds ? `AND rec.hotel_id IN (${hotelIds.map(() => '?').join(',')})` : '';
  const hotelCondI = hotelIds ? `AND i.hotel_id IN (${hotelIds.map(() => '?').join(',')})` : '';
  const hotelCondSn = hotelIds ? `AND sn.hotel_id IN (${hotelIds.map(() => '?').join(',')})` : '';
  const hp = hotelIds ?? [];

  const dateCondRj = [
    filters.dateFrom ? 'AND rj.date_journal >= ?' : '',
    filters.dateTo ? 'AND rj.date_journal <= ?' : '',
  ].filter(Boolean).join(' ');
  const dateParamsRj = [filters.dateFrom, filters.dateTo].filter(Boolean);
  const dateCondE = [
    filters.dateFrom ? 'AND e.date_encaissement >= ?' : '',
    filters.dateTo ? 'AND e.date_encaissement <= ?' : '',
  ].filter(Boolean).join(' ');
  const dateParamsE = [filters.dateFrom, filters.dateTo].filter(Boolean);

  let rows: Record<string, unknown>[] = [];

  switch (kpiId) {
    case 'kpi_ca_par_hotel':
      rows = db.prepare(`
        SELECT h.name AS hotel, COUNT(*) AS nb_lignes, ROUND(SUM(rj.montant), 2) AS ca_total,
               SUM(rj.nuitees) AS nuitees, SUM(rj.couverts) AS couverts
        FROM recettes_journalieres rj INNER JOIN hotels h ON h.id = rj.hotel_id
        WHERE rj.deleted_at IS NULL ${hotelCond} ${dateCondRj}
        GROUP BY h.id ORDER BY ca_total DESC
      `).all(...hp, ...dateParamsRj) as Record<string, unknown>[];
      break;
    case 'kpi_ca_par_rubrique': {
      const total = (db.prepare(`
        SELECT COALESCE(SUM(rj.montant), 0) AS t FROM recettes_journalieres rj
        WHERE rj.deleted_at IS NULL ${hotelCond} ${dateCondRj}
      `).get(...hp, ...dateParamsRj) as { t: number }).t;
      rows = db.prepare(`
        SELECT rub.label AS rubrique, ROUND(SUM(rj.montant), 2) AS ca_total
        FROM recettes_journalieres rj INNER JOIN rubriques rub ON rub.id = rj.rubrique_id
        WHERE rj.deleted_at IS NULL ${hotelCond} ${dateCondRj}
        GROUP BY rub.id ORDER BY ca_total DESC
      `).all(...hp, ...dateParamsRj) as Record<string, unknown>[];
      rows = rows.map((r) => ({
        ...r,
        part_pct: total > 0 ? Math.round(((r.ca_total as number) / total) * 1000) / 10 : 0,
      }));
      break;
    }
    case 'kpi_objectifs_realise': {
      const annee = filters.annee ?? new Date().getFullYear();
      const mois = filters.mois;
      const moisCond = mois ? 'AND o.mois = ?' : '';
      const moisParams = mois ? [mois] : [];
      rows = db.prepare(`
        SELECT h.name AS hotel,
               printf('%02d/%d', o.mois, o.annee) AS periode,
               ROUND(o.objectif_hebergement + o.objectif_restauration + o.objectif_boissons + o.objectif_autres, 2) AS objectif,
               ROUND(COALESCE(SUM(rj.montant), 0), 2) AS realise,
               ROUND(COALESCE(SUM(rj.montant), 0) - (o.objectif_hebergement + o.objectif_restauration + o.objectif_boissons + o.objectif_autres), 2) AS ecart,
               CASE WHEN (o.objectif_hebergement + o.objectif_restauration + o.objectif_boissons + o.objectif_autres) > 0
                 THEN ROUND(COALESCE(SUM(rj.montant), 0) * 100.0 / (o.objectif_hebergement + o.objectif_restauration + o.objectif_boissons + o.objectif_autres), 1)
                 ELSE 0 END AS taux_pct
        FROM objectifs o
        INNER JOIN hotels h ON h.id = o.hotel_id
        LEFT JOIN recettes_journalieres rj ON rj.hotel_id = o.hotel_id
          AND CAST(strftime('%m', rj.date_journal) AS INTEGER) = o.mois
          AND CAST(strftime('%Y', rj.date_journal) AS INTEGER) = o.annee
          AND rj.deleted_at IS NULL
        WHERE o.deleted_at IS NULL AND o.annee = ? ${moisCond}
        ${hotelIds ? `AND o.hotel_id IN (${hotelIds.map(() => '?').join(',')})` : ''}
        GROUP BY o.id ORDER BY o.annee DESC, o.mois DESC
      `).all(annee, ...moisParams, ...hp) as Record<string, unknown>[];
      break;
    }
    case 'kpi_creances_clients':
      rows = db.prepare(`
        SELECT f.client_nom AS client, h.name AS hotel, COUNT(*) AS nb_factures,
               ROUND(SUM(f.montant_ttc), 2) AS total_ttc, ROUND(SUM(f.montant_paye), 2) AS total_paye,
               ROUND(SUM(f.montant_ttc - f.montant_paye), 2) AS reste_du
        FROM factures f INNER JOIN hotels h ON h.id = f.hotel_id
        WHERE f.deleted_at IS NULL AND f.montant_ttc > f.montant_paye ${hotelCondF}
        GROUP BY f.client_nom, h.id HAVING reste_du > 0 ORDER BY reste_du DESC LIMIT 100
      `).all(...hp) as Record<string, unknown>[];
      break;
    case 'kpi_encaissements_mode':
      rows = db.prepare(`
        SELECT e.mode, COUNT(*) AS nb, ROUND(SUM(e.montant), 2) AS montant_total
        FROM encaissements e WHERE e.deleted_at IS NULL ${hotelCondE} ${dateCondE}
        GROUP BY e.mode ORDER BY montant_total DESC
      `).all(...hp, ...dateParamsE) as Record<string, unknown>[];
      break;
    case 'kpi_reservations_canal':
      rows = db.prepare(`
        SELECT r.source, COUNT(*) AS nb_reservations, SUM(r.nb_nuits) AS nuitees,
               ROUND(SUM(r.montant_total), 2) AS ca_total,
               ROUND(AVG(r.montant_total), 2) AS panier_moyen
        FROM reservations r WHERE r.deleted_at IS NULL ${hotelCondR}
        GROUP BY r.source ORDER BY ca_total DESC
      `).all(...hp) as Record<string, unknown>[];
      break;
    case 'kpi_occupation_chambres':
      rows = db.prepare(`
        SELECT h.name AS hotel, COUNT(*) AS total,
               SUM(CASE WHEN ch.statut = 'libre' THEN 1 ELSE 0 END) AS libres,
               SUM(CASE WHEN ch.statut = 'occupee' THEN 1 ELSE 0 END) AS occupees,
               SUM(CASE WHEN ch.statut = 'hors_service' THEN 1 ELSE 0 END) AS hors_service,
               ROUND(SUM(CASE WHEN ch.statut = 'occupee' THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0), 1) AS taux_occ_pct
        FROM chambres ch INNER JOIN hotels h ON h.id = ch.hotel_id
        WHERE ch.actif = 1 ${hotelCondCh}
        GROUP BY h.id ORDER BY h.name
      `).all(...hp) as Record<string, unknown>[];
      break;
    case 'kpi_pipeline_commercial':
      rows = db.prepare(`
        SELECT o.statut, COUNT(*) AS nb,
               ROUND(SUM(COALESCE(o.montant_estime, 0)), 2) AS montant_estime,
               ROUND(SUM(COALESCE(o.montant_estime, 0) * o.probabilite / 100.0), 2) AS montant_pondere
        FROM opportunites o WHERE 1=1 ${hotelCondO}
        GROUP BY o.statut ORDER BY montant_pondere DESC
      `).all(...hp) as Record<string, unknown>[];
      break;
    case 'kpi_qualite_reclamations':
      rows = db.prepare(`
        SELECT rec.categorie, rec.statut, COUNT(*) AS nb,
               ROUND(AVG(rec.satisfaction), 1) AS satisfaction_moy
        FROM reclamations rec WHERE 1=1 ${hotelCondRec}
        GROUP BY rec.categorie, rec.statut ORDER BY nb DESC
      `).all(...hp) as Record<string, unknown>[];
      break;
    case 'kpi_couts_maintenance':
      rows = db.prepare(`
        SELECT h.name AS hotel, COALESCE(eq.categorie, 'sans_equipement') AS categorie,
               COUNT(*) AS nb_interventions,
               ROUND(SUM(i.cout_pieces), 2) AS cout_pieces,
               ROUND(SUM(i.cout_main_oeuvre), 2) AS cout_mo,
               ROUND(SUM(i.cout_pieces + i.cout_main_oeuvre), 2) AS cout_total
        FROM interventions i
        INNER JOIN hotels h ON h.id = i.hotel_id
        LEFT JOIN equipements eq ON eq.id = i.equipement_id
        WHERE 1=1 ${hotelCondI}
        GROUP BY h.id, eq.categorie ORDER BY cout_total DESC
      `).all(...hp) as Record<string, unknown>[];
      break;
    case 'kpi_stock_alertes':
      rows = db.prepare(`
        SELECT h.name AS hotel, p.code, p.designation, sn.quantite,
               p.seuil_alerte AS seuil, MAX(0, p.seuil_alerte - sn.quantite) AS manquant
        FROM stock_niveaux sn
        INNER JOIN stock_produits p ON p.id = sn.produit_id
        INNER JOIN hotels h ON h.id = sn.hotel_id
        WHERE sn.quantite <= p.seuil_alerte AND p.is_active = 1 ${hotelCondSn}
        ORDER BY manquant DESC, h.name
      `).all(...hp) as Record<string, unknown>[];
      break;
    case 'kpi_effectif_rh': {
      const hotelFilter = hotelIds ? `AND e.hotel_id IN (${hotelIds.map(() => '?').join(',')})` : '';
      rows = db.prepare(`
        SELECT COALESCE(h.name, 'Non affecté') AS hotel, COALESCE(d.nom, '—') AS departement,
               COUNT(*) AS effectif
        FROM rh_employes e
        LEFT JOIN hotels h ON h.id = e.hotel_id
        LEFT JOIN rh_postes po ON po.id = e.poste_actuel_id
        LEFT JOIN rh_departements d ON d.id = po.departement_id
        WHERE e.deleted_at IS NULL AND e.statut_rh = 'actif' ${hotelFilter}
        GROUP BY h.id, d.id ORDER BY effectif DESC
      `).all(...hp) as Record<string, unknown>[];
      break;
    }
    case 'kpi_masse_salariale': {
      const periodeCond = filters.periode ? 'AND b.periode = ?' : '';
      const periodeParams = filters.periode ? [filters.periode] : [];
      rows = db.prepare(`
        SELECT b.periode, COUNT(*) AS nb_bulletins,
               ROUND(SUM(b.brut), 2) AS brut_total, ROUND(SUM(b.net), 2) AS net_total,
               ROUND(SUM(b.charges), 2) AS charges_total
        FROM rh_bulletins b WHERE 1=1 ${periodeCond}
        GROUP BY b.periode ORDER BY b.periode DESC
      `).all(...periodeParams) as Record<string, unknown>[];
      break;
    }
    case 'kpi_parking_plage': {
      const parking = db.prepare(`
        SELECT h.name AS hotel, 'Parking' AS module, COUNT(*) AS nb_operations, ROUND(SUM(pt.montant), 2) AS ca_total
        FROM parking_tickets pt INNER JOIN hotels h ON h.id = pt.hotel_id
        WHERE pt.statut = 'termine' ${hotelCond.replace('rj.hotel_id', 'pt.hotel_id')}
        GROUP BY h.id
      `).all(...hp) as Record<string, unknown>[];
      const plage = db.prepare(`
        SELECT h.name AS hotel, 'Plage/Piscine' AS module, COUNT(*) AS nb_operations, ROUND(SUM(pe.montant), 2) AS ca_total
        FROM plage_entrees pe INNER JOIN hotels h ON h.id = pe.hotel_id
        WHERE 1=1 ${hotelCond.replace('rj.hotel_id', 'pe.hotel_id')}
        GROUP BY h.id
      `).all(...hp) as Record<string, unknown>[];
      rows = [...parking, ...plage];
      break;
    }
    default:
      throw new Error('Rapport KPI inconnu.');
  }

  return { columns: kpi.columns, rows };
}
