import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import type { DashboardFilters } from '@/shared/types/dashboard';
import { createDefaultDashboardFilters } from './useDashboard';

export function usePortDashboard() {
  const [draftFilters, setDraftFilters] = useState<DashboardFilters>(createDefaultDashboardFilters);
  const [appliedFilters, setAppliedFilters] = useState<DashboardFilters>(createDefaultDashboardFilters);

  const { data = null, isLoading: loading, error: queryError, refetch } = useQuery({
    queryKey: ['port-dashboard', appliedFilters],
    queryFn: async () => unwrapIpc(await ipcClient.portmaster.dashboard(appliedFilters)),
    staleTime: 30_000,
  });

  const error = queryError instanceof Error ? queryError.message : queryError ? 'Erreur' : '';

  const applyFilters = useCallback(() => {
    setAppliedFilters({ ...draftFilters });
  }, [draftFilters]);

  const resetFilters = useCallback(() => {
    const defaults = createDefaultDashboardFilters();
    setDraftFilters(defaults);
    setAppliedFilters(defaults);
  }, []);

  return {
    draftFilters,
    setDraftFilters,
    appliedFilters,
    data,
    loading,
    error,
    applyFilters,
    resetFilters,
    reload: () => { void refetch(); },
  };
}
