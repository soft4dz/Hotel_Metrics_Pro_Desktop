import type { ComponentType } from 'react';
import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Anchor,
  ArrowRightLeft,
  Banknote,
  BarChart3,
  Bell,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Cloud,
  Database,
  FileText,
  HardDrive,
  History,
  Layers,
  LayoutDashboard,
  ListTree,
  Lock,
  MapPin,
  Palette,
  Receipt,
  Settings,
  Shield,
  Ship,
  Target,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { APP_LOGO_URL } from '@/lib/logos';
import { useUiStore } from '@/stores/ui.store';
import { useAuthStore } from '@/stores/auth.store';
import {
  canManageUsers,
  canManageHotels,
  canReadAudit,
  canSaisieRecettes,
  canValidateRecettes,
  canViewRecettes,
  canViewObjectifs,
  canAccessPortmaster,
  canExportReports,
  canManageSync,
} from '@/shared/permissions';
import { Button } from '@/components/ui/button';

interface NavItem {
  label: string;
  to: string;
  icon: ComponentType<{ className?: string }>;
  disabled?: boolean;
  visible?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUiStore();
  const role = useAuthStore((s) => s.user?.role);
  const { pathname } = useLocation();

  const navGroups: NavGroup[] = [
    {
      title: 'Exploitation',
      items: [
        { label: 'Dashboard global', to: '/dashboard', icon: LayoutDashboard, visible: true },
        {
          label: 'Saisie journalière',
          to: '/recettes/journalieres',
          icon: Receipt,
          visible: canSaisieRecettes(role),
        },
        {
          label: 'Historique recettes',
          to: '/recettes/historique',
          icon: History,
          visible: canViewRecettes(role),
        },
        {
          label: 'Validation recettes',
          to: '/recettes/validation',
          icon: ClipboardCheck,
          visible: canValidateRecettes(role),
        },
        {
          label: 'Saisie mensuelle',
          to: '/recettes/mensuelles',
          icon: Receipt,
          visible: canSaisieRecettes(role),
        },
        {
          label: 'Objectifs',
          to: '/objectifs',
          icon: Target,
          visible: canViewObjectifs(role),
        },
      ],
    },
    {
      title: 'PortMaster',
      items: [
        {
          label: 'Dashboard port',
          to: '/portmaster',
          icon: Anchor,
          visible: canAccessPortmaster(role),
        },
        {
          label: 'Référentiel port',
          to: '/portmaster/referentiel',
          icon: Layers,
          visible: canAccessPortmaster(role),
        },
        {
          label: 'Clients port',
          to: '/portmaster/clients',
          icon: Users,
          visible: canAccessPortmaster(role),
        },
        {
          label: 'Bateaux',
          to: '/portmaster/bateaux',
          icon: Ship,
          visible: canAccessPortmaster(role),
        },
        {
          label: 'Contrats',
          to: '/portmaster/contrats',
          icon: FileText,
          visible: canAccessPortmaster(role),
        },
        {
          label: 'Emplacements',
          to: '/portmaster/emplacements',
          icon: MapPin,
          visible: canAccessPortmaster(role),
        },
        {
          label: 'Factures',
          to: '/portmaster/factures',
          icon: Receipt,
          visible: canAccessPortmaster(role),
        },
        {
          label: 'Tarifs',
          to: '/portmaster/tarifs',
          icon: BarChart3,
          visible: canAccessPortmaster(role),
        },
        {
          label: 'Validations',
          to: '/portmaster/validations',
          icon: ClipboardCheck,
          visible: canAccessPortmaster(role),
        },
        {
          label: 'Mouvements',
          to: '/portmaster/mouvements',
          icon: ArrowRightLeft,
          visible: canAccessPortmaster(role),
        },
        {
          label: 'Recouvrement',
          to: '/portmaster/recouvrement',
          icon: Banknote,
          visible: canAccessPortmaster(role),
        },
      ],
    },
    {
      title: 'Administration',
      items: [
        {
          label: 'Hôtels / unités',
          to: '/admin/hotels',
          icon: Building2,
          visible: canManageHotels(role),
        },
        {
          label: 'Utilisateurs',
          to: '/admin/users',
          icon: Users,
          visible: canManageUsers(role),
        },
        {
          label: 'Rôles',
          to: '/admin/roles',
          icon: Shield,
          visible: canManageUsers(role),
        },
        {
          label: 'Rubriques',
          to: '/admin/rubriques',
          icon: ListTree,
          visible: canManageHotels(role),
        },
      ],
    },
    {
      title: 'Rapports',
      items: [
        {
          label: 'Rapports & exports',
          to: '/rapports',
          icon: BarChart3,
          visible: canExportReports(role),
        },
      ],
    },
    {
      title: 'Système',
      items: [
        {
          label: 'Synchronisation',
          to: '/system/sync',
          icon: Cloud,
          visible: canManageSync(role),
        },
        {
          label: "Journal d'audit",
          to: '/audit/logs',
          icon: ClipboardList,
          visible: canReadAudit(role),
        },
      ],
    },
    {
      title: 'Paramètres',
      items: [
        { label: 'Général', to: '/settings', icon: Settings },
        { label: 'Interface & Thème', to: '/settings/interface', icon: Palette },
        { label: 'Notifications', to: '/settings/notifications', icon: Bell },
        { label: 'Sécurité & Accès', to: '/settings/securite', icon: Lock },
        {
          label: 'Base de données',
          to: '/settings/database',
          icon: Database,
          visible: canManageUsers(role),
        },
        {
          label: 'Sauvegarde',
          to: '/settings/backup',
          icon: HardDrive,
          visible: canManageUsers(role),
        },
      ],
    },
  ];

