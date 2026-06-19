import { CalendarDays, LogOut, Menu, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth.store';
import { useUiStore } from '@/stores/ui.store';

interface PremiumHeaderProps {
  title: string;
  subtitle?: string;
}

export function PremiumHeader({ title, subtitle }: PremiumHeaderProps) {
  const navigate = useNavigate();
  const setMobileNavOpen = useUiStore((s) => s.setMobileNavOpen);
  const { user, logout } = useAuthStore();
  const initials = user?.fullName?.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() ?? 'U';
  const today = new Intl.DateTimeFormat('fr-DZ', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date());

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/95 px-4 py-2.5 backdrop-blur-xl sm:px-6 sm:py-3 lg:px-8">
      <div className="flex items-center gap-3 sm:gap-5">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0 lg:hidden"
          aria-label="Ouvrir le menu"
          onClick={() => setMobileNavOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate font-heading text-base font-semibold tracking-tight text-foreground sm:text-lg lg:text-xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="truncate text-[11px] text-muted-foreground sm:text-xs">{subtitle}</p>
          ) : null}
        </div>

        <div className="hidden shrink-0 items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground shadow-sm md:flex xl:px-3">
          <CalendarDays className="h-4 w-4 text-primary" />
          <span className="hidden xl:inline">{today}</span>
          <span className="xl:hidden">{today.split(' ').slice(0, 2).join(' ')}</span>
        </div>

        <div className="flex shrink-0 items-center gap-1 rounded-lg border border-border bg-card p-1 shadow-sm sm:gap-2 sm:p-1.5">
          <div className="hidden px-1 text-right sm:block sm:px-2">
            <p className="max-w-[120px] truncate text-xs font-semibold text-foreground sm:max-w-[180px] sm:text-sm">
              {user?.fullName ?? 'Utilisateur'}
            </p>
            <p className="hidden text-[11px] text-muted-foreground md:block">
              {user?.roleLabel ?? user?.role ?? '—'}
            </p>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-[10px] font-bold text-primary-foreground sm:h-9 sm:w-9 sm:text-xs">
            {initials}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground sm:h-10 sm:w-10"
            onClick={() => navigate('/settings')}
            aria-label="Paramètres"
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive sm:h-10 sm:w-10"
            onClick={() => void handleLogout()}
            aria-label="Déconnexion"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
