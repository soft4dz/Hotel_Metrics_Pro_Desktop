import { useEffect, useState } from 'react';
import { Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { cn } from '@/lib/utils';
import type { ExerciceComptable } from '@/shared/types/comptabilite';

const inputCls = 'h-8 rounded-lg border border-border/60 bg-white px-2.5 text-[13px] shadow-sm outline-none focus:border-primary/50';

const STATUT_CLS = {
  ouvert: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  ferme: 'border-slate-200 bg-slate-100 text-slate-600',
};

export function ComptabiliteExercicesPage() {
  const [items, setItems] = useState<ExerciceComptable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<number | null>(null);
  const [form, setForm] = useState({ code: '', libelle: '', dateDebut: '', dateFin: '' });
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = unwrapIpc(await window.electronAPI.comptabilite.listExercices());
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const handleCloturer = async (id: number) => {
    if (!window.confirm('Clôturer cet exercice ? Cette action est définitive.')) return;
    setActionId(id);
    try {
      unwrapIpc(await window.electronAPI.comptabilite.cloturerExercice(id));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur clôture');
    } finally {
      setActionId(null);
    }
  };

  const handleCreate = async () => {
    if (!form.code || !form.libelle || !form.dateDebut || !form.dateFin) {
      setError('Tous les champs sont obligatoires.');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      unwrapIpc(await window.electronAPI.comptabilite.createExercice(form));
      setForm({ code: '', libelle: '', dateDebut: '', dateFin: '' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur création');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-border/60 bg-white px-4 py-3 shadow-sm">
        <input className={inputCls} placeholder="Code" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
        <input className={`${inputCls} min-w-[160px]`} placeholder="Libellé" value={form.libelle} onChange={(e) => setForm((f) => ({ ...f, libelle: e.target.value }))} />
        <input type="date" className={inputCls} value={form.dateDebut} onChange={(e) => setForm((f) => ({ ...f, dateDebut: e.target.value }))} />
        <input type="date" className={inputCls} value={form.dateFin} onChange={(e) => setForm((f) => ({ ...f, dateFin: e.target.value }))} />
        <Button size="sm" onClick={() => void handleCreate()} disabled={creating} className="h-8">
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Nouvel exercice'}
        </Button>
      </div>

      {error && <p className="rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-border/60 bg-white shadow-sm">
        {loading ? (
          <div className="flex min-h-[240px] items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" /> Chargement…
          </div>
        ) : items.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Aucun exercice comptable.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-slate-50/60">
                  {['Code', 'Libellé', 'Début', 'Fin', 'Statut', 'Clôture', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {items.map((ex) => (
                  <tr key={ex.id} className="hover:bg-slate-50/40">
                    <td className="px-4 py-3 font-mono text-[12px] font-semibold">{ex.code}</td>
                    <td className="px-4 py-3">{ex.libelle}</td>
                    <td className="px-4 py-3 text-muted-foreground">{ex.dateDebut}</td>
                    <td className="px-4 py-3 text-muted-foreground">{ex.dateFin}</td>
                    <td className="px-4 py-3">
                      <span className={cn('rounded-full border px-2.5 py-0.5 text-[10px] font-semibold capitalize', STATUT_CLS[ex.statut])}>
                        {ex.statut}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{ex.closedAt?.slice(0, 10) ?? '—'}</td>
                    <td className="px-4 py-3">
                      {ex.statut === 'ouvert' && (
                        <Button size="sm" variant="outline" disabled={actionId === ex.id} onClick={() => void handleCloturer(ex.id)} className="h-7 gap-1 text-[12px]">
                          {actionId === ex.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
                          Clôturer
                        </Button>
                      )}
                    </td>
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
