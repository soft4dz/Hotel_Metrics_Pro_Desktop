import { Link } from 'react-router-dom';
import { CalendarDays, LogOut, Menu, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SyncStatusBadge } from '@/components/common/SyncStatusBadge';
import { NotificationBell } from '@/components/common/NotificationBell';
import { Button } from '@/components/ui/button';
import { NavbarNav } from '@/layouts/NavbarNav';
import { NavbarUserMenu } from '@/layouts/NavbarUserMenu';
import { useAuthStore } from '@/stores/auth.store';
import { useCompanyBranding } from '@/hooks/useCompanyBranding';
import { useUiStore } from '@/stores/ui.store';
import { DEFAULT_HOME_PATH } from '@/shared/constants/routes';

export function TopNavbar() {
  const navigate = useNavigate();
  const setMobileNavOpen = useUiStore((s) => s.setMobileNavOpen);
  const { user, logout } = useAuthStore();
  const { logoUrl, companyName } = useCompanyBranding();

  const initials =
    user?.fullName
      ?.split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() ?? 'U';

  const today = new Intl.DateTimeFormat('fr-DZ', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="navbar-shell sticky top-0 z-30 shrink-0 border-b border-white/10 shadow-sm safe-top">
      <div className="layout-navbar mx-auto flex h-14 items-center gap-2 sm:h-[3.75rem] sm:gap-3 lg:h-16 2xl:h-[4.25rem]">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 text-white/80 hover:bg-white/10 hover:text-white lg:hidden"
          aria-label="Ouvrir le menu"
          onClick={() => setMobileNavOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <Link
          to={DEFAULT_HOME_PATH}
          className="flex shrink-0 items-center gap-2 rounded-lg py-1 pr-1 transition-colors hover:bg-white/5 sm:gap-2.5 sm:pr-2"
        >
          <img
            src={logoUrl}
            alt={companyName}
            className="h-8 w-8 rounded-lg object-contain ring-1 ring-white/20 sm:h-9 sm:w-9"
          />
          <div className="hidden min-w-0 sm:block">
            <p className="truncate text-sm font-bold leading-tight text-white lg:text-[15px] 2xl:text-base">
              Raqmi System
            </p>
            <p className="hidden text-[10px] leading-tight text-white/50 sm:block 2xl:text-[11px]">
              ERP Desktop
            </p>
          </div>
        </Link>

        <div className="hidden min-w-0 flex-1 lg:flex">
          <NavbarNav />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-1.5 md:gap-2">
          <SyncStatusBadge
            compact
            className="border-amber-300/40 bg-amber-400/15 text-amber-50 hover:bg-amber-400/25 md:inline-flex"
          />

          <NotificationBell />

          <div className="hidden items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs text-white/70 md:flex lg:px-3 2xl:text-sm">
            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-gold 2xl:h-4 2xl:w-4" />
            <span className="hidden 2xl:inline">{today}</span>
            <span className="hidden lg:inline 2xl:hidden">{today.split(' ').slice(0, 2).join(' ')}</span>
            <span className="lg:hidden">{today.split(' ')[0]}</span>
          </div>

          <NavbarUserMenu initials={initials} />

          <div className="hidden items-center gap-0.5 rounded-lg border border-white/15 bg-white/5 p-0.5 sm:flex sm:gap-1 sm:p-1">
            <div className="hidden px-1 text-right md:block md:px-2">
              <p className="max-w-[88px] truncate text-xs font-semibold text-white lg:max-w-[120px] 2xl:max-w-[180px] 2xl:text-sm">
                {user?.fullName ?? 'Utilisateur'}
              </p>
              <p className="hidden text-[10px] text-white/50 xl:block 2xl:text-[11px]">
                {user?.roleLabel ?? user?.role ?? '—'}
              </p>
            </div>
            <div className="hidden h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-gold to-amber-600 text-[10px] font-bold text-white sm:flex md:h-9 md:w-9">
              {initials}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/70 hover:bg-white/10 hover:text-white md:h-9 md:w-9"
              onClick={() => navigate('/settings')}
              aria-label="Paramètres"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/70 hover:bg-red-500/20 hover:text-red-200 md:h-9 md:w-9"
              onClick={() => void handleLogout()}
              aria-label="Déconnexion"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
