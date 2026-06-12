import { useState, useEffect } from 'react';
import { Plus, Trash2, BedDouble, Tag, Building2, AlertCircle, ChevronDown } from 'lucide-react';
import { useTypesChambre, useChambres } from '@/hooks/useHebergement';
import { ipcClient } from '@/lib/ipcClient';
import { cn } from '@/lib/utils';
import type { CreateTypeChambreInput, CreateChambreInput, TypeChambre, Chambre } from '@/shared/types/hebergement';

interface Hotel { id: number; name: string; code: string }

// ── Formulaire nouveau type de chambre ────────────────────────────────────────

function TypeChambreForm({ hotelId, onCreate, onCancel }: {
  hotelId: number;
  onCreate: (input: CreateTypeChambreInput) => Promise<unknown>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Partial<CreateTypeChambreInput>>({ hotelId, capacite: 2, tarifBase: 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof CreateTypeChambreInput, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.code || !form.label) { setError('Code et libellé sont obligatoires.'); return; }
    setSaving(true); setError(null);
    try { await onCreate({ ...form, hotelId } as CreateTypeChambreInput); onCancel(); }
    catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/[0.03] p-4 space-y-3">
      {error && (
        <p className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />{error}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Code *</label>
          <input className="mt-1 w-full rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="ex: STD, SUP, DLX"
            value={form.code ?? ''} onChange={(e) => set('code', e.target.value.toUpperCase())} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Libellé *</label>
          <input className="mt-1 w-full rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="ex: Standard, Supérieure"
            value={form.label ?? ''} onChange={(e) => set('label', e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Capacité (pers.)</label>
          <input type="number" min={1} max={20} className="mt-1 w-full rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={form.capacite ?? 2} onChange={(e) => set('capacite', +e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Tarif de base (DA)</label>
          <input type="number" min={0} className="mt-1 w-full rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={form.tarifBase ?? 0} onChange={(e) => set('tarifBase', +e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-medium text-muted-foreground">Description</label>
          <input className="mt-1 w-full rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Optionnel"
            value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onCancel} className="rounded-lg border border-border px-4 py-1.5 text-xs font-medium hover:bg-slate-50 transition-colors">
          Annuler
        </button>
        <button onClick={submit} disabled={saving}
          className="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors">
          {saving ? 'Enregistrement…' : 'Créer le type'}
        </button>
      </div>
    </div>
  );
}

// ── Formulaire nouvelle chambre ───────────────────────────────────────────────

function ChambreForm({ hotelId, types, onCreate, onCancel }: {
  hotelId: number;
  types: TypeChambre[];
  onCreate: (input: CreateChambreInput) => Promise<unknown>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Partial<CreateChambreInput>>({ hotelId, etage: 0, statut: 'libre' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof CreateChambreInput, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.numero) { setError('Le numéro de chambre est obligatoire.'); return; }
    setSaving(true); setError(null);
    try { await onCreate({ ...form, hotelId } as CreateChambreInput); onCancel(); }
    catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
      {error && (
        <p className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />{error}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Numéro *</label>
          <input className="mt-1 w-full rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="ex: 101"
            value={form.numero ?? ''} onChange={(e) => set('numero', e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Étage</label>
          <input type="number" min={0} className="mt-1 w-full rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={form.etage ?? 0} onChange={(e) => set('etage', +e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Type</label>
          <select className="mt-1 w-full rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={form.typeChambreId ?? ''} onChange={(e) => set('typeChambreId', e.target.value ? +e.target.value : undefined)}>
            <option value="">— Aucun —</option>
            {types.map((t) => <option key={t.id} value={t.id}>{t.label} ({t.code})</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Statut initial</label>
          <select className="mt-1 w-full rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={form.statut ?? 'libre'} onChange={(e) => set('statut', e.target.value)}>
            <option value="libre">Libre</option>
            <option value="hors_service">Hors service</option>
          </select>
        </div>
        <div className="col-span-2 sm:col-span-4">
          <label className="text-xs font-medium text-muted-foreground">Description</label>
          <input className="mt-1 w-full rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Optionnel (vue, équipements spéciaux…)"
            value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onCancel} className="rounded-lg border border-border px-4 py-1.5 text-xs font-medium hover:bg-slate-50 transition-colors">
          Annuler
        </button>
        <button onClick={submit} disabled={saving}
          className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors">
          {saving ? 'Enregistrement…' : 'Ajouter la chambre'}
        </button>
      </div>
    </div>
  );
}

// ── Panneau d'un hôtel ────────────────────────────────────────────────────────

function HotelPanel({ hotel }: { hotel: Hotel }) {
  const { data: types, create: createType, remove: removeType } = useTypesChambre(hotel.id);
  const { data: chambres, create: createChambre, remove: removeChambre } = useChambres(hotel.id);
  const [showTypeForm, setShowTypeForm] = useState(false);
  const [showChambreForm, setShowChambreForm] = useState(false);
  const [open, setOpen] = useState(true);
  const [removing, setRemoving] = useState<number | null>(null);
  const [removingC, setRemovingC] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRemoveType = async (id: number) => {
    setRemoving(id); setError(null);
    try { await removeType(id); }
    catch (e) { setError((e as Error).message); }
    finally { setRemoving(null); }
  };

  const handleRemoveChambre = async (id: number) => {
    setRemovingC(id); setError(null);
    try { await removeChambre(id); }
    catch (e) { setError((e as Error).message); }
    finally { setRemovingC(null); }
  };

  return (
    <div className="rounded-xl border border-border/60 bg-white shadow-sm overflow-hidden">
      {/* Header hôtel */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 hover:bg-slate-50/60 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold">{hotel.name}</p>
            <p className="text-xs text-muted-foreground">{types.length} type{types.length > 1 ? 's' : ''} · {chambres.length} chambre{chambres.length > 1 ? 's' : ''}</p>
          </div>
        </div>
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform duration-200', open ? 'rotate-180' : '')} />
      </button>

      {open && (
        <div className="border-t border-border/40 divide-y divide-border/30">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 px-5 py-2.5 text-xs text-red-600">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />{error}
              <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
            </div>
          )}

          {/* ── Types de chambres ── */}
          <div className="px-5 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Types de chambres</h4>
              </div>
              <button
                onClick={() => setShowTypeForm((v) => !v)}
                className="flex items-center gap-1.5 rounded-lg bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Nouveau type
              </button>
            </div>

            {showTypeForm && (
              <TypeChambreForm
                hotelId={hotel.id}
                onCreate={createType}
                onCancel={() => setShowTypeForm(false)}
              />
            )}

            {types.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2 text-center italic">Aucun type configuré</p>
            ) : (
              <div className="rounded-xl border border-border/40 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50/70 text-left">
                      {['Code', 'Libellé', 'Capacité', 'Tarif base', ''].map((h) => (
                        <th key={h} className="px-3 py-2 text-[11px] font-semibold text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {types.map((t: TypeChambre) => (
                      <tr key={t.id} className="border-t border-border/20 hover:bg-slate-50/40 transition-colors">
                        <td className="px-3 py-2.5">
                          <span className="rounded-md bg-primary/8 px-2 py-0.5 text-xs font-mono font-bold text-primary">{t.code}</span>
                        </td>
                        <td className="px-3 py-2.5 font-medium">{t.label}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{t.capacite} pers.</td>
                        <td className="px-3 py-2.5 text-muted-foreground">
                          {t.tarifBase > 0 ? `${t.tarifBase.toLocaleString('fr-DZ')} DA` : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <button
                            onClick={() => handleRemoveType(t.id)}
                            disabled={removing === t.id}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-40"
                            title="Supprimer ce type"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Chambres ── */}
          <div className="px-5 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BedDouble className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Chambres</h4>
              </div>
              <button
                onClick={() => setShowChambreForm((v) => !v)}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Nouvelle chambre
              </button>
            </div>

            {showChambreForm && (
              <ChambreForm
                hotelId={hotel.id}
                types={types}
                onCreate={createChambre}
                onCancel={() => setShowChambreForm(false)}
              />
            )}

            {chambres.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2 text-center italic">Aucune chambre configurée</p>
            ) : (
              <div className="rounded-xl border border-border/40 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50/70 text-left">
                      {['N°', 'Étage', 'Type', 'Statut', ''].map((h) => (
                        <th key={h} className="px-3 py-2 text-[11px] font-semibold text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {chambres.map((c: Chambre) => {
                      const STATUT_STYLE: Record<string, string> = {
                        libre: 'bg-emerald-50 text-emerald-700',
                        occupee: 'bg-blue-50 text-blue-700',
                        menage: 'bg-amber-50 text-amber-700',
                        hors_service: 'bg-red-50 text-red-600',
                      };
                      const STATUT_LBL: Record<string, string> = {
                        libre: 'Libre', occupee: 'Occupée', menage: 'Ménage', hors_service: 'Hors service',
                      };
                      return (
                        <tr key={c.id} className="border-t border-border/20 hover:bg-slate-50/40 transition-colors">
                          <td className="px-3 py-2.5 font-semibold">{c.numero}</td>
                          <td className="px-3 py-2.5 text-muted-foreground">
                            {c.etage === 0 ? 'RDC' : `Étage ${c.etage}`}
                          </td>
                          <td className="px-3 py-2.5 text-muted-foreground">
                            {c.typeChambreLabel ?? <span className="italic opacity-50">—</span>}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', STATUT_STYLE[c.statut])}>
                              {STATUT_LBL[c.statut]}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <button
                              onClick={() => handleRemoveChambre(c.id)}
                              disabled={removingC === c.id}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-40"
                              title="Désactiver cette chambre"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

export function ParametrageHebergement() {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loadingHotels, setLoadingHotels] = useState(true);

  useEffect(() => {
    ipcClient.hotels.list().then((res) => {
      if (res.ok) setHotels(res.data as Hotel[]);
    }).catch(() => {}).finally(() => setLoadingHotels(false));
  }, []);

  if (loadingHotels) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-24 rounded-xl border border-border/40 bg-slate-50 animate-pulse" />
        ))}
      </div>
    );
  }

  if (hotels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border py-16 text-center">
        <Building2 className="h-10 w-10 text-muted-foreground/30 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">Aucune unité hôtelière accessible</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Configurez vos hôtels dans Administration → Hôtels</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Configurez les types de chambres et les chambres pour chaque unité hôtelière.
        Les modifications sont effectives immédiatement.
      </p>
      {hotels.map((h) => (
        <HotelPanel key={h.id} hotel={h} />
      ))}
    </div>
  );
}
