import { useEffect, useState } from 'react';
import { Calculator, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { formatMoney } from '@/lib/formatters';
import type { DeclarationTva } from '@/shared/types/fiscalite';

const inputCls = 'h-8 rounded-lg border border-border/60 bg-white px-2.5 text-[13px] shadow-sm outline-none focus:border-primary/50';

function currentPeriode() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function FiscaliteDeclarationTvaPage() {
  const [periode, setPeriode] = useState(currentPeriode());
  const [declarations, setDeclarations] = useState<DeclarationTva[]>([]);
  const [current, setCurrent] = useState<DeclarationTva | null>(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, decl] = await Promise.all([
        window.electronAPI.fiscalite.listDeclarationsTva(),
        window.electronAPI.fiscalite.getDeclarationTva(periode),
      ]);
      setDeclarations(unwrapIpc(list));
      const declData = unwrapIpc(decl);
      setCurrent(declData);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [periode]);

  const handleCalculer = async () => {
    setCalculating(true);
    setError(null);
    try {
      const decl = unwrapIpc(await window.electronAPI.fiscalite.calculerDeclarationTva(periode));
      setCurrent(decl);
      const list = unwrapIpc(await window.electronAPI.fiscalite.listDeclarationsTva());
      setDeclarations(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur calcul');
    } finally {
      setCalculating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-white px-4 py-2.5 shadow-sm">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Période</span>
        <input type="month" className={inputCls} value={periode} onChange={(e) => setPeriode(e.target.value)} />
        <Button size="sm" onClick={() => void handleCalculer()} disabled={calculating} className="h-8 gap-1.5">
          {calculating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Calculator className="h-3.5 w-3.5" />}
          Calculer déclaration
        </Button>
      </div>

      {error && <p className="rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p>}

      {loading ? (
        <div className="flex min-h-[120px] items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" /> Chargement…
        </div>
      ) : current ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ['Base HT ventes', current.baseHtVentes],
            ['TVA collectée', current.tvaCollectee],
            ['TVA déductible', current.tvaDeductible],
            ['Crédit antérieur', current.creditAnterieur],
            ['Solde à payer', current.solde],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-xl border border-border/60 bg-white p-4 shadow-sm">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className="mt-1 text-lg font-semibold font-mono tabular-nums">{formatMoney(Number(value))}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">Statut : {current.statut}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-border/60 bg-white px-4 py-8 text-center text-sm text-muted-foreground">
          Aucune déclaration pour {periode}. Cliquez sur « Calculer déclaration ».
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-border/60 bg-white shadow-sm">
        <div className="border-b border-border/50 px-4 py-3">
          <h3 className="text-[13px] font-semibold">Historique des déclarations</h3>
        </div>
        {declarations.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Aucune déclaration enregistrée.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-slate-50/60">
                  {['Période', 'Base HT', 'TVA collectée', 'TVA déductible', 'Solde', 'Statut'].map((h, i) => (
                    <th key={h} className={`px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-400 ${i >= 1 ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {declarations.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/40">
                    <td className="px-4 py-3 font-mono text-[12px]">{d.periode}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{formatMoney(d.baseHtVentes)}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{formatMoney(d.tvaCollectee)}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{formatMoney(d.tvaDeductible)}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums">{formatMoney(d.solde)}</td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">{d.statut}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
