import type { ComponentType } from 'react';
import {
  Anchor,
  AlertTriangle,
  BookOpen,
  Building2,
  Handshake,
  LayoutDashboard,
  Settings,
  Shield,
  UserCog,
  Wallet,
  Wrench,
} from 'lucide-react';
import { getRhSidebarItemsForRole } from '@/pages/rh/rhNavigation';
import {
  canAccessPortmaster,
  canExportReports,
  canManageClients,
  canManageHotels,
  canManageRh,
  canManageSync,
  canManageUsers,
  canReadAudit,
  canSaisieRecettes,
  canValidateRecettes,
  canValidateRhTeam,
  canAccessRhSelf,
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
  /** ID du module dans modules_config — si défini, la section est masquée quand le module est désactivé */
  moduleId?: string;
  visible?: boolean;
  items: SidebarNavItem[];
};

export function buildSidebarModules(
  role: string | undefined,
  pendingUsers = 0,
  pendingValidationsN1 = 0,
): SidebarModule[] {
  return [
    {
      id: 'pilotage',
      title: 'Pilotage',
      icon: LayoutDashboard,
      items: [
        { label: 'Dashboard global', to: '/dashboard' },
        { label: 'Dashboard PDG', to: '/dashboard/pdg' },
        { label: 'Cockpit DEC', to: '/dec/cockpit' },
        { label: 'Modules de pilotage', to: '/modules' },
        { label: 'Rapports & exports', to: '/rapports', visible: canExportReports(role) },
      ],
    },
    {
      id: 'exploitation',
      title: 'Exploitation',
      icon: Building2,
      items: [
        { label: 'Hébergement & occupation', to: '/hebergement' },
        { label: 'Housekeeping', to: '/housekeeping' },
        { label: 'Tarifs & conventions', to: '/tarifs' },
        { label: 'CA journalier (ERP)', to: '/recettes/journalieres', visible: canViewRecettes(role) },
        { label: 'Historique recettes', to: '/recettes/historique', visible: canViewRecettes(role) },
        { label: 'Validation recettes', to: '/recettes/validation', visible: canValidateRecettes(role) },
        { label: 'Clôture journalière', to: '/recettes/cloture', visible: canValidateRecettes(role) },
        { label: 'Clients', to: '/clients', visible: canManageClients(role) },
        { label: 'Facturation', to: '/facturation' },
        { label: 'Conformité hôtelière', to: '/hotel-legal' },
        { label: 'Données personnelles (18-07)', to: '/conformite/donnees-personnelles', visible: canManageUsers(role) },
        { label: 'Modules légaux', to: '/conformite/modules-legaux', visible: canManageUsers(role) },
      ],
    },
    {
      id: 'finance',
      title: 'Finances & comptabilité',
      icon: Wallet,
      items: [
        { label: 'Rapprochements', to: '/finance/rapprochements', visible: canValidateRecettes(role) },
        { label: 'Créances', to: '/creances' },
        { label: 'Saisie mensuelle', to: '/recettes/mensuelles', visible: canSaisieRecettes(role) },
        { label: 'Objectifs', to: '/objectifs', visible: canViewObjectifs(role) },
        { label: 'Encaissements & trésorerie', to: '/encaissements' },
        { label: 'Comptabilité SCF', to: '/comptabilite' },
        { label: 'Fiscalité DGI', to: '/fiscalite' },
      ],
    },
    {
      id: 'operations',
      title: 'Opérations',
      icon: Wrench,
      items: [
        { label: 'Stocks & consommations', to: '/stocks' },
        { label: 'Production & fiches techniques', to: '/cuisine' },
        { label: 'Points de vente (POS)', to: '/pos' },
        { label: 'Achats & fournisseurs', to: '/achats' },
        { label: 'Maintenance', to: '/maintenance' },
        { label: 'Parking', to: '/parking' },
        { label: 'Plage & piscine', to: '/plage' },
      ],
    },
    {
      id: 'controle',
      title: 'Contrôle interne',
      icon: Shield,
      items: [
        { label: 'Workflows', to: '/workflows' },
        { label: 'Checklists', to: '/controle/checklists' },
      ],
    },
    {
      id: 'qualite',
      title: 'Qualité & relation client',
      icon: AlertTriangle,
      items: [
        { label: 'Anomalies', to: '/anomalies' },
        { label: 'Réclamations', to: '/reclamations' },
        { label: 'Décisions & instructions', to: '/decisions' },
      ],
    },
    {
      id: 'commercial-ged',
      title: 'Commercial & documents',
      icon: Handshake,
      items: [
        { label: 'Commercial', to: '/commercial' },
        { label: 'Gestion documentaire', to: '/ged' },
        { label: 'Archivage légal GED', to: '/ged/archivage-legal' },
      ],
    },
    {
      id: 'rh',
      title: 'RH & productivité',
      icon: UserCog,
      moduleId: 'rh-productivite',
      visible: canManageRh(role) || canValidateRhTeam(role) || canAccessRhSelf(role),
      items: [
        { label: 'Applications RH', to: '/rh' },
        ...getRhSidebarItemsForRole(role, pendingValidationsN1).map((item) => ({
          label: item.label,
          to: item.path,
          badge: item.badge,
        })),
      ],
    },
    {
      id: 'portmaster',
      title: 'PortMaster',
      icon: Anchor,
      moduleId: 'portmaster',
      visible: canAccessPortmaster(role),
      items: [
        { label: 'Applications port', to: '/portmaster' },
        { label: 'Dashboard port', to: '/portmaster/dashboard' },
        { label: 'Référentiel', to: '/portmaster/referentiel' },
        { label: 'Clients port', to: '/portmaster/clients' },
        { label: 'Bateaux', to: '/portmaster/bateaux' },
        { label: 'Contrats hôtel', to: '/contrats' },
        { label: 'Contrats PortMaster', to: '/portmaster/contrats' },
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
      id: 'aide',
      title: 'Aide & guides',
      icon: BookOpen,
      items: [
        { label: 'Manuel utilisateur', to: '/guide' },
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
        { label: 'Modules activés', to: '/settings/modules', visible: canManageUsers(role) },
        { label: 'Interface & thème', to: '/settings/interface' },
        { label: 'Notifications', to: '/settings/notifications' },
        { label: 'Sécurité & accès', to: '/settings/securite' },
        { label: 'Base de données', to: '/settings/database', visible: canManageUsers(role) },
        { label: 'Sauvegarde', to: '/settings/backup', visible: canManageUsers(role) },
        { label: 'Santé système', to: '/settings/system-health', visible: canManageUsers(role) },
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
