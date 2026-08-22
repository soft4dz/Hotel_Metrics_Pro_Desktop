import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Gavel, AlertCircle } from 'lucide-react';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { useAppelsOffres } from '@/hooks/useAppelsOffres';
import { useHotelsList } from '@/hooks/useHotelsList';
import { cn } from '@/lib/utils';
import type { AppelOffres, CreateAppelOffresInput, RegimeAppelOffres } from '@/shared/types/appelsOffres';
import type { DemandeAchat } from '@/shared/types/achats';

const STATUT_LABELS: Record<AppelOffres['statut'], string> = {
  brouillon: 'Brouillon', publie: 'Publié', ouvert: 'Ouvert', evaluation: 'Évaluation',
  attribue: 'Attribué', annule: 'Annulé',
};

const STATUT_COLORS: Record<AppelOffres['statut'], string> = {
  brouillon: 'bg-slate-100 text-slate-600', publie: 'bg-blue-50 text-blue-700',
  ouvert: 'bg-amber-50 text-amber-700', evaluation: 'bg-amber-50 text-amber-700',
  attribue: 'bg-emerald-50 text-emerald-700', annule: 'bg-red-50 text-red-500',
};

const REGIME_LABELS: Record<RegimeAppelOffres, string> = {
  consultation_restreinte: 'Consultation restreinte', appel_offres: 'Appel d’offres réglementé',
};

export function AppelsOffresPage() {
  const { operationalHotels, defaultHotelId } = useHotelsList();
  const [hotelId, setHotelId] = useState(0);
  const effectiveHotelId = hotelId || defaultHotelId || 0;

  const { data: dossiers, loading, create } = useAppelsOffres(effectiveHotelId || undefined);

  const { data: demandes = [] } = useQuery({
    queryKey: ['achats-demandes-approuvees', effectiveHotelId],
    queryFn: async () => unwrapIpc(await ipcClient.achats.listDemandes(effectiveHotelId)) as DemandeAchat[],
    enabled: Boolean(effectiveHotelId),
  });
  const demandesApprouvees = useMemo(() => demandes.filter((d) => d.statut === 'approuvee'), [demandes]);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<{ objet: string; regime: RegimeAppelOffres; demandeIds: number[] }>({
    objet: '', regime: 'consultation_restreinte', demandeIds: [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!effectiveHotelId || !form.objet.trim() || !form.demandeIds.length) {
      setError('Objet et au moins une demande d’achat approuvée sont obligatoires.');
      return;
    }
    setSaving(true); setError(null);
    try {
      const input: CreateAppelOffresInput = { hotelId: effectiveHotelId, objet: form.objet.trim(), regime: form.regime, demandeIds: form.demandeIds };
      await create(input);
      setShowForm(false);
      setForm({ objet: '', regime: 'consultation_restreinte', demandeIds: [] });
    } catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Gavel className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-lg font-semibold">Appels d’offres et consultations</h1>
            <p className="text-xs text-muted-foreground">{dossiers.length} dossier{dossiers.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select className="rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={hotelId} onChange={(e) => setHotelId(+e.target.value)}>
            <option value={0}>— Sélectionner une unité —</option>
            {operationalHotels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
          <button onClick={() => setShowForm((v) => !v)} disabled={!effectiveHotelId}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50">
            <Plus className="h-4 w-4" /> Nouveau dossier
          </button>
        </div>
      </div>

      {showForm && (
        <div className="rounded-xl border border-primary/30 bg-primary/[0.03] p-5 space-y-4">
          <h3 className="text-sm font-semibold">Nouveau dossier</h3>
          {error && <p className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2"><AlertCircle className="h-3.5 w-3.5 shrink-0" />{error}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Objet *</label>
              <input className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="ex: Rénovation restaurant principal" value={form.objet} onChange={(e) => setForm({ ...form, objet: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Régime</label>
              <select className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={form.regime} onChange={(e) => setForm({ ...form, regime: e.target.value as RegimeAppelOffres })}>
                <option value="consultation_restreinte">Consultation restreinte</option>
                <option value="appel_offres">Appel d’offres réglementé</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Demandes d’achat approuvées *</label>
              {demandesApprouvees.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Aucune demande d’achat approuvée pour cette unité.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {demandesApprouvees.map((d) => {
                    const sel = form.demandeIds.includes(d.id);
                    return (
                      <label key={d.id} className={cn(
                        'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs cursor-pointer',
                        sel ? 'border-primary bg-primary/5' : 'border-border',
                      )}>
                        <input type="checkbox" checked={sel} onChange={(e) => setForm({
                          ...form,
                          demandeIds: e.target.checked ? [...form.demandeIds, d.id] : form.demandeIds.filter((id) => id !== d.id),
                        })} className="rounded border-border" />
                        {d.numero} — {d.objet}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button onClick={() => setShowForm(false)} className="rounded-xl border border-border px-5 py-2 text-sm font-medium hover:bg-slate-50">Annuler</button>
            <button onClick={submit} disabled={saving}
              className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50">
              {saving ? 'Création…' : 'Créer le dossier'}
            </button>
          </div>
        </div>
      )}

      {!effectiveHotelId ? (
        <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-border py-16">
          <p className="text-sm text-muted-foreground">Sélectionnez une unité pour voir ses dossiers</p>
        </div>
      ) : loading ? (
        <div className="h-32 rounded-xl border border-border/40 bg-slate-50 animate-pulse" />
      ) : dossiers.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <Gavel className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Aucun dossier d’appel d’offres</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {dossiers.map((d) => (
            <Link key={d.id} to={`/appels-offres/${d.id}`}
              className="rounded-xl border border-border/60 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold">{d.numero}</p>
                <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0', STATUT_COLORS[d.statut])}>
                  {STATUT_LABELS[d.statut]}
                </span>
              </div>
              <p className="text-sm mt-1 line-clamp-2">{d.objet}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{REGIME_LABELS[d.regime]}</p>
              <p className="text-xs text-muted-foreground mt-2">
                {d.lotsCount} lot{d.lotsCount !== 1 ? 's' : ''} · {d.fournisseursCount} invité{d.fournisseursCount !== 1 ? 's' : ''} · {d.offresCount} offre{d.offresCount !== 1 ? 's' : ''}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
