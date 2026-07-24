import { useEffect, useState } from 'react';
import { Download, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { LiasseLigne } from '@/shared/types/fiscalite';

const inputCls = 'h-8 w-24 rounded-lg border border-border/60 bg-white px-2.5 text-[13px] shadow-sm outline-none focus:border-primary/50';

export function FiscaliteLiassePage() {
  const [exercice, setExercice] = useState(new Date().getFullYear());
  const [items, setItems] = useState<LiasseLigne[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = unwrapIpc(await window.electronAPI.fiscalite.listLiasse(exercice));
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [exercice]);

  const handleGenerer = async () => {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const data = unwrapIpc(await window.electronAPI.fiscalite.genererLiasse(exercice));
      setItems(data);
      setMsg('Liasse fiscale générée.');
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
      const path = unwrapIpc(await window.electronAPI.fiscalite.exportLiasseCsv(exercice));
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
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Exercice</span>
        <input type="number" className={inputCls} value={exercice} onChange={(e) => setExercice(Number(e.target.value))} />
        <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading} className="h-8 gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Actualiser
        </Button>
        <Button size="sm" onClick={() => void handleGenerer()} disabled={busy} className="h-8 gap-1.5">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Générer liasse
        </Button>
        <Button size="sm" variant="secondary" onClick={async () => {
          setBusy(true);
          try {
            const data = unwrapIpc(await window.electronAPI.fiscalite.genererLiasseAvancee(exercice));
            setItems(data);
            setMsg('Liasse avancée G50/G4/G29 générée.');
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Erreur génération avancée');
          } finally { setBusy(false); }
        }} disabled={busy} className="h-8">
          Liasse avancée
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
          <p className="py-12 text-center text-sm text-muted-foreground">Aucune ligne pour cet exercice.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-slate-50/60">
                  {['Code G50', 'Libellé', 'Montant'].map((h, i) => (
                    <th key={h} className={cn('px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-400', i === 2 ? 'text-right' : 'text-left')}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {items.map((l, idx) => (
                  <tr key={`${l.codeG50}-${idx}`} className="hover:bg-slate-50/40">
                    <td className="px-4 py-3 font-mono text-[12px] font-semibold">{l.codeG50}</td>
                    <td className="px-4 py-3">{l.libelle}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums">{formatMoney(l.montant)}</td>
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
