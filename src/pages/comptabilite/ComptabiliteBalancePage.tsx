import { useEffect, useState } from 'react';
import { Filter, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { BalanceLigne, ExerciceComptable } from '@/shared/types/comptabilite';

const selectCls = 'h-8 rounded-lg border border-border/60 bg-white px-2.5 text-[13px] shadow-sm outline-none focus:border-primary/50';

export function ComptabiliteBalancePage() {
  const [exercices, setExercices] = useState<ExerciceComptable[]>([]);
  const [exerciceId, setExerciceId] = useState<number | undefined>();
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [items, setItems] = useState<BalanceLigne[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = unwrapIpc(await window.electronAPI.comptabilite.listExercices());
        setExercices(data);
        const ouvert = data.find((e) => e.statut === 'ouvert');
        if (ouvert) setExerciceId(ouvert.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur chargement exercices');
      }
    })();
  }, []);

  const loadBalance = async () => {
    if (!exerciceId) { setError('Sélectionnez un exercice.'); return; }
    setLoading(true);
    setError(null);
    try {
      const data = unwrapIpc(await window.electronAPI.comptabilite.getBalance(
        exerciceId,
        dateDebut || undefined,
        dateFin || undefined,
      ));
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur chargement balance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (exerciceId) void loadBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exerciceId]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-white px-4 py-2.5 shadow-sm">
        <Filter className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <span className="mr-1 shrink-0 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Période</span>

        <select className={selectCls} value={exerciceId ?? ''} onChange={(e) => setExerciceId(e.target.value ? Number(e.target.value) : undefined)}>
          <option value="">Exercice…</option>
          {exercices.map((ex) => <option key={ex.id} value={ex.id}>{ex.code} — {ex.libelle}</option>)}
        </select>

        <input type="date" className={selectCls} value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
        <span className="text-xs text-slate-400">→</span>
        <input type="date" className={selectCls} value={dateFin} onChange={(e) => setDateFin(e.target.value)} />

        <div className="flex-1" />
        <Button size="sm" onClick={() => void loadBalance()} className="h-8 gap-1.5 px-3 text-[13px]">
          <Filter className="h-3.5 w-3.5" /> Appliquer
        </Button>
        <Button size="sm" variant="outline" onClick={() => { setDateDebut(''); setDateFin(''); void loadBalance(); }} className="h-8 px-3">
          <RotateCcw className="h-3 w-3" />
        </Button>
      </div>

      {error && <p className="rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-border/60 bg-white shadow-sm">
        {loading ? (
          <div className="flex min-h-[240px] items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" /> Chargement…
          </div>
        ) : items.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Aucune ligne de balance.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-slate-50/60">
                  {['Compte', 'Libellé', 'Classe', 'Débit', 'Crédit', 'Solde'].map((h, i) => (
                    <th key={h} className={cn('px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-400', i >= 3 ? 'text-right' : 'text-left')}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {items.map((l) => (
                  <tr key={l.compteNumero} className="hover:bg-slate-50/40">
                    <td className="px-4 py-3 font-mono text-[12px] font-semibold">{l.compteNumero}</td>
                    <td className="px-4 py-3">{l.compteLibelle}</td>
                    <td className="px-4 py-3 text-muted-foreground">{l.classe}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{formatMoney(l.totalDebit)}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{formatMoney(l.totalCredit)}</td>
                    <td className={cn('px-4 py-3 text-right font-mono font-semibold tabular-nums', l.solde >= 0 ? 'text-foreground' : 'text-red-600')}>
                      {formatMoney(l.solde)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="text-right text-[11px] text-muted-foreground">{items.length} compte{items.length > 1 ? 's' : ''}</p>
    </div>
  );
}
