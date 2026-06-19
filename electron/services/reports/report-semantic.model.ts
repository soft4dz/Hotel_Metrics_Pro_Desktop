/** Modèle sémantique — dimensions & mesures combinables */

export interface SemanticFact {
  id: string;
  label: string;
  description: string;
  category: string;
  permissions: string[];
  baseFrom: string;
  baseAlias: string;
  baseWhere: string[];
  hotelColumn?: string;
  dateColumn?: string;
}

export interface SemanticDimension {
  id: string;
  label: string;
  description: string;
  category: string;
  /** Faits sur lesquels cette dimension est disponible */
  facts: string[];
  /** Expression SELECT (avec alias = id) par fait */
  selectSql: Partial<Record<string, string>>;
  /** GROUP BY par fait */
  groupSql: Partial<Record<string, string>>;
  /** JOINs additionnels par fait (en plus des joins de base du fait) */
  joins: Partial<Record<string, string[]>>;
}

export interface SemanticMeasure {
  id: string;
  label: string;
  description: string;
  category: string;
  format: 'currency' | 'number' | 'percent' | 'integer';
  facts: string[];
  aggSql: Partial<Record<string, string>>;
}

export const SEMANTIC_FACTS: Record<string, SemanticFact> = {
  fact_recettes: {
    id: 'fact_recettes', label: 'Recettes journalières', category: 'Finance',
    description: 'CA, nuitées, couverts saisis quotidiennement',
    permissions: ['recettes.saisie', 'recettes.validate', 'reports.export'],
    baseFrom: 'recettes_journalieres', baseAlias: 'rj',
    baseWhere: ['rj.deleted_at IS NULL'],
    hotelColumn: 'rj.hotel_id', dateColumn: 'rj.date_journal',
  },
  fact_encaissements: {
    id: 'fact_encaissements', label: 'Encaissements', category: 'Finance',
    description: 'Encaissements trésorerie',
    permissions: ['recettes.saisie', 'recettes.validate', 'reports.export'],
    baseFrom: 'encaissements', baseAlias: 'e',
    baseWhere: ['e.deleted_at IS NULL'],
    hotelColumn: 'e.hotel_id', dateColumn: 'e.date_encaissement',
  },
  fact_factures: {
    id: 'fact_factures', label: 'Factures clients', category: 'Finance',
    description: 'Facturation HT/TTC et créances',
    permissions: ['reports.export'],
    baseFrom: 'factures', baseAlias: 'f',
    baseWhere: ['f.deleted_at IS NULL'],
    hotelColumn: 'f.hotel_id', dateColumn: 'f.date_emission',
  },
  fact_reservations: {
    id: 'fact_reservations', label: 'Réservations', category: 'Exploitation',
    description: 'Hébergement et canaux de distribution',
    permissions: ['reports.export'],
    baseFrom: 'reservations', baseAlias: 'res',
    baseWhere: ['res.deleted_at IS NULL'],
    hotelColumn: 'res.hotel_id', dateColumn: 'res.date_arrivee',
  },
  fact_reclamations: {
    id: 'fact_reclamations', label: 'Réclamations', category: 'Contrôle',
    description: 'Qualité et satisfaction client',
    permissions: ['reports.export'],
    baseFrom: 'reclamations', baseAlias: 'rec',
    baseWhere: ['1=1'],
    hotelColumn: 'rec.hotel_id', dateColumn: 'rec.date_reception',
  },
};

const HOTEL_JOINS: Partial<Record<string, string[]>> = {
  fact_recettes: ['INNER JOIN hotels h ON h.id = rj.hotel_id'],
  fact_encaissements: ['INNER JOIN hotels h ON h.id = e.hotel_id'],
  fact_factures: ['INNER JOIN hotels h ON h.id = f.hotel_id'],
  fact_reservations: ['INNER JOIN hotels h ON h.id = res.hotel_id'],
  fact_reclamations: ['LEFT JOIN hotels h ON h.id = rec.hotel_id'],
};

