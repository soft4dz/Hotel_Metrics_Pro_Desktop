import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ipcClient } from '@/lib/ipcClient';
import type {
  CreateAppelOffresInput,
  CreateLotInput,
  UploadDocumentAoInput,
  CreateOffreAoInput,
  CreateCritereInput,
  NoteEvaluation,
  OuvrirPlisInput,
  AttribuerLotInput,
} from '@/shared/types/appelsOffres';

function unwrap<T>(r: { ok: boolean; data?: T; error?: string }): T {
  if (!r.ok) throw new Error(r.error ?? 'Erreur inconnue');
  return r.data as T;
}

// ── Dossiers ──────────────────────────────────────────────────────────────────

export function useAppelsOffres(hotelId?: number) {
  const qc = useQueryClient();
  const key = ['appels-offres', hotelId];
  const { data = [], isLoading: loading, refetch } = useQuery({
    queryKey: key,
    queryFn: async () => unwrap(await ipcClient.appelsOffres.list(hotelId)),
    staleTime: 20_000,
  });
  const inv = () => qc.invalidateQueries({ queryKey: key });
  const create = async (input: CreateAppelOffresInput) => { const r = unwrap(await ipcClient.appelsOffres.create(input)); await inv(); return r; };
  const publier = async (id: number, dateLimiteDepot: string) => { const r = unwrap(await ipcClient.appelsOffres.publier(id, dateLimiteDepot)); await inv(); return r; };
  const annuler = async (id: number, motif: string) => { const r = unwrap(await ipcClient.appelsOffres.annuler(id, motif)); await inv(); return r; };
  return { data, loading, refresh: () => { void refetch(); }, create, publier, annuler };
}

// ── Lots ──────────────────────────────────────────────────────────────────────

export function useLotsAo(appelOffresId: number) {
  const qc = useQueryClient();
  const key = ['ao-lots', appelOffresId];
  const { data = [], isLoading: loading, refetch } = useQuery({
    queryKey: key,
    queryFn: async () => unwrap(await ipcClient.appelsOffres.listLots(appelOffresId)),
    enabled: Boolean(appelOffresId),
    staleTime: 20_000,
  });
  const inv = () => qc.invalidateQueries({ queryKey: key });
  const create = async (input: CreateLotInput) => { const r = unwrap(await ipcClient.appelsOffres.createLot(input)); await inv(); return r; };
  const remove = async (id: number) => { unwrap(await ipcClient.appelsOffres.deleteLot(id)); await inv(); };
  return { data, loading, refresh: () => { void refetch(); }, create, remove };
}

// ── Documents ─────────────────────────────────────────────────────────────────

export function useDocumentsAo(appelOffresId: number) {
  const qc = useQueryClient();
  const key = ['ao-documents', appelOffresId];
  const { data = [], isLoading: loading, refetch } = useQuery({
    queryKey: key,
    queryFn: async () => unwrap(await ipcClient.appelsOffres.listDocuments(appelOffresId)),
    enabled: Boolean(appelOffresId),
    staleTime: 20_000,
  });
  const inv = () => qc.invalidateQueries({ queryKey: key });
  const upload = async (input: UploadDocumentAoInput) => { const r = unwrap(await ipcClient.appelsOffres.uploadDocument(input)); await inv(); return r; };
  const ouvrir = async (id: number) => { unwrap(await ipcClient.appelsOffres.ouvrirDocument(id)); };
  const remove = async (id: number) => { unwrap(await ipcClient.appelsOffres.deleteDocument(id)); await inv(); };
  return { data, loading, refresh: () => { void refetch(); }, upload, ouvrir, remove };
}

// ── Fournisseurs invités ────────────────────────────────────────────────────────

export function useFournisseursAo(appelOffresId: number) {
  const qc = useQueryClient();
  const key = ['ao-fournisseurs', appelOffresId];
  const { data = [], isLoading: loading, refetch } = useQuery({
    queryKey: key,
    queryFn: async () => unwrap(await ipcClient.appelsOffres.listFournisseurs(appelOffresId)),
    enabled: Boolean(appelOffresId),
    staleTime: 20_000,
  });
  const inv = () => qc.invalidateQueries({ queryKey: key });
  const invite = async (fournisseurIds: number[]) => { const r = unwrap(await ipcClient.appelsOffres.inviteFournisseurs(appelOffresId, fournisseurIds)); await inv(); return r; };
  const remove = async (id: number) => { unwrap(await ipcClient.appelsOffres.removeFournisseurInvite(id)); await inv(); };
  return { data, loading, refresh: () => { void refetch(); }, invite, remove };
}

