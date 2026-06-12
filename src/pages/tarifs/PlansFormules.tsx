import { useState, useEffect } from 'react';
import { Plus, Trash2, Tag, Layers, AlertCircle, ChevronDown } from 'lucide-react';
import { usePlans, useFormules, useComposants } from '@/hooks/useTarifs';
import { ipcClient } from '@/lib/ipcClient';
import { cn } from '@/lib/utils';
import type { CreatePlanInput, CreateFormuleInput, CreateComposantInput, TypePlan, ModeCalcul } from '@/shared/types/tarifs';

interface Hotel { id: number; name: string }

const TYPE_PLAN_LABELS: Record<TypePlan, string> = {
  BASIQUE: 'Basique', PROMOTIONNEL: 'Promotionnel', PACKAGE: 'Package', GROUPE: 'Groupe',
};
const MODE_CALCUL_LABELS: Record<ModeCalcul, string> = {
  PAR_NUIT: 'Par nuit', PAR_PERSONNE_NUIT: 'Par pers./nuit', PAR_SEJOUR: 'Par séjour', FIXE: 'Fixe',
};

// Formules prédéfinies standards
const FORMULES_STD = [
  { code: 'RO',  label: 'Room Only',       description: 'Hébergement seul' },
  { code: 'BB',  label: 'Bed & Breakfast', description: 'Hébergement + petit déjeuner' },
  { code: 'HB',  label: 'Half Board',      description: 'Hébergement + PDJ + dîner' },
  { code: 'FB',  label: 'Full Board',      description: 'Hébergement + 3 repas' },
  { code: 'AI',  label: 'All Inclusive',   description: 'Tout inclus' },
];

