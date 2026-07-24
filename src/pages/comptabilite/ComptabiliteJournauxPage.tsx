import { useEffect, useState } from 'react';
import { Filter, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { EcritureFilters, EcritureListItem, Journal } from '@/shared/types/comptabilite';

const selectCls = 'h-8 rounded-lg border border-border/60 bg-white px-2.5 text-[13px] shadow-sm outline-none focus:border-primary/50';

const STATUT_CLS = {
  brouillon: 'border-amber-200 bg-amber-50 text-amber-700',
  valide: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

export function ComptabiliteJournauxPage() {
  const [journaux, setJournaux] = useState<Journal[]>([]);
  const [draft, setDraft] = useState<EcritureFilters>({});
  const [filters, setFilters] = useState<EcritureFilters>({});
  const [items, setItems] = useState<EcritureListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = unwrapIpc(await window.electronAPI.comptabilite.listJournaux());
        setJournaux(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur chargement journaux');
      }
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = unwrapIpc(await window.electronAPI.comptabilite.listEcritures(filters));
        if (!cancelled) setItems(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erreur chargement écritures');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [filters]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-white px-4 py-2.5 shadow-sm">
        <Filter className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <span className="mr-1 shrink-0 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Filtres</span>

        <select className={selectCls} value={draft.journalCode ?? ''} onChange={(e) => setDraft((d) => ({ ...d, journalCode: e.target.value || undefined }))}>
          <option value="">Tous les journaux</option>
          {journaux.map((j) => <option key={j.id} value={j.code}>{j.code} — {j.libelle}</option>)}
        </select>

        <input type="date" className={selectCls} value={draft.dateDebut ?? ''} onChange={(e) => setDraft((d) => ({ ...d, dateDebut: e.target.value || undefined }))} />
        <span className="text-xs text-slate-400">→</span>
        <input type="date" className={selectCls} value={draft.dateFin ?? ''} onChange={(e) => setDraft((d) => ({ ...d, dateFin: e.target.value || undefined }))} />

        <div className="flex-1" />
        <Button size="sm" onClick={() => setFilters(draft)} className="h-8 gap-1.5 px-3 text-[13px]">
          <Filter className="h-3.5 w-3.5" /> Appliquer
        </Button>
        <Button size="sm" variant="outline" onClick={() => { setDraft({}); setFilters({}); }} className="h-8 px-3">
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
          <p className="py-12 text-center text-sm text-muted-foreground">Aucune écriture trouvée.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-slate-50/60">
                  {['Date', 'Journal', 'Pièce', 'Libellé', 'Débit', 'Crédit', 'Statut'].map((h, i) => (
                    <th key={h} className={cn('px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-400', i >= 4 ? 'text-right' : 'text-left')}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {items.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/40">
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{e.dateEcriture}</td>
                    <td className="px-4 py-3 font-mono text-[12px]">{e.journalCode}</td>
                    <td className="px-4 py-3 text-muted-foreground">{e.piece ?? '—'}</td>
                    <td className="max-w-[200px] truncate px-4 py-3">{e.libelle}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{formatMoney(e.totalDebit)}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{formatMoney(e.totalCredit)}</td>
                    <td className="px-4 py-3">
                      <span className={cn('rounded-full border px-2.5 py-0.5 text-[10px] font-semibold capitalize', STATUT_CLS[e.statut])}>
                        {e.statut}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="text-right text-[11px] text-muted-foreground">{items.length} écriture{items.length > 1 ? 's' : ''}</p>
    </div>
  );
}
