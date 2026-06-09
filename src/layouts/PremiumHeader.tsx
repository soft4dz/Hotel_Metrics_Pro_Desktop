import { LogOut, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth.store';

interface PremiumHeaderProps {
  title: string;
  subtitle?: string;
}

export function PremiumHeader({ title, subtitle }: PremiumHeaderProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const initials = user?.fullName?.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() ?? 'U';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-20 border-b border-white/70 bg-white/80 px-6 py-3 shadow-sm backdrop-blur-xl lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 border-l-4 border-primary pl-4">
          <h1 className="truncate font-heading text-lg font-semibold tracking-tight">{title}</h1>
          {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
        <div className="flex items-center gap-2 rounded-2xl border bg-card/90 p-1.5 shadow-sm">
          <div className="hidden px-2 text-right sm:block">
            <p className="max-w-[180px] truncate text-sm font-semibold">{user?.fullName ?? 'Utilisateur'}</p>
            <p className="text-[11px] text-muted-foreground">{user?.roleLabel ?? user?.role ?? '—'}</p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-xs font-bold text-white">
            {initials}
          </div>
          <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => navigate('/settings')} aria-label="Paramètres">
            <Settings className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-xl text-muted-foreground hover:text-destructive" onClick={() => void handleLogout()} aria-label="Déconnexion">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
