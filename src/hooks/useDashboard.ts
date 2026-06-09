import { useCallback, useEffect, useState } from 'react';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import type { DashboardDto, DashboardFilters } from '@/shared/types/dashboard';

const now = new Date();

export function createDefaultDashboardFilters(): DashboardFilters {
  return { annee: now.getFullYear(), mois: now.getMonth() + 1 };
}

export function useDashboard(canView: boolean) {
  const [draftFilters, setDraftFilters] = useState<DashboardFilters>(createDefaultDashboardFilters);
  const [appliedFilters, setAppliedFilters] = useState<DashboardFilters>(createDefaultDashboardFilters);
  const [data, setData] = useState<DashboardDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exportMsg, setExportMsg] = useState('');

  const reload = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    setError('');
    try {
      setData(unwrapIpc(await ipcClient.dashboard.get(appliedFilters)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, canView]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const applyFilters = useCallback(() => {
    setAppliedFilters({ ...draftFilters });
  }, [draftFilters]);

  const resetFilters = useCallback(() => {
    const defaults = createDefaultDashboardFilters();
    setDraftFilters(defaults);
    setAppliedFilters(defaults);
  }, []);

  const exportExcel = useCallback(async () => {
    if (!data?.canExport) return;
    const r = unwrapIpc(await ipcClient.export.dashboardExcel(appliedFilters));
    setExportMsg(r.message ?? (r.ok ? `Export : ${r.filePath}` : 'Échec export'));
  }, [appliedFilters, data?.canExport]);

  const exportPdf = useCallback(async () => {
    if (!data?.canExport) return;
    const r = unwrapIpc(await ipcClient.export.dashboardPdf(appliedFilters));
    setExportMsg(r.message ?? (r.ok ? `Export : ${r.filePath}` : 'Échec export'));
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
  };
}
