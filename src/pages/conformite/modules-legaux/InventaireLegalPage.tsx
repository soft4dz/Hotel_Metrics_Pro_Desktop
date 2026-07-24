import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { formatMoney } from '@/lib/formatters';
import { notify } from '@/lib/toast';
import type { InventaireLigne, InventaireSession } from '@/shared/types/modules-legaux';

const inputCls = 'h-8 rounded-lg border px-2.5 text-[13px] shadow-sm';

export function InventaireLegalPage() {
  const qc = useQueryClient();
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [hotelId, setHotelId] = useState(1);
  const [exercice, setExercice] = useState(new Date().getFullYear());

  const { data: sessions = [] } = useQuery({
    queryKey: ['inventaire-sessions'],
    queryFn: async () => unwrapIpc(await ipcClient.modulesLegaux.inventaire.listSessions()) as InventaireSession[],
  });

  const { data: lignes = [], isLoading } = useQuery({
    queryKey: ['inventaire-lignes', sessionId],
    queryFn: async () => unwrapIpc(await ipcClient.modulesLegaux.inventaire.listLignes(sessionId!)) as InventaireLigne[],
    enabled: sessionId != null,
  });

  const createMut = useMutation({
    mutationFn: async () => unwrapIpc(await ipcClient.modulesLegaux.inventaire.createSession({
      exercice, hotelId, dateInventaire: new Date().toISOString().slice(0, 10),
    })),
    onSuccess: (s) => { qc.invalidateQueries({ queryKey: ['inventaire-sessions'] }); setSessionId(s.id); notify.success('Session inventaire créée'); },
    onError: (e: Error) => notify.error(e.message),
  });

  const clotureMut = useMutation({
    mutationFn: async () => unwrapIpc(await ipcClient.modulesLegaux.inventaire.cloturerSession(sessionId!)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventaire-sessions'] }); qc.invalidateQueries({ queryKey: ['modules-legaux-dashboard'] }); notify.success('Inventaire clôturé'); },
    onError: (e: Error) => notify.error(e.message),
  });

  const exportMut = useMutation({
    mutationFn: async () => unwrapIpc(await ipcClient.modulesLegaux.inventaire.exportCsv(sessionId!)),
    onSuccess: (csv) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      a.download = `inventaire-legal-${sessionId}.csv`;
      a.click();
    },
  });

  const activeSession = sessions.find((s) => s.id === sessionId);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-white px-4 py-2.5">
        <input type="number" className={inputCls + ' w-24'} value={exercice} onChange={(e) => setExercice(Number(e.target.value))} />
        <input type="number" className={inputCls + ' w-20'} value={hotelId} onChange={(e) => setHotelId(Number(e.target.value))} title="ID unité" />
        <Button size="sm" onClick={() => createMut.mutate()} disabled={createMut.isPending}>Nouvelle session</Button>
        <select className={inputCls} value={sessionId ?? ''} onChange={(e) => setSessionId(e.target.value ? Number(e.target.value) : null)}>
          <option value="">Choisir session…</option>
          {sessions.map((s) => <option key={s.id} value={s.id}>#{s.id} — {s.exercice} / hôtel {s.hotelId} ({s.statut})</option>)}
        </select>
        {sessionId && (
          <>
            <Button size="sm" variant="outline" onClick={() => clotureMut.mutate()} disabled={clotureMut.isPending || activeSession?.statut !== 'en_cours'} className="gap-1.5">
              <Lock className="h-3.5 w-3.5" /> Clôturer
            </Button>
            <Button size="sm" variant="outline" onClick={() => exportMut.mutate()} className="gap-1.5"><Download className="h-3.5 w-3.5" /> Export</Button>
          </>
        )}
      </div>

      {activeSession && (
        <div className="grid grid-cols-3 gap-3">
          {[
            ['Valeur comptable', activeSession.totalValeurComptable],
            ['Valeur physique', activeSession.totalValeurPhysique],
            ['Écart', activeSession.ecartTotal],
          ].map(([l, v]) => (
            <div key={String(l)} className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">{l}</p><p className="font-mono font-semibold">{formatMoney(Number(v))}</p></div>
          ))}
        </div>
      )}

      {sessionId && (isLoading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : (
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-50"><tr>{['Désignation', 'Qté compt.', 'Qté phys.', 'Écart'].map((h) => <th key={h} className="px-4 py-2 text-left text-[11px] font-bold uppercase text-slate-400">{h}</th>)}</tr></thead>
            <tbody className="divide-y">
              {lignes.map((l) => (
                <tr key={l.id}><td className="px-4 py-2">{l.designation}</td><td className="px-4 py-2 font-mono">{l.quantiteComptable}</td><td className="px-4 py-2 font-mono">{l.quantitePhysique}</td><td className="px-4 py-2 font-mono">{l.ecartValeur.toFixed(2)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
