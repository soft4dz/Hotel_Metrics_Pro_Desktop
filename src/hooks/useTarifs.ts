import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ipcClient } from '@/lib/ipcClient';
import type {
  CreateComposantInput,
  CreateFormuleInput,
  CreatePlanInput,
  UpsertTarifInput,
  UpsertTarifsBulkInput,
  CreatePromotionInput,
  CreateConventionInput,
  SimulateurInput,
  SimulateurResult,
} from '@/shared/types/tarifs';

function unwrap<T>(r: { ok: boolean; data?: T; error?: string }): T {
  if (!r.ok) throw new Error(r.error ?? 'Erreur inconnue');
  return r.data as T;
}

// ── Composants ────────────────────────────────────────────────────────────────

export function useComposants(hotelId?: number) {
  const qc = useQueryClient();
  const key = ['composants', hotelId];
  const { data = [], isLoading: loading, refetch } = useQuery({
    queryKey: key,
    queryFn: async () => unwrap(await ipcClient.tarifs.listComposants(hotelId)),
    staleTime: 60_000,
  });
  const inv = () => qc.invalidateQueries({ queryKey: key });
  const create = async (input: CreateComposantInput) => { const r = unwrap(await ipcClient.tarifs.createComposant(input)); await inv(); return r; };
  const remove = async (id: number) => { unwrap(await ipcClient.tarifs.deleteComposant(id)); await inv(); };
  return { data, loading, refresh: () => { void refetch(); }, create, remove };
}

// ── Formules ──────────────────────────────────────────────────────────────────

export function useFormules(hotelId?: number) {
  const qc = useQueryClient();
  const key = ['formules', hotelId];
  const { data = [], isLoading: loading, refetch } = useQuery({
    queryKey: key,
    queryFn: async () => unwrap(await ipcClient.tarifs.listFormules(hotelId)),
    staleTime: 60_000,
  });
  const inv = () => qc.invalidateQueries({ queryKey: key });
  const create = async (input: CreateFormuleInput) => { const r = unwrap(await ipcClient.tarifs.createFormule(input)); await inv(); return r; };
  const remove = async (id: number) => { unwrap(await ipcClient.tarifs.deleteFormule(id)); await inv(); };
  return { data, loading, refresh: () => { void refetch(); }, create, remove };
}

// ── Plans ─────────────────────────────────────────────────────────────────────

export function usePlans(hotelId?: number) {
  const qc = useQueryClient();
  const key = ['plans', hotelId];
  const { data = [], isLoading: loading, refetch } = useQuery({
    queryKey: key,
    queryFn: async () => unwrap(await ipcClient.tarifs.listPlans(hotelId)),
    staleTime: 60_000,
  });
  const inv = () => qc.invalidateQueries({ queryKey: key });
  const create = async (input: CreatePlanInput) => { const r = unwrap(await ipcClient.tarifs.createPlan(input)); await inv(); return r; };
  const remove = async (id: number) => { unwrap(await ipcClient.tarifs.deletePlan(id)); await inv(); };
  return { data, loading, refresh: () => { void refetch(); }, create, remove };
}

// ── Grille tarifaire ──────────────────────────────────────────────────────────

export function useGrille(hotelId: number, planId: number, dateDebut: string, dateFin: string, formuleId?: number) {
  const qc = useQueryClient();
  const key = ['grille', hotelId, planId, dateDebut, dateFin, formuleId];
  const { data = [], isLoading: loading, refetch } = useQuery({
    queryKey: key,
    queryFn: async () => unwrap(await ipcClient.tarifs.getGrille(hotelId, planId, dateDebut, dateFin, formuleId)),
    enabled: !!(hotelId && planId && dateDebut && dateFin),
    staleTime: 30_000,
  });
  const inv = () => qc.invalidateQueries({ queryKey: key });
  const upsert = async (input: UpsertTarifInput) => { unwrap(await ipcClient.tarifs.upsertTarif(input)); await inv(); };
  const upsertBulk = async (input: UpsertTarifsBulkInput) => { const count = unwrap(await ipcClient.tarifs.upsertBulk(input)); await inv(); return count; };
  return { data, loading, refresh: () => { void refetch(); }, upsert, upsertBulk };
}

// ── Promotions ────────────────────────────────────────────────────────────────

export function usePromotions(hotelId?: number) {
  const qc = useQueryClient();
  const key = ['promotions', hotelId];
  const { data = [], isLoading: loading, refetch } = useQuery({
    queryKey: key,
    queryFn: async () => unwrap(await ipcClient.tarifs.listPromotions(hotelId)),
    staleTime: 60_000,
  });
  const inv = () => qc.invalidateQueries({ queryKey: key });
  const create = async (input: CreatePromotionInput) => { const r = unwrap(await ipcClient.tarifs.createPromotion(input)); await inv(); return r; };
  const toggle = async (id: number, actif: boolean) => { unwrap(await ipcClient.tarifs.togglePromotion(id, actif)); await inv(); };
  const remove = async (id: number) => { unwrap(await ipcClient.tarifs.deletePromotion(id)); await inv(); };
  return { data, loading, refresh: () => { void refetch(); }, create, toggle, remove };
}

// ── Conventions ───────────────────────────────────────────────────────────────

export function useConventions(hotelId?: number, clientId?: number) {
  const qc = useQueryClient();
  const key = ['conventions', hotelId, clientId];
  const { data = [], isLoading: loading, refetch } = useQuery({
    queryKey: key,
    queryFn: async () => unwrap(await ipcClient.tarifs.listConventions(hotelId, clientId)),
    staleTime: 60_000,
  });
  const inv = () => qc.invalidateQueries({ queryKey: key });
  const create = async (input: CreateConventionInput) => { const r = unwrap(await ipcClient.tarifs.createConvention(input)); await inv(); return r; };
  const toggle = async (id: number, actif: boolean) => { unwrap(await ipcClient.tarifs.toggleConvention(id, actif)); await inv(); };
  const remove = async (id: number) => { unwrap(await ipcClient.tarifs.deleteConvention(id)); await inv(); };
  return { data, loading, refresh: () => { void refetch(); }, create, toggle, remove };
}

// ── Simulateur (action one-shot, pas de cache) ────────────────────────────────

export function useSimulateur() {
  const [result, setResult] = useState<SimulateurResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const simuler = async (input: SimulateurInput) => {
    setLoading(true);
    setError(null);
    try {
      setResult(unwrap(await ipcClient.tarifs.simuler(input)));
    } catch (e) {
      setError((e as Error).message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return { result, loading, error, simuler, reset: () => setResult(null) };
}
