import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SidebarUserFooter } from '@/layouts/SidebarUserFooter';
import {
  useSidebarNav,
  type SidebarModule,
} from '@/hooks/useSidebarNav';
import type { SidebarNavItem } from '@/layouts/sidebarModules';

function NavLeaf({
  item,
  onNavigate,
}: {
  item: SidebarNavItem;
  onNavigate?: () => void;
}) {
  return (
    <NavLink
      to={item.to}
      title={item.label}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group flex items-center gap-2.5 rounded-lg py-2 pl-9 pr-3 text-sm transition-colors duration-150',
          isActive ? 'sidebar-nav-active' : 'sidebar-nav-idle',
        )
      }
    >
      <span className="sidebar-nav-label truncate">{item.label}</span>
      {item.badge != null && item.badge > 0 && (
        <span className="ml-auto rounded-full bg-gold px-1.5 py-0.5 text-[10px] font-semibold text-gold-foreground">
          {item.badge}
        </span>
      )}
    </NavLink>
  );
}

function CollapsedModuleFlyout({
  module,
  isOpen,
  onToggle,
  onClose,
  onNavigate,
}: {
  module: SidebarModule;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onNavigate?: () => void;
}) {
  const { pathname } = useLocation();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const Icon = module.icon;
  const items = module.items.filter((i) => i.visible !== false);
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0 });

  if (!items.length) return null;

  const moduleActive = items.some(
    (item) =>
      pathname === item.to ||
      (item.to !== '/' && pathname.startsWith(`${item.to}/`)),
  );

  const hasBadge = items.some((i) => i.badge != null && i.badge > 0);

  const updatePanelPos = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPanelPos({
      top: rect.top,
      left: rect.right + 8,
    });
  };

  useEffect(() => {
    if (!isOpen) return;
    updatePanelPos();
    window.addEventListener('resize', updatePanelPos);
    window.addEventListener('scroll', updatePanelPos, true);
    return () => {
      window.removeEventListener('resize', updatePanelPos);
      window.removeEventListener('scroll', updatePanelPos, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      onClose();
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [isOpen, onClose]);

  if (items.length === 1) {
    return (
      <NavLink
        to={items[0].to}
        title={items[0].label}
        onClick={onNavigate}
        className={({ isActive }) =>
          cn(
            'relative flex w-full items-center justify-center rounded-lg p-2.5 transition-colors duration-150',
            isActive || moduleActive ? 'sidebar-nav-active' : 'sidebar-nav-idle',
          )
        }
      >
        <Icon className="h-[18px] w-[18px] shrink-0 [&_svg]:stroke-[1.75]" aria-hidden />
        {hasBadge && (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-gold ring-2 ring-transparent" />
        )}
      </NavLink>
    );
  }

  const flyoutPanel = isOpen
    ? createPortal(
        <div
          ref={panelRef}
          role="menu"
          style={{ top: panelPos.top, left: panelPos.left }}
          className="sidebar-flyout fixed z-[100] min-w-[240px] max-w-[min(320px,calc(100vw-5rem))] rounded-xl border border-white/15 p-2 shadow-elevated"
        >
          <p className="sidebar-nav-label mb-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white/50">
            {module.title}
          </p>
          <div className="space-y-0.5">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                role="menuitem"
                onClick={() => {
                  onNavigate?.();
                  onClose();
                }}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                    isActive ? 'sidebar-nav-active' : 'sidebar-nav-idle',
                  )
                }
              >
                <span className="truncate">{item.label}</span>
                {item.badge != null && item.badge > 0 && (
                  <span className="ml-auto rounded-full bg-gold px-1.5 py-0.5 text-[10px] font-semibold text-gold-foreground">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={onToggle}
        title={module.title}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className={cn(
          'relative flex w-full items-center justify-center rounded-lg p-2.5 transition-colors duration-150',
          moduleActive || isOpen ? 'sidebar-nav-active' : 'sidebar-nav-idle',
        )}
      >
        <Icon className="h-[18px] w-[18px] shrink-0 [&_svg]:stroke-[1.75]" aria-hidden />
        {hasBadge && (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-gold ring-2 ring-transparent" />
        )}
      </button>
      {flyoutPanel}
    </>
  );
}

function ModuleDropdown({
  module,
  collapsed,
  isOpen,
  onToggle,
  flyoutOpen,
  onFlyoutToggle,
  onFlyoutClose,
  onNavigate,
}: {
  module: SidebarModule;
  collapsed: boolean;
  isOpen: boolean;
  onToggle: () => void;
  flyoutOpen: boolean;
  onFlyoutToggle: () => void;
  onFlyoutClose: () => void;
  onNavigate?: () => void;
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
      <CollapsedModuleFlyout
        module={module}
        isOpen={flyoutOpen}
        onToggle={onFlyoutToggle}
        onClose={onFlyoutClose}
        onNavigate={onNavigate}
      />
    );
  }

  if (items.length === 1) {
    return (
      <NavLink
        to={items[0].to}
        onClick={onNavigate}
        className={({ isActive }) =>
          cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150',
            isActive || moduleActive ? 'sidebar-nav-active' : 'sidebar-nav-idle',
          )
        }
      >
        <Icon className="h-4 w-4 shrink-0 [&_svg]:stroke-[1.75]" aria-hidden />
        <span className="sidebar-nav-label flex-1 truncate">{items[0].label}</span>
        {items[0].badge != null && items[0].badge > 0 && (
          <span className="rounded-full bg-gold px-1.5 py-0.5 text-[10px] font-semibold text-gold-foreground">
            {items[0].badge}
          </span>
        )}
      </NavLink>
    );
  }

  return (
    <div className="rounded-lg">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors duration-150',
          moduleActive ? 'text-white' : 'sidebar-nav-idle',
        )}
        aria-expanded={isOpen}
      >
        <Icon className={cn('h-4 w-4 shrink-0', moduleActive ? 'text-white' : 'text-white/60')} aria-hidden />
        <span className="sidebar-nav-label flex-1 truncate">{module.title}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-white/50 transition-transform duration-200',
            isOpen && 'rotate-180',
          )}
          aria-hidden
        />
      </button>

      {isOpen && (
        <div className="space-y-0.5 pb-1 pt-0.5">
          {items.map((item) => (
            <NavLeaf key={item.to} item={item} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  );
}

interface SidebarNavProps {
  collapsed?: boolean;
  showCollapseControl?: boolean;
  onToggleCollapse?: () => void;
  onNavigate?: () => void;
  className?: string;
}

export function SidebarNav({
  collapsed = false,
  showCollapseControl = false,
  onToggleCollapse,
  onNavigate,
  className,
}: SidebarNavProps) {
  const {
    modules,
    brandLogoUrl,
    openModuleId,
    flyoutModuleId,
    handleToggle,
    toggleFlyout,
    closeFlyout,
    closeOpenModule,
  } = useSidebarNav();

  const prevCollapsed = useRef(collapsed);
  useEffect(() => {
    if (collapsed && !prevCollapsed.current) {
      closeFlyout();
      closeOpenModule();
    }
    prevCollapsed.current = collapsed;
  }, [collapsed, closeFlyout, closeOpenModule]);

  return (
    <div className={cn('flex h-full min-h-0 flex-col', collapsed && 'sidebar-collapsed', className)}>
      <div
        className={cn(
          'flex h-14 shrink-0 items-center border-b border-white/10 px-3 sm:h-16',
          collapsed ? 'justify-center' : 'justify-between gap-2',
        )}
      >
        {!collapsed ? (
          <>
            <div className="flex min-w-0 items-center gap-3">
              <img
                src={brandLogoUrl}
                alt="Hotel Metrics Pro"
                className="h-8 w-8 shrink-0 rounded-lg object-contain ring-1 ring-white/20"
              />
              <div className="min-w-0 sidebar-nav-label">
                <p className="truncate text-sm font-bold text-white">Hotel Metrics</p>
                <p className="text-[11px] text-white/50">Pro Desktop</p>
              </div>
            </div>
            {showCollapseControl && onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="rounded-lg p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Replier le menu"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
          </>
        ) : (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="flex flex-col items-center gap-1"
            aria-label="Déplier le menu"
          >
            <img
              src={brandLogoUrl}
              alt="Hotel Metrics Pro"
              className="h-8 w-8 rounded-lg object-contain ring-1 ring-white/20"
            />
          </button>
        )}
      </div>

      <nav className="sidebar-scroll flex-1 space-y-1 overflow-y-auto px-2 py-3">
        {modules.map((module) => (
          <ModuleDropdown
            key={module.id}
            module={module}
            collapsed={collapsed}
            isOpen={!collapsed && openModuleId === module.id}
            onToggle={() => handleToggle(module.id)}
            flyoutOpen={flyoutModuleId === module.id}
            onFlyoutToggle={() => toggleFlyout(module.id)}
            onFlyoutClose={closeFlyout}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      <SidebarUserFooter collapsed={collapsed} onNavigate={onNavigate} />
    </div>
  );
}
