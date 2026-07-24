import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { cn } from '@/lib/utils';
import type { Compte } from '@/shared/types/comptabilite';

const selectCls = 'h-8 rounded-lg border border-border/60 bg-white px-2.5 text-[13px] shadow-sm outline-none focus:border-primary/50';

export function ComptabilitePlanPage() {
  const [classe, setClasse] = useState<string>('');
  const [items, setItems] = useState<Compte[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = unwrapIpc(await window.electronAPI.comptabilite.listComptes(classe ? Number(classe) : undefined));
        if (!cancelled) setItems(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erreur chargement');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [classe]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-white px-4 py-2.5 shadow-sm">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Classe</span>
        <select className={selectCls} value={classe} onChange={(e) => setClasse(e.target.value)}>
          <option value="">Toutes les classes</option>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((c) => (
            <option key={c} value={c}>Classe {c}</option>
          ))}
        </select>
      </div>

      {error && <p className="rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-border/60 bg-white shadow-sm">
        {loading ? (
          <div className="flex min-h-[240px] items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" /> Chargement…
          </div>
        ) : items.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Aucun compte trouvé.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-slate-50/60">
                  {['N° compte', 'Libellé', 'Classe', 'Solde', 'Actif'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {items.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/40">
                    <td className="px-4 py-3 font-mono text-[12px] font-semibold">{c.numero}</td>
                    <td className="px-4 py-3">{c.libelle}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.classe}</td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">{c.typeSolde}</td>
                    <td className="px-4 py-3">
                      <span className={cn('rounded-full border px-2.5 py-0.5 text-[10px] font-semibold', c.actif ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-500')}>
                        {c.actif ? 'Actif' : 'Inactif'}
                      </span>
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
