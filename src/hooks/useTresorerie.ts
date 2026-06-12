import { useCallback, useEffect, useState } from 'react';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import type {
  AddCaisseInput,
  CompteBancaire,
  CreateCompteInput,
  CreateEncaissementInput,
  EncaissementFilters,
  EncaissementItem,
  JournalCaisseEntry,
  TresorerieDashboard,
} from '@/shared/types/tresorerie';

// ── Dashboard ─────────────────────────────────────────────────────────────────

export function useTresorerieDashboard(hotelId?: number) {
  const [data, setData] = useState<TresorerieDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await ipcClient.tresorerie.getDashboard(hotelId);
      setData(unwrapIpc(result));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur chargement trésorerie');
    } finally {
      setLoading(false);
    }
  }, [hotelId]);

  useEffect(() => { void load(); }, [load]);
  return { data, loading, error, reload: load };
}

// ── Encaissements list ────────────────────────────────────────────────────────

export function useEncaissements(initialFilters?: EncaissementFilters) {
  const [filters, setFilters] = useState<EncaissementFilters>(initialFilters ?? {});
  const [items, setItems] = useState<EncaissementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await ipcClient.tresorerie.listEncaissements(filters);
      setItems(unwrapIpc(result));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur chargement encaissements');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { void load(); }, [load]);

  const createEncaissement = useCallback(async (input: CreateEncaissementInput) => {
    const result = await ipcClient.tresorerie.createEncaissement(input);
    const created = unwrapIpc(result);
    setItems((prev) => [created, ...prev]);
    return created;
  }, []);

  const confirmer = useCallback(async (id: number) => {
    const result = await ipcClient.tresorerie.confirmerEncaissement(id);
    const updated = unwrapIpc(result);
    setItems((prev) => prev.map((e) => (e.id === id ? updated : e)));
    return updated;
  }, []);

  const rejeter = useCallback(async (id: number, motif: string) => {
    const result = await ipcClient.tresorerie.rejeterEncaissement(id, motif);
    const updated = unwrapIpc(result);
    setItems((prev) => prev.map((e) => (e.id === id ? updated : e)));
    return updated;
  }, []);

  const remove = useCallback(async (id: number) => {
    unwrapIpc(await ipcClient.tresorerie.deleteEncaissement(id));
    setItems((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return { items, loading, error, filters, setFilters, reload: load, createEncaissement, confirmer, rejeter, remove };
}

// ── Comptes bancaires ─────────────────────────────────────────────────────────

export function useComptesBancaires(hotelId?: number) {
  const [comptes, setComptes] = useState<CompteBancaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await ipcClient.tresorerie.listComptes(hotelId);
      setComptes(unwrapIpc(result));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur chargement comptes');
    } finally {
      setLoading(false);
    }
  }, [hotelId]);

  useEffect(() => { void load(); }, [load]);

  const create = useCallback(async (input: CreateCompteInput) => {
    const result = await ipcClient.tresorerie.createCompte(input);
    const created = unwrapIpc(result);
    setComptes((prev) => [...prev, created]);
    return created;
  }, []);

  const update = useCallback(async (id: number, input: Partial<CreateCompteInput>) => {
    const result = await ipcClient.tresorerie.updateCompte(id, input);
    const updated = unwrapIpc(result);
    setComptes((prev) => prev.map((c) => (c.id === id ? updated : c)));
    return updated;
  }, []);

  const remove = useCallback(async (id: number) => {
    unwrapIpc(await ipcClient.tresorerie.deleteCompte(id));
    setComptes((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return { comptes, loading, error, reload: load, create, update, remove };
}

// ── Journal de caisse ─────────────────────────────────────────────────────────

export function useJournalCaisse(hotelId: number, dateDebut: string, dateFin: string) {
  const [entries, setEntries] = useState<JournalCaisseEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!hotelId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await ipcClient.tresorerie.getJournalCaisse(hotelId, dateDebut, dateFin);
      setEntries(unwrapIpc(result));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur journal caisse');
    } finally {
      setLoading(false);
    }
  }, [hotelId, dateDebut, dateFin]);

  useEffect(() => { void load(); }, [load]);

  const add = useCallback(async (input: AddCaisseInput) => {
    const result = await ipcClient.tresorerie.addOperationCaisse(input);
    const entry = unwrapIpc(result);
    void load();
    return entry;
  }, [load]);

  const remove = useCallback(async (id: number) => {
    unwrapIpc(await ipcClient.tresorerie.deleteOperationCaisse(id));
    void load();
  }, [load]);

  return { entries, loading, error, reload: load, add, remove };
}