function HotelSection({ hotel }: { hotel: Hotel }) {
  const { data: plans,      create: createPlan,      remove: removePlan }      = usePlans(hotel.id);
  const { data: formules,   create: createFormule,   remove: removeFormule }   = useFormules(hotel.id);
  const { data: composants, create: createComposant, remove: removeComposant } = useComposants(hotel.id);
  const [open, setOpen] = useState(true);
  const [showPlanForm, setShowPlanForm]           = useState(false);
  const [showFormuleForm, setShowFormuleForm]      = useState(false);
  const [showComposantForm, setShowComposantForm]  = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Formulaire plan ─────────────────────────────────────────────────────────
  const [planForm, setPlanForm] = useState<Partial<CreatePlanInput>>({ hotelId: hotel.id, typePlan: 'BASIQUE', priorite: 10 });
  const [savingPlan, setSavingPlan] = useState(false);

  const submitPlan = async () => {
    if (!planForm.code || !planForm.label) { setError('Code et libellé obligatoires.'); return; }
    setSavingPlan(true); setError(null);
    try { await createPlan({ ...planForm, hotelId: hotel.id } as CreatePlanInput); setShowPlanForm(false); setPlanForm({ hotelId: hotel.id, typePlan: 'BASIQUE', priorite: 10 }); }
    catch (e) { setError((e as Error).message); } finally { setSavingPlan(false); }
  };

  // ── Formulaire composant ────────────────────────────────────────────────────
  const [compForm, setCompForm] = useState<Partial<CreateComposantInput>>({ hotelId: hotel.id, modeCalcul: 'PAR_PERSONNE_NUIT', prixDefaut: 0 });
  const [savingComp, setSavingComp] = useState(false);

  const submitComposant = async () => {
    if (!compForm.code || !compForm.label) { setError('Code et libellé obligatoires.'); return; }
    setSavingComp(true); setError(null);
    try { await createComposant({ ...compForm, hotelId: hotel.id } as CreateComposantInput); setShowComposantForm(false); setCompForm({ hotelId: hotel.id, modeCalcul: 'PAR_PERSONNE_NUIT', prixDefaut: 0 }); }
    catch (e) { setError((e as Error).message); } finally { setSavingComp(false); }
  };

  // ── Formulaire formule ──────────────────────────────────────────────────────
  const [formuleForm, setFormuleForm] = useState<{ code: string; label: string; description: string; composantIds: number[] }>({ code: '', label: '', description: '', composantIds: [] });
  const [savingFormule, setSavingFormule] = useState(false);

  const applyStd = (std: typeof FORMULES_STD[0]) => {
    setFormuleForm((f) => ({ ...f, code: std.code, label: std.label, description: std.description }));
  };

  const submitFormule = async () => {
    if (!formuleForm.code || !formuleForm.label) { setError('Code et libellé obligatoires.'); return; }
    setSavingFormule(true); setError(null);
    try {
      await createFormule({
        hotelId: hotel.id, code: formuleForm.code, label: formuleForm.label,
        description: formuleForm.description || undefined,
        composants: formuleForm.composantIds.map((cid) => ({ composantId: cid })),
      } as CreateFormuleInput);
      setShowFormuleForm(false);
      setFormuleForm({ code: '', label: '', description: '', composantIds: [] });
    } catch (e) { setError((e as Error).message); } finally { setSavingFormule(false); }
  };

  return (
    <div className="rounded-xl border border-border/60 bg-white shadow-sm overflow-hidden">
      <button onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 hover:bg-slate-50/60 transition-colors">
        <div>
          <p className="text-sm font-semibold text-left">{hotel.name}</p>
          <p className="text-xs text-muted-foreground">{plans.length} plan(s) · {formules.length} formule(s) · {composants.length} composant(s)</p>
        </div>
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="border-t border-border/40 divide-y divide-border/30">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 px-5 py-2.5 text-xs text-red-600">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />{error}
              <button onClick={() => setError(null)} className="ml-auto">✕</button>
            </div>
          )}

          {/* Plans tarifaires */}
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Plans tarifaires</span>
              </div>
              <button onClick={() => setShowPlanForm((v) => !v)}
                className="flex items-center gap-1.5 rounded-lg bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10">
                <Plus className="h-3.5 w-3.5" /> Nouveau plan
              </button>
            </div>

            {showPlanForm && (
              <div className="rounded-xl border border-primary/30 bg-primary/[0.03] p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { k: 'code', label: 'Code *', placeholder: 'STD' },
                    { k: 'label', label: 'Libellé *', placeholder: 'Standard' },
                  ].map(({ k, label, placeholder }) => (
                    <div key={k}>
                      <label className="text-xs font-medium text-muted-foreground">{label}</label>
                      <input className="mt-1 w-full rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        placeholder={placeholder}
                        value={(planForm as any)[k] ?? ''}
                        onChange={(e) => setPlanForm((f) => ({ ...f, [k]: e.target.value }))} />
                    </div>
                  ))}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Type</label>
                    <select className="mt-1 w-full rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      value={planForm.typePlan ?? 'BASIQUE'}
                      onChange={(e) => setPlanForm((f) => ({ ...f, typePlan: e.target.value as TypePlan }))}>
                      {(Object.keys(TYPE_PLAN_LABELS) as TypePlan[]).map((k) => (
                        <option key={k} value={k}>{TYPE_PLAN_LABELS[k]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Priorité</label>
                    <input type="number" className="mt-1 w-full rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      value={planForm.priorite ?? 10}
                      onChange={(e) => setPlanForm((f) => ({ ...f, priorite: +e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { k: 'conditionsAnnulation', label: "Conditions d'annulation" },
                    { k: 'conditionsPaiement', label: 'Conditions de paiement' },
                  ].map(({ k, label }) => (
                    <div key={k}>
                      <label className="text-xs font-medium text-muted-foreground">{label}</label>
                      <input className="mt-1 w-full rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        placeholder="Optionnel"
                        value={(planForm as any)[k] ?? ''}
                        onChange={(e) => setPlanForm((f) => ({ ...f, [k]: e.target.value }))} />
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowPlanForm(false)} className="rounded-lg border border-border px-4 py-1.5 text-xs font-medium hover:bg-slate-50">Annuler</button>
                  <button onClick={submitPlan} disabled={savingPlan}
                    className="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 disabled:opacity-50">
                    {savingPlan ? 'Enregistrement…' : 'Créer'}
                  </button>
                </div>
              </div>
            )}

            {plans.length === 0 ? (
              <p className="text-xs text-muted-foreground italic text-center py-2">Aucun plan tarifaire</p>
            ) : (
              <div className="rounded-xl border border-border/40 overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="bg-slate-50/70">
                    {['Code', 'Libellé', 'Type', 'Priorité', ''].map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {plans.map((p) => (
                      <tr key={p.id} className="border-t border-border/20 hover:bg-slate-50/40">
                        <td className="px-3 py-2.5"><span className="rounded-md bg-primary/8 px-2 py-0.5 text-xs font-mono font-bold text-primary">{p.code}</span></td>
                        <td className="px-3 py-2.5 font-medium">{p.label}</td>
                        <td className="px-3 py-2.5 text-muted-foreground text-xs">{TYPE_PLAN_LABELS[p.typePlan]}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{p.priorite}</td>
                        <td className="px-3 py-2.5 text-right">
                          <button onClick={() => { setError(null); removePlan(p.id).catch((e) => setError((e as Error).message)); }}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500">
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

          {/* Composants */}
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Composants</span>
                <span className="text-xs text-muted-foreground/60">(PDJ, dîner, minibar…)</span>
              </div>
              <button onClick={() => setShowComposantForm((v) => !v)}
                className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100">
                <Plus className="h-3.5 w-3.5" /> Nouveau composant
              </button>
            </div>

            {showComposantForm && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Code *</label>
                    <input className="mt-1 w-full rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="PDJ" value={compForm.code ?? ''}
                      onChange={(e) => setCompForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Libellé *</label>
                    <input className="mt-1 w-full rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="Petit déjeuner" value={compForm.label ?? ''}
                      onChange={(e) => setCompForm((f) => ({ ...f, label: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Mode calcul</label>
                    <select className="mt-1 w-full rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      value={compForm.modeCalcul ?? 'PAR_PERSONNE_NUIT'}
                      onChange={(e) => setCompForm((f) => ({ ...f, modeCalcul: e.target.value as ModeCalcul }))}>
                      {(Object.keys(MODE_CALCUL_LABELS) as ModeCalcul[]).map((k) => (
                        <option key={k} value={k}>{MODE_CALCUL_LABELS[k]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Prix (DA)</label>
                    <input type="number" min={0} className="mt-1 w-full rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      value={compForm.prixDefaut ?? 0}
                      onChange={(e) => setCompForm((f) => ({ ...f, prixDefaut: +e.target.value }))} />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowComposantForm(false)} className="rounded-lg border border-border px-4 py-1.5 text-xs font-medium hover:bg-slate-50">Annuler</button>
                  <button onClick={submitComposant} disabled={savingComp}
                    className="rounded-lg bg-amber-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50">
                    {savingComp ? 'Enregistrement…' : 'Créer'}
                  </button>
                </div>
              </div>
            )}

            {composants.length > 0 && (
              <div className="rounded-xl border border-border/40 overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="bg-slate-50/70">
                    {['Code', 'Libellé', 'Mode', 'Prix défaut', ''].map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {composants.map((c) => (
                      <tr key={c.id} className="border-t border-border/20 hover:bg-slate-50/40">
                        <td className="px-3 py-2.5"><span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-mono font-bold text-amber-700">{c.code}</span></td>
                        <td className="px-3 py-2.5 font-medium">{c.label}</td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">{MODE_CALCUL_LABELS[c.modeCalcul]}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{c.prixDefaut.toLocaleString('fr-DZ')} DA</td>
                        <td className="px-3 py-2.5 text-right">
                          <button onClick={() => removeComposant(c.id).catch((e) => setError((e as Error).message))}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500">
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

          {/* Formules */}
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Formules</span>
                <span className="text-xs text-muted-foreground/60">(RO, BB, HB, FB, AI…)</span>
              </div>
              <button onClick={() => setShowFormuleForm((v) => !v)}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">
                <Plus className="h-3.5 w-3.5" /> Nouvelle formule
              </button>
            </div>

            {showFormuleForm && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Formules standard :</p>
                  <div className="flex flex-wrap gap-1.5">
                    {FORMULES_STD.map((s) => (
                      <button key={s.code} onClick={() => applyStd(s)}
                        className="rounded-lg bg-white border border-border px-2.5 py-1 text-xs font-semibold hover:bg-emerald-50 hover:border-emerald-300 transition-colors">
                        {s.code} — {s.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Code *</label>
                    <input className="mt-1 w-full rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="BB" value={formuleForm.code}
                      onChange={(e) => setFormuleForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Libellé *</label>
                    <input className="mt-1 w-full rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="Bed & Breakfast" value={formuleForm.label}
                      onChange={(e) => setFormuleForm((f) => ({ ...f, label: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Description</label>
                    <input className="mt-1 w-full rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="Optionnel" value={formuleForm.description}
                      onChange={(e) => setFormuleForm((f) => ({ ...f, description: e.target.value }))} />
                  </div>
                </div>
                {composants.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">Composants inclus :</p>
                    <div className="flex flex-wrap gap-2">
                      {composants.map((c) => (
                        <label key={c.id} className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox"
                            checked={formuleForm.composantIds.includes(c.id)}
                            onChange={(e) => setFormuleForm((f) => ({
                              ...f,
                              composantIds: e.target.checked
                                ? [...f.composantIds, c.id]
                                : f.composantIds.filter((id) => id !== c.id),
                            }))}
                            className="rounded border-border" />
                          <span className="text-xs font-medium">{c.label}</span>
                          <span className="text-xs text-muted-foreground">({c.prixDefaut.toLocaleString('fr-DZ')} DA)</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowFormuleForm(false)} className="rounded-lg border border-border px-4 py-1.5 text-xs font-medium hover:bg-slate-50">Annuler</button>
                  <button onClick={submitFormule} disabled={savingFormule}
                    className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                    {savingFormule ? 'Enregistrement…' : 'Créer la formule'}
                  </button>
                </div>
              </div>
            )}

            {formules.length > 0 && (
              <div className="rounded-xl border border-border/40 overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="bg-slate-50/70">
                    {['Code', 'Libellé', 'Composants inclus', ''].map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {formules.map((f) => (
                      <tr key={f.id} className="border-t border-border/20 hover:bg-slate-50/40">
                        <td className="px-3 py-2.5"><span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-mono font-bold text-emerald-700">{f.code}</span></td>
                        <td className="px-3 py-2.5 font-medium">{f.label}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-wrap gap-1">
                            {f.composants.length === 0
                              ? <span className="text-xs text-muted-foreground italic">Hébergement seul</span>
                              : f.composants.map((c) => (
                                <span key={c.composantId} className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                                  {c.label} — {(c.prixEffectif).toLocaleString('fr-DZ')} DA
                                </span>
                              ))
                            }
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <button onClick={() => removeFormule(f.id).catch((e) => setError((e as Error).message))}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500">
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
        </div>
      )}
    </div>
  );
}

export function PlansFormules() {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  useEffect(() => {
    ipcClient.hotels.list().then((r) => { if (r.ok) setHotels(r.data as Hotel[]); }).catch(() => {});
  }, []);
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Configurez les plans tarifaires, les composants de prestation et les formules (BB, HB…) pour chaque unité.</p>
      {hotels.map((h) => <HotelSection key={h.id} hotel={h} />)}
    </div>
  );
}
