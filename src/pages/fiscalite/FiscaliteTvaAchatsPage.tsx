import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Loader2, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { formatMoney } from '@/lib/formatters';
import { notify } from '@/lib/toast';
import type { RegistreTvaAchat } from '@/shared/types/fiscalite';

const inputCls = 'h-8 rounded-lg border border-border/60 bg-white px-2.5 text-[13px] shadow-sm outline-none focus:border-primary/50';

function currentPeriode() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function FiscaliteTvaAchatsPage() {
  const qc = useQueryClient();
  const [periode, setPeriode] = useState(currentPeriode());

  const { data: achats = [], isLoading } = useQuery({
    queryKey: ['fiscalite-achats', periode],
    queryFn: async () => unwrapIpc(await ipcClient.fiscalite.listAchats(periode)) as RegistreTvaAchat[],
  });

  const importMut = useMutation({
    mutationFn: async () => unwrapIpc(await ipcClient.fiscalite.importAchatsFromBons(periode)),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ['fiscalite-achats', periode] }); notify.success(`${r.imported} bon(s) importé(s)`); },
    onError: (e: Error) => notify.error(e.message),
  });

  const exportMut = useMutation({
    mutationFn: async () => unwrapIpc(await ipcClient.fiscalite.exportAchatsCsv(periode)),
    onSuccess: (csv) => {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `registre-tva-achats-${periode}.csv`;
      a.click();
      notify.success('Export CSV téléchargé');
    },
    onError: (e: Error) => notify.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-white px-4 py-2.5 shadow-sm">
        <input type="month" className={inputCls} value={periode} onChange={(e) => setPeriode(e.target.value)} />
        <Button size="sm" variant="outline" onClick={() => importMut.mutate()} disabled={importMut.isPending} className="gap-1.5">
          {importMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Package className="h-3.5 w-3.5" />}
          Importer bons validés
        </Button>
        <Button size="sm" variant="outline" onClick={() => exportMut.mutate()} disabled={exportMut.isPending} className="gap-1.5">
          <Download className="h-3.5 w-3.5" /> Export CSV
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : achats.length === 0 ? (
        <p className="rounded-xl border px-4 py-8 text-center text-sm text-muted-foreground">Aucune ligne TVA achats pour {periode}.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50/60">
                {['Date', 'N° pièce', 'Fournisseur', 'Base HT', 'TVA', 'TTC', 'Source'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-bold uppercase text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {achats.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-3">{a.dateOperation}</td>
                  <td className="px-4 py-3 font-mono text-[12px]">{a.numeroPiece}</td>
                  <td className="px-4 py-3">{a.fournisseurNom}</td>
                  <td className="px-4 py-3 font-mono tabular-nums">{formatMoney(a.baseHt)}</td>
                  <td className="px-4 py-3 font-mono tabular-nums">{formatMoney(a.montantTva)}</td>
                  <td className="px-4 py-3 font-mono tabular-nums">{formatMoney(a.montantTtc)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{a.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
