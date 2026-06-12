import { useState, useEffect, useCallback } from 'react';
import { ipcClient } from '@/lib/ipcClient';
import type {
  ComposantTarif, CreateComposantInput,
  FormuleTarif, CreateFormuleInput,
  PlanTarifaire, CreatePlanInput,
  TarifJournalier, UpsertTarifInput, UpsertTarifsBulkInput,
  PromotionTarif, CreatePromotionInput,
  Convention, CreateConventionInput,
  SimulateurInput, SimulateurResult,
} from '@/shared/types/tarifs';

function unwrap<T>(r: { ok: boolean; data?: T; error?: string }): T {
  if (!r.ok) throw new Error(r.error ?? 'Erreur inconnue');
  return r.data as T;
}

// ── Composants ────────────────────────────────────────────────────────────────

export function useComposants(hotelId?: number) {
  const [data, setData] = useState<ComposantTarif[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(unwrap(await ipcClient.tarifs.listComposants(hotelId))); }
    catch { setData([]); } finally { setLoading(false); }
  }, [hotelId]);

  useEffect(() => { load(); }, [load]);

  const create = useCallback(async (input: CreateComposantInput) => {
    const r = unwrap(await ipcClient.tarifs.createComposant(input));
    await load(); return r;
  }, [load]);

  const remove = useCallback(async (id: number) => {
    unwrap(await ipcClient.tarifs.deleteComposant(id)); await load();
  }, [load]);

  return { data, loading, refresh: load, create, remove };
}

// ── Formules ──────────────────────────────────────────────────────────────────

export function useFormules(hotelId?: number) {
  const [data, setData] = useState<FormuleTarif[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(unwrap(await ipcClient.tarifs.listFormules(hotelId))); }
    catch { setData([]); } finally { setLoading(false); }
  }, [hotelId]);

  useEffect(() => { load(); }, [load]);

  const create = useCallback(async (input: CreateFormuleInput) => {
    const r = unwrap(await ipcClient.tarifs.createFormule(input)); await load(); return r;
  }, [load]);

  const remove = useCallback(async (id: number) => {
    unwrap(await ipcClient.tarifs.deleteFormule(id)); await load();
  }, [load]);

  return { data, loading, refresh: load, create, remove };
}

// ── Plans ─────────────────────────────────────────────────────────────────────

export function usePlans(hotelId?: number) {
  const [data, setData] = useState<PlanTarifaire[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(unwrap(await ipcClient.tarifs.listPlans(hotelId))); }
    catch { setData([]); } finally { setLoading(false); }
  }, [hotelId]);

  useEffect(() => { load(); }, [load]);

  const create = useCallback(async (input: CreatePlanInput) => {
    const r = unwrap(await ipcClient.tarifs.createPlan(input)); await load(); return r;
  }, [load]);

  const remove = useCallback(async (id: number) => {
    unwrap(await ipcClient.tarifs.deletePlan(id)); await load();
  }, [load]);

  return { data, loading, refresh: load, create, remove };
}

// ── Grille tarifaire ──────────────────────────────────────────────────────────

export function useGrille(hotelId: number, planId: number, dateDebut: string, dateFin: string, formuleId?: number) {
  const [data, setData] = useState<TarifJournalier[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!hotelId || !planId || !dateDebut || !dateFin) return;
    setLoading(true);
    try { setData(unwrap(await ipcClient.tarifs.getGrille(hotelId, planId, dateDebut, dateFin, formuleId))); }
    catch { setData([]); } finally { setLoading(false); }
  }, [hotelId, planId, dateDebut, dateFin, formuleId]);

  useEffect(() => { load(); }, [load]);

  const upsert = useCallback(async (input: UpsertTarifInput) => {
    unwrap(await ipcClient.tarifs.upsertTarif(input)); await load();
  }, [load]);

  const upsertBulk = useCallback(async (input: UpsertTarifsBulkInput) => {
    const count = unwrap(await ipcClient.tarifs.upsertBulk(input)); await load(); return count;
  }, [load]);

  return { data, loading, refresh: load, upsert, upsertBulk };
}

// ── Promotions ────────────────────────────────────────────────────────────────

export function usePromotions(hotelId?: number) {
  const [data, setData] = useState<PromotionTarif[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(unwrap(await ipcClient.tarifs.listPromotions(hotelId))); }
    catch { setData([]); } finally { setLoading(false); }
  }, [hotelId]);

  useEffect(() => { load(); }, [load]);

  const create = useCallback(async (input: CreatePromotionInput) => {
    const r = unwrap(await ipcClient.tarifs.createPromotion(input)); await load(); return r;
  }, [load]);

  const toggle = useCallback(async (id: number, actif: boolean) => {
    unwrap(await ipcClient.tarifs.togglePromotion(id, actif)); await load();
  }, [load]);

  const remove = useCallback(async (id: number) => {
    unwrap(await ipcClient.tarifs.deletePromotion(id)); await load();
  }, [load]);

  return { data, loading, refresh: load, create, toggle, remove };
}

// ── Conventions ───────────────────────────────────────────────────────────────

export function useConventions(hotelId?: number, clientId?: number) {
  const [data, setData] = useState<Convention[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(unwrap(await ipcClient.tarifs.listConventions(hotelId, clientId))); }
    catch { setData([]); } finally { setLoading(false); }
  }, [hotelId, clientId]);

  useEffect(() => { load(); }, [load]);

  const create = useCallback(async (input: CreateConventionInput) => {
    const r = unwrap(await ipcClient.tarifs.createConvention(input)); await load(); return r;
  }, [load]);

  const toggle = useCallback(async (id: number, actif: boolean) => {
    unwrap(await ipcClient.tarifs.toggleConvention(id, actif)); await load();
  }, [load]);

  const remove = useCallback(async (id: number) => {
    unwrap(await ipcClient.tarifs.deleteConvention(id)); await load();
  }, [load]);

  return { data, loading, refresh: load, create, toggle, remove };
}

// ── Simulateur ────────────────────────────────────────────────────────────────

export function useSimulateur() {
  const [result, setResult] = useState<SimulateurResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const simuler = useCallback(async (input: SimulateurInput) => {
    setLoading(true); setError(null);
    try { setResult(unwrap(await ipcClient.tarifs.simuler(input))); }
    catch (e) { setError((e as Error).message); setResult(null); }
    finally { setLoading(false); }
  }, []);

  return { result, loading, error, simuler, reset: () => setResult(null) };
}
