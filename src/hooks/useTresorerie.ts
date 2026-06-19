import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import type {
  AddCaisseInput,
  CreateCompteInput,
  CreateEncaissementInput,
  EncaissementFilters,
} from '@/shared/types/tresorerie';

// ── Dashboard ─────────────────────────────────────────────────────────────────

export function useTresorerieDashboard(hotelId?: number) {
  const { data = null, isLoading: loading, error: queryError, refetch } = useQuery({
    queryKey: ['tresorerie-dashboard', hotelId],
    queryFn: async () => unwrapIpc(await ipcClient.tresorerie.getDashboard(hotelId)),
    staleTime: 30_000,
  });
  const error = queryError instanceof Error ? queryError.message : queryError ? 'Erreur chargement trésorerie' : null;
  return { data, loading, error, reload: () => { void refetch(); } };
}

// ── Encaissements ─────────────────────────────────────────────────────────────

export function useEncaissements(initialFilters?: EncaissementFilters) {
  const qc = useQueryClient();
  const [filters, setFilters] = useState<EncaissementFilters>(initialFilters ?? {});

  const { data: items = [], isLoading: loading, error: queryError, refetch } = useQuery({
    queryKey: ['encaissements', filters],
    queryFn: async () => unwrapIpc(await ipcClient.tresorerie.listEncaissements(filters)),
    staleTime: 30_000,
  });
  const error = queryError instanceof Error ? queryError.message : queryError ? 'Erreur chargement encaissements' : null;

  const invalidate = () => qc.invalidateQueries({ queryKey: ['encaissements'] });

  const createEncaissement = async (input: CreateEncaissementInput) => {
    const created = unwrapIpc(await ipcClient.tresorerie.createEncaissement(input));
    await invalidate();
    return created;
  };

  const confirmer = async (id: number) => {
    const updated = unwrapIpc(await ipcClient.tresorerie.confirmerEncaissement(id));
    await invalidate();
    return updated;
  };

  const rejeter = async (id: number, motif: string) => {
    const updated = unwrapIpc(await ipcClient.tresorerie.rejeterEncaissement(id, motif));
    await invalidate();
    return updated;
  };

  const remove = async (id: number) => {
    unwrapIpc(await ipcClient.tresorerie.deleteEncaissement(id));
    await invalidate();
  };

  return { items, loading, error, filters, setFilters, reload: () => { void refetch(); }, createEncaissement, confirmer, rejeter, remove };
}

// ── Comptes bancaires ─────────────────────────────────────────────────────────

export function useComptesBancaires(hotelId?: number) {
  const qc = useQueryClient();

  const { data: comptes = [], isLoading: loading, error: queryError, refetch } = useQuery({
    queryKey: ['comptes-bancaires', hotelId],
    queryFn: async () => unwrapIpc(await ipcClient.tresorerie.listComptes(hotelId)),
    staleTime: 60_000,
  });
  const error = queryError instanceof Error ? queryError.message : queryError ? 'Erreur chargement comptes' : null;

  const invalidate = () => qc.invalidateQueries({ queryKey: ['comptes-bancaires'] });

  const create = async (input: CreateCompteInput) => {
    const created = unwrapIpc(await ipcClient.tresorerie.createCompte(input));
    await invalidate();
    return created;
  };

  const update = async (id: number, input: Partial<CreateCompteInput>) => {
    const updated = unwrapIpc(await ipcClient.tresorerie.updateCompte(id, input));
    await invalidate();
    return updated;
  };

  const remove = async (id: number) => {
    unwrapIpc(await ipcClient.tresorerie.deleteCompte(id));
    await invalidate();
  };

  return { comptes, loading, error, reload: () => { void refetch(); }, create, update, remove };
}

// ── Journal de caisse ─────────────────────────────────────────────────────────

export function useJournalCaisse(hotelId: number, dateDebut: string, dateFin: string) {
  const qc = useQueryClient();
  const key = ['journal-caisse', hotelId, dateDebut, dateFin];

  const { data: entries = [], isLoading: loading, error: queryError, refetch } = useQuery({
    queryKey: key,
    queryFn: async () => unwrapIpc(await ipcClient.tresorerie.getJournalCaisse(hotelId, dateDebut, dateFin)),
    enabled: !!hotelId,
    staleTime: 30_000,
  });
  const error = queryError instanceof Error ? queryError.message : queryError ? 'Erreur journal caisse' : null;

  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const add = async (input: AddCaisseInput) => {
    const entry = unwrapIpc(await ipcClient.tresorerie.addOperationCaisse(input));
    await invalidate();
    return entry;
  };

  const remove = async (id: number) => {
    unwrapIpc(await ipcClient.tresorerie.deleteOperationCaisse(id));
    await invalidate();
  };

  return { entries, loading, error, reload: () => { void refetch(); }, add, remove };
}
