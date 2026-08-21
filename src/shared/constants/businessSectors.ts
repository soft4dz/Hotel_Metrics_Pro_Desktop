import { CONFIGURED_MODULE_IDS, type ConfiguredModuleId } from './configuredModules';

export const BUSINESS_SECTOR_IDS = [
  'hotel',
  'restaurant',
  'commerce',
  'services',
  'industrie',
  'port',
  'generic',
] as const;

export type BusinessSectorId = (typeof BUSINESS_SECTOR_IDS)[number];

export interface SectorTerminology {
  unit: string;
  units: string;
  unitAdminTitle: string;
  newUnit: string;
  unitEmpty: string;
  dailyRevenue: string;
  exploitationSection: string;
}

export interface BusinessSectorProfile {
  id: BusinessSectorId;
  label: string;
  description: string;
  terminology: SectorTerminology;
  /** Modules à activer lors de l'application du pack */
  enabledModules: readonly ConfiguredModuleId[];
  /** Modules à désactiver lors de l'application du pack */
  disabledModules: readonly ConfiguredModuleId[];
  /** Routes sidebar masquées pour ce secteur */
  hiddenRoutes: readonly string[];
}

export const HOTEL_ONLY_MODULE_IDS: readonly ConfiguredModuleId[] = [
  'hebergement-occupation',
  'housekeeping-chambres',
  'tarifs-conventions',
  'recettes-journalieres',
  'comparatif-inter-unites',
];

const HOTEL_ROUTES = [
  '/hebergement',
  '/housekeeping',
  '/tarifs',
  '/hotel-legal',
] as const;

const RECETTES_ROUTES = [
  '/recettes/journalieres',
  '/recettes/historique',
  '/recettes/validation',
  '/recettes/cloture',
] as const;

const CORE_ERP_MODULES: readonly ConfiguredModuleId[] = [
  'facturation',
  'clients',
  'creances-recouvrement',
  'encaissements-tresorerie',
  'stocks-consommations',
  'achats-approvisionnements',
  'maintenance-interventions',
  'rh-productivite',
  'gestion-documentaire',
  'audit-controle-interne',
  'journal-anomalies',
  'decisions-instructions',
  'qualite-reclamations',
  'commercial-partenariats',
  'tableaux-bord-directionnels',
  'rapports-automatiques',
  'alertes-notifications',
  'budget-previsions',
  'contrats-conventions',
] as const;

const DEFAULT_TERMINOLOGY: SectorTerminology = {
  unit: 'Unité',
  units: 'Unités',
  unitAdminTitle: 'Unités / sites',
  newUnit: 'Nouvelle unité',
  unitEmpty: 'Aucune unité',
  dailyRevenue: 'CA journalier',
  exploitationSection: 'Exploitation',
};

