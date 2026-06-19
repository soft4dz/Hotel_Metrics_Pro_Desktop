import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ipcClient } from '@/lib/ipcClient';
import type {
  CreateChambreInput,
  CreateReservationInput,
  CreateTypeChambreInput,
  EstimateReservationPriceInput,
  StatutChambre,
  StatutReservation,
} from '@/shared/types/hebergement';

function unwrap<T>(result: { ok: boolean; data?: T; error?: string }): T {
  if (!result.ok) throw new Error(result.error ?? 'Erreur inconnue');
  return result.data as T;
}

// ── Types de chambre ──────────────────────────────────────────────────────────

export function useTypesChambre(hotelId?: number) {
  const qc = useQueryClient();
  const key = ['types-chambre', hotelId];

  const { data = [], isLoading: loading, refetch } = useQuery({
    queryKey: key,
    queryFn: async () => unwrap(await ipcClient.hebergement.listTypesChambre(hotelId)),
    staleTime: 60_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const create = async (input: CreateTypeChambreInput) => {
    const result = unwrap(await ipcClient.hebergement.createTypeChambre(input));
    await invalidate();
    return result;
  };

  const remove = async (id: number) => {
    unwrap(await ipcClient.hebergement.deleteTypeChambre(id));
    await invalidate();
  };

  return { data, loading, refresh: () => { void refetch(); }, create, remove };
}

// ── Chambres ──────────────────────────────────────────────────────────────────

export function useChambres(hotelId?: number, statut?: StatutChambre) {
  const qc = useQueryClient();
  const key = ['chambres', hotelId, statut];

  const { data = [], isLoading: loading, refetch } = useQuery({
    queryKey: key,
    queryFn: async () => unwrap(await ipcClient.hebergement.listChambres(hotelId, statut)),
    staleTime: 30_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const updateStatut = async (id: number, s: StatutChambre) => {
    unwrap(await ipcClient.hebergement.updateStatutChambre(id, s));
    await invalidate();
  };

  const create = async (input: CreateChambreInput) => {
    const result = unwrap(await ipcClient.hebergement.createChambre(input));
    await invalidate();
    return result;
  };

  const remove = async (id: number) => {
    unwrap(await ipcClient.hebergement.deleteChambre(id));
    await invalidate();
  };

  return { data, loading, refresh: () => { void refetch(); }, updateStatut, create, remove };
}

// ── Réservations ──────────────────────────────────────────────────────────────

export function useReservations(
  hotelId?: number,
  dateDebut?: string,
  dateFin?: string,
  statut?: StatutReservation,
) {
  const qc = useQueryClient();
  const key = ['reservations', hotelId, dateDebut, dateFin, statut];

  const { data = [], isLoading: loading, error: queryError, refetch } = useQuery({
    queryKey: key,
    queryFn: async () => unwrap(await ipcClient.hebergement.listReservations(hotelId, dateDebut, dateFin, statut)),
    staleTime: 30_000,
  });
  const error = queryError instanceof Error ? queryError.message : null;

  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const create = async (input: CreateReservationInput) => {
    const result = unwrap(await ipcClient.hebergement.createReservation(input));
    await invalidate();
    return result;
  };

  const estimatePrice = async (input: EstimateReservationPriceInput) => {
    return unwrap(await ipcClient.hebergement.estimatePrice(input));
  };

  const createFactureFromReservation = async (reservationId: number) => {
    const result = unwrap(await ipcClient.hebergement.createFactureFromReservation(reservationId));
    await invalidate();
    return result;
  };

  const updateStatut = async (id: number, s: StatutReservation) => {
    unwrap(await ipcClient.hebergement.updateReservationStatut(id, s));
    await invalidate();
  };

  const remove = async (id: number) => {
    unwrap(await ipcClient.hebergement.deleteReservation(id));
    await invalidate();
  };

  return { data, loading, error, refresh: () => { void refetch(); }, create, estimatePrice, createFactureFromReservation, updateStatut, remove };
}

// ── KPIs occupation ───────────────────────────────────────────────────────────

export function useOccupationKpis(dateDebut: string, dateFin: string, hotelId?: number) {
  const { data = null, isLoading: loading, refetch } = useQuery({
    queryKey: ['occupation-kpis', dateDebut, dateFin, hotelId],
    queryFn: async () => unwrap(await ipcClient.hebergement.getOccupationKpis(dateDebut, dateFin, hotelId)),
    staleTime: 30_000,
  });
  return { data, loading, refresh: () => { void refetch(); } };
}
