import { LogOut, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';

interface SidebarUserFooterProps {
  collapsed: boolean;
  onNavigate?: () => void;
}

export function SidebarUserFooter({ collapsed, onNavigate }: SidebarUserFooterProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const initials =
    user?.fullName
      ?.split(' ')
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() ?? 'U';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="border-t border-white/[0.08] p-3">
      <div
        className={cn(
          'flex items-center gap-2',
          collapsed ? 'flex-col' : 'rounded-lg bg-white/[0.06] p-2',
        )}
      >
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-gold to-amber-600 text-xs font-bold text-white shadow-sm"
          title={user?.fullName ?? 'Utilisateur'}
        >
          {initials}
        </div>

        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{user?.fullName ?? 'Utilisateur'}</p>
            <p className="truncate text-[11px] text-white/50">
              {user?.roleLabel ?? user?.role ?? '—'}
            </p>
          </div>
        )}

        <div className={cn('flex shrink-0 gap-0.5', collapsed && 'flex-col')}>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 cursor-pointer text-white/70 hover:bg-white/10 hover:text-white"
            aria-label="Paramètres"
            onClick={() => {
              onNavigate?.();
              navigate('/settings');
            }}
          >
            <Settings className="h-4 w-4" strokeWidth={1.75} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 cursor-pointer text-white/70 hover:bg-red-500/20 hover:text-red-200"
            aria-label="Déconnexion"
            onClick={() => {
              onNavigate?.();
              void handleLogout();
            }}
          >
            <LogOut className="h-4 w-4" strokeWidth={1.75} />
          </Button>
        </div>
      </div>

      {!collapsed && (
        <p className="mt-2 text-center text-[10px] text-white/30">v0.8.0 · Enterprise</p>
      )}
    </div>
  );
}
