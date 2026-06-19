import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { ReferentielRhTab } from '@/pages/rh/ReferentielRhTab';

export function RhReferentielPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/settings"><ArrowLeft className="mr-1 h-4 w-4" /> Paramètres</Link>
        </Button>
      </div>
      <PageHeader title="Référentiel RH" description="Postes, départements et structure organisationnelle" />
      <ReferentielRhTab />
    </div>
  );
}
