import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronsUpDown, KeyRound, LogOut, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { clampMenuPosition } from '@/lib/clampMenuPosition';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { useUiStore } from '@/stores/ui.store';
import { translate } from '@/lib/localization';

interface SidebarUserFooterProps {
  collapsed: boolean;
  onNavigate?: () => void;
}

export function SidebarUserFooter({ collapsed, onNavigate }: SidebarUserFooterProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const locale = useUiStore((state) => state.locale);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const initials =
    user?.fullName
      ?.split(' ')
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() ?? 'U';

  const updatePos = () => {
    const el = triggerRef.current;
    if (!el) return;
    setPos(clampMenuPosition(el.getBoundingClientRect(), 240, 216));
  };

  useEffect(() => {
    if (!open) return;
    updatePos();
    window.addEventListener('resize', updatePos);
    window.addEventListener('scroll', updatePos, true);
    return () => {
      window.removeEventListener('resize', updatePos);
      window.removeEventListener('scroll', updatePos, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const goTo = (path: string) => {
    setOpen(false);
    onNavigate?.();
    navigate(path);
  };

  const handleLogout = async () => {
    setOpen(false);
    onNavigate?.();
    await logout();
    navigate('/login');
  };

  const panel = open
    ? createPortal(
        <div
          ref={panelRef}
          role="menu"
          style={{ top: pos.top, left: pos.left }}
          className="sidebar-flyout fixed z-[110] w-[240px] animate-in rounded-xl border border-white/15 p-1.5 shadow-elevated fade-in-0 zoom-in-95 duration-150"
        >
          <div className="mb-1 flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-gold to-amber-600 text-xs font-bold text-white shadow-sm">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{user?.fullName ?? translate(locale, 'Utilisateur')}</p>
              <p className="truncate text-xs text-white/50">{user?.roleLabel ?? user?.role ?? '—'}</p>
            </div>
          </div>

          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            onClick={() => goTo('/settings')}
          >
            <Settings className="h-4 w-4" strokeWidth={1.75} />
            {translate(locale, 'Paramètres')}
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            onClick={() => goTo('/settings/securite')}
          >
            <KeyRound className="h-4 w-4" strokeWidth={1.75} />
            {translate(locale, 'Changer le mot de passe')}
          </button>

          <div className="my-1 h-px bg-white/10" />

          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-red-200 transition-colors hover:bg-red-500/20"
            onClick={() => void handleLogout()}
          >
            <LogOut className="h-4 w-4" strokeWidth={1.75} />
            {translate(locale, 'Déconnexion')}
          </button>
        </div>,
        document.body,
      )
    : null;

  return (
    <div className="border-t border-white/[0.08] p-3">
      <button
        ref={triggerRef}
        type="button"
        aria-label={translate(locale, 'Menu utilisateur')}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex w-full cursor-pointer items-center gap-2 rounded-lg transition-colors duration-150 hover:bg-white/[0.08]',
          collapsed ? 'flex-col justify-center py-1' : 'bg-white/[0.06] p-2',
          open && 'bg-white/[0.1]',
        )}
      >
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-gold to-amber-600 text-xs font-bold text-white shadow-sm"
          title={user?.fullName ?? translate(locale, 'Utilisateur')}
        >
          {initials}
        </div>

        {!collapsed && (
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-sm font-medium text-white">{user?.fullName ?? translate(locale, 'Utilisateur')}</p>
            <p className="truncate text-[11px] text-white/50">
              {user?.roleLabel ?? user?.role ?? '—'}
            </p>
          </div>
        )}

        <ChevronsUpDown
          className={cn('h-3.5 w-3.5 shrink-0 text-white/40', collapsed && 'hidden')}
          strokeWidth={1.75}
        />
      </button>

      {panel}

      {!collapsed && (
        <p className="mt-2 text-center text-[10px] text-white/30">v0.8.0 · Enterprise</p>
      )}
    </div>
  );
}