export const BUSINESS_SECTOR_PROFILES: Record<BusinessSectorId, BusinessSectorProfile> = {
  hotel: {
    id: 'hotel',
    label: 'Hôtellerie & tourisme',
    description: 'PMS, housekeeping, recettes journalières, conformité hôtelière.',
    terminology: {
      unit: 'Hôtel',
      units: 'Hôtels / unités',
      unitAdminTitle: 'Hôtels et unités',
      newUnit: 'Nouvel hôtel',
      unitEmpty: 'Aucun hôtel',
      dailyRevenue: 'CA journalier (ERP)',
      exploitationSection: 'Exploitation hôtelière',
    },
    enabledModules: [...CONFIGURED_MODULE_IDS],
    disabledModules: [],
    hiddenRoutes: [],
  },
  restaurant: {
    id: 'restaurant',
    label: 'Restauration & production',
    description: 'POS, cuisine, stocks alimentaires, facturation — sans PMS ni housekeeping.',
    terminology: {
      ...DEFAULT_TERMINOLOGY,
      unit: 'Établissement',
      units: 'Établissements',
      unitAdminTitle: 'Établissements',
      newUnit: 'Nouvel établissement',
      unitEmpty: 'Aucun établissement',
      dailyRevenue: 'CA journalier',
      exploitationSection: 'Exploitation restauration',
    },
    enabledModules: [
      ...CORE_ERP_MODULES,
      'pos-restauration',
      'unites-hotelieres',
    ],
    disabledModules: [...HOTEL_ONLY_MODULE_IDS, 'portmaster'],
    hiddenRoutes: [...HOTEL_ROUTES, ...RECETTES_ROUTES],
  },
  commerce: {
    id: 'commerce',
    label: 'Commerce & distribution',
    description: 'Clients, stocks, facturation, créances — multi-magasins.',
    terminology: {
      ...DEFAULT_TERMINOLOGY,
      unit: 'Magasin',
      units: 'Magasins / points de vente',
      unitAdminTitle: 'Magasins et sites',
      newUnit: 'Nouveau magasin',
      unitEmpty: 'Aucun magasin',
      dailyRevenue: 'Ventes journalières',
      exploitationSection: 'Exploitation commerciale',
    },
    enabledModules: [
      ...CORE_ERP_MODULES,
      'unites-hotelieres',
    ],
    disabledModules: [...HOTEL_ONLY_MODULE_IDS, 'portmaster', 'pos-restauration'],
    hiddenRoutes: [...HOTEL_ROUTES, ...RECETTES_ROUTES, '/cuisine', '/pos'],
  },
  services: {
    id: 'services',
    label: 'Services & BTP',
    description: 'Clients, contrats, maintenance, facturation et trésorerie.',
    terminology: {
      ...DEFAULT_TERMINOLOGY,
      unit: 'Agence',
      units: 'Agences / sites',
      unitAdminTitle: 'Agences et sites',
      newUnit: 'Nouvelle agence',
      unitEmpty: 'Aucune agence',
      dailyRevenue: 'Activité journalière',
      exploitationSection: 'Exploitation',
    },
    enabledModules: [...CORE_ERP_MODULES, 'unites-hotelieres'],
    disabledModules: [
      ...HOTEL_ONLY_MODULE_IDS,
      'portmaster',
      'pos-restauration',
    ],
    hiddenRoutes: [
      ...HOTEL_ROUTES,
      ...RECETTES_ROUTES,
      '/cuisine',
      '/pos',
    ],
  },
  industrie: {
    id: 'industrie',
    label: 'Industrie & production',
    description: 'Stocks, achats, maintenance, RH et comptabilité.',
    terminology: {
      ...DEFAULT_TERMINOLOGY,
      unit: 'Site',
      units: 'Sites / usines',
      unitAdminTitle: 'Sites de production',
      newUnit: 'Nouveau site',
      unitEmpty: 'Aucun site',
      dailyRevenue: 'Production journalière',
      exploitationSection: 'Opérations industrielles',
    },
    enabledModules: [
      ...CORE_ERP_MODULES.filter((id) => id !== 'commercial-partenariats'),
      'unites-hotelieres',
    ],
    disabledModules: [
      ...HOTEL_ONLY_MODULE_IDS,
      'portmaster',
      'pos-restauration',
      'commercial-partenariats',
    ],
    hiddenRoutes: [
      ...HOTEL_ROUTES,
      ...RECETTES_ROUTES,
      '/cuisine',
      '/pos',
      '/commercial',
    ],
  },
  port: {
    id: 'port',
    label: 'Port & marina',
    description: 'PortMaster, contrats nautiques, finance et RH.',
    terminology: {
      ...DEFAULT_TERMINOLOGY,
      unit: 'Site portuaire',
      units: 'Sites portuaires',
      unitAdminTitle: 'Sites portuaires',
      newUnit: 'Nouveau site',
      unitEmpty: 'Aucun site',
      dailyRevenue: 'Recettes portuaires',
      exploitationSection: 'Exploitation portuaire',
    },
    enabledModules: [
      ...CORE_ERP_MODULES,
      'portmaster',
      'unites-hotelieres',
    ],
    disabledModules: HOTEL_ONLY_MODULE_IDS,
    hiddenRoutes: [...HOTEL_ROUTES, ...RECETTES_ROUTES, '/cuisine', '/pos'],
  },
  generic: {
    id: 'generic',
    label: 'Entreprise générique',
    description: 'Socle ERP transversal : finance, RH, stocks, GED — sans modules sectoriels.',
    terminology: DEFAULT_TERMINOLOGY,
    enabledModules: [...CORE_ERP_MODULES, 'unites-hotelieres'],
    disabledModules: [
      ...HOTEL_ONLY_MODULE_IDS,
      'portmaster',
      'pos-restauration',
    ],
    hiddenRoutes: [
      ...HOTEL_ROUTES,
      ...RECETTES_ROUTES,
      '/cuisine',
      '/pos',
    ],
  },
};

export function isBusinessSectorId(value: string): value is BusinessSectorId {
  return (BUSINESS_SECTOR_IDS as readonly string[]).includes(value);
}

export function getBusinessSectorProfile(sectorId: BusinessSectorId): BusinessSectorProfile {
  return BUSINESS_SECTOR_PROFILES[sectorId];
}

export function normalizeBusinessSectorId(value: string | null | undefined): BusinessSectorId {
  if (value && isBusinessSectorId(value)) return value;
  return 'hotel';
}

export function listBusinessSectorOptions(): Array<Pick<BusinessSectorProfile, 'id' | 'label' | 'description'>> {
  return BUSINESS_SECTOR_IDS.map((id) => {
    const p = BUSINESS_SECTOR_PROFILES[id];
    return { id: p.id, label: p.label, description: p.description };
  });
}
