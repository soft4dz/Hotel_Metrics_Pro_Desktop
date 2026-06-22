import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { clampMenuPosition } from '@/lib/clampMenuPosition';
import {
  useIsNavLabelsFull,
  useIsNavLabelsVisible,
} from '@/hooks/useMediaQuery';
import { useSidebarNav, type SidebarModule } from '@/hooks/useSidebarNav';

function NavbarModuleDropdown({
  module,
  isOpen,
  onToggle,
  onClose,
  onNavigate,
  showLabels,
  showFullLabels,
}: {
  module: SidebarModule;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onNavigate?: () => void;
  showLabels: boolean;
  showFullLabels: boolean;
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
      (item.to !== '/' && item.to !== '/modules' && pathname.startsWith(`${item.to}/`)) ||
      (item.to === '/modules' && pathname.startsWith('/modules')),
  );

  const hasBadge = items.some((i) => i.badge != null && i.badge > 0);

  const labelText = showFullLabels ? module.title : module.title.split(' ')[0];

  const updatePanelPos = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const menuWidth = Math.min(320, window.innerWidth - 16);
    const menuHeight = Math.min(420, 56 + items.length * 40);
    setPanelPos(clampMenuPosition(rect, menuWidth, menuHeight));
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
  }, [isOpen, items.length]);

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

  const triggerClass = cn(
    'relative flex shrink-0 items-center gap-1 rounded-lg px-2 py-2 text-sm font-medium transition-colors duration-150 lg:px-2.5 2xl:px-3',
    moduleActive || isOpen ? 'navbar-nav-active' : 'navbar-nav-idle',
  );

  if (items.length === 1) {
    return (
      <NavLink
        to={items[0].to}
        title={items[0].label}
        onClick={onNavigate}
        className={({ isActive }) => cn(triggerClass, isActive || moduleActive ? 'navbar-nav-active' : 'navbar-nav-idle')}
      >
        <Icon className="h-4 w-4 shrink-0 [&_svg]:stroke-[1.75]" aria-hidden />
        {showLabels ? (
          <span className="max-w-[9rem] truncate 2xl:max-w-[12rem]">{showFullLabels ? items[0].label : labelText}</span>
        ) : null}
        {items[0].badge != null && items[0].badge > 0 && (
          <span className="rounded-full bg-gold px-1.5 py-0.5 text-[10px] font-semibold text-gold-foreground">
            {items[0].badge}
          </span>
        )}
      </NavLink>
    );
  }

  const dropdownPanel = isOpen
    ? createPortal(
        <div
          ref={panelRef}
          role="menu"
          style={{ top: panelPos.top, left: panelPos.left }}
          className="navbar-dropdown fixed z-[100] min-w-[220px] max-w-[min(320px,calc(100vw-1rem))] max-h-[min(70vh,28rem)] overflow-y-auto rounded-xl border border-white/15 p-2 shadow-elevated"
        >
          <p className="mb-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white/50">
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
                    isActive ? 'navbar-nav-active' : 'navbar-nav-idle',
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
        className={triggerClass}
      >
        <Icon className="h-4 w-4 shrink-0 [&_svg]:stroke-[1.75]" aria-hidden />
        {showLabels ? <span className="max-w-[7rem] truncate 2xl:max-w-[11rem]">{labelText}</span> : null}
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 shrink-0 text-white/50 transition-transform duration-200',
            isOpen && 'rotate-180',
          )}
          aria-hidden
        />
        {hasBadge && (
          <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-gold ring-2 ring-transparent lg:right-1 lg:top-1" />
        )}
      </button>
      {dropdownPanel}
    </>
  );
}

interface NavbarNavProps {
  onNavigate?: () => void;
  className?: string;
}

export function NavbarNav({ onNavigate, className }: NavbarNavProps) {
  const { modules, openModuleId, handleToggle, closeOpenModule } = useSidebarNav();
  const showLabels = useIsNavLabelsVisible();
  const showFullLabels = useIsNavLabelsFull();
  const scrollRef = useRef<HTMLElement>(null);
  const [scrollState, setScrollState] = useState({ left: false, right: false });

  const updateScrollFade = () => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setScrollState({
      left: scrollLeft > 4,
      right: scrollLeft + clientWidth < scrollWidth - 4,
    });
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollFade();
    el.addEventListener('scroll', updateScrollFade, { passive: true });
    const ro = new ResizeObserver(updateScrollFade);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateScrollFade);
      ro.disconnect();
    };
  }, [modules.length]);

  return (
    <div className={cn('relative min-w-0 flex-1', className)}>
      {scrollState.left ? (
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-[hsl(var(--sidebar-from)/0.95)] to-transparent"
          aria-hidden
        />
      ) : null}
      {scrollState.right ? (
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-[hsl(var(--sidebar-to)/0.95)] to-transparent"
          aria-hidden
        />
      ) : null}
      <nav
        ref={scrollRef}
        className="navbar-scroll flex min-w-0 items-center gap-0.5 overflow-x-auto px-0.5 scrollbar-none lg:gap-1"
        aria-label="Navigation principale"
      >
        {modules.map((module) => (
          <NavbarModuleDropdown
            key={module.id}
            module={module}
            isOpen={openModuleId === module.id}
            onToggle={() => handleToggle(module.id)}
            onClose={closeOpenModule}
            onNavigate={onNavigate}
            showLabels={showLabels}
            showFullLabels={showFullLabels}
          />
        ))}
      </nav>
    </div>
  );
}
