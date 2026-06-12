import { useState } from 'react';
import { Plus, Trash2, ToggleLeft, ToggleRight, Tag, AlertCircle } from 'lucide-react';
import { usePromotions } from '@/hooks/useTarifs';
import { cn } from '@/lib/utils';
import type { CreatePromotionInput } from '@/shared/types/tarifs';

const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

function today() { return new Date().toISOString().slice(0, 10); }
function in30() { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().slice(0, 10); }

export function PromotionsPage() {
  const { data, loading, create, toggle, remove } = usePromotions();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<CreatePromotionInput>>({
    typeReduction: 'POURCENTAGE', valeurReduction: 10,
    minSejour: 1, dateDebut: today(), dateFin: in30(),
    hotelId: 0,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof CreatePromotionInput, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.nom || !form.hotelId) { setError('Nom et hôtel obligatoires.'); return; }
    setSaving(true); setError(null);
    try {
      await create(form as CreatePromotionInput);
      setShowForm(false);
      setForm({ typeReduction: 'POURCENTAGE', valeurReduction: 10, minSejour: 1, dateDebut: today(), dateFin: in30(), hotelId: 0 });
    } catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  };

  const actives = data.filter((p) => p.actif);
  const inactives = data.filter((p) => !p.actif);

  return (
    <div className="space-y-5">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            {actives.length} promotion{actives.length !== 1 ? 's' : ''} active{actives.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Nouvelle promotion
        </button>
      </div>

      {/* Formulaire */}
      {showForm && (
        <div className="rounded-xl border border-primary/30 bg-primary/[0.03] p-5 space-y-4">
          <h3 className="text-sm font-semibold">Nouvelle promotion</h3>
          {error && <p className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2"><AlertCircle className="h-3.5 w-3.5 shrink-0" />{error}</p>}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="col-span-2 sm:col-span-3">
              <label className="text-xs font-medium text-muted-foreground">Nom *</label>
              <input className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="ex: Promo Été 2025" value={form.nom ?? ''} onChange={(e) => set('nom', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Date début</label>
              <input type="date" className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={form.dateDebut ?? ''} onChange={(e) => set('dateDebut', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Date fin</label>
              <input type="date" className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={form.dateFin ?? ''} onChange={(e) => set('dateFin', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Min. séjour (nuits)</label>
              <input type="number" min={1} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={form.minSejour ?? 1} onChange={(e) => set('minSejour', +e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Type réduction</label>
              <select className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={form.typeReduction ?? 'POURCENTAGE'} onChange={(e) => set('typeReduction', e.target.value)}>
                <option value="POURCENTAGE">Pourcentage (%)</option>
                <option value="MONTANT_FIXE">Montant fixe (DA)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Valeur ({form.typeReduction === 'MONTANT_FIXE' ? 'DA' : '%'})
              </label>
              <input type="number" min={0} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={form.valeurReduction ?? 0} onChange={(e) => set('valeurReduction', +e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Jours applicables</label>
              <div className="flex gap-1">
                {JOURS.map((j, i) => {
                  const num = i + 1;
                  const sel = form.joursSemaine?.includes(num) ?? false;
                  return (
                    <button key={j} type="button"
                      onClick={() => set('joursSemaine', sel
                        ? (form.joursSemaine ?? []).filter((d) => d !== num)
                        : [...(form.joursSemaine ?? []), num])}
                      className={cn(
                        'w-8 h-8 rounded-lg text-xs font-semibold transition-colors',
                        sel ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
                      )}
                    >{j[0]}</button>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Vide = tous les jours</p>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button onClick={() => setShowForm(false)} className="rounded-xl border border-border px-5 py-2 text-sm font-medium hover:bg-slate-50">Annuler</button>
            <button onClick={submit} disabled={saving}
              className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50">
              {saving ? 'Enregistrement…' : 'Créer la promotion'}
            </button>
          </div>
        </div>
      )}

      {/* Liste promotions actives */}
      {loading ? (
        <div className="h-32 rounded-xl border border-border/40 bg-slate-50 animate-pulse" />
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <Tag className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Aucune promotion configurée</p>
        </div>
      ) : (
        <div className="space-y-2">
          {[...actives, ...inactives].map((p) => (
            <div key={p.id} className={cn(
              'flex items-center gap-4 rounded-xl border px-4 py-3 transition-opacity',
              p.actif ? 'border-emerald-200 bg-emerald-50/30' : 'border-border/40 bg-slate-50/40 opacity-60',
            )}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">{p.nom}</p>
                  <span className={cn(
                    'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                    p.actif ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500',
                  )}>
                    {p.actif ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {p.dateDebut} → {p.dateFin} ·{' '}
                  <strong className="text-primary">
                    -{p.valeurReduction}{p.typeReduction === 'POURCENTAGE' ? '%' : ' DA'}
                  </strong>
                  {p.minSejour > 1 && ` · min. ${p.minSejour} nuits`}
                  {p.joursSemaine && ` · ${p.joursSemaine.map((d) => JOURS[d - 1]).join(', ')}`}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => toggle(p.id, !p.actif)}
                  className="rounded-lg p-1.5 hover:bg-white/60 transition-colors">
                  {p.actif
                    ? <ToggleRight className="h-5 w-5 text-emerald-600" />
                    : <ToggleLeft className="h-5 w-5 text-slate-400" />}
                </button>
                <button onClick={() => remove(p.id).catch((e) => setError((e as Error).message))}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
