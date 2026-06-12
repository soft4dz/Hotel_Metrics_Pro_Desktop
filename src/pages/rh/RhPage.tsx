import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { canManageRh, canValidateRhTeam, canAccessRhSelf } from '@/shared/permissions';
import { RhDashboardTab } from './RhDashboardTab';
import { RecrutementsTab } from './RecrutementsTab';
import { EmployesTab } from './EmployesTab';
import { PointagesTab } from './PointagesTab';
import { AbsencesTab } from './AbsencesTab';
import { MonEspaceTab } from './MonEspaceTab';
import { ReferentielRhTab } from './ReferentielRhTab';

type RhTab = 'dashboard' | 'recrutements' | 'employes' | 'pointages' | 'absences' | 'referentiel' | 'mon-espace';

export function RhPage() {
  const role = useAuthStore((s) => s.user?.role);
  const canManage = canManageRh(role);
  const canTeam = canValidateRhTeam(role);
  const canSelf = canAccessRhSelf(role);
  const [active, setActive] = useState<RhTab>(canManage ? 'dashboard' : 'mon-espace');

  const tabs: { id: RhTab; label: string; hidden?: boolean }[] = [
    { id: 'dashboard', label: 'Tableau de bord', hidden: !canManage },
    { id: 'recrutements', label: 'Recrutements', hidden: !canManage },
    { id: 'employes', label: 'Employés', hidden: !canManage },
    { id: 'pointages', label: 'Pointages', hidden: !canTeam && !canSelf },
    { id: 'absences', label: 'Absences', hidden: !canTeam && !canSelf },
    { id: 'referentiel', label: 'Postes & départements', hidden: !canManage },
    { id: 'mon-espace', label: 'Mon espace', hidden: !canSelf },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">RH & Productivité</h1>
        <p className="text-sm text-muted-foreground">
          Effectifs, recrutement, présences et indicateurs de performance
        </p>
      </div>

      <div className="border-b border-border">
        <div className="flex flex-wrap gap-1">
          {tabs.filter((t) => !t.hidden).map((tab) => (
            <button
              key={tab.id}
              type="button"
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
        {active === 'dashboard' && canManage && <RhDashboardTab />}
        {active === 'recrutements' && canManage && <RecrutementsTab />}
        {active === 'employes' && canManage && <EmployesTab />}
        {active === 'pointages' && (canTeam || canSelf) && <PointagesTab canValidate={canTeam} />}
        {active === 'absences' && (canTeam || canSelf) && <AbsencesTab canValidate={canTeam} />}
        {active === 'referentiel' && canManage && <ReferentielRhTab />}
        {active === 'mon-espace' && canSelf && <MonEspaceTab />}
      </div>
    </div>
  );
}
