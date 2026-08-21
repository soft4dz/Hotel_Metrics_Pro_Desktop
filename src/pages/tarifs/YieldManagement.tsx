import { useState, useMemo } from 'react';
import { Plus, Trash2, ToggleLeft, ToggleRight, TrendingUp, AlertCircle, Check } from 'lucide-react';
import { useYieldRules, useYieldSuggestions } from '@/hooks/useYield';
import { usePlans } from '@/hooks/useTarifs';
import { useTypesChambre } from '@/hooks/useHebergement';
import { cn } from '@/lib/utils';
import type { CreateYieldRuleInput, YieldSuggestion } from '@/shared/types/yield';

function today() { return new Date().toISOString().slice(0, 10); }
function in14() { const d = new Date(); d.setDate(d.getDate() + 14); return d.toISOString().slice(0, 10); }
function suggestionKey(s: YieldSuggestion) { return `${s.typeChambreId}_${s.dateApplication}`; }

export function YieldManagement() {
  const { data: allPlans } = usePlans();
  const { data: allTypes } = useTypesChambre();

  const hotels = useMemo(() => {
    const map = new Map<number, string>();
    allPlans.forEach((p) => map.set(p.hotelId, p.hotelName));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [allPlans]);

  const [hotelId, setHotelId] = useState(0);
  const effectiveHotelId = hotelId || hotels[0]?.id || 0;

  const { data: rules, loading: rulesLoading, create, toggle, remove } = useYieldRules(effectiveHotelId || undefined);
  const types = allTypes.filter((t) => !effectiveHotelId || t.hotelId === effectiveHotelId);

  // ── Formulaire règle ──────────────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<CreateYieldRuleInput>>({
    ajustementType: 'POURCENTAGE', ajustementValeur: 10, priorite: 10,
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const set = (k: keyof CreateYieldRuleInput, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const submitRule = async () => {
    if (!effectiveHotelId || !form.nom) { setFormError('Nom et unité obligatoires.'); return; }
    setSaving(true); setFormError(null);
    try {
      await create({ ...form, hotelId: effectiveHotelId } as CreateYieldRuleInput);
      setShowForm(false);
      setForm({ ajustementType: 'POURCENTAGE', ajustementValeur: 10, priorite: 10 });
    } catch (e) { setFormError((e as Error).message); }
    finally { setSaving(false); }
  };

  // ── Suggestions ───────────────────────────────────────────────────────────
  const plans = allPlans.filter((p) => !effectiveHotelId || p.hotelId === effectiveHotelId);
  const [planId, setPlanId] = useState(0);
  const effectivePlanId = planId || plans[0]?.id || 0;
  const [dateDebut, setDateDebut] = useState(today());
  const [dateFin, setDateFin] = useState(in14());
  const { result: suggestions, loading: computing, error: computeError, compute, apply } = useYieldSuggestions();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);
  const [applyMsg, setApplyMsg] = useState<string | null>(null);

  const handleCompute = async () => {
    if (!effectiveHotelId || !effectivePlanId) return;
    setApplyMsg(null);
    setSelected(new Set());
    await compute({ hotelId: effectiveHotelId, planId: effectivePlanId, dateDebut, dateFin });
  };

  const toggleSelected = (key: string) => setSelected((s) => {
    const next = new Set(s);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  const selectAll = () => setSelected(new Set((suggestions ?? []).map(suggestionKey)));
  const clearAll = () => setSelected(new Set());

  const handleApply = async () => {
    if (!suggestions || selected.size === 0) return;
    setApplying(true); setApplyMsg(null);
    try {
      const toApply = suggestions.filter((s) => selected.has(suggestionKey(s)));
      const count = await apply({
        suggestions: toApply.map((s) => ({
          hotelId: s.hotelId, typeChambreId: s.typeChambreId, planId: s.planId,
          formuleId: s.formuleId, dateApplication: s.dateApplication, prixSuggere: s.prixSuggere,
        })),
      });
      setApplyMsg(`✓ ${count} tarif(s) appliqué(s).`);
      setSelected(new Set());
    } catch (e) { setApplyMsg((e as Error).message); }
    finally { setApplying(false); }
  };

  return (
    <div className="space-y-6">
      {/* Sélecteur d'unité */}
      <div className="flex flex-wrap gap-3 rounded-xl border border-border/60 bg-white p-4 shadow-sm">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Unité</label>
          <select className="mt-1 block rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={hotelId} onChange={(e) => { setHotelId(+e.target.value); setPlanId(0); }}>
            <option value={0}>— Sélectionner —</option>
            {hotels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        </div>
      </div>

      {/* ── Règles de yield ──────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Règles de yield</h3>
          <button onClick={() => setShowForm((v) => !v)} disabled={!effectiveHotelId}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50">
            <Plus className="h-4 w-4" /> Nouvelle règle
          </button>
        </div>

        {showForm && (
          <div className="rounded-xl border border-primary/30 bg-primary/[0.03] p-5 space-y-4">
            {formError && <p className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2"><AlertCircle className="h-3.5 w-3.5 shrink-0" />{formError}</p>}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="col-span-2 sm:col-span-3">
                <label className="text-xs font-medium text-muted-foreground">Nom *</label>
                <input className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="ex: Forte demande weekend" value={form.nom ?? ''} onChange={(e) => set('nom', e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Type de chambre</label>
                <select className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={form.typeChambreId ?? ''} onChange={(e) => set('typeChambreId', e.target.value ? +e.target.value : null)}>
                  <option value="">Tous les types</option>
                  {types.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Occupation min (%)</label>
                <input type="number" min={0} max={100} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={form.occupationMin ?? ''} onChange={(e) => set('occupationMin', e.target.value ? +e.target.value : null)} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Occupation max (%)</label>
                <input type="number" min={0} max={100} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={form.occupationMax ?? ''} onChange={(e) => set('occupationMax', e.target.value ? +e.target.value : null)} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Jours avant date (max)</label>
                <input type="number" min={0} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="ex: 3 = dernière minute" value={form.joursAvantMax ?? ''} onChange={(e) => set('joursAvantMax', e.target.value ? +e.target.value : null)} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Type d'ajustement</label>
                <select className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={form.ajustementType ?? 'POURCENTAGE'} onChange={(e) => set('ajustementType', e.target.value)}>
                  <option value="POURCENTAGE">Pourcentage (%)</option>
                  <option value="MONTANT_FIXE">Montant fixe (DA)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Ajustement ({form.ajustementType === 'MONTANT_FIXE' ? 'DA' : '%'}) — négatif = baisse
                </label>
                <input type="number" className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={form.ajustementValeur ?? 0} onChange={(e) => set('ajustementValeur', +e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Priorité</label>
                <input type="number" min={0} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={form.priorite ?? 10} onChange={(e) => set('priorite', +e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <button onClick={() => setShowForm(false)} className="rounded-xl border border-border px-5 py-2 text-sm font-medium hover:bg-slate-50">Annuler</button>
              <button onClick={submitRule} disabled={saving}
                className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50">
                {saving ? 'Enregistrement…' : 'Créer la règle'}
              </button>
            </div>
          </div>
        )}

        {!effectiveHotelId ? (
          <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-border py-10">
            <p className="text-sm text-muted-foreground">Sélectionnez une unité pour gérer ses règles</p>
          </div>
        ) : rulesLoading ? (
          <div className="h-24 rounded-xl border border-border/40 bg-slate-50 animate-pulse" />
        ) : rules.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <TrendingUp className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">Aucune règle de yield configurée</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rules.map((r) => (
              <div key={r.id} className={cn(
                'flex items-center gap-4 rounded-xl border px-4 py-3 transition-opacity',
                r.actif ? 'border-emerald-200 bg-emerald-50/30' : 'border-border/40 bg-slate-50/40 opacity-60',
              )}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{r.nom}</p>
                    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold',
                      r.ajustementValeur >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700')}>
                      {r.ajustementValeur >= 0 ? '+' : ''}{r.ajustementValeur}{r.ajustementType === 'POURCENTAGE' ? '%' : ' DA'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {r.typeChambreLabel ?? 'Tous types'}
                    {(r.occupationMin != null || r.occupationMax != null) && ` · occupation ${r.occupationMin ?? 0}–${r.occupationMax ?? 100}%`}
                    {r.joursAvantMax != null && ` · J-${r.joursAvantMax}`}
                    {` · priorité ${r.priorite}`}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => toggle(r.id, !r.actif)} className="rounded-lg p-1.5 hover:bg-white/60 transition-colors">
                    {r.actif ? <ToggleRight className="h-5 w-5 text-emerald-600" /> : <ToggleLeft className="h-5 w-5 text-slate-400" />}
                  </button>
                  <button onClick={() => remove(r.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Suggestions de tarifs ────────────────────────────────────────── */}
      <div className="space-y-3 border-t border-border pt-6">
        <h3 className="text-sm font-semibold flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Suggestions de tarifs</h3>

        <div className="flex flex-wrap gap-3 items-end rounded-xl border border-border/60 bg-white p-4 shadow-sm">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Plan tarifaire</label>
            <select className="mt-1 block rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={planId} onChange={(e) => setPlanId(+e.target.value)}>
              <option value={0}>— Sélectionner —</option>
              {plans.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Du</label>
            <input type="date" className="mt-1 block rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Au</label>
            <input type="date" className="mt-1 block rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
          </div>
          <button onClick={handleCompute} disabled={!effectiveHotelId || !effectivePlanId || computing}
            className="rounded-lg bg-primary px-5 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 disabled:opacity-50">
            {computing ? 'Calcul…' : 'Calculer les suggestions'}
          </button>
        </div>

        {computeError && <p className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2"><AlertCircle className="h-3.5 w-3.5 shrink-0" />{computeError}</p>}

        {suggestions && (
          suggestions.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <Check className="h-8 w-8 text-emerald-400 mb-2" />
              <p className="text-sm text-muted-foreground">Aucun ajustement suggéré sur cette période — les tarifs actuels respectent déjà les règles.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border/60 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/30 bg-slate-50/40">
                <div className="flex items-center gap-3">
                  <button onClick={selectAll} className="text-xs font-medium text-primary hover:underline">Tout sélectionner</button>
                  <button onClick={clearAll} className="text-xs font-medium text-muted-foreground hover:underline">Aucun</button>
                  <span className="text-xs text-muted-foreground">{selected.size} / {suggestions.length} sélectionné(s)</span>
                </div>
                <button onClick={handleApply} disabled={selected.size === 0 || applying}
                  className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                  {applying ? 'Application…' : `Appliquer (${selected.size})`}
                </button>
              </div>
              {applyMsg && (
                <p className={cn('px-4 py-2 text-xs', applyMsg.startsWith('✓') ? 'text-emerald-600' : 'text-red-500')}>{applyMsg}</p>
              )}
              <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
                <table className="text-xs w-full border-collapse">
                  <thead className="sticky top-0 bg-slate-50/90 backdrop-blur-sm">
                    <tr>
                      <th className="w-8 px-3 py-2"></th>
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground border-b border-border/30">Date</th>
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground border-b border-border/30">Type de chambre</th>
                      <th className="px-3 py-2 text-right font-semibold text-muted-foreground border-b border-border/30">Occupation</th>
                      <th className="px-3 py-2 text-right font-semibold text-muted-foreground border-b border-border/30">Prix actuel</th>
                      <th className="px-3 py-2 text-right font-semibold text-muted-foreground border-b border-border/30">Prix suggéré</th>
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground border-b border-border/30">Règle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suggestions.map((s) => {
                      const key = suggestionKey(s);
                      const hausse = s.prixSuggere > s.prixActuel;
                      return (
                        <tr key={key} className={cn('border-b border-border/10 hover:bg-slate-50/50', selected.has(key) && 'bg-primary/[0.03]')}>
                          <td className="px-3 py-2">
                            <input type="checkbox" checked={selected.has(key)} onChange={() => toggleSelected(key)} className="rounded border-border" />
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">{s.dateApplication}</td>
                          <td className="px-3 py-2">{s.typeChambreLabel}</td>
                          <td className="px-3 py-2 text-right">{s.occupationPct.toFixed(0)}%</td>
                          <td className="px-3 py-2 text-right text-muted-foreground">{s.prixActuel.toLocaleString('fr-DZ')}</td>
                          <td className={cn('px-3 py-2 text-right font-semibold', hausse ? 'text-emerald-600' : 'text-red-500')}>
                            {s.prixSuggere.toLocaleString('fr-DZ')}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">{s.ruleNom}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
