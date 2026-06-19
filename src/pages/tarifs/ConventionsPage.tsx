import { useState } from 'react';
import {
  Plus, Trash2, ToggleLeft, ToggleRight, ChevronDown, ChevronUp,
  FileText, AlertCircle,
} from 'lucide-react';
import { useConventions } from '@/hooks/useTarifs';
import { useTypesChambre } from '@/hooks/useHebergement';
import { useHotelsList } from '@/hooks/useHotelsList';
import { useClients } from '@/hooks/useClients';
import { cn } from '@/lib/utils';
import type { CreateConventionInput, TypeReductionConvention } from '@/shared/types/tarifs';
import type { ClientItem } from '@/shared/types/clients';

function clientLabel(c: ClientItem) {
  if (c.type === 'entreprise') return c.raisonSociale || c.nom;
  return [c.nom, c.prenom].filter(Boolean).join(' ');
}

function today() { return new Date().toISOString().slice(0, 10); }
function in1y() { const d = new Date(); d.setFullYear(d.getFullYear() + 1); return d.toISOString().slice(0, 10); }

interface TarifLigneForm {
  typeChambreId: number;
  formuleId?: number;
  typeReduction: TypeReductionConvention;
  valeur: number;
}

export function ConventionsPage() {
  const { hotels } = useHotelsList();
  const { items: clients } = useClients({ actif: true });
  const { data, loading, create, toggle, remove } = useConventions();
  const { data: allTypes } = useTypesChambre();
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<CreateConventionInput>>({
    hotelId: hotels[0]?.id,
    dateDebut: today(), dateFin: in1y(), priorite: 1, tarifs: [],
  });
  const [lignes, setLignes] = useState<TarifLigneForm[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof CreateConventionInput, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const addLigne = () => setLignes((l) => [
    ...l, { typeChambreId: allTypes[0]?.id ?? 0, typeReduction: 'POURCENTAGE', valeur: 10 },
  ]);

  const updateLigne = (i: number, patch: Partial<TarifLigneForm>) =>
    setLignes((l) => l.map((x, idx) => idx === i ? { ...x, ...patch } : x));

  const removeLigne = (i: number) => setLignes((l) => l.filter((_, idx) => idx !== i));

  const submit = async () => {
    if (!form.nom || !form.clientId || !form.hotelId) {
      setError('Nom, hôtel et client sont obligatoires.'); return;
    }
    if (!lignes.length) { setError('Ajoutez au moins une ligne tarifaire.'); return; }
    setSaving(true); setError(null);
    try {
      await create({ ...form, tarifs: lignes } as CreateConventionInput);
      setShowForm(false);
      setForm({ dateDebut: today(), dateFin: in1y(), priorite: 1, tarifs: [] });
      setLignes([]);
    } catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  };

  const actives = data.filter((c) => c.estActive);
  const inactives = data.filter((c) => !c.estActive);

  return (
    <div className="space-y-5">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">
          {actives.length} convention{actives.length !== 1 ? 's' : ''} active{actives.length !== 1 ? 's' : ''}
          <span className="ml-2 text-xs text-muted-foreground/70">
            (les tarifs conventionnés remplacent le tarif public — aucune promo ne s'applique)
          </span>
        </p>
        <button onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Nouvelle convention
        </button>
      </div>

      {/* Formulaire */}
      {showForm && (
        <div className="rounded-xl border border-primary/30 bg-primary/[0.03] p-5 space-y-4">
          <h3 className="text-sm font-semibold">Nouvelle convention client</h3>
          {error && (
            <p className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />{error}
            </p>
          )}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Nom de la convention *</label>
              <input className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="ex: Convention Société X 2025" value={form.nom ?? ''} onChange={(e) => set('nom', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Client *</label>
              <select
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={form.clientId ?? ''}
                onChange={(e) => set('clientId', Number(e.target.value))}
              >
                <option value="">— Sélectionner —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{clientLabel(c)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Hôtel *</label>
              <select
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={form.hotelId ?? ''}
                onChange={(e) => set('hotelId', Number(e.target.value))}
              >
                <option value="">— Sélectionner —</option>
                {hotels.map((h) => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
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
              <label className="text-xs font-medium text-muted-foreground">Priorité</label>
              <input type="number" min={1} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={form.priorite ?? 1} onChange={(e) => set('priorite', +e.target.value)} />
            </div>
            <div className="col-span-2 sm:col-span-3">
              <label className="text-xs font-medium text-muted-foreground">Description</label>
              <input className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Notes sur la convention…" value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} />
            </div>
          </div>

          {/* Lignes tarifaires */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground">Lignes tarifaires *</label>
              <button type="button" onClick={addLigne}
                className="flex items-center gap-1 text-xs text-primary hover:underline">
                <Plus className="h-3.5 w-3.5" /> Ajouter une ligne
              </button>
            </div>
            {lignes.length === 0 && (
              <p className="text-xs text-muted-foreground italic">Aucune ligne — cliquez « Ajouter une ligne »</p>
            )}
            {lignes.map((l, i) => (
              <div key={i} className="grid grid-cols-4 gap-2 items-end rounded-lg border border-border/50 bg-white px-3 py-2">
                <div>
                  <label className="text-[11px] text-muted-foreground">Type chambre</label>
                  <select className="mt-0.5 w-full rounded border border-border px-2 py-1 text-xs"
                    value={l.typeChambreId} onChange={(e) => updateLigne(i, { typeChambreId: +e.target.value })}>
                    {allTypes.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground">Type réduction</label>
                  <select className="mt-0.5 w-full rounded border border-border px-2 py-1 text-xs"
                    value={l.typeReduction} onChange={(e) => updateLigne(i, { typeReduction: e.target.value as TypeReductionConvention })}>
                    <option value="POURCENTAGE">% réduction</option>
                    <option value="FIXE_PRIX">Prix fixe (DA)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground">
                    {l.typeReduction === 'FIXE_PRIX' ? 'Prix (DA)' : 'Réduction (%)'}
                  </label>
                  <input type="number" min={0} className="mt-0.5 w-full rounded border border-border px-2 py-1 text-xs"
                    value={l.valeur} onChange={(e) => updateLigne(i, { valeur: +e.target.value })} />
                </div>
                <div className="flex justify-end">
                  <button type="button" onClick={() => removeLigne(i)}
                    className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button onClick={() => setShowForm(false)} className="rounded-xl border border-border px-5 py-2 text-sm font-medium hover:bg-slate-50">Annuler</button>
            <button onClick={submit} disabled={saving}
              className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50">
              {saving ? 'Enregistrement…' : 'Créer la convention'}
            </button>
          </div>
        </div>
      )}

      {/* Liste */}
      {loading ? (
        <div className="h-32 rounded-xl border border-border/40 bg-slate-50 animate-pulse" />
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <FileText className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Aucune convention configurée</p>
        </div>
      ) : (
        <div className="space-y-2">
          {[...actives, ...inactives].map((c) => (
            <div key={c.id} className={cn(
              'rounded-xl border transition-opacity',
              c.estActive ? 'border-indigo-200 bg-indigo-50/20' : 'border-border/40 bg-slate-50/40 opacity-60',
            )}>
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{c.nom}</p>
                    <span className={cn(
                      'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                      c.estActive ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500',
                    )}>
                      {c.estActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Client: <strong>{c.clientNom}</strong> · {c.hotelName} · {c.dateDebut} → {c.dateFin}
                    {' · '}{c.tarifs.length} ligne{c.tarifs.length !== 1 ? 's' : ''} tarifaire{c.tarifs.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                    className="rounded-lg p-1.5 hover:bg-white/60 transition-colors">
                    {expanded === c.id
                      ? <ChevronUp className="h-4 w-4 text-slate-500" />
                      : <ChevronDown className="h-4 w-4 text-slate-500" />}
                  </button>
                  <button onClick={() => toggle(c.id, !c.estActive)}
                    className="rounded-lg p-1.5 hover:bg-white/60 transition-colors">
                    {c.estActive
                      ? <ToggleRight className="h-5 w-5 text-indigo-600" />
                      : <ToggleLeft className="h-5 w-5 text-slate-400" />}
                  </button>
                  <button onClick={() => remove(c.id).catch((e) => setError((e as Error).message))}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Lignes détail */}
              {expanded === c.id && c.tarifs.length > 0 && (
                <div className="border-t border-border/30 mx-4 mb-3">
                  <table className="w-full text-xs mt-2">
                    <thead>
                      <tr className="text-muted-foreground">
                        <th className="text-left font-medium py-1 pr-4">Type chambre</th>
                        <th className="text-left font-medium py-1 pr-4">Formule</th>
                        <th className="text-left font-medium py-1 pr-4">Type réduction</th>
                        <th className="text-right font-medium py-1">Valeur</th>
                      </tr>
                    </thead>
                    <tbody>
                      {c.tarifs.map((t) => (
                        <tr key={t.id} className="border-t border-border/20">
                          <td className="py-1.5 pr-4 font-medium">{t.typeChambreLabel}</td>
                          <td className="py-1.5 pr-4 text-muted-foreground">{t.formuleLabel ?? 'Hébergement seul'}</td>
                          <td className="py-1.5 pr-4">
                            {t.typeReduction === 'FIXE_PRIX' ? 'Prix fixe' : 'Réduction %'}
                          </td>
                          <td className="py-1.5 text-right font-semibold text-primary">
                            {t.typeReduction === 'FIXE_PRIX'
                              ? `${t.valeur.toLocaleString('fr-DZ')} DA`
                              : `-${t.valeur}%`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
