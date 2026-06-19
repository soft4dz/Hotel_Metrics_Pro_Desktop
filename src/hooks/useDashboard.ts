import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import type { DashboardFilters } from '@/shared/types/dashboard';

const now = new Date();

export function createDefaultDashboardFilters(): DashboardFilters {
  return { annee: now.getFullYear(), mois: now.getMonth() + 1 };
}

export function useDashboard(canView: boolean) {
  const [draftFilters, setDraftFilters] = useState<DashboardFilters>(createDefaultDashboardFilters);
  const [appliedFilters, setAppliedFilters] = useState<DashboardFilters>(createDefaultDashboardFilters);
  const [exportMsg, setExportMsg] = useState('');

  const { data = null, isLoading: loading, error: queryError, refetch } = useQuery({
    queryKey: ['dashboard', appliedFilters],
    queryFn: async () => unwrapIpc(await ipcClient.dashboard.get(appliedFilters)),
    enabled: canView,
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

  const exportExcel = useCallback(async () => {
    if (!data?.canExport) {
      setExportMsg('Export non autorisé pour votre profil.');
      return;
    }
    try {
      const r = unwrapIpc(await ipcClient.export.dashboardExcel(appliedFilters));
      setExportMsg(r.ok && r.filePath ? `Excel enregistré : ${r.filePath}` : r.message ?? 'Export annulé.');
    } catch (e) {
      setExportMsg(e instanceof Error ? e.message : 'Échec export Excel');
    }
  }, [appliedFilters, data?.canExport]);

  const exportPdf = useCallback(async () => {
    if (!data?.canExport) {
      setExportMsg('Export non autorisé pour votre profil.');
      return;
    }
    try {
      const r = unwrapIpc(await ipcClient.export.dashboardPdf(appliedFilters));
      setExportMsg(r.ok && r.filePath ? `PDF enregistré : ${r.filePath}` : r.message ?? 'Export annulé.');
    } catch (e) {
      setExportMsg(e instanceof Error ? e.message : 'Échec export PDF');
    }
  }, [appliedFilters, data?.canExport]);

  return {
    draftFilters,
    setDraftFilters,
    appliedFilters,
    data,
    loading,
    error,
    exportMsg,
    applyFilters,
    resetFilters,
    exportExcel,
    exportPdf,
    reload: () => { void refetch(); },
  };
}
