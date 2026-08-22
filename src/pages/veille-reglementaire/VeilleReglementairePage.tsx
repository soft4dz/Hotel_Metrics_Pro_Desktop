import { useMemo, useState } from 'react';
import { Plus, Trash2, Pencil, Paperclip, ExternalLink, Link2, AlertCircle, ScrollText, X } from 'lucide-react';
import { useVeilleReglementaire } from '@/hooks/useVeilleReglementaire';
import { useHotelsList } from '@/hooks/useHotelsList';
import { cn } from '@/lib/utils';
import type {
  TexteReglementaire, CreateTexteReglementaireInput,
  TypeTexteReglementaire, CategorieVeille, StatutConformite,
} from '@/shared/types/veilleReglementaire';

const TYPE_LABELS: Record<TypeTexteReglementaire, string> = {
  loi: 'Loi', decret: 'Décret', arrete: 'Arrêté', circulaire: 'Circulaire', norme: 'Norme', autre: 'Autre',
};

const CATEGORIE_LABELS: Record<CategorieVeille, string> = {
  marches_publics: 'Marchés publics', fiscal: 'Fiscal', travail: 'Travail', tourisme: 'Tourisme',
  securite: 'Sécurité', environnement: 'Environnement', sante: 'Santé', urbanisme: 'Urbanisme', autre: 'Autre',
};

const STATUT_LABELS: Record<StatutConformite, string> = {
  a_evaluer: 'À évaluer', en_cours: 'En cours', conforme: 'Conforme', non_applicable: 'Non applicable',
};

const STATUT_COLORS: Record<StatutConformite, string> = {
  a_evaluer: 'bg-amber-50 text-amber-700', en_cours: 'bg-blue-50 text-blue-700',
  conforme: 'bg-emerald-50 text-emerald-700', non_applicable: 'bg-slate-100 text-slate-500',
};

function today() { return new Date().toISOString().slice(0, 10); }
function daysUntil(date: string): number { return Math.round((new Date(date).getTime() - new Date(today()).getTime()) / 86_400_000); }

const emptyForm: CreateTexteReglementaireInput = {
  titre: '', typeTexte: 'decret', categorie: 'autre', statutConformite: 'a_evaluer',
};

