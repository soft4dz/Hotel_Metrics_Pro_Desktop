import { memo, useMemo } from 'react';
import { SectionBlock } from '@/components/common/SectionBlock';
import { CaEvolutionChart } from '@/components/charts/CaEvolutionChart';
import { CaParHotelChart } from '@/components/charts/CaParHotelChart';
import { DonutChart } from '@/components/charts/DonutChart';
import { EncaissementHotelChart } from '@/components/charts/EncaissementHotelChart';
import { EvolutionMensuelleChart } from '@/components/charts/EvolutionMensuelleChart';
import { FrequentationChart } from '@/components/charts/FrequentationChart';
import { ObjectifsCategorieChart } from '@/components/charts/ObjectifsCategorieChart';
import { YearCompareChart } from '@/components/charts/YearCompareChart';
import {
  selectDashboardChartData,
  selectEvolutionJournaliere,
} from '@/components/dashboard/dashboardSelectors';
import type { DashboardDto } from '@/shared/types/dashboard';

interface DashboardChartsSectionProps {
  data: DashboardDto;
  annee: number;
}

function DashboardChartsSectionComponent({ data, annee }: DashboardChartsSectionProps) {
  const charts = useMemo(() => selectDashboardChartData(data), [data]);
  const evolutionJournaliere = useMemo(() => selectEvolutionJournaliere(data), [data]);

  return (
    <>
      <div className="grid gap-3 sm:gap-4 xl:grid-cols-2">
        <SectionBlock title="Évolution mensuelle du CA" description={`Année ${annee}`}>
          <EvolutionMensuelleChart data={charts.evolutionMensuelle} />
        </SectionBlock>
        <SectionBlock title="Comparaison année N / N-1">
          <YearCompareChart data={data.comparaisonAnnee} yearN={annee} yearNm1={annee - 1} />
        </SectionBlock>
      </div>

      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        <SectionBlock title="CA par hôtel">
          <CaParHotelChart data={charts.caParHotel} />
        </SectionBlock>
        <SectionBlock title="Répartition CA par rubrique">
          <DonutChart data={data.repartitionRubrique} />
        </SectionBlock>
      </div>

      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        <SectionBlock title="Objectif vs réalisé (unités)">
          <CaParHotelChart data={charts.objectifVsRealiseHotels} />
        </SectionBlock>
        <SectionBlock title="Taux d'encaissement par hôtel">
          <EncaissementHotelChart data={data.tauxEncaissementHotel} />
        </SectionBlock>
      </div>

      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        <SectionBlock title="Réalisation mensuelle vs objectif">
          <ObjectifsCategorieChart data={charts.realisationCategories} />
        </SectionBlock>
        <SectionBlock title="Fréquentation" description="Chambres, nuitées, couverts (données saisies)">
          <FrequentationChart data={data.frequentation} />
        </SectionBlock>
      </div>

      <SectionBlock title="Évolution journalière" description="CA validé par jour">
        <CaEvolutionChart data={evolutionJournaliere} />
      </SectionBlock>
    </>
  );
}

export const DashboardChartsSection = memo(DashboardChartsSectionComponent);
