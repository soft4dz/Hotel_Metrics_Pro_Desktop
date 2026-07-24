import { useMutation, useQuery } from '@tanstack/react-query';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { notify } from '@/lib/toast';
import type { RgpdTraitement } from '@/shared/types/rgpd';
import { Download } from 'lucide-react';

export function RgpdTraitementsPage() {
  const { data: traitements = [], isLoading } = useQuery({
    queryKey: ['rgpd-traitements'],
    queryFn: async () => unwrapIpc(await ipcClient.rgpd.listTraitements(false)) as RgpdTraitement[],
  });

  const exportCsv = useMutation({
    mutationFn: async () => unwrapIpc(await ipcClient.rgpd.exportTraitementsCsv()),
    onSuccess: () => notify.success('Registre des traitements exporté'),
    onError: () => notify.error('Export impossible'),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => exportCsv.mutate()}
          disabled={exportCsv.isPending}
          className="flex items-center gap-2 border rounded-lg px-3 py-2 text-sm hover:bg-muted/50"
        >
          <Download className="w-4 h-4" /> Export registre CSV
        </button>
      </div>
      {isLoading ? (
        <div className="h-40 rounded-xl bg-muted animate-pulse" />
      ) : (
        <div className="space-y-3">
          {traitements.map((t) => (
            <div key={t.id} className="bg-card border rounded-xl p-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold">{t.libelle}</span>
                <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{t.code}</span>
                {!t.actif && <span className="text-xs text-muted-foreground">(inactif)</span>}
              </div>
              <p className="text-sm text-muted-foreground mt-1">{t.finalite}</p>
              <div className="flex gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                <span>Base légale : {t.baseLegale}</span>
                <span>Durée : {t.dureeConservation ?? '—'}</span>
                <span>Responsable : {t.responsableTraitement ?? '—'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
