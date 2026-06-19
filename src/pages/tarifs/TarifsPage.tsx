import { useState } from 'react';
import { cn } from '@/lib/utils';
import { PlansFormules } from './PlansFormules';
import { GrilleTarifaire } from './GrilleTarifaire';
import { PromotionsPage } from './PromotionsPage';
import { ConventionsPage } from './ConventionsPage';
import { SimulateurTarifPage } from './SimulateurTarifPage';

type Tab = 'plans' | 'grille' | 'promotions' | 'conventions' | 'simulateur';

const TABS: { id: Tab; label: string }[] = [
  { id: 'plans',       label: 'Plans & Formules' },
  { id: 'grille',      label: 'Grille tarifaire' },
  { id: 'promotions',  label: 'Promotions' },
  { id: 'conventions', label: 'Conventions client' },
  { id: 'simulateur',  label: 'Simulateur' },
];

export function TarifsPage() {
  const [active, setActive] = useState<Tab>('grille');

  return (
    <div className="space-y-6">
      <div className="border-b border-border">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={cn(
                'whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
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
        {active === 'plans'       && <PlansFormules />}
        {active === 'grille'      && <GrilleTarifaire />}
        {active === 'promotions'  && <PromotionsPage />}
        {active === 'conventions' && <ConventionsPage />}
        {active === 'simulateur'  && <SimulateurTarifPage />}
      </div>
    </div>
  );
}
