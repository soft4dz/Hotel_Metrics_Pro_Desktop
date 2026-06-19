import {
  canAccessRhSelf,
  canManageRh,
  canValidateRhTeam,
} from '@/shared/permissions';

export type RhHubId =
  | 'pilotage'
  | 'collaborateurs'
  | 'temps'
  | 'paie'
  | 'talents'
  | 'validations'
  | 'mon-espace';

export type RhSubSection = string;

export interface RhHubSubItem {
  id: RhSubSection;
  label: string;
  manageOnly?: boolean;
  teamOk?: boolean;
}

export interface RhHub {
  id: RhHubId;
  label: string;
  description: string;
  path: string;
  visible: (role?: string) => boolean;
  subs: RhHubSubItem[];
  defaultSub: RhSubSection;
}

export const RH_HUBS: RhHub[] = [
  {
    id: 'pilotage',
    label: 'Pilotage & Vision',
    description: 'KPIs, analyses IA, prévisions et comparatif unités',
    path: '/rh/pilotage',
    visible: (role) => canManageRh(role),
    defaultSub: 'dashboard',
    subs: [
      { id: 'dashboard', label: 'Tableau de bord' },
      { id: 'ia', label: 'Analyses IA' },
      { id: 'previsions', label: 'Prévisions' },
      { id: 'comparatif', label: 'Comparatif' },
      { id: 'onboarding', label: 'Onboarding' },
      { id: 'port', label: 'PortMaster' },
    ],
  },
  {
    id: 'collaborateurs',
    label: 'Collaborateurs',
    description: 'Annuaire, contrats, organigramme et affectations',
    path: '/rh/collaborateurs',
    visible: (role) => canManageRh(role),
    defaultSub: 'annuaire',
    subs: [
      { id: 'annuaire', label: 'Annuaire' },
      { id: 'contrats', label: 'Contrats' },
      { id: 'organigramme', label: 'Organigramme' },
      { id: 'affectations', label: 'Affectations' },
    ],
  },
  {
    id: 'temps',
    label: 'Temps & Présence',
    description: 'Planning, pointages et absences',
    path: '/rh/temps',
    visible: (role) => canManageRh(role) || canValidateRhTeam(role) || canAccessRhSelf(role),
    defaultSub: 'planning',
    subs: [
      { id: 'planning', label: 'Planning', teamOk: true },
      { id: 'pointages', label: 'Pointages', teamOk: true },
      { id: 'absences', label: 'Absences & congés', teamOk: true },
    ],
  },
  {
    id: 'paie',
    label: 'Paie & Légal DZ',
    description: 'Pré-paie CNAS/IRG, DLG et conformité Algérie',
    path: '/rh/paie',
    visible: (role) => canManageRh(role),
    defaultSub: 'prepaie',
    subs: [
      { id: 'prepaie', label: 'Pré-paie & DLG' },
      { id: 'registres', label: 'Registres légaux' },
      { id: 'conformite', label: 'Conformité DZ' },
    ],
  },
  {
    id: 'talents',
    label: 'Talents & Développement',
    description: 'Recrutement, formations, compétences et entretiens',
    path: '/rh/talents',
    visible: (role) => canManageRh(role),
    defaultSub: 'recrutements',
    subs: [
      { id: 'recrutements', label: 'Recrutements' },
      { id: 'formations', label: 'Formations' },
      { id: 'competences', label: 'Compétences' },
      { id: 'entretiens', label: 'Entretiens' },
    ],
  },
  {
    id: 'validations',
    label: 'Centre validations',
    description: 'Approbations N+1 : absences, pointages, documents',
    path: '/rh/validations',
    visible: (role) => canValidateRhTeam(role) || canManageRh(role),
    defaultSub: 'absences',
    subs: [
      { id: 'absences', label: 'Absences' },
      { id: 'pointages', label: 'Pointages' },
      { id: 'documents', label: 'Documents' },
    ],
  },
  {
    id: 'mon-espace',
    label: 'Mon espace',
    description: 'Profil, demandes et documents personnels',
    path: '/rh/mon-espace',
    visible: (role) => canAccessRhSelf(role),
    defaultSub: '',
    subs: [],
  },
];

