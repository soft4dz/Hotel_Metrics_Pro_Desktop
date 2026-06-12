import type { ComponentType } from 'react';
import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Anchor,
  BarChart3,
  BedDouble,
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
  Tag,
  Wallet,
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
          'group flex items-center rounded-lg text-sm transition-colors duration-150',
          collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2',
          isActive
            ? 'bg-primary/[0.08] font-semibold text-primary'
            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            className={cn(
              'shrink-0 transition-colors',
              collapsed ? 'h-5 w-5' : 'h-4 w-4',
              isActive ? 'text-primary' : 'text-slate-400 group-hover:text-slate-600',
            )}
          />
          {!collapsed && <span className="truncate">{item.label}</span>}
        </>
      )}
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
        { label: 'Hébergement & Occupation', to: '/hebergement', icon: BedDouble },
        { label: 'Tarifs & Conventions', to: '/tarifs', icon: Tag },
        { label: 'Encaissements & Trésorerie', to: '/encaissements', icon: Wallet },
        { label: 'Facturation', to: '/facturation', icon: Receipt },
        { label: 'Clients', to: '/clients', icon: Users },
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
        'hidden h-full shrink-0 flex-col overflow-hidden border-r border-slate-200/80 bg-white transition-all duration-300 motion-reduce:transition-none lg:flex',
        sidebarCollapsed ? 'w-[68px]' : 'w-[248px]',
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          'flex h-16 items-center border-b border-slate-200/70 px-3',
          sidebarCollapsed ? 'justify-center' : 'justify-between gap-2',
        )}
      >
        {sidebarCollapsed ? (
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Déplier le menu"
            className="flex flex-col items-center gap-1.5"
          >
            <img
              src={sidebarLogo}
              alt="Hotel Metrics Pro"
              className="h-8 w-8 rounded-lg object-contain"
            />
            <ChevronRight className="h-3 w-3 text-slate-400" />
          </button>
        ) : (
          <>
            <div className="flex min-w-0 items-center gap-3">
              <img
                src={sidebarLogo}
                alt="Hotel Metrics Pro"
                className="h-8 w-8 shrink-0 rounded-lg object-contain"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900">Hotel Metrics</p>
                <p className="text-[11px] text-slate-400">Pro Desktop</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="shrink-0 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Replier le menu"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-2 py-4 scrollbar-thin">
        {groups.map((group) => {
          const items = group.items.filter((item) => item.visible !== false);
          if (!items.length) return null;

          return (
            <div key={group.title}>
              {!sidebarCollapsed && (
                <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  {group.title}
                </p>
              )}
              {sidebarCollapsed && (
                <div className="mb-1.5 h-px bg-slate-200/60" />
              )}
              <div className="space-y-0.5">
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
