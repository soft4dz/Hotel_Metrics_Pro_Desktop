import { useState } from 'react';
import { Check, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useClientsFacturation } from '@/hooks/useFacturation';
import { cn } from '@/lib/utils';
import type { ClientFacturation, CreateClientInput, TypeClient } from '@/shared/types/facturation';
import { TYPE_CLIENT_LABELS } from '@/shared/types/facturation';

const inputCls = 'h-9 w-full rounded-lg border border-border/60 bg-white px-3 text-[13px] text-foreground shadow-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10';
const labelCls = 'mb-1 block text-[11px] font-semibold text-slate-500';

const EMPTY: CreateClientInput = { type: 'entreprise', nom: '', raisonSociale: '', email: '', telephone: '', adresse: '', nif: '', rc: '' };

function ClientForm({ initial, onSubmit, onCancel, submitLabel }: {
  initial: CreateClientInput;
  onSubmit: (data: CreateClientInput) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
}) {
  const [form, setForm] = useState<CreateClientInput>({ ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nom.trim()) { setError('Le nom est requis.'); return; }
    setSaving(true);
    setError(null);
    try { await onSubmit(form); } catch (err) { setError(err instanceof Error ? err.message : 'Erreur'); setSaving(false); }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
      {error && <p className="rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-xs text-destructive">{error}</p>}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Type</label>
          <select className={inputCls} value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as TypeClient }))}>
            {(Object.keys(TYPE_CLIENT_LABELS) as TypeClient[]).map((t) => <option key={t} value={t}>{TYPE_CLIENT_LABELS[t]}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Nom / Prénom *</label>
          <input className={inputCls} value={form.nom} onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} placeholder="Nom de famille" required />
        </div>
        {form.type === 'entreprise' && (
          <div className="col-span-2">
            <label className={labelCls}>Raison sociale</label>
            <input className={inputCls} value={form.raisonSociale ?? ''} onChange={(e) => setForm((f) => ({ ...f, raisonSociale: e.target.value }))} placeholder="SARL, SPA, EURL…" />
          </div>
        )}
        <div>
          <label className={labelCls}>Email</label>
          <input type="email" className={inputCls} value={form.email ?? ''} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
        </div>
        <div>
          <label className={labelCls}>Téléphone</label>
          <input className={inputCls} value={form.telephone ?? ''} onChange={(e) => setForm((f) => ({ ...f, telephone: e.target.value }))} />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Adresse</label>
          <input className={inputCls} value={form.adresse ?? ''} onChange={(e) => setForm((f) => ({ ...f, adresse: e.target.value }))} />
        </div>
        {form.type === 'entreprise' && (
          <>
            <div>
              <label className={labelCls}>NIF</label>
              <input className={inputCls} value={form.nif ?? ''} onChange={(e) => setForm((f) => ({ ...f, nif: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Registre de commerce</label>
              <input className={inputCls} value={form.rc ?? ''} onChange={(e) => setForm((f) => ({ ...f, rc: e.target.value }))} />
            </div>
          </>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={saving}><X className="h-3.5 w-3.5 mr-1" /> Annuler</Button>
        <Button type="submit" size="sm" disabled={saving} className="gap-1.5">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

export function ClientsFacturationPage() {
  const [search, setSearch] = useState('');
  const { clients, loading, error, create, update, remove } = useClientsFacturation(search || undefined);

  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleCreate = async (data: CreateClientInput) => {
    await create(data);
    setShowCreate(false);
  };

  const handleUpdate = async (id: number, data: CreateClientInput) => {
    await update(id, data);
    setEditId(null);
  };

  const handleDelete = async (c: ClientFacturation) => {
    if (!window.confirm(`Supprimer le client "${c.raisonSociale ?? c.nom}" ?`)) return;
    setDeletingId(c.id);
    try { await remove(c.id); } finally { setDeletingId(null); }
  };

  const toForm = (c: ClientFacturation): CreateClientInput => ({
    type: c.type, nom: c.nom, raisonSociale: c.raisonSociale ?? '',
    email: c.email ?? '', telephone: c.telephone ?? '',
    adresse: c.adresse ?? '', nif: c.nif ?? '', rc: c.rc ?? '',
  });

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-white px-4 py-2.5 shadow-sm">
        <input
          type="text"
          placeholder="Rechercher un client…"
          className="h-8 flex-1 min-w-[160px] rounded-lg border border-border/60 bg-white px-3 text-[13px] outline-none focus:border-primary/50"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex-1" />
        <Button size="sm" onClick={() => setShowCreate((v) => !v)} className="h-8 gap-1.5 px-3 text-[13px]">
          <Plus className="h-4 w-4" /> Nouveau client
        </Button>
      </div>

      {/* Formulaire création */}
      {showCreate && (
        <div className="overflow-hidden rounded-xl border border-primary/25 bg-white shadow-sm">
          <div className="border-b border-border/50 px-5 py-3.5">
            <h3 className="text-[13px] font-semibold text-foreground">Nouveau client</h3>
          </div>
          <div className="p-5">
            <ClientForm initial={EMPTY} onSubmit={handleCreate} onCancel={() => setShowCreate(false)} submitLabel="Créer" />
          </div>
        </div>
      )}

      {error && <p className="rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-border/60 bg-white shadow-sm">
        {loading ? (
          <div className="flex min-h-[200px] items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" /> Chargement…
          </div>
        ) : clients.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Aucun client trouvé.</p>
        ) : (
          <div className="divide-y divide-border/40">
            {clients.map((c) => (
              editId === c.id ? (
                <div key={c.id} className="px-5 py-4">
                  <ClientForm
                    initial={toForm(c)}
                    onSubmit={(data) => handleUpdate(c.id, data)}
                    onCancel={() => setEditId(null)}
                    submitLabel="Enregistrer"
                  />
                </div>
              ) : (
                <div key={c.id} className="flex items-start justify-between gap-4 px-5 py-4 hover:bg-slate-50/40">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{c.raisonSociale ?? c.nom}</p>
                    {c.raisonSociale && <p className="text-[12px] text-muted-foreground">{c.nom}</p>}
                    <div className="mt-1 flex flex-wrap gap-3 text-[12px] text-muted-foreground">
                      <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                        c.type === 'entreprise' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-slate-50 text-slate-600')}>
                        {TYPE_CLIENT_LABELS[c.type]}
                      </span>
                      {c.email && <span>{c.email}</span>}
                      {c.telephone && <span>{c.telephone}</span>}
                      {c.nif && <span>NIF: {c.nif}</span>}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button onClick={() => setEditId(c.id)} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-foreground">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => void handleDelete(c)}
                      disabled={deletingId === c.id}
                      className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
