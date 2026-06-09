import { Bell, LogOut, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth.store';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials =
    user?.fullName
      ?.split(' ')
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() ?? 'U';

  return (
    <header className="sticky top-0 z-20 flex h-[4.25rem] shrink-0 items-center justify-between border-b border-border/80 bg-card/90 px-6 backdrop-blur-md lg:px-8">
      <div className="min-w-0 border-l-[3px] border-primary pl-4">
        <h1 className="truncate font-heading text-base font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {subtitle && (
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="cursor-pointer text-muted-foreground transition-colors duration-200 hover:text-foreground"
          aria-label="Notifications"
          disabled
        >
          <Bell className="h-4 w-4" strokeWidth={1.75} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="cursor-pointer text-muted-foreground transition-colors duration-200 hover:text-foreground"
          aria-label="Paramètres"
          onClick={() => navigate('/settings')}
        >
          <Settings className="h-4 w-4" strokeWidth={1.75} />
        </Button>

        <div className="ml-2 flex items-center gap-2 border-l border-border pl-3 sm:gap-3">
          <div className="min-w-0 text-right">
            <p className="max-w-[140px] truncate text-sm font-medium leading-tight sm:max-w-[200px]">
              {user?.fullName ?? 'Utilisateur'}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {user?.roleLabel ?? user?.role ?? '—'}
            </p>
          </div>
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-brand-blue text-xs font-semibold text-white shadow-sm ring-2 ring-white"
            title={user?.fullName ?? 'Utilisateur'}
          >
            {initials}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="hidden cursor-pointer gap-1.5 sm:inline-flex"
            onClick={() => void handleLogout()}
          >
            <LogOut className="h-4 w-4" strokeWidth={1.75} />
            Déconnexion
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="cursor-pointer text-muted-foreground transition-colors duration-200 hover:text-destructive sm:hidden"
            onClick={() => void handleLogout()}
            aria-label="Déconnexion"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.75} />
          </Button>
        </div>
      </div>
    </header>
  );
}
