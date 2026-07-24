import type { LucideIcon } from 'lucide-react';
import {
  BadgeCheck,
  Briefcase,
  Clock,
  GraduationCap,
  LayoutDashboard,
  ListTree,
  User,
  Users,
  Wallet,
} from 'lucide-react';
import type { OdooAppDefinition } from '@/components/apps/OdooAppLauncher';
import { getRhHubsForRole, hubEntryPath, type RhHubId } from './rhNavigation';

export const RH_APP_GROUPS = [
  'Pilotage',
  'Personnel',
  'Opérations',
  'Talents',
  'Espace personnel',
] as const;

const RH_HUB_ICONS: Record<RhHubId, LucideIcon> = {
  pilotage: LayoutDashboard,
  collaborateurs: Users,
  referentiel: ListTree,
  temps: Clock,
  paie: Wallet,
  talents: GraduationCap,
  validations: BadgeCheck,
  'mon-espace': User,
};

const RH_HUB_COLORS: Record<RhHubId, string> = {
  pilotage: '#714B67',
  collaborateurs: '#A24689',
  referentiel: '#875A7B',
  temps: '#5278B8',
  paie: '#00A09D',
  talents: '#E67E22',
  validations: '#DC6965',
  'mon-espace': '#3498DB',
};

const RH_HUB_GROUPS: Record<RhHubId, (typeof RH_APP_GROUPS)[number]> = {
  pilotage: 'Pilotage',
  collaborateurs: 'Personnel',
  referentiel: 'Personnel',
  temps: 'Opérations',
  paie: 'Opérations',
  talents: 'Talents',
  validations: 'Personnel',
  'mon-espace': 'Espace personnel',
};

export function buildRhAppsForRole(role?: string): OdooAppDefinition[] {
  return getRhHubsForRole(role).map((hub) => ({
    id: hub.id,
    name: hub.label,
    description: hub.description,
    route: hubEntryPath(hub),
    group: RH_HUB_GROUPS[hub.id],
    color: RH_HUB_COLORS[hub.id],
    icon: RH_HUB_ICONS[hub.id] ?? Briefcase,
  }));
}
