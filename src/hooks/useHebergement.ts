import { useState, useEffect, useCallback } from 'react';
import { ipcClient } from '@/lib/ipcClient';
import type {
  Chambre, CreateChambreInput, CreateReservationInput, CreateTypeChambreInput,
  OccupationPeriode, Reservation, StatutChambre, StatutReservation, TypeChambre,
} from '@/shared/types/hebergement';

// ── unwrapIpc helper (local si pas exporté) ───────────────────────────────────
function unwrap<T>(result: { ok: boolean; data?: T; error?: string }): T {
  if (!result.ok) throw new Error(result.error ?? 'Erreur inconnue');
  return result.data as T;
}

export function useTypesChambre(hotelId?: number) {
  const [data, setData] = useState<TypeChambre[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(unwrap(await ipcClient.hebergement.listTypesChambre(hotelId))); }
    catch { setData([]); } finally { setLoading(false); }
  }, [hotelId]);

  useEffect(() => { load(); }, [load]);

  const create = useCallback(async (input: CreateTypeChambreInput) => {
    const result = unwrap(await ipcClient.hebergement.createTypeChambre(input));
    await load();
    return result;
  }, [load]);

  const remove = useCallback(async (id: number) => {
    unwrap(await ipcClient.hebergement.deleteTypeChambre(id));
    await load();
  }, [load]);

  return { data, loading, refresh: load, create, remove };
}

export function useChambres(hotelId?: number, statut?: StatutChambre) {
  const [data, setData] = useState<Chambre[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(unwrap(await ipcClient.hebergement.listChambres(hotelId, statut))); }
    catch { setData([]); } finally { setLoading(false); }
  }, [hotelId, statut]);

  useEffect(() => { load(); }, [load]);

  const updateStatut = useCallback(async (id: number, s: StatutChambre) => {
    unwrap(await ipcClient.hebergement.updateStatutChambre(id, s));
    await load();
  }, [load]);

  const create = useCallback(async (input: CreateChambreInput) => {
    const result = unwrap(await ipcClient.hebergement.createChambre(input));
    await load();
    return result;
  }, [load]);

  const remove = useCallback(async (id: number) => {
    unwrap(await ipcClient.hebergement.deleteChambre(id));
    await load();
  }, [load]);

  return { data, loading, refresh: load, updateStatut, create, remove };
}

export function useReservations(hotelId?: number, dateDebut?: string, dateFin?: string, statut?: StatutReservation) {
  const [data, setData] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setData(unwrap(await ipcClient.hebergement.listReservations(hotelId, dateDebut, dateFin, statut))); }
    catch (e) { setError((e as Error).message); setData([]); }
    finally { setLoading(false); }
  }, [hotelId, dateDebut, dateFin, statut]);

  useEffect(() => { load(); }, [load]);

  const create = useCallback(async (input: CreateReservationInput) => {
    const result = unwrap(await ipcClient.hebergement.createReservation(input));
    await load();
    return result;
  }, [load]);

  const updateStatut = useCallback(async (id: number, s: StatutReservation) => {
    unwrap(await ipcClient.hebergement.updateReservationStatut(id, s));
    await load();
  }, [load]);

  const remove = useCallback(async (id: number) => {
    unwrap(await ipcClient.hebergement.deleteReservation(id));
    await load();
  }, [load]);

  return { data, loading, error, refresh: load, create, updateStatut, remove };
}

export function useOccupationKpis(dateDebut: string, dateFin: string, hotelId?: number) {
  const [data, setData] = useState<OccupationPeriode | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(unwrap(await ipcClient.hebergement.getOccupationKpis(dateDebut, dateFin, hotelId))); }
    catch { setData(null); } finally { setLoading(false); }
  }, [dateDebut, dateFin, hotelId]);

  useEffect(() => { load(); }, [load]);
  return { data, loading, refresh: load };
}
