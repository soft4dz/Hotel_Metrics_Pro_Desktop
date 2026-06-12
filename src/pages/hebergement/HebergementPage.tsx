import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { canManageHotels } from '@/shared/permissions';
import { OccupationDashboard } from './OccupationDashboard';
import { PlanChambres } from './PlanChambres';
import { ReservationsPage } from './ReservationsPage';
import { ParametrageHebergement } from './ParametrageHebergement';

type Tab = 'dashboard' | 'chambres' | 'reservations' | 'parametrage';

export function HebergementPage() {
  const role = useAuthStore((s) => s.user?.role);
  const canAdmin = canManageHotels(role) || role === 'DIRECTEUR_UNITE';
  const [active, setActive] = useState<Tab>('dashboard');

  const TABS: { id: Tab; label: string; hidden?: boolean }[] = [
    { id: 'dashboard',    label: 'Tableau de bord' },
    { id: 'chambres',     label: 'Plan des chambres' },
    { id: 'reservations', label: 'Réservations' },
    { id: 'parametrage',  label: 'Paramétrage', hidden: !canAdmin },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Hébergement & Occupation</h1>
        <p className="text-sm text-muted-foreground">Chambres, réservations et indicateurs de performance</p>
      </div>

      <div className="border-b border-border">
        <div className="flex gap-1">
          {TABS.filter((t) => !t.hidden).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
                active === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-slate-700 hover:border-slate-300',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        {active === 'dashboard'    && <OccupationDashboard />}
        {active === 'chambres'     && <PlanChambres />}
        {active === 'reservations' && <ReservationsPage />}
        {active === 'parametrage'  && canAdmin && <ParametrageHebergement />}
      </div>
    </div>
  );
}
