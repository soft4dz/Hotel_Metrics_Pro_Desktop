import { NavLink, Outlet } from 'react-router-dom';
import { BarChart3, BookOpenCheck, FileText, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { canManageClients } from '@/shared/permissions';

const TABS = [
  { to: '/facturation',         label: 'Tableau de bord', icon: BarChart3,  end: true },
  { to: '/facturation/factures', label: 'Factures',        icon: FileText,   end: false },
  { to: '/facturation/registre', label: 'Registre',        icon: BookOpenCheck, end: false },
  { to: '/clients',              label: 'Clients',         icon: Users,      end: false, visible: canManageClients },
];

export function FacturationIndexPage() {
  const role = useAuthStore((s) => s.user?.role);
  const tabs = TABS.filter((tab) => !tab.visible || tab.visible(role));
  return (
    <div className="space-y-5">
      <nav className="flex gap-1 overflow-x-auto rounded-xl border border-border/60 bg-white px-2 py-1.5 shadow-sm">
        {tabs.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => cn(
              'flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors',
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-slate-50 hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            {label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
