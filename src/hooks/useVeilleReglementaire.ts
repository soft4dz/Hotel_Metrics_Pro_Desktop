import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ipcClient } from '@/lib/ipcClient';
import type { CreateTexteReglementaireInput, UpdateTexteReglementaireInput } from '@/shared/types/veilleReglementaire';

function unwrap<T>(r: { ok: boolean; data?: T; error?: string }): T {
  if (!r.ok) throw new Error(r.error ?? 'Erreur inconnue');
  return r.data as T;
}

export function useVeilleReglementaire(filters?: { hotelId?: number; categorie?: string; statutConformite?: string; search?: string }) {
  const qc = useQueryClient();
  const key = ['veille-reglementaire', filters];
  const { data = [], isLoading: loading, refetch } = useQuery({
    queryKey: key,
    queryFn: async () => unwrap(await ipcClient.veille.list(filters)),
    staleTime: 30_000,
  });
  const inv = () => qc.invalidateQueries({ queryKey: ['veille-reglementaire'] });
  const create = async (input: CreateTexteReglementaireInput) => { const r = unwrap(await ipcClient.veille.create(input)); await inv(); return r; };
  const update = async (id: number, input: UpdateTexteReglementaireInput) => { const r = unwrap(await ipcClient.veille.update(id, input)); await inv(); return r; };
  const remove = async (id: number) => { unwrap(await ipcClient.veille.remove(id)); await inv(); };
  const attachDocument = async (id: number) => { const r = unwrap(await ipcClient.veille.attachDocument(id)); await inv(); return r; };
  const ouvrirDocument = async (id: number) => { unwrap(await ipcClient.veille.ouvrirDocument(id)); };
  return { data, loading, refresh: () => { void refetch(); }, create, update, remove, attachDocument, ouvrirDocument };
}
