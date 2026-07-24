import { NavLink, Outlet } from 'react-router-dom';
import { Building2, ClipboardList, Scale, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { to: '/conformite/modules-legaux', label: 'Hub', icon: Scale, end: true },
  { to: '/conformite/modules-legaux/immobilisations', label: 'Immobilisations', icon: Building2, end: false },
  { to: '/conformite/modules-legaux/casnos', label: 'CASNOS', icon: Users, end: false },
  { to: '/conformite/modules-legaux/inventaire', label: 'Inventaire légal', icon: ClipboardList, end: false },
];

export function ConformiteModulesLegauxIndexPage() {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border bg-white px-4 py-3 shadow-sm">
        <h1 className="text-lg font-semibold">Modules légaux — Phase 3</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Immobilisations SCF, cotisations CASNOS (TNS) et inventaire légal annuel
        </p>
      </div>
      <nav className="flex gap-1 overflow-x-auto rounded-xl border bg-white px-2 py-1.5 shadow-sm">
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => cn(
            'flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors',
            isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-slate-50 hover:text-foreground',
          )}>
            <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            {label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
