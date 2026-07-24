import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { notify } from '@/lib/toast';
import { useHotelsList } from '@/hooks/useHotelsList';
import type { OrganigrammeNode, EffectifEgtSummary } from '@/shared/types/phase2';
import { Network, Download } from 'lucide-react';

export default function RhOrganisationEgtPage() {
  const { hotels, defaultHotelId } = useHotelsList();
  const [hotelId, setHotelId] = useState<number | undefined>(defaultHotelId || undefined);

  const { data: nodes = [], isLoading } = useQuery({
    queryKey: ['organigramme-egt', hotelId],
    queryFn: async () =>
      unwrapIpc(await ipcClient.rh.getOrganigrammeEgt(hotelId)) as OrganigrammeNode[],
  });

  const { data: effectifs = [] } = useQuery({
    queryKey: ['effectifs-egt', hotelId],
    queryFn: async () =>
      unwrapIpc(await ipcClient.rh.getEffectifsEgt(hotelId)) as EffectifEgtSummary[],
  });

  const exportCsv = useMutation({
    mutationFn: async () => unwrapIpc(await ipcClient.rh.exportOrganigrammeCsv(hotelId)),
    onSuccess: (content) => {
      const blob = new Blob([content as string], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `organigramme-egt${hotelId ? `-hotel-${hotelId}` : ''}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      notify.success('Export CSV téléchargé');
    },
    onError: () => notify.error('Erreur export CSV'),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Network className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Organisation EGT</h1>
            <p className="text-sm text-muted-foreground">Organigramme et effectifs cibles</p>
          </div>
        </div>
        <button
          onClick={() => exportCsv.mutate()}
          disabled={exportCsv.isPending}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <select
        value={hotelId ?? ''}
        onChange={(e) => setHotelId(e.target.value ? Number(e.target.value) : undefined)}
        className="border rounded-lg px-3 py-2 text-sm bg-background"
      >
        <option value="">Tous les hôtels</option>
        {hotels.map((h) => (
          <option key={h.id} value={h.id}>{h.name}</option>
        ))}
      </select>

      {effectifs.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {effectifs.map((e) => (
            <div key={e.directionId} className="bg-card border rounded-xl p-4">
              <p className="text-xs text-muted-foreground truncate">{e.directionNom}</p>
              <p className="text-lg font-bold mt-1">{e.effectifReel} / {e.effectifCible}</p>
              <p className={`text-xs mt-1 ${e.ecart >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                Écart : {e.ecart >= 0 ? '+' : ''}{e.ecart}
              </p>
            </div>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="h-48 rounded-xl bg-muted animate-pulse" />
      ) : nodes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun nœud dans l'organigramme.</p>
      ) : (
        <div className="bg-card border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-2 font-medium">Type</th>
                <th className="text-left px-4 py-2 font-medium">Libellé</th>
                <th className="text-right px-4 py-2 font-medium">Cible</th>
                <th className="text-right px-4 py-2 font-medium">Réel</th>
                <th className="text-right px-4 py-2 font-medium">Écart</th>
              </tr>
            </thead>
            <tbody>
              {nodes.map((n) => (
                <tr key={`${n.type}-${n.id}`} className="border-b last:border-0">
                  <td className="px-4 py-2 capitalize text-muted-foreground">{n.type}</td>
                  <td className="px-4 py-2 font-medium">{n.libelle}</td>
                  <td className="px-4 py-2 text-right">{n.effectifCible}</td>
                  <td className="px-4 py-2 text-right">{n.effectifReel}</td>
                  <td className={`px-4 py-2 text-right ${n.ecart >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {n.ecart >= 0 ? '+' : ''}{n.ecart}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
