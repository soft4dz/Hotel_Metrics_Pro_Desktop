import { NavLink, Outlet } from 'react-router-dom';
import { AlertTriangle, BookOpen, ClipboardList, FileKey, Shield, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { to: '/conformite/donnees-personnelles', label: 'Hub', icon: Shield, end: true },
  { to: '/conformite/donnees-personnelles/traitements', label: 'Registre traitements', icon: BookOpen, end: false },
  { to: '/conformite/donnees-personnelles/consentements', label: 'Consentements', icon: UserCheck, end: false },
  { to: '/conformite/donnees-personnelles/demandes', label: 'Demandes droits', icon: FileKey, end: false },
  { to: '/conformite/donnees-personnelles/incidents', label: 'Incidents', icon: AlertTriangle, end: false },
  { to: '/conformite/donnees-personnelles/conservation', label: 'Conservation', icon: ClipboardList, end: false },
];

export function ConformiteDonneesIndexPage() {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border/60 bg-white px-4 py-3 shadow-sm">
        <h1 className="text-lg font-semibold">Protection des données — Loi 18-07 / ANPDP</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Registre des traitements, consentements, droits des personnes et notification des violations
        </p>
      </div>
      <nav className="flex gap-1 overflow-x-auto rounded-xl border border-border/60 bg-white px-2 py-1.5 shadow-sm">
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => cn(
              'flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors',
              isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-slate-50 hover:text-foreground',
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
