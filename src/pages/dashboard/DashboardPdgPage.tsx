import { useQuery, useMutation } from '@tanstack/react-query';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { notify } from '@/lib/toast';
import { formatMoney, formatPercent } from '@/lib/formatters';
import type { PdgKpi } from '@/shared/types/phase2';
import { LayoutDashboard, Download, FileSpreadsheet } from 'lucide-react';

const levelColor = (level: string) =>
  ({ normal: 'border-green-200', warning: 'border-yellow-200', critical: 'border-red-200' }[level] ?? 'border-border');

export default function DashboardPdgPage() {
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dashboard-pdg'],
    queryFn: async () => unwrapIpc(await ipcClient.dashboardPdg.get()),
  });

  const exportCsv = useMutation({
    mutationFn: async () => unwrapIpc(await ipcClient.dashboardPdg.exportCsv()),
    onSuccess: () => notify.success('Export CSV généré'),
    onError: () => notify.error('Erreur export CSV'),
  });

  const exportMensuel = useMutation({
    mutationFn: async () => unwrapIpc(await ipcClient.dashboardPdg.exportMensuel()),
    onSuccess: (res) => {
      if (res.ok && res.filePath) notify.success(`Rapport mensuel : ${res.filePath}`);
      else if (res.message) notify.info(res.message);
    },
    onError: () => notify.error('Erreur export rapport mensuel'),
  });

  const kpis = (dashboard?.kpis ?? []) as PdgKpi[];
  const parHotel = dashboard?.parHotel ?? [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Tableau de bord PDG</h1>
            <p className="text-sm text-muted-foreground">Vue consolidée multi-hôtels</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportMensuel.mutate()}
            disabled={exportMensuel.isPending}
            className="flex items-center gap-2 border rounded-lg px-4 py-2 text-sm font-medium hover:bg-muted/50 disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" /> Rapport mensuel CA
          </button>
          <button
            onClick={() => exportCsv.mutate()}
            disabled={exportCsv.isPending}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {kpis.map((k) => (
            <div key={k.code} className={`bg-card border rounded-xl p-4 ${levelColor(k.level)}`}>
              <p className="text-xs text-muted-foreground">{k.domaine}</p>
              <p className="text-sm font-medium mt-1">{k.libelle}</p>
              <p className="text-2xl font-bold mt-2">
                {k.unite === '%' ? formatPercent(k.value) : k.unite === 'DZD' ? formatMoney(k.value) : k.value}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b">
          <h2 className="text-sm font-semibold">Performance par hôtel</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-2 font-medium">Hôtel</th>
                <th className="text-right px-4 py-2 font-medium">CA mois</th>
                <th className="text-right px-4 py-2 font-medium">Occupation</th>
                <th className="text-right px-4 py-2 font-medium">Créances</th>
              </tr>
            </thead>
            <tbody>
              {parHotel.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Aucune donnée</td>
                </tr>
              ) : (
                parHotel.map((h) => (
                  <tr key={h.hotelId} className="border-b last:border-0">
                    <td className="px-4 py-2">{h.hotelName}</td>
                    <td className="px-4 py-2 text-right">{formatMoney(h.caMois)}</td>
                    <td className="px-4 py-2 text-right">{formatPercent(h.occupation)}</td>
                    <td className="px-4 py-2 text-right">{formatMoney(h.creances)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
