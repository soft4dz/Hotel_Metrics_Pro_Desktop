import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { cn } from '@/lib/utils';
import type { PaieClotureMensuelle } from '@/shared/types/rh';

const inputCls = 'h-8 rounded-lg border border-border/60 bg-white px-2.5 text-[13px] shadow-sm outline-none focus:border-primary/50';

const STATUT_CLS = {
  brouillon: 'border-amber-200 bg-amber-50 text-amber-700',
  valide: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  cloture: 'border-slate-300 bg-slate-100 text-slate-700',
};

function currentPeriode() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function RhPaieCloturePage() {
  const [periode, setPeriode] = useState(currentPeriode());
  const [cloture, setCloture] = useState<PaieClotureMensuelle | null>(null);
  const [historique, setHistorique] = useState<PaieClotureMensuelle[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [current, list] = await Promise.all([
        window.electronAPI.rh.getPaieCloture(periode),
        window.electronAPI.rh.listPaieClotures(),
      ]);
      setCloture(unwrapIpc(current));
      setHistorique(unwrapIpc(list));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [periode]);

  const handleValider = async () => {
    setBusy(true);
    setError(null);
    try {
      setCloture(unwrapIpc(await window.electronAPI.rh.validerPaieMensuelle(periode)));
      setHistorique(unwrapIpc(await window.electronAPI.rh.listPaieClotures()));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur validation');
    } finally {
      setBusy(false);
    }
  };

  const handleCloturer = async () => {
    if (!window.confirm(`Clôturer la paie de ${periode} ?`)) return;
    setBusy(true);
    setError(null);
    try {
      setCloture(unwrapIpc(await window.electronAPI.rh.cloturerPaieMensuelle(periode)));
      setHistorique(unwrapIpc(await window.electronAPI.rh.listPaieClotures()));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur clôture');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-white px-4 py-2.5 shadow-sm">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Période</span>
        <input type="month" className={inputCls} value={periode} onChange={(e) => setPeriode(e.target.value)} />
      </div>

      {error && <p className="rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p>}

      {loading ? (
        <div className="flex min-h-[160px] items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" /> Chargement…
        </div>
      ) : cloture ? (
        <div className="rounded-xl border border-border/60 bg-white p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className={cn('rounded-full border px-3 py-1 text-[11px] font-semibold capitalize', STATUT_CLS[cloture.statut])}>
              {cloture.statut}
            </span>
            <span className="text-sm text-muted-foreground">{cloture.nbBulletins} bulletin{cloture.nbBulletins > 1 ? 's' : ''}</span>
            {cloture.valideAt && <span className="text-[12px] text-muted-foreground">Validé le {cloture.valideAt.slice(0, 10)}</span>}
            {cloture.clotureAt && <span className="text-[12px] text-muted-foreground">Clôturé le {cloture.clotureAt.slice(0, 10)}</span>}
          </div>
          <div className="flex flex-wrap gap-2">
            {cloture.statut === 'brouillon' && (
              <Button size="sm" onClick={() => void handleValider()} disabled={busy} className="h-8 gap-1.5">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Valider paie mensuelle
              </Button>
            )}
            {cloture.statut === 'valide' && (
              <Button size="sm" variant="outline" onClick={() => void handleCloturer()} disabled={busy} className="h-8 gap-1.5">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />} Clôturer paie mensuelle
              </Button>
            )}
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border/60 bg-white shadow-sm">
        <div className="border-b border-border/50 px-4 py-3">
          <h3 className="text-[13px] font-semibold">Historique des clôtures</h3>
        </div>
        {historique.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Aucune clôture enregistrée.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-slate-50/60">
                  {['Période', 'Statut', 'Bulletins', 'Validé', 'Clôturé'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {historique.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/40">
                    <td className="px-4 py-3 font-mono text-[12px] font-semibold">{c.periode}</td>
                    <td className="px-4 py-3">
                      <span className={cn('rounded-full border px-2.5 py-0.5 text-[10px] font-semibold capitalize', STATUT_CLS[c.statut])}>
                        {c.statut}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{c.nbBulletins}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.valideAt?.slice(0, 10) ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.clotureAt?.slice(0, 10) ?? '—'}</td>
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
