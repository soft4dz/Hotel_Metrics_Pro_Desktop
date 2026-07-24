import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calculator, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { formatMoney } from '@/lib/formatters';
import { notify } from '@/lib/toast';
import type { CasnosAffilie, CasnosDeclaration } from '@/shared/types/modules-legaux';

const inputCls = 'h-8 rounded-lg border px-2.5 text-[13px] shadow-sm';

function currentPeriode() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function CasnosPage() {
  const qc = useQueryClient();
  const [periode, setPeriode] = useState(currentPeriode());

  const { data: affilies = [] } = useQuery({
    queryKey: ['casnos-affilies'],
    queryFn: async () => unwrapIpc(await ipcClient.modulesLegaux.casnos.listAffilies()) as CasnosAffilie[],
  });

  const { data: declarations = [], isLoading } = useQuery({
    queryKey: ['casnos-decl', periode],
    queryFn: async () => unwrapIpc(await ipcClient.modulesLegaux.casnos.listDeclarations(periode)) as CasnosDeclaration[],
  });

  const calcMut = useMutation({
    mutationFn: async () => unwrapIpc(await ipcClient.modulesLegaux.casnos.calculerPeriode(periode)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['casnos-decl', periode] }); notify.success('Déclarations CASNOS calculées'); },
    onError: (e: Error) => notify.error(e.message),
  });

  const exportMut = useMutation({
    mutationFn: async () => unwrapIpc(await ipcClient.modulesLegaux.casnos.exportCsv(periode)),
    onSuccess: (csv) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      a.download = `casnos-${periode}.csv`;
      a.click();
    },
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{affilies.length} affilié(s) CASNOS actif(s) — travailleurs non salariés (gérants, prestataires).</p>
      <div className="flex flex-wrap gap-2 rounded-xl border bg-white px-4 py-2.5">
        <input type="month" className={inputCls} value={periode} onChange={(e) => setPeriode(e.target.value)} />
        <Button size="sm" onClick={() => calcMut.mutate()} disabled={calcMut.isPending || affilies.length === 0} className="gap-1.5">
          {calcMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Calculator className="h-3.5 w-3.5" />}
          Calculer période
        </Button>
        <Button size="sm" variant="outline" onClick={() => exportMut.mutate()} className="gap-1.5"><Download className="h-3.5 w-3.5" /> Export CSV</Button>
      </div>

      {isLoading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : declarations.length === 0 ? (
        <p className="rounded-xl border px-4 py-8 text-center text-sm text-muted-foreground">Aucune déclaration pour {periode}.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-slate-50/60">{['Affilié', 'Revenu', 'Cotisation', 'Statut'].map((h) => <th key={h} className="px-4 py-2 text-left text-[11px] font-bold uppercase text-slate-400">{h}</th>)}</tr></thead>
            <tbody className="divide-y">
              {declarations.map((d) => (
                <tr key={d.id}>
                  <td className="px-4 py-3">{d.affilieNom}</td>
                  <td className="px-4 py-3 font-mono">{formatMoney(d.revenuDeclare)}</td>
                  <td className="px-4 py-3 font-mono">{formatMoney(d.cotisationCalculee)}</td>
                  <td className="px-4 py-3 capitalize">{d.statut}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
