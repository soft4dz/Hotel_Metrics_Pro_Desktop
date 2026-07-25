import { RhDashboardTab } from './RhDashboardTab';
import { RecrutementsTab } from './RecrutementsTab';
import { EmployesTab } from './EmployesTab';
import { PointagesTab } from './PointagesTab';
import { AbsencesTab } from './AbsencesTab';
import { MonEspaceTab } from './MonEspaceTab';
import { AffectationsTab } from './AffectationsTab';
import { ContratsTab } from './ContratsTab';
import { PlanningTab } from './PlanningTab';
import { PaieTab } from './PaieTab';
import { FormationsTab } from './FormationsTab';
import { PilotageTab } from './PilotageTab';
import { AnalyseIaTab } from './AnalyseIaTab';
import { ConformiteTab } from './ConformiteTab';
import { RegistresLegauxTab } from './RegistresLegauxTab';
import { ValidationsTab } from './ValidationsTab';
import { OrganisationTab } from './OrganisationTab';
import { ReferentielRhTab } from './ReferentielRhTab';
import { PointeuseTab } from './PointeuseTab';
import { ReconciliationTab } from './ReconciliationTab';
import { GpecTab } from './GpecTab';
import type { RhHub, RhHubId, RhSubSection } from './rhNavigation';

interface Props {
  hub: RhHub;
  sub: RhSubSection;
  canManage: boolean;
  canTeam: boolean;
  canSelf: boolean;
}

export function RhHubContent({ hub, sub, canManage, canTeam, canSelf }: Props) {
  switch (hub.id as RhHubId) {
    case 'pilotage':
      if (!canManage) return null;
      if (sub === 'dashboard') return <RhDashboardTab />;
      if (sub === 'ia') return <AnalyseIaTab />;
      if (sub === 'onboarding') return <PilotageTab initialSub="onboarding" compactNav />;
      return <PilotageTab initialSub={pilotageSub(sub)} compactNav />;

    case 'collaborateurs':
      if (!canManage) return null;
      if (sub === 'annuaire') return <EmployesTab />;
      if (sub === 'contrats') return <ContratsTab />;
      if (sub === 'organigramme') return <OrganisationTab />;
      if (sub === 'affectations') return <AffectationsTab />;
      return <EmployesTab />;

    case 'referentiel':
      return canManage ? <ReferentielRhTab /> : null;

    case 'temps':
      if (sub === 'planning') return canManage || canTeam ? <PlanningTab /> : null;
      if (sub === 'pointages') {
        return canTeam || canSelf || canManage ? (
          <PointagesTab canValidateRh={canManage} showN1Hint={canTeam && !canManage} />
        ) : null;
      }
      if (sub === 'absences') return canTeam || canSelf ? <AbsencesTab canValidate={canManage || canTeam} /> : null;
      if (sub === 'reconciliation') return canManage ? <ReconciliationTab /> : null;
      if (sub === 'pointeuse') return canManage ? <PointeuseTab /> : null;
      return null;

    case 'paie':
      if (!canManage) return null;
      if (sub === 'conformite') return <ConformiteTab />;
      if (sub === 'registres') return <RegistresLegauxTab />;
      return <PaieTab initialSub={paieSub(sub)} compactNav />;

    case 'talents':
      if (!canManage) return null;
      if (sub === 'recrutements') return <RecrutementsTab />;
      if (sub === 'gpec') return <GpecTab />;
      return <FormationsTab initialSub={talentsSub(sub)} hideDocuments />;

    case 'validations':
      if (!canTeam && !canManage) return null;
      return <ValidationsTab filter={validationFilter(sub)} />;

    case 'mon-espace':
      return canSelf ? <MonEspaceTab /> : null; // pas de sous-onglet — contenu direct

    default:
      return null;
  }
}

function pilotageSub(sub: RhSubSection): 'comparatif' | 'previsions' | 'port' {
  if (sub === 'previsions') return 'previsions';
  if (sub === 'port') return 'port';
  return 'comparatif';
}

function talentsSub(sub: RhSubSection): 'formations' | 'competences' | 'entretiens' | 'documents' {
  if (sub === 'competences') return 'competences';
  if (sub === 'entretiens') return 'entretiens';
  return 'formations';
}

function validationFilter(sub: RhSubSection): 'all' | 'absence' | 'pointage' | 'document' {
  if (sub === 'absences') return 'absence';
  if (sub === 'pointages') return 'pointage';
  if (sub === 'documents') return 'document';
  return 'all';
}

function paieSub(sub: RhSubSection): 'prepaie' | 'primes' | 'dlg' | 'declarations' {
  if (sub === 'primes' || sub === 'dlg' || sub === 'declarations') return sub;
  return 'prepaie';
}
