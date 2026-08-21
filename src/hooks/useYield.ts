import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ipcClient } from '@/lib/ipcClient';
import type {
  CreateYieldRuleInput,
  UpdateYieldRuleInput,
  ComputeYieldSuggestionsInput,
  YieldSuggestion,
  ApplyYieldSuggestionsInput,
} from '@/shared/types/yield';

function unwrap<T>(r: { ok: boolean; data?: T; error?: string }): T {
  if (!r.ok) throw new Error(r.error ?? 'Erreur inconnue');
  return r.data as T;
}

// ── Règles de yield ───────────────────────────────────────────────────────────

export function useYieldRules(hotelId?: number) {
  const qc = useQueryClient();
  const key = ['yield-rules', hotelId];
  const { data = [], isLoading: loading, refetch } = useQuery({
    queryKey: key,
    queryFn: async () => unwrap(await ipcClient.yield.listRules(hotelId)),
    staleTime: 30_000,
  });
  const inv = () => qc.invalidateQueries({ queryKey: key });
  const create = async (input: CreateYieldRuleInput) => { const r = unwrap(await ipcClient.yield.createRule(input)); await inv(); return r; };
  const update = async (id: number, input: UpdateYieldRuleInput) => { const r = unwrap(await ipcClient.yield.updateRule(id, input)); await inv(); return r; };
  const toggle = async (id: number, actif: boolean) => { unwrap(await ipcClient.yield.toggleRule(id, actif)); await inv(); };
  const remove = async (id: number) => { unwrap(await ipcClient.yield.deleteRule(id)); await inv(); };
  return { data, loading, refresh: () => { void refetch(); }, create, update, toggle, remove };
}

// ── Suggestions (action à la demande, pas de cache) ───────────────────────────

export function useYieldSuggestions() {
  const [result, setResult] = useState<YieldSuggestion[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const compute = async (input: ComputeYieldSuggestionsInput) => {
    setLoading(true);
    setError(null);
    try {
      setResult(unwrap(await ipcClient.yield.computeSuggestions(input)));
    } catch (e) {
      setError((e as Error).message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const apply = async (input: ApplyYieldSuggestionsInput) => {
    const count = unwrap(await ipcClient.yield.applySuggestions(input));
    setResult(null);
    return count;
  };

  return { result, loading, error, compute, apply, reset: () => setResult(null) };
}