  // Open the group containing the active route + Exploitation by default
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const active = navGroups.find((g) =>
      g.items.some((i) => !i.disabled && i.to.length > 1 && pathname.startsWith(i.to)),
    );
    const initial = new Set<string>(['Exploitation']);
    if (active) initial.add(active.title);
    return initial;
  });

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-white/[0.06] bg-gradient-to-b from-[#0F172A] via-[#1E3A8A] to-[#172554] text-white shadow-sidebar transition-all duration-300 motion-reduce:transition-none',
        sidebarCollapsed ? 'w-[72px]' : 'w-[260px]',
      )}
    >
      <div className="flex h-[4.25rem] items-center justify-between border-b border-white/[0.08] px-3">
        {sidebarCollapsed ? (
          <img
            src={APP_LOGO_URL}
            alt="Hotel Metrics Pro"
            className="mx-auto h-9 w-9 rounded-lg object-contain"
          />
        ) : (
          <div className="flex items-center gap-3 px-1">
            <img
              src={APP_LOGO_URL}
              alt="Hotel Metrics Pro"
              className="h-10 w-10 rounded-xl object-contain shadow-lg"
            />
            <div className="leading-tight">
              <p className="font-heading text-sm font-semibold tracking-tight">Hotel Metrics</p>
              <p className="text-[10px] font-medium text-white/50">Pro Desktop</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="cursor-pointer text-white/80 transition-colors duration-200 hover:bg-white/10 hover:text-white"
          aria-label={sidebarCollapsed ? 'Déplier le menu' : 'Replier le menu'}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-4 scrollbar-thin">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter(
            (item) => item.disabled || item.visible !== false,
          );
          if (visibleItems.length === 0) return null;

          // In collapsed mode all groups stay "open" (icons only, no labels)
          const isOpen = sidebarCollapsed || openGroups.has(group.title);

          return (
            <div key={group.title} className="mb-1">
              {!sidebarCollapsed && (
                <button
                  type="button"
                  onClick={() => toggleGroup(group.title)}
                  className="mb-1 flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/40 transition-colors duration-150 hover:bg-white/[0.04] hover:text-white/60"
                >
                  <span>{group.title}</span>
                  <ChevronDown
                    className={cn(
                      'h-3 w-3 transition-transform duration-200 motion-reduce:transition-none',
                      isOpen ? 'rotate-0' : '-rotate-90',
                    )}
                  />
                </button>
              )}

              <div
                className={cn(
                  'overflow-hidden transition-all duration-200 motion-reduce:transition-none',
                  isOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0',
                )}
              >
                <ul className="space-y-0.5 pb-2">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    if (item.disabled) {
                      return (
                        <li key={item.to}>
                          <span
                            className={cn(
                              'flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/35',
                              sidebarCollapsed && 'justify-center px-2',
                            )}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            {!sidebarCollapsed && (
                              <>
                                <span>{item.label}</span>
                                <span className="ml-auto rounded-md bg-white/10 px-1.5 py-0.5 text-[10px]">
                                  Bientôt
                                </span>
                              </>
                            )}
                          </span>
                        </li>
                      );
                    }

                    return (
                      <li key={item.to}>
                        <NavLink
                          to={item.to}
                          className={({ isActive }) =>
                            cn(
                              'group relative flex cursor-pointer items-center gap-3 rounded-lg border-l-2 border-transparent py-2.5 pl-2.5 pr-3 text-sm transition-all duration-200 motion-reduce:transition-none',
                              sidebarCollapsed && 'justify-center border-l-0 px-2',
                              isActive
                                ? 'border-brand-gold bg-white/12 font-medium text-white'
                                : 'text-white/70 hover:border-white/20 hover:bg-white/[0.08] hover:text-white',
                            )
                          }
                        >
                          <Icon className="h-4 w-4 shrink-0 opacity-90 group-hover:opacity-100" />
                          {!sidebarCollapsed && <span>{item.label}</span>}
                        </NavLink>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
