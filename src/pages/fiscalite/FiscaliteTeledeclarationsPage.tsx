import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileOutput, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { formatMoney } from '@/lib/formatters';
import { notify } from '@/lib/toast';
import type { Teledeclaration } from '@/shared/types/fiscalite';

const inputCls = 'h-8 rounded-lg border border-border/60 bg-white px-2.5 text-[13px] shadow-sm outline-none focus:border-primary/50';

function currentPeriode() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function FiscaliteTeledeclarationsPage() {
  const qc = useQueryClient();
  const [periode, setPeriode] = useState(currentPeriode());
  const [refDgi, setRefDgi] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data: teledecls = [], isLoading } = useQuery({
    queryKey: ['fiscalite-teledecl'],
    queryFn: async () => unwrapIpc(await ipcClient.fiscalite.listTeledeclarations()) as Teledeclaration[],
  });

  const exportMut = useMutation({
    mutationFn: async () => unwrapIpc(await ipcClient.fiscalite.exportTeledeclTvaG50(periode)),
    onSuccess: (csv) => {
      qc.invalidateQueries({ queryKey: ['fiscalite-teledecl'] });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `teledecl-tva-g50-${periode}.csv`;
      a.click();
      notify.success('Export G50 généré');
    },
    onError: (e: Error) => notify.error(e.message),
  });

  const declareMut = useMutation({
    mutationFn: async () => {
      if (!selectedId || !refDgi.trim()) throw new Error('Sélectionnez une télédéclaration et saisissez la référence DGI.');
      return unwrapIpc(await ipcClient.fiscalite.marquerTeledeclDeclaree(selectedId, refDgi.trim()));
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fiscalite-teledecl'] }); setRefDgi(''); notify.success('Télédéclaration marquée comme déclarée'); },
    onError: (e: Error) => notify.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-white px-4 py-2.5 shadow-sm">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Période TVA</span>
        <input type="month" className={inputCls} value={periode} onChange={(e) => setPeriode(e.target.value)} />
        <Button size="sm" onClick={() => exportMut.mutate()} disabled={exportMut.isPending} className="gap-1.5">
          {exportMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileOutput className="h-3.5 w-3.5" />}
          Exporter G50 TVA
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-xl border bg-white px-4 py-3 shadow-sm">
        <div>
          <label className="text-xs text-muted-foreground">Référence DGI (après dépôt portail)</label>
          <input className={inputCls + ' min-w-[220px]'} value={refDgi} onChange={(e) => setRefDgi(e.target.value)} placeholder="REF-DGI-2026-..." />
        </div>
        <Button size="sm" variant="outline" disabled={!selectedId || declareMut.isPending} onClick={() => declareMut.mutate()}>
          Marquer déclarée
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : teledecls.length === 0 ? (
        <p className="rounded-xl border px-4 py-8 text-center text-sm text-muted-foreground">Aucune télédéclaration enregistrée. Exportez d&apos;abord une déclaration TVA G50.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50/60">
                {['', 'Type', 'Période', 'Montant', 'Statut', 'Réf. DGI', 'Export'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-bold uppercase text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {teledecls.map((t) => (
                <tr key={t.id} className={selectedId === t.id ? 'bg-primary/5' : ''} onClick={() => setSelectedId(t.id)}>
                  <td className="px-4 py-3"><input type="radio" checked={selectedId === t.id} onChange={() => setSelectedId(t.id)} /></td>
                  <td className="px-4 py-3 uppercase">{t.typeDecl}</td>
                  <td className="px-4 py-3 font-mono">{t.periode}</td>
                  <td className="px-4 py-3 font-mono tabular-nums">{t.montantDeclare != null ? formatMoney(t.montantDeclare) : '—'}</td>
                  <td className="px-4 py-3 capitalize">{t.statut}</td>
                  <td className="px-4 py-3 font-mono text-[11px]">{t.referenceDgi ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground text-[12px]">{t.dateExport?.slice(0, 10) ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
