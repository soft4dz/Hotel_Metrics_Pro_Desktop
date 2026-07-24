import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Send, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { formatMoney } from '@/lib/formatters';
import { notify } from '@/lib/toast';
import type { SifecFactureItem } from '@/shared/types/sifec';

const STATUT_COLORS: Record<string, string> = {
  prepare: 'text-amber-600',
  soumis: 'text-blue-600',
  accepte: 'text-green-600',
  rejete: 'text-red-600',
  erreur: 'text-red-700',
};

export function SifecFacturesPage() {
  const qc = useQueryClient();
  const { data: factures = [], isLoading } = useQuery({
    queryKey: ['sifec-factures'],
    queryFn: async () => unwrapIpc(await ipcClient.sifec.listFactures()) as SifecFactureItem[],
  });

  const pending = factures.filter((f) => !['accepte'].includes(f.sifecStatut));

  const submitMut = useMutation({
    mutationFn: async (id: number) => unwrapIpc(await ipcClient.sifec.submitFacture(id)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sifec-factures'] }); qc.invalidateQueries({ queryKey: ['sifec-dashboard'] }); notify.success('Transmission SIFEC effectuée'); },
    onError: (e: Error) => notify.error(e.message),
  });

  const batchMut = useMutation({
    mutationFn: async () => unwrapIpc(await ipcClient.sifec.submitBatch(pending.map((f) => f.factureId))),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sifec-factures'] }); qc.invalidateQueries({ queryKey: ['sifec-dashboard'] }); notify.success('Lot SIFEC transmis'); },
    onError: (e: Error) => notify.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={pending.length === 0 || batchMut.isPending} onClick={() => batchMut.mutate()} className="gap-1.5">
          {batchMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          Transmettre le lot ({pending.length})
        </Button>
      </div>

      {isLoading ? (
        <div className="flex min-h-[120px] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : factures.length === 0 ? (
        <p className="rounded-xl border px-4 py-8 text-center text-sm text-muted-foreground">Aucune facture validée avec métadonnées fiscales.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50/60">
                {['N° facture', 'Date', 'Client', 'TTC', 'Statut SIFEC', 'UID', ''].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {factures.map((f) => (
                <tr key={f.factureId} className="hover:bg-slate-50/40">
                  <td className="px-4 py-3 font-mono text-[12px]">{f.numero}</td>
                  <td className="px-4 py-3">{f.dateEmission}</td>
                  <td className="px-4 py-3">{f.clientNom}</td>
                  <td className="px-4 py-3 font-mono tabular-nums">{formatMoney(f.montantTtc)}</td>
                  <td className={`px-4 py-3 capitalize ${STATUT_COLORS[f.sifecStatut] ?? ''}`}>{f.sifecStatut}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">{f.sifecUid ?? '—'}</td>
                  <td className="px-4 py-3">
                    {f.sifecStatut !== 'accepte' && (
                      <Button size="sm" variant="outline" disabled={submitMut.isPending} onClick={() => submitMut.mutate(f.factureId)} className="h-7 gap-1">
                        <Send className="h-3 w-3" /> Envoyer
                      </Button>
                    )}
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
