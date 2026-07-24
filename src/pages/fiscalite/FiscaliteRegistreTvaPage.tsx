import { useEffect, useState } from 'react';
import { Download, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { RegistreTvaVente } from '@/shared/types/fiscalite';

const inputCls = 'h-8 rounded-lg border border-border/60 bg-white px-2.5 text-[13px] shadow-sm outline-none focus:border-primary/50';

function currentPeriode() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function FiscaliteRegistreTvaPage() {
  const [periode, setPeriode] = useState(currentPeriode());
  const [items, setItems] = useState<RegistreTvaVente[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = unwrapIpc(await window.electronAPI.fiscalite.listRegistreTva(periode));
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [periode]);

  const handleGenerer = async () => {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const data = unwrapIpc(await window.electronAPI.fiscalite.genererRegistreTva(periode));
      setItems(data);
      setMsg('Registre TVA généré.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur génération');
    } finally {
      setBusy(false);
    }
  };

  const handleExport = async () => {
    setBusy(true);
    setError(null);
    try {
      const path = unwrapIpc(await window.electronAPI.fiscalite.exportRegistreTvaCsv(periode));
      setMsg(`Export CSV : ${path}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur export');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-white px-4 py-2.5 shadow-sm">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Période</span>
        <input type="month" className={inputCls} value={periode} onChange={(e) => setPeriode(e.target.value)} />
        <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading} className="h-8 gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Actualiser
        </Button>
        <Button size="sm" onClick={() => void handleGenerer()} disabled={busy} className="h-8 gap-1.5">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Générer
        </Button>
        <Button size="sm" variant="outline" onClick={() => void handleExport()} disabled={busy || items.length === 0} className="h-8 gap-1.5">
          <Download className="h-3.5 w-3.5" /> Export CSV
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
          <p className="py-12 text-center text-sm text-muted-foreground">Aucune ligne pour cette période.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-slate-50/60">
                  {['Pièce', 'Date', 'Client', 'Type', 'Base HT', 'TVA', 'TTC'].map((h, i) => (
                    <th key={h} className={cn('px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-400', i >= 4 ? 'text-right' : 'text-left')}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {items.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/40">
                    <td className="px-4 py-3 font-mono text-[12px]">{r.numeroPiece}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.dateOperation}</td>
                    <td className="px-4 py-3">{r.clientNom ?? '—'}</td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">{r.typeMouvement}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{formatMoney(r.baseHt)}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{formatMoney(r.montantTva)}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums">{formatMoney(r.montantTtc)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="text-right text-[11px] text-muted-foreground">{items.length} ligne{items.length > 1 ? 's' : ''}</p>
    </div>
  );
}
