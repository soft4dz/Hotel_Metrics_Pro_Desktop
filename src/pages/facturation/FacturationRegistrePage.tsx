import { useEffect, useState } from 'react';
import { Download, Filter, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { FactureFilters, FactureRegistreItem, FactureStatut } from '@/shared/types/facturation';
import { STATUT_FACT_LABELS } from '@/shared/types/facturation';

const selectCls = 'h-8 rounded-lg border border-border/60 bg-white px-2.5 text-[13px] shadow-sm outline-none focus:border-primary/50';

const STATUT_CLS: Partial<Record<FactureStatut, string>> = {
  brouillon: 'border-slate-200 bg-slate-100 text-slate-600',
  proforma: 'border-violet-200 bg-violet-50 text-violet-700',
  soumise: 'border-blue-200 bg-blue-50 text-blue-700',
  validee: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  envoyee: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  payee_partielle: 'border-amber-200 bg-amber-50 text-amber-700',
  payee: 'border-green-200 bg-green-100 text-green-800',
  annulee: 'border-red-200 bg-red-50 text-red-600',
  avoir_emis: 'border-orange-200 bg-orange-50 text-orange-700',
};
const DEFAULT_STATUT_CLS = 'border-slate-200 bg-slate-100 text-slate-600';

export function FacturationRegistrePage() {
  const [draft, setDraft] = useState<FactureFilters>({});
  const [filters, setFilters] = useState<FactureFilters>({});
  const [items, setItems] = useState<FactureRegistreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = unwrapIpc(await window.electronAPI.facturation.listRegistre(filters));
        if (!cancelled) setItems(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erreur chargement');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [filters]);

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    setMsg(null);
    try {
      const path = unwrapIpc(await window.electronAPI.facturation.exportRegistreCsv(filters));
      setMsg(`Export CSV : ${path}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur export');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-white px-4 py-2.5 shadow-sm">
        <Filter className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <span className="mr-1 shrink-0 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Filtres</span>

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
        <Button size="sm" variant="outline" onClick={() => void handleExport()} disabled={exporting || items.length === 0} className="h-8 gap-1.5 px-3 text-[13px]">
          {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Export CSV
        </Button>
      </div>

      {error && <p className="rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p>}
      {msg && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{msg}</p>}

      <div className="overflow-hidden rounded-xl border border-border/60 bg-white shadow-sm">
        {loading ? (
          <div className="flex min-h-[240px] items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" /> Chargement…
          </div>
        ) : items.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Aucune entrée dans le registre.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-slate-50/60">
                  {['N°', 'Type', 'Date', 'Client', 'NIF', 'HT', 'TVA', 'TTC', 'Statut'].map((h, i) => (
                    <th key={h} className={cn('px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-400', i >= 5 ? 'text-right' : 'text-left')}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {items.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/40">
                    <td className="px-4 py-3 font-mono text-[12px] font-semibold">{r.numero}</td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">{r.typeDocument}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.dateEmission}</td>
                    <td className="px-4 py-3">{r.clientNom}</td>
                    <td className="px-4 py-3 font-mono text-[12px] text-muted-foreground">{r.nifClient ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{formatMoney(r.montantHt)}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{formatMoney(r.montantTva)}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums">{formatMoney(r.montantTtc)}</td>
                    <td className="px-4 py-3">
                      <span className={cn('rounded-full border px-2.5 py-0.5 text-[10px] font-semibold', STATUT_CLS[r.statut] ?? DEFAULT_STATUT_CLS)}>
                        {STATUT_FACT_LABELS[r.statut]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="text-right text-[11px] text-muted-foreground">{items.length} entrée{items.length > 1 ? 's' : ''}</p>
    </div>
  );
}
