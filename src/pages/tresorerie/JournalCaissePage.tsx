import { useState } from 'react';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useJournalCaisse } from '@/hooks/useTresorerie';
import { useHotelsList } from '@/hooks/useHotelsList';
import { formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';

const today = () => new Date().toISOString().slice(0, 10);
const firstOfMonth = () => `${new Date().toISOString().slice(0, 7)}-01`;

const inputCls = 'h-9 rounded-lg border border-border/60 bg-white px-3 text-[13px] text-foreground shadow-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10';

export function JournalCaissePage() {
  const { hotels } = useHotelsList();
  const [hotelId, setHotelId] = useState<number>(hotels[0]?.id ?? 0);
  const [dateDebut, setDateDebut] = useState(firstOfMonth());
  const [dateFin, setDateFin] = useState(today());

  const { entries, loading, error, add, remove } = useJournalCaisse(hotelId, dateDebut, dateFin);

  // Form state
  const [form, setForm] = useState({ date: today(), libelle: '', entree: '', sortie: '' });
  const [adding, setAdding] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const totalEntrees = entries.reduce((s, e) => s + e.entree, 0);
  const totalSorties = entries.reduce((s, e) => s + e.sortie, 0);
  const soldeFinal = entries[entries.length - 1]?.solde ?? 0;

  const handleAdd = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!form.libelle.trim()) { setFormError('Le libellé est requis.'); return; }
    const entree = parseFloat(form.entree) || 0;
    const sortie = parseFloat(form.sortie) || 0;
    if (entree === 0 && sortie === 0) { setFormError('Saisissez un montant en entrée ou en sortie.'); return; }
    if (!hotelId) { setFormError('Sélectionnez un établissement.'); return; }
    setAdding(true);
    setFormError(null);
    try {
      await add({ hotelId, dateOperation: form.date, libelle: form.libelle, entree, sortie });
      setForm({ date: today(), libelle: '', entree: '', sortie: '' });
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Erreur ajout opération');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-white px-4 py-2.5 shadow-sm">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Filtres</span>
        <select className={inputCls} value={hotelId} onChange={(e) => setHotelId(Number(e.target.value))}>
          {hotels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
        <input type="date" className={inputCls} value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
        <span className="text-xs text-slate-400">→</span>
        <input type="date" className={inputCls} value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
      </div>

      {/* Formulaire ajout */}
      <div className="overflow-hidden rounded-xl border border-border/60 bg-white shadow-sm">
        <div className="border-b border-border/50 px-5 py-3.5">
          <h3 className="text-[13px] font-semibold text-foreground">Ajouter une opération</h3>
        </div>
        <form onSubmit={(e) => void handleAdd(e)} className="flex flex-wrap items-end gap-3 p-5">
          {formError && <p className="w-full rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive">{formError}</p>}

          <div className="flex-1 min-w-[100px]">
            <label className="mb-1 block text-[11px] font-semibold text-slate-500">Date</label>
            <input type="date" className={inputCls} value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
          </div>
          <div className="flex-[3] min-w-[160px]">
            <label className="mb-1 block text-[11px] font-semibold text-slate-500">Libellé *</label>
            <input type="text" className={inputCls} value={form.libelle} onChange={(e) => setForm((f) => ({ ...f, libelle: e.target.value }))} placeholder="Caisse recettes du jour…" />
          </div>
          <div className="flex-1 min-w-[100px]">
            <label className="mb-1 block text-[11px] font-semibold text-slate-500">Entrée (DA)</label>
            <input type="number" min="0" step="0.01" className={inputCls} value={form.entree} onChange={(e) => setForm((f) => ({ ...f, entree: e.target.value }))} placeholder="0" />
          </div>
          <div className="flex-1 min-w-[100px]">
            <label className="mb-1 block text-[11px] font-semibold text-slate-500">Sortie (DA)</label>
            <input type="number" min="0" step="0.01" className={inputCls} value={form.sortie} onChange={(e) => setForm((f) => ({ ...f, sortie: e.target.value }))} placeholder="0" />
          </div>
          <Button type="submit" disabled={adding} className="h-9 gap-1.5 px-4 text-[13px]">
            <Plus className="h-4 w-4" />
            {adding ? 'Ajout…' : 'Ajouter'}
          </Button>
        </form>
      </div>

      {error && <p className="rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p>}

      {/* Journal */}
      <div className="overflow-hidden rounded-xl border border-border/60 bg-white shadow-sm">
        <div className="border-b border-border/50 px-5 py-3.5">
          <h3 className="text-[13px] font-semibold text-foreground">Journal de caisse</h3>
        </div>

        {loading ? (
          <div className="flex min-h-[200px] items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" /> Chargement…
          </div>
        ) : entries.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Aucune opération sur la période.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-slate-50/60">
                  {['Date', 'Libellé', 'Entrée', 'Sortie', 'Solde', ''].map((h, i) => (
                    <th key={i} className={cn('px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-400', i >= 2 ? 'text-right' : 'text-left')}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {entries.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/40">
                    <td className="whitespace-nowrap px-5 py-3 text-muted-foreground">{e.dateOperation}</td>
                    <td className="px-5 py-3 font-medium text-foreground">{e.libelle}</td>
                    <td className={cn('px-5 py-3 text-right font-mono tabular-nums', e.entree > 0 ? 'text-emerald-600 font-semibold' : 'text-muted-foreground')}>
                      {e.entree > 0 ? `+${formatMoney(e.entree)}` : '—'}
                    </td>
                    <td className={cn('px-5 py-3 text-right font-mono tabular-nums', e.sortie > 0 ? 'text-red-600 font-semibold' : 'text-muted-foreground')}>
                      {e.sortie > 0 ? `-${formatMoney(e.sortie)}` : '—'}
                    </td>
                    <td className="px-5 py-3 text-right font-mono font-semibold tabular-nums text-foreground">{formatMoney(e.solde)}</td>
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => void remove(e.id)} className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600" title="Supprimer">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Totaux */}
        {entries.length > 0 && (
          <div className="flex flex-wrap items-center justify-end gap-6 border-t border-border/50 bg-slate-50/60 px-5 py-3 text-sm">
            <span className="text-muted-foreground">Total entrées : <span className="font-mono font-semibold text-emerald-600">{formatMoney(totalEntrees)}</span></span>
            <span className="text-muted-foreground">Total sorties : <span className="font-mono font-semibold text-red-600">{formatMoney(totalSorties)}</span></span>
            <span className="font-semibold text-foreground">Solde final : <span className="font-mono">{formatMoney(soldeFinal)}</span></span>
          </div>
        )}
      </div>
    </div>
  );
}
