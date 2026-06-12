import type { ComponentType } from 'react';
import {
  Anchor,
  Building2,
  LayoutDashboard,
  Receipt,
  Settings,
  UserCog,
} from 'lucide-react';
import {
  canAccessPortmaster,
  canAccessRhSelf,
  canExportReports,
  canManageHotels,
  canManageRh,
  canManageSync,
  canManageUsers,
  canReadAudit,
  canSaisieRecettes,
  canValidateRecettes,
  canValidateRhTeam,
  canViewObjectifs,
  canViewRecettes,
} from '@/shared/permissions';

export type SidebarNavItem = {
  label: string;
  to: string;
  visible?: boolean;
  badge?: number;
};

export type SidebarModule = {
  id: string;
  title: string;
  icon: ComponentType<{ className?: string }>;
  visible?: boolean;
  items: SidebarNavItem[];
};

export function buildSidebarModules(
  role: string | undefined,
  pendingUsers = 0,
): SidebarModule[] {
  return [
    {
      id: 'pilotage',
      title: 'Pilotage',
      icon: LayoutDashboard,
      items: [
        { label: 'Dashboard global', to: '/dashboard' },
        { label: 'Modules de pilotage', to: '/modules' },
        { label: 'Rapports & exports', to: '/rapports', visible: canExportReports(role) },
      ],
    },
    {
      id: 'exploitation',
      title: 'Exploitation',
      icon: Receipt,
      items: [
        { label: 'Saisie journalière', to: '/recettes/journalieres', visible: canSaisieRecettes(role) },
        { label: 'Historique recettes', to: '/recettes/historique', visible: canViewRecettes(role) },
        { label: 'Validation recettes', to: '/recettes/validation', visible: canValidateRecettes(role) },
        { label: 'Saisie mensuelle', to: '/recettes/mensuelles', visible: canSaisieRecettes(role) },
        { label: 'Objectifs', to: '/objectifs', visible: canViewObjectifs(role) },
        { label: 'Hébergement & occupation', to: '/hebergement' },
        { label: 'Tarifs & conventions', to: '/tarifs' },
        { label: 'Encaissements & trésorerie', to: '/encaissements' },
        { label: 'Facturation', to: '/facturation' },
        { label: 'Clients', to: '/clients' },
      ],
    },
    {
      id: 'rh',
      title: 'RH & productivité',
      icon: UserCog,
      visible: canManageRh(role) || canValidateRhTeam(role) || canAccessRhSelf(role),
      items: [{ label: 'Tableau de bord RH', to: '/rh' }],
    },
    {
      id: 'portmaster',
      title: 'PortMaster',
      icon: Anchor,
      visible: canAccessPortmaster(role),
      items: [
        { label: 'Dashboard port', to: '/portmaster' },
        { label: 'Référentiel', to: '/portmaster/referentiel' },
        { label: 'Clients port', to: '/portmaster/clients' },
        { label: 'Bateaux', to: '/portmaster/bateaux' },
        { label: 'Contrats', to: '/portmaster/contrats' },
        { label: 'Emplacements', to: '/portmaster/emplacements' },
        { label: 'Factures', to: '/portmaster/factures' },
        { label: 'Tarifs port', to: '/portmaster/tarifs' },
        { label: 'Validations', to: '/portmaster/validations' },
        { label: 'Mouvements', to: '/portmaster/mouvements' },
        { label: 'Recouvrement', to: '/portmaster/recouvrement' },
      ],
    },
    {
      id: 'administration',
      title: 'Administration',
      icon: Building2,
      items: [
        { label: 'Hôtels / unités', to: '/admin/hotels', visible: canManageHotels(role) },
        {
          label: 'Utilisateurs',
          to: '/admin/users',
          visible: canManageUsers(role),
          badge: pendingUsers > 0 ? pendingUsers : undefined,
        },
        { label: 'Rôles', to: '/admin/roles', visible: canManageUsers(role) },
        { label: 'Rubriques', to: '/admin/rubriques', visible: canManageHotels(role) },
      ],
    },
    {
      id: 'systeme',
      title: 'Système',
      icon: Settings,
      items: [
        { label: 'Synchronisation', to: '/system/sync', visible: canManageSync(role) },
        { label: "Journal d'audit", to: '/audit/logs', visible: canReadAudit(role) },
        { label: 'Paramètres', to: '/settings' },
        { label: 'Interface & thème', to: '/settings/interface' },
        { label: 'Notifications', to: '/settings/notifications' },
        { label: 'Sécurité & accès', to: '/settings/securite' },
        { label: 'Base de données', to: '/settings/database', visible: canManageUsers(role) },
        { label: 'Sauvegarde', to: '/settings/backup', visible: canManageUsers(role) },
      ],
    },
  ];
}

/** Trouve le module contenant la route active (match le préfixe le plus long). */
export function findActiveModuleId(modules: SidebarModule[], pathname: string): string | null {
  let best: { id: string; len: number } | null = null;

  for (const mod of modules) {
    for (const item of mod.items) {
      if (item.visible === false) continue;
      const matches =
        pathname === item.to ||
        (item.to !== '/' && item.to !== '/modules' && pathname.startsWith(`${item.to}/`)) ||
        (item.to === '/modules' && pathname.startsWith('/modules'));
      if (matches) {
        const len = item.to.length;
        if (!best || len > best.len) best = { id: mod.id, len };
      }
    }
  }

  return best?.id ?? null;
}
