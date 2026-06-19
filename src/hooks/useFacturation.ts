import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import type {
  AddPaiementInput,
  CreateClientInput,
  FactureFilters,
} from '@/shared/types/facturation';

// ── Dashboard ─────────────────────────────────────────────────────────────────

export function useFacturationDashboard(hotelId?: number) {
  const { data = null, isLoading: loading, error: queryError, refetch } = useQuery({
    queryKey: ['facturation-dashboard', hotelId],
    queryFn: async () => unwrapIpc(await ipcClient.facturation.getDashboard(hotelId)),
    staleTime: 30_000,
  });
  const error = queryError instanceof Error ? queryError.message : queryError ? 'Erreur chargement' : null;
  return { data, loading, error, reload: () => { void refetch(); } };
}

// ── Factures List ─────────────────────────────────────────────────────────────

export function useFactures(initialFilters?: FactureFilters) {
  const qc = useQueryClient();
  const [filters, setFilters] = useState<FactureFilters>(initialFilters ?? {});

  const { data: items = [], isLoading: loading, error: queryError, refetch } = useQuery({
    queryKey: ['factures', filters],
    queryFn: async () => unwrapIpc(await ipcClient.facturation.listFactures(filters)),
    staleTime: 30_000,
  });
  const error = queryError instanceof Error ? queryError.message : queryError ? 'Erreur chargement factures' : null;

  const invalidate = () => qc.invalidateQueries({ queryKey: ['factures'] });

  const soumettre = async (id: number) => {
    const updated = unwrapIpc(await ipcClient.facturation.soumettre(id));
    await invalidate();
    return updated;
  };

  const valider = async (id: number) => {
    const updated = unwrapIpc(await ipcClient.facturation.valider(id));
    await invalidate();
    return updated;
  };

  const annuler = async (id: number) => {
    const updated = unwrapIpc(await ipcClient.facturation.annuler(id));
    await invalidate();
    return updated;
  };

  const remove = async (id: number) => {
    unwrapIpc(await ipcClient.facturation.deleteFacture(id));
    await invalidate();
  };

  return { items, loading, error, filters, setFilters, reload: () => { void refetch(); }, soumettre, valider, annuler, remove };
}

// ── Facture Detail ────────────────────────────────────────────────────────────

export function useFactureDetail(id: number | null) {
  const qc = useQueryClient();
  const key = ['facture-detail', id];

  const { data: facture = null, isLoading: loading, error: queryError, refetch } = useQuery({
    queryKey: key,
    queryFn: async () => unwrapIpc(await ipcClient.facturation.getFacture(id!)),
    enabled: !!id,
    staleTime: 30_000,
  });
  const error = queryError instanceof Error ? queryError.message : queryError ? 'Erreur chargement facture' : null;

  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const addPaiement = async (input: AddPaiementInput) => {
    const updated = unwrapIpc(await ipcClient.facturation.addPaiement(input));
    await invalidate();
    return updated;
  };

  const deletePaiement = async (paiementId: number) => {
    const updated = unwrapIpc(await ipcClient.facturation.deletePaiement(paiementId));
    await invalidate();
    return updated;
  };

  return { facture, loading, error, reload: () => { void refetch(); }, addPaiement, deletePaiement };
}

// ── Clients ───────────────────────────────────────────────────────────────────

export function useClientsFacturation(search?: string) {
  const qc = useQueryClient();

  const { data: clients = [], isLoading: loading, error: queryError, refetch } = useQuery({
    queryKey: ['clients-facturation', search],
    queryFn: async () => unwrapIpc(await ipcClient.facturation.listClients(search)),
    staleTime: 60_000,
  });
  const error = queryError instanceof Error ? queryError.message : queryError ? 'Erreur chargement clients' : null;

  const invalidate = () => qc.invalidateQueries({ queryKey: ['clients-facturation'] });

  const create = async (input: CreateClientInput) => {
    const c = unwrapIpc(await ipcClient.facturation.createClient(input));
    await invalidate();
    return c;
  };

  const update = async (id: number, input: Partial<CreateClientInput>) => {
    const c = unwrapIpc(await ipcClient.facturation.updateClient(id, input));
    await invalidate();
    return c;
  };

  const remove = async (id: number) => {
    unwrapIpc(await ipcClient.facturation.deleteClient(id));
    await invalidate();
  };

  return { clients, loading, error, reload: () => { void refetch(); }, create, update, remove };
}
