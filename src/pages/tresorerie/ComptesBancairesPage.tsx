import { useState } from 'react';
import { Pencil, Plus, Trash2, X, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useComptesBancaires } from '@/hooks/useTresorerie';
import { useHotelsList } from '@/hooks/useHotelsList';
import { formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { CompteBancaire, CreateCompteInput } from '@/shared/types/tresorerie';

const inputCls = 'h-9 w-full rounded-lg border border-border/60 bg-white px-3 text-[13px] text-foreground shadow-sm outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/10';
const labelCls = 'mb-1 block text-[11px] font-semibold text-slate-500';

type CompteFormData = Omit<CreateCompteInput, 'hotelId'>;

const EMPTY_FORM: CompteFormData = { intitule: '', banque: '', numeroCompte: '', soldeInitial: 0, actif: true };

function CompteForm({
  initial,
  hotels,
  onSubmit,
  onCancel,
  submitLabel,
  showHotel = true,
}: {
  initial: CompteFormData & { hotelId?: number };
  hotels: { id: number; name: string }[];
  onSubmit: (hotelId: number, data: CompteFormData) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
  showHotel?: boolean;
}) {
  const [form, setForm] = useState<CompteFormData>({ ...initial });
  const [hotelId, setHotelId] = useState<number | ''>(initial.hotelId ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hotelId) { setError('Sélectionnez un établissement.'); return; }
    if (!form.intitule.trim()) { setError("L'intitulé est requis."); return; }
    setSaving(true);
    setError(null);
    try {
      await onSubmit(Number(hotelId), form);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur enregistrement');
      setSaving(false);
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      {error && <p className="rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-xs text-destructive">{error}</p>}

      {showHotel && (
        <div>
          <label className={labelCls}>Établissement *</label>
          <select className={inputCls} value={hotelId} onChange={(e) => setHotelId(e.target.value ? Number(e.target.value) : '')} required>
            <option value="">— Sélectionner —</option>
            {hotels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={labelCls}>Intitulé du compte *</label>
          <input className={inputCls} value={form.intitule} onChange={(e) => setForm((f) => ({ ...f, intitule: e.target.value }))} placeholder="Compte courant principal…" required />
        </div>
        <div>
          <label className={labelCls}>Banque</label>
          <input className={inputCls} value={form.banque} onChange={(e) => setForm((f) => ({ ...f, banque: e.target.value }))} placeholder="BNA, CPA, BADR…" />
        </div>
        <div>
          <label className={labelCls}>N° de compte</label>
          <input className={inputCls} value={form.numeroCompte} onChange={(e) => setForm((f) => ({ ...f, numeroCompte: e.target.value }))} placeholder="00000000000" />
        </div>
        <div>
          <label className={labelCls}>Solde initial (DA)</label>
          <input type="number" step="0.01" className={inputCls} value={form.soldeInitial || ''} onChange={(e) => setForm((f) => ({ ...f, soldeInitial: parseFloat(e.target.value) || 0 }))} placeholder="0" />
        </div>
        <div className="flex items-center gap-2 pt-4">
          <input type="checkbox" id="actif-check" checked={form.actif} onChange={(e) => setForm((f) => ({ ...f, actif: e.target.checked }))} className="h-4 w-4 accent-primary rounded" />
          <label htmlFor="actif-check" className="text-[13px] text-foreground">Compte actif</label>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={saving}><X className="h-3.5 w-3.5" /> Annuler</Button>
        <Button type="submit" size="sm" disabled={saving} className="gap-1.5">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

export function ComptesBancairesPage() {
  const { hotels } = useHotelsList();
  const [filterHotelId, setFilterHotelId] = useState<number | undefined>();
  const { comptes, loading, error, create, update, remove } = useComptesBancaires(filterHotelId);

  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleCreate = async (hotelId: number, data: CompteFormData) => {
    await create({ hotelId, ...data });
    setShowCreate(false);
  };

  const handleUpdate = async (id: number, hotelId: number, data: CompteFormData) => {
    await update(id, { hotelId, ...data });
    setEditId(null);
  };

  const handleDelete = async (compte: CompteBancaire) => {
    if (!window.confirm(`Supprimer le compte "${compte.intitule}" ?`)) return;
    setDeletingId(compte.id);
    try { await remove(compte.id); } finally { setDeletingId(null); }
  };

  const hotelName = (id: number) => hotels.find((h) => h.id === id)?.name ?? `#${id}`;

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-white px-4 py-2.5 shadow-sm">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Établissement</span>
        <select
          className="h-8 rounded-lg border border-border/60 bg-white px-2.5 text-[13px] shadow-sm outline-none focus:border-primary/50"
          value={filterHotelId ?? ''}
          onChange={(e) => setFilterHotelId(e.target.value ? Number(e.target.value) : undefined)}
        >
          <option value="">Tous</option>
          {hotels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
        <div className="flex-1" />
        <Button size="sm" onClick={() => setShowCreate((v) => !v)} className="h-8 gap-1.5 px-3 text-[13px]">
          <Plus className="h-4 w-4" /> Nouveau compte
        </Button>
      </div>

      {/* Formulaire de création */}
      {showCreate && (
        <div className="overflow-hidden rounded-xl border border-primary/25 bg-white shadow-sm">
          <div className="border-b border-border/50 px-5 py-3.5">
            <h3 className="text-[13px] font-semibold text-foreground">Nouveau compte bancaire</h3>
          </div>
          <div className="p-5">
            <CompteForm
              initial={EMPTY_FORM}
              hotels={hotels}
              onSubmit={handleCreate}
              onCancel={() => setShowCreate(false)}
              submitLabel="Créer"
            />
          </div>
        </div>
      )}

      {error && <p className="rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p>}

      {/* Tableau */}
      <div className="overflow-hidden rounded-xl border border-border/60 bg-white shadow-sm">
        <div className="border-b border-border/50 px-5 py-3.5">
          <h3 className="text-[13px] font-semibold text-foreground">Comptes bancaires</h3>
        </div>

        {loading ? (
          <div className="flex min-h-[200px] items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" /> Chargement…
          </div>
        ) : comptes.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Aucun compte bancaire enregistré.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-slate-50/60">
                  {['Intitulé', 'Établissement', 'Banque', 'N° Compte', 'Solde initial', 'Statut', 'Actions'].map((h, i) => (
                    <th key={i} className={cn('px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-400', i === 4 ? 'text-right' : 'text-left')}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {comptes.map((c) => (
                  editId === c.id ? (
                    <tr key={c.id}>
                      <td colSpan={7} className="px-5 py-4">
                        <CompteForm
                          initial={{ intitule: c.intitule, banque: c.banque, numeroCompte: c.numeroCompte, soldeInitial: c.soldeInitial, actif: c.actif, hotelId: c.hotelId }}
                          hotels={hotels}
                          onSubmit={(hotelId, data) => handleUpdate(c.id, hotelId, data)}
                          onCancel={() => setEditId(null)}
                          submitLabel="Enregistrer"
                        />
                      </td>
                    </tr>
                  ) : (
                    <tr key={c.id} className="hover:bg-slate-50/40">
                      <td className="px-5 py-3 font-medium text-foreground">{c.intitule}</td>
                      <td className="px-5 py-3 text-muted-foreground">{hotelName(c.hotelId)}</td>
                      <td className="px-5 py-3 text-muted-foreground">{c.banque || '—'}</td>
                      <td className="px-5 py-3 font-mono text-[12px] text-muted-foreground">{c.numeroCompte || '—'}</td>
                      <td className="px-5 py-3 text-right font-mono tabular-nums text-foreground">{formatMoney(c.soldeInitial)}</td>
                      <td className="px-5 py-3">
                        <span className={cn('rounded-full border px-2.5 py-0.5 text-[10px] font-semibold',
                          c.actif ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-500')}>
                          {c.actif ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => setEditId(c.id)} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-foreground" title="Modifier">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => void handleDelete(c)}
                            disabled={deletingId === c.id}
                            className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                            title="Supprimer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
