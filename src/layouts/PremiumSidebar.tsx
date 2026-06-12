import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { APP_LOGO_URL } from '@/lib/logos';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { Button } from '@/components/ui/button';
import { useUiStore } from '@/stores/ui.store';
import { useAuthStore } from '@/stores/auth.store';
import { canManageUsers } from '@/shared/permissions';
import {
  buildSidebarModules,
  findActiveModuleId,
  type SidebarModule,
  type SidebarNavItem,
} from '@/layouts/sidebarModules';

function NavLeaf({
  item,
  collapsed,
  onNavigate,
}: {
  item: SidebarNavItem;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <NavLink
      to={item.to}
      title={collapsed ? item.label : undefined}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group flex items-center rounded-lg text-sm transition-colors duration-150',
          collapsed ? 'justify-center p-2.5' : 'gap-2.5 py-2 pl-9 pr-3',
          isActive
            ? 'bg-primary/[0.08] font-semibold text-primary'
            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800',
        )
      }
    >
      {!collapsed && (
        <>
          <span className="truncate">{item.label}</span>
          {item.badge != null && item.badge > 0 && (
            <span className="ml-auto rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              {item.badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

function ModuleDropdown({
  module,
  collapsed,
  isOpen,
  onToggle,
}: {
  module: SidebarModule;
  collapsed: boolean;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const { pathname } = useLocation();
  const Icon = module.icon;
  const items = module.items.filter((i) => i.visible !== false);
  if (!items.length) return null;

  const moduleActive = items.some(
    (item) =>
      pathname === item.to ||
      (item.to !== '/' && pathname.startsWith(`${item.to}/`)),
  );

  if (collapsed) {
    return (
      <div className="space-y-0.5">
        {items.map((item) => (
          <NavLeaf key={item.to} item={item} collapsed />
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-lg">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors',
          moduleActive ? 'text-primary' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
        )}
        aria-expanded={isOpen}
      >
        <Icon className={cn('h-4 w-4 shrink-0', moduleActive ? 'text-primary' : 'text-slate-400')} />
        <span className="flex-1 truncate">{module.title}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200',
            isOpen && 'rotate-180',
          )}
        />
      </button>

      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-200 ease-out',
          isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          <div className="space-y-0.5 pb-1 pt-0.5">
            {items.map((item) => (
              <NavLeaf key={item.to} item={item} collapsed={false} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PremiumSidebar() {
  const role = useAuthStore((state) => state.user?.role);
  const { sidebarCollapsed, toggleSidebar } = useUiStore();
  const { pathname } = useLocation();
  const [brandLogoUrl, setBrandLogoUrl] = useState(APP_LOGO_URL);
  const [pendingUsers, setPendingUsers] = useState(0);
  const [openModuleId, setOpenModuleId] = useState<string | null>(null);

  const modules = useMemo(
    () =>
      buildSidebarModules(role, pendingUsers).filter((mod) => {
        if (mod.visible === false) return false;
        return mod.items.some((item) => item.visible !== false);
      }),
    [role, pendingUsers],
  );

  useEffect(() => {
    ipcClient.settings
      .getBranding()
      .then((result) => {
        if (result.ok && result.data?.companyLogoUrl) {
          setBrandLogoUrl(result.data.companyLogoUrl);
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!canManageUsers(role)) return;
    void ipcClient.users
      .pendingCount()
      .then((r) => setPendingUsers(unwrapIpc(r)))
      .catch(() => setPendingUsers(0));
  }, [role, pathname]);

  useEffect(() => {
    const activeId = findActiveModuleId(modules, pathname);
    if (activeId) setOpenModuleId(activeId);
  }, [pathname, modules]);

  const handleToggle = (moduleId: string) => {
    setOpenModuleId((prev) => (prev === moduleId ? null : moduleId));
  };

  const sidebarLogo = brandLogoUrl || APP_LOGO_URL;

  return (
    <aside
      className={cn(
        'hidden h-full shrink-0 flex-col overflow-hidden border-r border-slate-200/80 bg-white transition-all duration-300 motion-reduce:transition-none lg:flex',
        sidebarCollapsed ? 'w-[68px]' : 'w-[248px]',
      )}
    >
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
            <img src={sidebarLogo} alt="Hotel Metrics Pro" className="h-8 w-8 rounded-lg object-contain" />
            <ChevronRight className="h-3 w-3 text-slate-400" />
          </button>
        ) : (
          <>
            <div className="flex min-w-0 items-center gap-3">
              <img src={sidebarLogo} alt="Hotel Metrics Pro" className="h-8 w-8 shrink-0 rounded-lg object-contain" />
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

      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4 scrollbar-thin">
        {modules.map((module) => (
          <ModuleDropdown
            key={module.id}
            module={module}
            collapsed={sidebarCollapsed}
            isOpen={!sidebarCollapsed && openModuleId === module.id}
            onToggle={() => handleToggle(module.id)}
          />
        ))}
      </nav>
    </aside>
  );
}
