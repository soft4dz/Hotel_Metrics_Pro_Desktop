import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LogOut, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { clampMenuPosition } from '@/lib/clampMenuPosition';
import { useAuthStore } from '@/stores/auth.store';

interface NavbarUserMenuProps {
  initials: string;
}

export function NavbarUserMenu({ initials }: NavbarUserMenuProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const updatePos = () => {
    const el = triggerRef.current;
    if (!el) return;
    setPos(clampMenuPosition(el.getBoundingClientRect(), 260, 220));
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

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    navigate('/login');
  };

  const panel = open
    ? createPortal(
        <div
          ref={panelRef}
          role="menu"
          style={{ top: pos.top, left: pos.left }}
          className="navbar-dropdown fixed z-[110] w-[min(280px,calc(100vw-1rem))] rounded-xl border border-white/15 p-2 shadow-elevated"
        >
          <div className="mb-2 flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-gold to-amber-600 text-xs font-bold text-white">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{user?.fullName ?? 'Utilisateur'}</p>
              <p className="truncate text-xs text-white/50">{user?.roleLabel ?? user?.role ?? '—'}</p>
            </div>
          </div>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            onClick={() => {
              setOpen(false);
              navigate('/settings');
            }}
          >
            <Settings className="h-4 w-4" />
            Paramètres
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-red-200 transition-colors hover:bg-red-500/20"
            onClick={() => void handleLogout()}
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </button>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <Button
        ref={triggerRef}
        type="button"
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-lg p-0 text-white/80 hover:bg-white/10 hover:text-white sm:hidden"
        aria-label="Menu utilisateur"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-gold to-amber-600 text-[10px] font-bold text-white">
          {initials}
        </span>
      </Button>
      {panel}
    </>
  );
}
