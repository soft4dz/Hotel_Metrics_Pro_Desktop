import { NavLink, Outlet } from 'react-router-dom';
import { BarChart3, BookOpen, Calculator, CalendarRange, FileSpreadsheet, ListChecks } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { to: '/comptabilite', label: 'Hub', icon: BarChart3, end: true },
  { to: '/comptabilite/plan', label: 'Plan comptable', icon: BookOpen, end: false },
  { to: '/comptabilite/saisie', label: 'Saisie OD', icon: FileSpreadsheet, end: false },
  { to: '/comptabilite/journaux', label: 'Journaux', icon: ListChecks, end: false },
  { to: '/comptabilite/balance', label: 'Balance', icon: Calculator, end: false },
  { to: '/comptabilite/exercices', label: 'Exercices', icon: CalendarRange, end: false },
];

export function ComptabiliteIndexPage() {
  return (
    <div className="space-y-5">
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
      <Outlet />
    </div>
  );
}
