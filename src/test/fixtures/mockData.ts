import type { AuthUserDto } from '@/shared/types/auth';
import type { DashboardDto } from '@/shared/types/dashboard';
import type { HotelListItem } from '@/shared/types/admin';
import { MODULES } from '@/modules/moduleCatalog';

export const mockAdminUser: AuthUserDto = {
  id: 1,
  uuid: '00000000-0000-4000-8000-000000000001',
  email: 'admin@hotelmetrics.local',
  fullName: 'Administrateur test',
  role: 'ADMIN_DEC',
  roleLabel: 'Admin décisionnel',
  hotelId: null,
  hotelIds: [1],
  allHotelsAccess: true,
  mustChangePassword: false,
};

export const mockHotels: HotelListItem[] = [
  {
    id: 1,
    uuid: '00000000-0000-4000-8000-000000000010',
    code: 'HTL01',
    name: 'Hôtel Test',
    city: 'Alger',
    isActive: true,
    userCount: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    logoFile: null,
    logoUrl: null,
    rubriqueIds: [],
  },
];

export const mockDashboard: DashboardDto = {
  kpis: {
    caJour: 0,
    caMois: 0,
    caAnnuel: 0,
    objectifMois: 0,
    realiseMois: 0,
    tauxRealisation: 0,
    totalEncaissements: 0,
    tauxEncaissement: 0,
    ecartObjectif: 0,
    saisiesRealisees: 0,
    saisiesManquantes: 0,
    periodeLabel: 'Test',
    variationCaPct: 0,
    tauxOccupation: 0,
    revPAR: 0,
    adr: 0,
    prixMoyenCouvert: 0,
  },
  parHotel: [],
  parRubrique: [],
  evolutionJournaliere: [],
  evolutionMensuelle: [],
  caParHotel: [],
  repartitionRubrique: [],
  objectifVsRealise: [],
  tauxEncaissementHotel: [],
  comparaisonAnnee: [],
  realisationVsObjectifMensuel: [],
  frequentation: { chambres: 0, nuitees: 0, couverts: 0 },
  alertes: [],
  saisiesManquantes: [],
  dernieresDeclarations: [],
  auditRecent: [],
  canViewAudit: true,
  canExport: true,
  scopeHotelOnly: false,
};

export const mockEnabledModuleIds = MODULES.map((m) => m.id);

export const mockBranding = {
  companyName: 'Hotel Metrics Pro Test',
  companyLogoUrl: null as string | null,
  reportHeader: 'Hotel Metrics Pro - Rapport interne',
  reportFooter: 'Document genere automatiquement',
  reportHeaderImageUrl: null as string | null,
  reportFooterImageUrl: null as string | null,
};

export const mockReportsCatalog = {
  packages: [],
  kpis: [],
  templates: [],
  sources: [],
};
