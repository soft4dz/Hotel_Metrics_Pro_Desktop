import type {
  CaParCategorie,
  CaParHotel,
  CaJournalierPoint,
  DashboardDto,
  EvolutionMensuellePoint,
} from '@/shared/types/dashboard';

export interface DashboardChartData {
  evolutionMensuelle: EvolutionMensuellePoint[];
  caParHotel: CaParHotel[];
  objectifVsRealiseHotels: CaParHotel[];
  realisationCategories: CaParCategorie[];
}

export function selectDashboardChartData(data: DashboardDto): DashboardChartData {
  return {
    evolutionMensuelle: data.evolutionMensuelle.map((m) => ({
      label: m.label,
      montant: m.value,
    })),
    caParHotel: data.parHotel.map((h) => ({
      hotelId: h.hotelId,
      hotelName: h.hotelName,
      realise: h.realise,
      objectif: h.objectif,
    })),
    objectifVsRealiseHotels: data.objectifVsRealise.map((r, i) => ({
      hotelId: i,
      hotelName: r.label,
      realise: r.realise,
      objectif: r.objectif,
    })),
    realisationCategories: data.realisationVsObjectifMensuel.map((r) => ({
      categorie: r.label,
      objectif: r.objectif,
      realise: r.realise,
    })),
  };
}

export function selectEvolutionJournaliere(data: DashboardDto): CaJournalierPoint[] {
  return data.evolutionJournaliere;
}
