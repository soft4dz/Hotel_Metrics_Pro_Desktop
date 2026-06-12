import { useCallback, useEffect, useState } from 'react';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import type {
  AddPaiementInput,
  ClientFacturation,
  CreateClientInput,
  FacturationDashboard,
  FactureDetail,
  FactureFilters,
  FactureListItem,
} from '@/shared/types/facturation';

// ── Dashboard ─────────────────────────────────────────────────────────────────

export function useFacturationDashboard(hotelId?: number) {
  const [data, setData] = useState<FacturationDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(unwrapIpc(await ipcClient.facturation.getDashboard(hotelId)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  }, [hotelId]);

  useEffect(() => { void load(); }, [load]);
  return { data, loading, error, reload: load };
}

// ── Factures List ─────────────────────────────────────────────────────────────

export function useFactures(initialFilters?: FactureFilters) {
  const [filters, setFilters] = useState<FactureFilters>(initialFilters ?? {});
  const [items, setItems] = useState<FactureListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(unwrapIpc(await ipcClient.facturation.listFactures(filters)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur chargement factures');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { void load(); }, [load]);

  const soumettre = useCallback(async (id: number) => {
    const updated = unwrapIpc(await ipcClient.facturation.soumettre(id));
    setItems((prev) => prev.map((f) => (f.id === id ? updated : f)));
    return updated;
  }, []);

  const valider = useCallback(async (id: number) => {
    const updated = unwrapIpc(await ipcClient.facturation.valider(id));
    setItems((prev) => prev.map((f) => (f.id === id ? updated : f)));
    return updated;
  }, []);

  const annuler = useCallback(async (id: number) => {
    const updated = unwrapIpc(await ipcClient.facturation.annuler(id));
    setItems((prev) => prev.map((f) => (f.id === id ? updated : f)));
    return updated;
  }, []);

  const remove = useCallback(async (id: number) => {
    unwrapIpc(await ipcClient.facturation.deleteFacture(id));
    setItems((prev) => prev.filter((f) => f.id !== id));
  }, []);

  return { items, loading, error, filters, setFilters, reload: load, soumettre, valider, annuler, remove };
}

// ── Facture Detail ────────────────────────────────────────────────────────────

export function useFactureDetail(id: number | null) {
  const [facture, setFacture] = useState<FactureDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setFacture(unwrapIpc(await ipcClient.facturation.getFacture(id)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur chargement facture');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const addPaiement = useCallback(async (input: AddPaiementInput) => {
    const updated = unwrapIpc(await ipcClient.facturation.addPaiement(input));
    setFacture(updated);
    return updated;
  }, []);

  const deletePaiement = useCallback(async (paiementId: number) => {
    const updated = unwrapIpc(await ipcClient.facturation.deletePaiement(paiementId));
    setFacture(updated);
    return updated;
  }, []);

  return { facture, loading, error, reload: load, addPaiement, deletePaiement };
}

// ── Clients ───────────────────────────────────────────────────────────────────

export function useClientsFacturation(search?: string) {
  const [clients, setClients] = useState<ClientFacturation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setClients(unwrapIpc(await ipcClient.facturation.listClients(search)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur chargement clients');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { void load(); }, [load]);

  const create = useCallback(async (input: CreateClientInput) => {
    const c = unwrapIpc(await ipcClient.facturation.createClient(input));
    setClients((prev) => [...prev, c]);
    return c;
  }, []);

  const update = useCallback(async (id: number, input: Partial<CreateClientInput>) => {
    const c = unwrapIpc(await ipcClient.facturation.updateClient(id, input));
    setClients((prev) => prev.map((x) => (x.id === id ? c : x)));
    return c;
  }, []);

  const remove = useCallback(async (id: number) => {
    unwrapIpc(await ipcClient.facturation.deleteClient(id));
    setClients((prev) => prev.filter((x) => x.id !== id));
  }, []);

  return { clients, loading, error, reload: load, create, update, remove };
}
