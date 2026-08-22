import { useState } from 'react';
import { Plus, Trash2, AlertCircle, Package } from 'lucide-react';
import { useLotsAo } from '@/hooks/useAppelsOffres';
import { cn } from '@/lib/utils';
import type { AppelOffres } from '@/shared/types/appelsOffres';

const STATUT_COLORS = {
  ouvert: 'bg-blue-50 text-blue-700', attribue: 'bg-emerald-50 text-emerald-700',
  infructueux: 'bg-slate-100 text-slate-500', annule: 'bg-red-50 text-red-500',
} as const;

const STATUT_LABELS = { ouvert: 'Ouvert', attribue: 'Attribué', infructueux: 'Infructueux', annule: 'Annulé' } as const;

export function LotsTab({ dossier }: { dossier: AppelOffres }) {
  const { data: lots, loading, create, remove } = useLotsAo(dossier.id);
  const editable = dossier.statut === 'brouillon';

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ numeroLot: '', designation: '', montantEstime: 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!form.numeroLot.trim() || !form.designation.trim()) { setError('Numéro et désignation obligatoires.'); return; }
    setSaving(true); setError(null);
    try {
      await create({ appelOffresId: dossier.id, numeroLot: form.numeroLot.trim(), designation: form.designation.trim(), montantEstime: form.montantEstime });
      setShowForm(false);
      setForm({ numeroLot: '', designation: '', montantEstime: 0 });
    } catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      {editable && (
        <div className="flex justify-end">
          <button onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90">
            <Plus className="h-4 w-4" /> Nouveau lot
          </button>
        </div>
      )}

      {showForm && (
        <div className="rounded-xl border border-primary/30 bg-primary/[0.03] p-4 space-y-3">
          {error && <p className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2"><AlertCircle className="h-3.5 w-3.5 shrink-0" />{error}</p>}
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Numéro de lot *</label>
              <input className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" placeholder="Lot 1"
                value={form.numeroLot} onChange={(e) => setForm({ ...form, numeroLot: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Désignation *</label>
              <input className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" placeholder="ex: Fourniture de literie"
                value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Montant estimé (DA)</label>
              <input type="number" min={0} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
                value={form.montantEstime} onChange={(e) => setForm({ ...form, montantEstime: +e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="rounded-lg border border-border px-4 py-1.5 text-xs font-medium hover:bg-slate-50">Annuler</button>
            <button onClick={submit} disabled={saving} className="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 disabled:opacity-50">
              {saving ? 'Ajout…' : 'Ajouter le lot'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="h-24 rounded-xl border border-border/40 bg-slate-50 animate-pulse" />
      ) : lots.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <Package className="h-8 w-8 text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">Aucun lot défini{editable ? ' — ajoutez-en un pour publier le dossier' : ''}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {lots.map((l) => (
            <div key={l.id} className="flex items-center gap-4 rounded-xl border border-border/60 bg-white px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">{l.numeroLot}</p>
                  <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', STATUT_COLORS[l.statut])}>{STATUT_LABELS[l.statut]}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{l.designation}</p>
                {l.montantEstime > 0 && <p className="text-xs text-muted-foreground mt-0.5">Estimé : {l.montantEstime.toLocaleString('fr-DZ')} DA</p>}
              </div>
              {editable && (
                <button onClick={() => remove(l.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