// ── Grille d'évaluation ──────────────────────────────────────────────────────

export function useCriteresAo(appelOffresId: number) {
  const qc = useQueryClient();
  const key = ['ao-criteres', appelOffresId];
  const { data = [], isLoading: loading, refetch } = useQuery({
    queryKey: key,
    queryFn: async () => unwrap(await ipcClient.appelsOffres.listCriteres(appelOffresId)),
    enabled: Boolean(appelOffresId),
    staleTime: 20_000,
  });
  const inv = () => qc.invalidateQueries({ queryKey: key });
  const create = async (input: CreateCritereInput) => { const r = unwrap(await ipcClient.appelsOffres.createCritere(input)); await inv(); return r; };
  const remove = async (id: number) => { unwrap(await ipcClient.appelsOffres.deleteCritere(id)); await inv(); };
  return { data, loading, refresh: () => { void refetch(); }, create, remove };
}

export function useNotesAo(lotId: number) {
  const { data = [], isLoading: loading } = useQuery({
    queryKey: ['ao-notes', lotId],
    queryFn: async () => unwrap(await ipcClient.appelsOffres.listNotes(lotId)),
    enabled: Boolean(lotId),
    staleTime: 10_000,
  });
  return { data, loading };
}

// ── Offres ────────────────────────────────────────────────────────────────────

export function useOffresAo(appelOffresId: number, lotId?: number) {
  const qc = useQueryClient();
  const key = ['ao-offres', appelOffresId, lotId];
  const { data = [], isLoading: loading, refetch } = useQuery({
    queryKey: key,
    queryFn: async () => unwrap(await ipcClient.appelsOffres.listOffres(appelOffresId, lotId)),
    enabled: Boolean(appelOffresId),
    staleTime: 10_000,
  });
  const inv = () => qc.invalidateQueries({ queryKey: ['ao-offres', appelOffresId] });
  const create = async (input: CreateOffreAoInput) => { const r = unwrap(await ipcClient.appelsOffres.createOffre(input)); await inv(); return r; };
  const saveNote = async (input: NoteEvaluation) => {
    unwrap(await ipcClient.appelsOffres.saveNote(input));
    await inv();
    if (lotId) await qc.invalidateQueries({ queryKey: ['ao-notes', lotId] });
  };
  return { data, loading, refresh: () => { void refetch(); }, create, saveNote };
}

// ── Commission & PV ───────────────────────────────────────────────────────────

export function useCommissionAo(appelOffresId: number) {
  const { data = [], isLoading: loading } = useQuery({
    queryKey: ['ao-commission', appelOffresId],
    queryFn: async () => unwrap(await ipcClient.appelsOffres.listCommission(appelOffresId)),
    enabled: Boolean(appelOffresId),
    staleTime: 20_000,
  });
  return { data, loading };
}

export function usePvAo(appelOffresId: number) {
  const qc = useQueryClient();
  const key = ['ao-pv', appelOffresId];
  const { data = [], isLoading: loading, refetch } = useQuery({
    queryKey: key,
    queryFn: async () => unwrap(await ipcClient.appelsOffres.listPv(appelOffresId)),
    enabled: Boolean(appelOffresId),
    staleTime: 20_000,
  });
  const inv = () => qc.invalidateQueries({ queryKey: key });
  const ouvrirPlis = async (input: OuvrirPlisInput) => {
    const r = unwrap(await ipcClient.appelsOffres.ouvrirPlis(input));
    await inv();
    await qc.invalidateQueries({ queryKey: ['appels-offres'] });
    await qc.invalidateQueries({ queryKey: ['ao-commission', appelOffresId] });
    return r;
  };
  return { data, loading, refresh: () => { void refetch(); }, ouvrirPlis };
}

// ── Attribution ───────────────────────────────────────────────────────────────

export function useAttributionAo(appelOffresId: number) {
  const qc = useQueryClient();
  const invalidateAll = async () => {
    await qc.invalidateQueries({ queryKey: ['ao-lots', appelOffresId] });
    await qc.invalidateQueries({ queryKey: ['ao-offres', appelOffresId] });
    await qc.invalidateQueries({ queryKey: ['ao-pv', appelOffresId] });
    await qc.invalidateQueries({ queryKey: ['appels-offres'] });
  };
  const attribuer = async (input: AttribuerLotInput) => { const r = unwrap(await ipcClient.appelsOffres.attribuerLot(input)); await invalidateAll(); return r; };
  const marquerInfructueux = async (lotId: number) => { const r = unwrap(await ipcClient.appelsOffres.marquerLotInfructueux(lotId)); await invalidateAll(); return r; };
  return { attribuer, marquerInfructueux };
}