export const SEMANTIC_DIMENSIONS: SemanticDimension[] = [
  {
    id: 'dim_hotel', label: 'Unité hôtelière', category: 'Organisation',
    description: 'Nom de l\'hôtel / unité',
    facts: ['fact_recettes', 'fact_encaissements', 'fact_factures', 'fact_reservations', 'fact_reclamations'],
    selectSql: {
      fact_recettes: 'h.name AS dim_hotel', fact_encaissements: 'h.name AS dim_hotel',
      fact_factures: 'h.name AS dim_hotel', fact_reservations: 'h.name AS dim_hotel',
      fact_reclamations: 'COALESCE(h.name, \'—\') AS dim_hotel',
    },
    groupSql: {
      fact_recettes: 'h.id', fact_encaissements: 'h.id', fact_factures: 'h.id',
      fact_reservations: 'h.id', fact_reclamations: 'h.id',
    },
    joins: HOTEL_JOINS,
  },
  {
    id: 'dim_hotel_code', label: 'Code unité', category: 'Organisation',
    description: 'Code court de l\'hôtel',
    facts: ['fact_recettes', 'fact_encaissements', 'fact_factures', 'fact_reservations', 'fact_reclamations'],
    selectSql: {
      fact_recettes: 'h.code AS dim_hotel_code', fact_encaissements: 'h.code AS dim_hotel_code',
      fact_factures: 'h.code AS dim_hotel_code', fact_reservations: 'h.code AS dim_hotel_code',
      fact_reclamations: 'h.code AS dim_hotel_code',
    },
    groupSql: {
      fact_recettes: 'h.code', fact_encaissements: 'h.code', fact_factures: 'h.code',
      fact_reservations: 'h.code', fact_reclamations: 'h.code',
    },
    joins: HOTEL_JOINS,
  },
  {
    id: 'dim_utilisateur', label: 'Utilisateur', category: 'Organisation',
    description: 'Utilisateur ayant saisi ou créé la donnée',
    facts: ['fact_recettes', 'fact_encaissements', 'fact_factures', 'fact_reservations', 'fact_reclamations'],
    selectSql: {
      fact_recettes: 'COALESCE(u.full_name, \'—\') AS dim_utilisateur',
      fact_encaissements: 'COALESCE(u.full_name, \'—\') AS dim_utilisateur',
      fact_factures: 'COALESCE(u.full_name, \'—\') AS dim_utilisateur',
      fact_reservations: 'COALESCE(u.full_name, \'—\') AS dim_utilisateur',
      fact_reclamations: 'COALESCE(u.full_name, \'—\') AS dim_utilisateur',
    },
    groupSql: {
      fact_recettes: 'u.id', fact_encaissements: 'u.id', fact_factures: 'u.id', fact_reservations: 'u.id',
      fact_reclamations: 'u.id',
    },
    joins: {
      fact_recettes: [...(HOTEL_JOINS.fact_recettes ?? []), 'LEFT JOIN users u ON u.id = rj.created_by'],
      fact_encaissements: [...(HOTEL_JOINS.fact_encaissements ?? []), 'LEFT JOIN users u ON u.id = e.created_by'],
      fact_factures: [...(HOTEL_JOINS.fact_factures ?? []), 'LEFT JOIN users u ON u.id = f.created_by'],
      fact_reservations: [...(HOTEL_JOINS.fact_reservations ?? []), 'LEFT JOIN users u ON u.id = res.created_by'],
      fact_reclamations: [...(HOTEL_JOINS.fact_reclamations ?? []), 'LEFT JOIN users u ON u.id = rec.assigne_a'],
    },
  },
  {
    id: 'dim_role', label: 'Rôle utilisateur', category: 'Organisation',
    description: 'Rôle du utilisateur saisie',
    facts: ['fact_recettes', 'fact_encaissements', 'fact_factures'],
    selectSql: {
      fact_recettes: 'COALESCE(rol.label, \'—\') AS dim_role',
      fact_encaissements: 'COALESCE(rol.label, \'—\') AS dim_role',
      fact_factures: 'COALESCE(rol.label, \'—\') AS dim_role',
    },
    groupSql: {
      fact_recettes: 'rol.id', fact_encaissements: 'rol.id', fact_factures: 'rol.id',
    },
    joins: {
      fact_recettes: [...(HOTEL_JOINS.fact_recettes ?? []), 'LEFT JOIN users u ON u.id = rj.created_by', 'LEFT JOIN roles rol ON rol.id = u.role_id'],
      fact_encaissements: [...(HOTEL_JOINS.fact_encaissements ?? []), 'LEFT JOIN users u ON u.id = e.created_by', 'LEFT JOIN roles rol ON rol.id = u.role_id'],
      fact_factures: [...(HOTEL_JOINS.fact_factures ?? []), 'LEFT JOIN users u ON u.id = f.created_by', 'LEFT JOIN roles rol ON rol.id = u.role_id'],
    },
  },
  {
    id: 'dim_rubrique', label: 'Rubrique', category: 'Finance',
    description: 'Rubrique de recette (hébergement, restauration…)',
    facts: ['fact_recettes'],
    selectSql: { fact_recettes: 'rub.label AS dim_rubrique' },
    groupSql: { fact_recettes: 'rub.id' },
    joins: { fact_recettes: [...(HOTEL_JOINS.fact_recettes ?? []), 'INNER JOIN rubriques rub ON rub.id = rj.rubrique_id'] },
  },
  {
    id: 'dim_date_jour', label: 'Date (jour)', category: 'Temps',
    description: 'Date au format journalier',
    facts: ['fact_recettes', 'fact_encaissements', 'fact_factures', 'fact_reservations', 'fact_reclamations'],
    selectSql: {
      fact_recettes: 'rj.date_journal AS dim_date_jour',
      fact_encaissements: 'e.date_encaissement AS dim_date_jour',
      fact_factures: 'f.date_emission AS dim_date_jour',
      fact_reservations: 'res.date_arrivee AS dim_date_jour',
      fact_reclamations: 'rec.date_reception AS dim_date_jour',
    },
    groupSql: {
      fact_recettes: 'rj.date_journal', fact_encaissements: 'e.date_encaissement',
      fact_factures: 'f.date_emission', fact_reservations: 'res.date_arrivee',
      fact_reclamations: 'rec.date_reception',
    },
    joins: HOTEL_JOINS,
  },
  {
    id: 'dim_mois', label: 'Mois', category: 'Temps',
    description: 'Mois (AAAA-MM)',
    facts: ['fact_recettes', 'fact_encaissements', 'fact_factures', 'fact_reservations', 'fact_reclamations'],
    selectSql: {
      fact_recettes: "strftime('%Y-%m', rj.date_journal) AS dim_mois",
      fact_encaissements: "strftime('%Y-%m', e.date_encaissement) AS dim_mois",
      fact_factures: "strftime('%Y-%m', f.date_emission) AS dim_mois",
      fact_reservations: "strftime('%Y-%m', res.date_arrivee) AS dim_mois",
      fact_reclamations: "strftime('%Y-%m', rec.date_reception) AS dim_mois",
    },
    groupSql: {
      fact_recettes: "strftime('%Y-%m', rj.date_journal)",
      fact_encaissements: "strftime('%Y-%m', e.date_encaissement)",
      fact_factures: "strftime('%Y-%m', f.date_emission)",
      fact_reservations: "strftime('%Y-%m', res.date_arrivee)",
      fact_reclamations: "strftime('%Y-%m', rec.date_reception)",
    },
    joins: HOTEL_JOINS,
  },
  {
    id: 'dim_annee', label: 'Année', category: 'Temps',
    description: 'Année civile',
    facts: ['fact_recettes', 'fact_encaissements', 'fact_factures', 'fact_reservations', 'fact_reclamations'],
    selectSql: {
      fact_recettes: "strftime('%Y', rj.date_journal) AS dim_annee",
      fact_encaissements: "strftime('%Y', e.date_encaissement) AS dim_annee",
      fact_factures: "strftime('%Y', f.date_emission) AS dim_annee",
      fact_reservations: "strftime('%Y', res.date_arrivee) AS dim_annee",
      fact_reclamations: "strftime('%Y', rec.date_reception) AS dim_annee",
    },
    groupSql: {
      fact_recettes: "strftime('%Y', rj.date_journal)",
      fact_encaissements: "strftime('%Y', e.date_encaissement)",
      fact_factures: "strftime('%Y', f.date_emission)",
      fact_reservations: "strftime('%Y', res.date_arrivee)",
      fact_reclamations: "strftime('%Y', rec.date_reception)",
    },
    joins: HOTEL_JOINS,
  },
  {
    id: 'dim_client', label: 'Client', category: 'Commercial',
    description: 'Nom du client',
    facts: ['fact_factures', 'fact_reservations', 'fact_reclamations'],
    selectSql: {
      fact_factures: 'f.client_nom AS dim_client',
      fact_reservations: "TRIM(res.client_nom || ' ' || COALESCE(res.client_prenom, '')) AS dim_client",
      fact_reclamations: 'rec.client_nom AS dim_client',
    },
    groupSql: {
      fact_factures: 'f.client_nom',
      fact_reservations: "TRIM(res.client_nom || ' ' || COALESCE(res.client_prenom, ''))",
      fact_reclamations: 'rec.client_nom',
    },
    joins: HOTEL_JOINS,
  },
  {
    id: 'dim_canal', label: 'Canal réservation', category: 'Commercial',
    description: 'Source de la réservation (direct, Booking…)',
    facts: ['fact_reservations'],
    selectSql: { fact_reservations: 'res.source AS dim_canal' },
    groupSql: { fact_reservations: 'res.source' },
    joins: HOTEL_JOINS,
  },
  {
    id: 'dim_statut', label: 'Statut', category: 'Qualité',
    description: 'Statut de la ligne',
    facts: ['fact_recettes', 'fact_encaissements', 'fact_factures', 'fact_reservations', 'fact_reclamations'],
    selectSql: {
      fact_recettes: 'rj.statut AS dim_statut',
      fact_encaissements: 'e.statut AS dim_statut',
      fact_factures: 'f.statut AS dim_statut',
      fact_reservations: 'res.statut AS dim_statut',
      fact_reclamations: 'rec.statut AS dim_statut',
    },
    groupSql: {
      fact_recettes: 'rj.statut', fact_encaissements: 'e.statut', fact_factures: 'f.statut',
      fact_reservations: 'res.statut', fact_reclamations: 'rec.statut',
    },
    joins: HOTEL_JOINS,
  },
  {
    id: 'dim_mode_paiement', label: 'Mode de paiement', category: 'Finance',
    description: 'Mode d\'encaissement',
    facts: ['fact_encaissements'],
    selectSql: { fact_encaissements: 'e.mode AS dim_mode_paiement' },
    groupSql: { fact_encaissements: 'e.mode' },
    joins: HOTEL_JOINS,
  },
  {
    id: 'dim_categorie_reclamation', label: 'Catégorie réclamation', category: 'Qualité',
    description: 'Type de réclamation',
    facts: ['fact_reclamations'],
    selectSql: { fact_reclamations: 'rec.categorie AS dim_categorie_reclamation' },
    groupSql: { fact_reclamations: 'rec.categorie' },
    joins: HOTEL_JOINS,
  },
];

