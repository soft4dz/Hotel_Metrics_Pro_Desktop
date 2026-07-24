import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calculator, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { formatMoney } from '@/lib/formatters';
import { notify } from '@/lib/toast';
import type { AmortissementLigne, Immobilisation } from '@/shared/types/modules-legaux';

const inputCls = 'h-8 rounded-lg border px-2.5 text-[13px] shadow-sm';

function currentPeriode() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function ImmobilisationsPage() {
  const qc = useQueryClient();
  const [periode, setPeriode] = useState(currentPeriode());
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data: immos = [], isLoading } = useQuery({
    queryKey: ['immo-list'],
    queryFn: async () => unwrapIpc(await ipcClient.modulesLegaux.immo.list()) as Immobilisation[],
  });

  const { data: amortissements = [] } = useQuery({
    queryKey: ['immo-amort', selectedId],
    queryFn: async () => unwrapIpc(await ipcClient.modulesLegaux.immo.listAmortissements(selectedId ?? undefined)) as AmortissementLigne[],
    enabled: selectedId != null,
  });

  const planMut = useMutation({
    mutationFn: async (id: number) => unwrapIpc(await ipcClient.modulesLegaux.immo.genererPlan(id)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['immo-amort'] }); qc.invalidateQueries({ queryKey: ['modules-legaux-dashboard'] }); notify.success('Plan d\'amortissement généré'); },
    onError: (e: Error) => notify.error(e.message),
  });

  const comptaMut = useMutation({
    mutationFn: async () => unwrapIpc(await ipcClient.modulesLegaux.immo.comptabiliserMensuel(periode)),
    onSuccess: (n) => { notify.success(`${n} amortissement(s) comptabilisé(s)`); qc.invalidateQueries({ queryKey: ['modules-legaux-dashboard'] }); },
    onError: (e: Error) => notify.error(e.message),
  });

  const exportMut = useMutation({
    mutationFn: async () => unwrapIpc(await ipcClient.modulesLegaux.immo.exportCsv()),
    onSuccess: (csv) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      a.download = 'immobilisations.csv';
      a.click();
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 rounded-xl border bg-white px-4 py-2.5">
        <input type="month" className={inputCls} value={periode} onChange={(e) => setPeriode(e.target.value)} />
        <Button size="sm" onClick={() => comptaMut.mutate()} disabled={comptaMut.isPending} className="gap-1.5">
          {comptaMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Calculator className="h-3.5 w-3.5" />}
          Comptabiliser {periode}
        </Button>
        <Button size="sm" variant="outline" onClick={() => exportMut.mutate()} className="gap-1.5"><Download className="h-3.5 w-3.5" /> Export</Button>
      </div>

      {isLoading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : (
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-slate-50/60">{['Code', 'Libellé', 'Valeur', 'Durée', ''].map((h) => <th key={h} className="px-4 py-2 text-left text-[11px] font-bold uppercase text-slate-400">{h}</th>)}</tr></thead>
            <tbody className="divide-y">
              {immos.map((i) => (
                <tr key={i.id} className={selectedId === i.id ? 'bg-primary/5' : ''} onClick={() => setSelectedId(i.id)}>
                  <td className="px-4 py-3 font-mono">{i.code}</td>
                  <td className="px-4 py-3">{i.libelle}</td>
                  <td className="px-4 py-3 font-mono">{formatMoney(i.valeurAcquisition)}</td>
                  <td className="px-4 py-3">{i.dureeAmortissementMois} mois</td>
                  <td className="px-4 py-3"><Button size="sm" variant="outline" className="h-7" onClick={(e) => { e.stopPropagation(); planMut.mutate(i.id); }}>Plan</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedId && amortissements.length > 0 && (
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold mb-2">Plan d&apos;amortissement</h3>
          <div className="max-h-48 overflow-y-auto text-xs font-mono space-y-1">
            {amortissements.slice(0, 24).map((a) => (
              <div key={a.id} className="flex justify-between gap-4">
                <span>{a.periode}</span><span>{formatMoney(a.dotation)}</span><span>VNC {formatMoney(a.vnc)}</span><span className="text-muted-foreground">{a.statut}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
