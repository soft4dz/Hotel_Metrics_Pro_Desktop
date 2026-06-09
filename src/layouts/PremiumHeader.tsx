import { CalendarDays, LogOut, Settings } from 'lucide-react';
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
  const today = new Intl.DateTimeFormat('fr-DZ', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date());

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-[#F8FAFC]/88 px-6 py-3 backdrop-blur-xl lg:px-8">
      <div className="flex items-center justify-between gap-5">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">Hotel Metrics Pro</p>
          <h1 className="mt-1 truncate font-heading text-xl font-semibold tracking-tight text-slate-950">{title}</h1>
          {subtitle ? <p className="truncate text-xs text-slate-500">{subtitle}</p> : null}
        </div>

        <div className="hidden items-center gap-2 rounded-2xl border bg-white px-3 py-2 text-sm text-slate-500 shadow-sm xl:flex">
          <CalendarDays className="h-4 w-4 text-primary" />
          {today}
        </div>

        <div className="flex items-center gap-2 rounded-2xl border bg-white p-1.5 shadow-sm">
          <div className="hidden px-2 text-right sm:block">
            <p className="max-w-[180px] truncate text-sm font-semibold text-slate-900">{user?.fullName ?? 'Utilisateur'}</p>
            <p className="text-[11px] text-slate-500">{user?.roleLabel ?? user?.role ?? '—'}</p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-xs font-bold text-white">
            {initials}
          </div>
          <Button variant="ghost" size="icon" className="rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-950" onClick={() => navigate('/settings')} aria-label="Paramètres">
            <Settings className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600" onClick={() => void handleLogout()} aria-label="Déconnexion">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
