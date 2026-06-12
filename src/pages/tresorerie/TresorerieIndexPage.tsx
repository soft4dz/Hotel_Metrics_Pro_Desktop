import { NavLink, Outlet } from 'react-router-dom';
import { BarChart3, BookOpen, Building2, ListChecks } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { to: '/encaissements', label: 'Tableau de bord', icon: BarChart3, end: true },
  { to: '/encaissements/liste', label: 'Encaissements', icon: ListChecks, end: false },
  { to: '/encaissements/caisse', label: 'Journal de caisse', icon: BookOpen, end: false },
  { to: '/encaissements/comptes', label: 'Comptes bancaires', icon: Building2, end: false },
];

export function TresorerieIndexPage() {
  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <nav className="flex gap-1 overflow-x-auto rounded-xl border border-border/60 bg-white px-2 py-1.5 shadow-sm">
        {TABS.map(({ to, label, icon: Icon, end }) => (
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

      {/* Page content */}
      <Outlet />
    </div>
  );
}
