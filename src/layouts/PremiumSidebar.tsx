import type { ComponentType } from 'react';
import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Anchor,
  BarChart3,
  Building2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Cloud,
  Database,
  HardDrive,
  History,
  Layers,
  LayoutDashboard,
  ListTree,
  Lock,
  Palette,
  Receipt,
  Settings,
  Shield,
  Target,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { APP_LOGO_URL } from '@/lib/logos';
import { ipcClient } from '@/lib/ipcClient';
import { Button } from '@/components/ui/button';
import { useUiStore } from '@/stores/ui.store';
import { useAuthStore } from '@/stores/auth.store';
import {
  canAccessPortmaster,
  canExportReports,
  canManageHotels,
  canManageSync,
  canManageUsers,
  canReadAudit,
  canSaisieRecettes,
  canValidateRecettes,
  canViewObjectifs,
  canViewRecettes,
} from '@/shared/permissions';

type Item = {
  label: string;
  to: string;
  icon: ComponentType<{ className?: string }>;
  visible?: boolean;
};

type Group = {
  title: string;
  items: Item[];
};

function NavItem({ item, collapsed }: { item: Item; collapsed: boolean }) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.to}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        cn(
          'group flex items-center rounded-lg text-sm transition-all duration-200',
          collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5',
          isActive
            ? 'bg-primary text-primary-foreground shadow-lg shadow-black/20'
            : 'text-white/68 hover:bg-white/10 hover:text-white',
        )
      }
    >
      <span
        className={cn(
          'flex shrink-0 items-center justify-center rounded-lg bg-white/10 text-white/80 transition group-hover:bg-white/15 group-hover:text-white',
          collapsed ? 'h-9 w-9' : 'h-8 w-8',
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      {!collapsed && <span className="truncate font-medium">{item.label}</span>}
    </NavLink>
  );
}

export function PremiumSidebar() {
  const role = useAuthStore((state) => state.user?.role);
  const { sidebarCollapsed, toggleSidebar } = useUiStore();
  const [brandLogoUrl, setBrandLogoUrl] = useState(APP_LOGO_URL);

  useEffect(() => {
    ipcClient.settings
      .getBranding()
      .then((result) => {
        if (result.ok && result.data?.companyLogoUrl) {
          setBrandLogoUrl(result.data.companyLogoUrl);
        }
      })
      .catch(() => {
        /* garder logo app par défaut */
      });
  }, []);

  const sidebarLogo = brandLogoUrl || APP_LOGO_URL;

  const groups: Group[] = [
    {
      title: 'Pilotage',
      items: [
        { label: 'Dashboard global', to: '/dashboard', icon: LayoutDashboard },
        { label: 'Modules de pilotage', to: '/modules', icon: Layers },
        { label: 'Rapports & exports', to: '/rapports', icon: BarChart3, visible: canExportReports(role) },
      ],
    },
    {
      title: 'Exploitation',
      items: [
        { label: 'Saisie journalière', to: '/recettes/journalieres', icon: Receipt, visible: canSaisieRecettes(role) },
        { label: 'Historique recettes', to: '/recettes/historique', icon: History, visible: canViewRecettes(role) },
        { label: 'Validation recettes', to: '/recettes/validation', icon: ClipboardCheck, visible: canValidateRecettes(role) },
        { label: 'Saisie mensuelle', to: '/recettes/mensuelles', icon: Receipt, visible: canSaisieRecettes(role) },
        { label: 'Objectifs', to: '/objectifs', icon: Target, visible: canViewObjectifs(role) },
      ],
    },
    {
      title: 'PortMaster',
      items: [
        { label: 'Dashboard port', to: '/portmaster', icon: Anchor, visible: canAccessPortmaster(role) },
        { label: 'Référentiel', to: '/portmaster/referentiel', icon: Layers, visible: canAccessPortmaster(role) },
        { label: 'Clients', to: '/portmaster/clients', icon: Users, visible: canAccessPortmaster(role) },
        { label: 'Bateaux', to: '/portmaster/bateaux', icon: Anchor, visible: canAccessPortmaster(role) },
        { label: 'Contrats', to: '/portmaster/contrats', icon: ClipboardList, visible: canAccessPortmaster(role) },
        { label: 'Factures', to: '/portmaster/factures', icon: Receipt, visible: canAccessPortmaster(role) },
      ],
    },
    {
      title: 'Administration',
      items: [
        { label: 'Hôtels / unités', to: '/admin/hotels', icon: Building2, visible: canManageHotels(role) },
        { label: 'Utilisateurs', to: '/admin/users', icon: Users, visible: canManageUsers(role) },
        { label: 'Rôles', to: '/admin/roles', icon: Shield, visible: canManageUsers(role) },
        { label: 'Rubriques', to: '/admin/rubriques', icon: ListTree, visible: canManageHotels(role) },
      ],
    },
    {
      title: 'Système',
      items: [
        { label: 'Synchronisation', to: '/system/sync', icon: Cloud, visible: canManageSync(role) },
        { label: "Journal d'audit", to: '/audit/logs', icon: ClipboardList, visible: canReadAudit(role) },
        { label: 'Paramètres', to: '/settings', icon: Settings },
        { label: 'Interface', to: '/settings/interface', icon: Palette },
        { label: 'Notifications', to: '/settings/notifications', icon: Lock },
        { label: 'Base de données', to: '/settings/database', icon: Database, visible: canManageUsers(role) },
        { label: 'Sauvegarde', to: '/settings/backup', icon: HardDrive, visible: canManageUsers(role) },
      ],
    },
  ];

  return (
    <aside
      className={cn(
        'sidebar-shell hidden h-full shrink-0 overflow-hidden text-white shadow-2xl transition-all duration-300 motion-reduce:transition-none lg:flex lg:flex-col',
        sidebarCollapsed ? 'w-[76px]' : 'w-[292px]',
      )}
    >
      <div className="relative border-b border-white/10 p-3">
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5" />
        <div
          className={cn(
            'relative flex items-center',
            sidebarCollapsed ? 'justify-center' : 'justify-between gap-2 px-1',
          )}
        >
          {sidebarCollapsed ? (
            <img
              src={sidebarLogo}
              alt="Hotel Metrics Pro"
              className="h-9 w-9 rounded-lg object-contain"
            />
          ) : (
            <div className="flex min-w-0 items-center gap-3">
              <div className="rounded-lg bg-white/10 p-2 ring-1 ring-white/15">
                <img src={sidebarLogo} alt="Hotel Metrics Pro" className="h-10 w-10 rounded-lg object-contain" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-heading text-base font-semibold">Hotel Metrics</p>
                <p className="text-xs text-white/45">Executive Suite</p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className={cn(
              'shrink-0 text-white/80 hover:bg-white/10 hover:text-white',
              sidebarCollapsed && 'absolute -right-1 top-1/2 h-7 w-7 -translate-y-1/2',
            )}
            aria-label={sidebarCollapsed ? 'Déplier le menu' : 'Replier le menu'}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4 scrollbar-thin">
        {groups.map((group) => {
          const items = group.items.filter((item) => item.visible !== false);
          if (!items.length) return null;

          return (
            <div key={group.title}>
              {!sidebarCollapsed && (
                <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.24em] text-white/32">
                  {group.title}
                </p>
              )}
              <div className="space-y-1">
                {items.map((item) => (
                  <NavItem key={item.to} item={item} collapsed={sidebarCollapsed} />
                ))}
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