export function VeilleReglementairePage() {
  const { operationalHotels } = useHotelsList();
  const [hotelFilter, setHotelFilter] = useState<number>(0);
  const [categorieFilter, setCategorieFilter] = useState<string>('');
  const [statutFilter, setStatutFilter] = useState<string>('');
  const [search, setSearch] = useState('');

  const filters = useMemo(() => ({
    hotelId: hotelFilter || undefined,
    categorie: categorieFilter || undefined,
    statutConformite: statutFilter || undefined,
    search: search || undefined,
  }), [hotelFilter, categorieFilter, statutFilter, search]);

  const { data: textes, loading, create, update, remove, attachDocument, ouvrirDocument } = useVeilleReglementaire(filters);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CreateTexteReglementaireInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof CreateTexteReglementaireInput, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const startCreate = () => { setEditingId(null); setForm(emptyForm); setShowForm(true); };
  const startEdit = (t: TexteReglementaire) => {
    setEditingId(t.id);
    setForm({
      hotelId: t.hotelId ?? undefined, reference: t.reference ?? undefined, titre: t.titre,
      typeTexte: t.typeTexte, categorie: t.categorie,
      datePublication: t.datePublication ?? undefined, dateEntreeVigueur: t.dateEntreeVigueur ?? undefined,
      dateRevue: t.dateRevue ?? undefined, resume: t.resume ?? undefined,
      statutConformite: t.statutConformite, responsable: t.responsable ?? undefined,
      urlSource: t.urlSource ?? undefined,
    });
    setShowForm(true);
  };

  const submit = async () => {
    if (!form.titre.trim()) { setError('Le titre est obligatoire.'); return; }
    setSaving(true); setError(null);
    try {
      if (editingId) await update(editingId, form);
      else await create(form);
      setShowForm(false); setEditingId(null); setForm(emptyForm);
    } catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ScrollText className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-lg font-semibold">Veille juridique et réglementaire</h1>
            <p className="text-xs text-muted-foreground">{textes.length} texte{textes.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button onClick={startCreate}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Nouveau texte
        </button>
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-border/60 bg-white p-3 shadow-sm">
        <select className="rounded-lg border border-border px-3 py-1.5 text-sm" value={hotelFilter} onChange={(e) => setHotelFilter(+e.target.value)}>
          <option value={0}>Toutes les unités</option>
          {operationalHotels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
        <select className="rounded-lg border border-border px-3 py-1.5 text-sm" value={categorieFilter} onChange={(e) => setCategorieFilter(e.target.value)}>
          <option value="">Toutes catégories</option>
          {Object.entries(CATEGORIE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="rounded-lg border border-border px-3 py-1.5 text-sm" value={statutFilter} onChange={(e) => setStatutFilter(e.target.value)}>
          <option value="">Tous statuts</option>
          {Object.entries(STATUT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input className="flex-1 min-w-[180px] rounded-lg border border-border px-3 py-1.5 text-sm" placeholder="Rechercher un titre, une référence…"
          value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {showForm && (
        <div className="rounded-xl border border-primary/30 bg-primary/[0.03] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">{editingId ? 'Modifier le texte' : 'Nouveau texte réglementaire'}</h3>
            <button onClick={() => setShowForm(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/60"><X className="h-4 w-4" /></button>
          </div>
          {error && <p className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2"><AlertCircle className="h-3.5 w-3.5 shrink-0" />{error}</p>}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="text-xs font-medium text-muted-foreground">Titre *</label>
              <input className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" placeholder="ex: Décret exécutif relatif aux marchés publics"
                value={form.titre} onChange={(e) => set('titre', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Référence</label>
              <input className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" placeholder="ex: Décret 15-247"
                value={form.reference ?? ''} onChange={(e) => set('reference', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Type</label>
              <select className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" value={form.typeTexte} onChange={(e) => set('typeTexte', e.target.value)}>
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Catégorie</label>
              <select className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" value={form.categorie} onChange={(e) => set('categorie', e.target.value)}>
                {Object.entries(CATEGORIE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Unité concernée</label>
              <select className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
                value={form.hotelId ?? 0} onChange={(e) => set('hotelId', e.target.value ? +e.target.value : null)}>
                <option value={0}>Toutes les unités</option>
                {operationalHotels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Statut de conformité</label>
              <select className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" value={form.statutConformite} onChange={(e) => set('statutConformite', e.target.value)}>
                {Object.entries(STATUT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Date de publication</label>
              <input type="date" className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" value={form.datePublication ?? ''} onChange={(e) => set('datePublication', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Entrée en vigueur</label>
              <input type="date" className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" value={form.dateEntreeVigueur ?? ''} onChange={(e) => set('dateEntreeVigueur', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Échéance de revue</label>
              <input type="date" className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" value={form.dateRevue ?? ''} onChange={(e) => set('dateRevue', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Responsable</label>
              <input className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" value={form.responsable ?? ''} onChange={(e) => set('responsable', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Lien source (JORADP, etc.)</label>
              <input type="url" className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" placeholder="https://www.joradp.dz/…"
                value={form.urlSource ?? ''} onChange={(e) => set('urlSource', e.target.value)} />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="text-xs font-medium text-muted-foreground">Résumé</label>
              <textarea rows={3} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" placeholder="Points clés, obligations, impact pour l'établissement…"
                value={form.resume ?? ''} onChange={(e) => set('resume', e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button onClick={() => setShowForm(false)} className="rounded-xl border border-border px-5 py-2 text-sm font-medium hover:bg-slate-50">Annuler</button>
            <button onClick={submit} disabled={saving} className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50">
              {saving ? 'Enregistrement…' : editingId ? 'Enregistrer' : 'Ajouter le texte'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="h-32 rounded-xl border border-border/40 bg-slate-50 animate-pulse" />
      ) : textes.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <ScrollText className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Aucun texte réglementaire enregistré</p>
        </div>
      ) : (
        <div className="space-y-2">
          {textes.map((t) => {
            const revueDays = t.dateRevue ? daysUntil(t.dateRevue) : null;
            const revueAlerte = revueDays != null && revueDays <= 30;
            return (
              <div key={t.id} className="rounded-xl border border-border/60 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{t.titre}</p>
                      <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', STATUT_COLORS[t.statutConformite])}>{STATUT_LABELS[t.statutConformite]}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">{TYPE_LABELS[t.typeTexte]}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">{CATEGORIE_LABELS[t.categorie]}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t.reference && <span className="font-medium">{t.reference}</span>}
                      {t.reference && ' · '}
                      {t.hotelName ?? 'Toutes les unités'}
                      {t.datePublication && ` · publié le ${t.datePublication}`}
                      {t.dateRevue && (
                        <span className={cn(revueAlerte && 'font-semibold', revueDays! < 0 ? 'text-red-600' : revueAlerte ? 'text-amber-600' : '')}>
                          {' · revue le '}{t.dateRevue}{revueDays! < 0 ? ' (dépassée)' : revueAlerte ? ` (J-${revueDays})` : ''}
                        </span>
                      )}
                      {t.responsable && ` · resp. ${t.responsable}`}
                    </p>
                    {t.resume && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{t.resume}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {t.urlSource && (
                      <a href={t.urlSource} target="_blank" rel="noopener noreferrer" title={t.urlSource}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-primary">
                        <Link2 className="h-4 w-4" />
                      </a>
                    )}
                    {t.nomFichier ? (
                      <button onClick={() => void ouvrirDocument(t.id)} title={t.nomFichier} className="rounded-lg p-1.5 text-primary hover:bg-primary/5">
                        <ExternalLink className="h-4 w-4" />
                      </button>
                    ) : (
                      <button onClick={() => void attachDocument(t.id)} title="Joindre le document" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-primary">
                        <Paperclip className="h-4 w-4" />
                      </button>
                    )}
                    <button onClick={() => startEdit(t)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-primary"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => remove(t.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