export const SEMANTIC_MEASURES: SemanticMeasure[] = [
  {
    id: 'mes_ca', label: 'Chiffre d\'affaires', category: 'Finance', format: 'currency',
    description: 'Somme des montants de recettes',
    facts: ['fact_recettes'],
    aggSql: { fact_recettes: 'ROUND(SUM(rj.montant), 2) AS mes_ca' },
  },
  {
    id: 'mes_nuitees', label: 'Nuitées', category: 'Exploitation', format: 'integer',
    description: 'Total nuitées vendues',
    facts: ['fact_recettes'],
    aggSql: { fact_recettes: 'SUM(rj.nuitees) AS mes_nuitees' },
  },
  {
    id: 'mes_chambres', label: 'Chambres', category: 'Exploitation', format: 'integer',
    description: 'Total chambres vendues',
    facts: ['fact_recettes'],
    aggSql: { fact_recettes: 'SUM(rj.chambres) AS mes_chambres' },
  },
  {
    id: 'mes_couverts', label: 'Couverts', category: 'Exploitation', format: 'integer',
    description: 'Total couverts restauration',
    facts: ['fact_recettes'],
    aggSql: { fact_recettes: 'SUM(rj.couverts) AS mes_couverts' },
  },
  {
    id: 'mes_nb_lignes_recettes', label: 'Nb lignes recettes', category: 'Finance', format: 'integer',
    description: 'Nombre de lignes de recettes',
    facts: ['fact_recettes'],
    aggSql: { fact_recettes: 'COUNT(*) AS mes_nb_lignes_recettes' },
  },
  {
    id: 'mes_encaissements', label: 'Encaissements', category: 'Finance', format: 'currency',
    description: 'Somme des encaissements',
    facts: ['fact_encaissements'],
    aggSql: { fact_encaissements: 'ROUND(SUM(e.montant), 2) AS mes_encaissements' },
  },
  {
    id: 'mes_nb_encaissements', label: 'Nb encaissements', category: 'Finance', format: 'integer',
    description: 'Nombre d\'opérations d\'encaissement',
    facts: ['fact_encaissements'],
    aggSql: { fact_encaissements: 'COUNT(*) AS mes_nb_encaissements' },
  },
  {
    id: 'mes_facture_ttc', label: 'Facturé TTC', category: 'Finance', format: 'currency',
    description: 'Somme TTC facturée',
    facts: ['fact_factures'],
    aggSql: { fact_factures: 'ROUND(SUM(f.montant_ttc), 2) AS mes_facture_ttc' },
  },
  {
    id: 'mes_facture_paye', label: 'Facturé payé', category: 'Finance', format: 'currency',
    description: 'Somme payée sur factures',
    facts: ['fact_factures'],
    aggSql: { fact_factures: 'ROUND(SUM(f.montant_paye), 2) AS mes_facture_paye' },
  },
  {
    id: 'mes_creances', label: 'Créances', category: 'Finance', format: 'currency',
    description: 'Reste à payer (TTC - payé)',
    facts: ['fact_factures'],
    aggSql: { fact_factures: 'ROUND(SUM(f.montant_ttc - f.montant_paye), 2) AS mes_creances' },
  },
  {
    id: 'mes_nb_factures', label: 'Nb factures', category: 'Finance', format: 'integer',
    description: 'Nombre de factures',
    facts: ['fact_factures'],
    aggSql: { fact_factures: 'COUNT(*) AS mes_nb_factures' },
  },
  {
    id: 'mes_ca_reservations', label: 'CA réservations', category: 'Exploitation', format: 'currency',
    description: 'Montant total des réservations',
    facts: ['fact_reservations'],
    aggSql: { fact_reservations: 'ROUND(SUM(res.montant_total), 2) AS mes_ca_reservations' },
  },
  {
    id: 'mes_nuitees_reservations', label: 'Nuitées réservées', category: 'Exploitation', format: 'integer',
    description: 'Total nuitées réservations',
    facts: ['fact_reservations'],
    aggSql: { fact_reservations: 'SUM(res.nb_nuits) AS mes_nuitees_reservations' },
  },
  {
    id: 'mes_nb_reservations', label: 'Nb réservations', category: 'Exploitation', format: 'integer',
    description: 'Nombre de réservations',
    facts: ['fact_reservations'],
    aggSql: { fact_reservations: 'COUNT(*) AS mes_nb_reservations' },
  },
  {
    id: 'mes_nb_reclamations', label: 'Nb réclamations', category: 'Qualité', format: 'integer',
    description: 'Nombre de réclamations',
    facts: ['fact_reclamations'],
    aggSql: { fact_reclamations: 'COUNT(*) AS mes_nb_reclamations' },
  },
  {
    id: 'mes_satisfaction', label: 'Satisfaction moyenne', category: 'Qualité', format: 'number',
    description: 'Note satisfaction moyenne (1-5)',
    facts: ['fact_reclamations'],
    aggSql: { fact_reclamations: 'ROUND(AVG(rec.satisfaction), 2) AS mes_satisfaction' },
  },
];

export const DIMENSION_MAP = Object.fromEntries(SEMANTIC_DIMENSIONS.map((d) => [d.id, d]));
export const MEASURE_MAP = Object.fromEntries(SEMANTIC_MEASURES.map((m) => [m.id, m]));