/** Anciens chemins /rh/:section → nouveau hub */
export const RH_LEGACY_REDIRECTS: Record<string, string> = {
  dashboard: '/rh/pilotage/dashboard',
  'analyse-ia': '/rh/pilotage/ia',
  pilotage: '/rh/pilotage/comparatif',
  employes: '/rh/collaborateurs/annuaire',
  contrats: '/rh/collaborateurs/contrats',
  organisation: '/rh/collaborateurs/organigramme',
  affectations: '/rh/collaborateurs/affectations',
  dossiers: '/rh/collaborateurs/annuaire',
  planning: '/rh/temps/planning',
  pointages: '/rh/temps/pointages',
  absences: '/rh/temps/absences',
  paie: '/rh/paie/prepaie',
  conformite: '/rh/paie/conformite',
  formations: '/rh/talents/formations',
  recrutements: '/rh/talents/recrutements',
  validations: '/rh/validations/absences',
  referentiel: '/settings/rh-referentiel',
  'mon-espace': '/rh/mon-espace',
};

export function getRhHubsForRole(role?: string): RhHub[] {
  return RH_HUBS.filter((h) => h.visible(role));
}

export function hubEntryPath(hub: RhHub): string {
  return hub.subs.length > 1 ? `${hub.path}/${hub.defaultSub}` : hub.path;
}

export function getDefaultRhPath(role?: string): string {
  const hubs = getRhHubsForRole(role);
  const first = hubs[0];
  if (!first) return '/rh/mon-espace';
  return hubEntryPath(first);
}

export function resolveRhHub(hubId: string | undefined, role?: string): RhHub | null {
  if (!hubId) return null;
  const hub = RH_HUBS.find((h) => h.id === hubId);
  if (hub && hub.visible(role)) return hub;
  // Segment legacy (/rh/employes, /rh/planning…) — pas un hub actuel
  if (RH_LEGACY_REDIRECTS[hubId]) return null;
  return null;
}

export function isRhLegacySection(section: string): boolean {
  return Boolean(RH_LEGACY_REDIRECTS[section]) && !RH_HUBS.some((h) => h.id === section);
}

export function resolveRhSub(
  hub: RhHub,
  subId: string | undefined,
  role?: string,
  canTeam = false,
): RhSubSection {
  const subs = hub.subs.filter((s) => {
    if (canTeam && !canManageRh(role) && s.teamOk) return true;
    if (canManageRh(role)) return true;
    if (hub.id === 'temps' && canAccessRhSelf(role)) {
      return s.id === 'pointages' || s.id === 'absences';
    }
    return false;
  });
  if (subId && subs.some((s) => s.id === subId)) return subId;
  return subs[0]?.id ?? hub.defaultSub;
}

export function rhHubPath(hubId: RhHubId, sub?: RhSubSection): string {
  const hub = RH_HUBS.find((h) => h.id === hubId);
  const s = sub ?? hub?.defaultSub ?? '';
  return s ? `/rh/${hubId}/${s}` : `/rh/${hubId}`;
}

export function rhPageTitle(hubId: RhHubId, sub?: RhSubSection): { title: string; subtitle: string } {
  const hub = RH_HUBS.find((h) => h.id === hubId);
  const subItem = hub?.subs.find((s) => s.id === sub);
  const subLabel = subItem?.label ?? '';
  return {
    title: hub ? `RH — ${hub.label}` : 'RH & Productivité',
    subtitle: subLabel ? `${hub?.description ?? ''} · ${subLabel}` : (hub?.description ?? ''),
  };
}

/** Sidebar plate : un lien par hub (sous-routes incluses pour le surlignage) */
export function getRhSidebarItemsForRole(role?: string, pendingValidationsN1 = 0) {
  return getRhHubsForRole(role).map((h) => ({
    id: h.id,
    label: h.label,
    path: h.path,
    badge: h.id === 'validations' && pendingValidationsN1 > 0 ? pendingValidationsN1 : undefined,
  }));
}
