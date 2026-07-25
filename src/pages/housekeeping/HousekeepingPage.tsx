import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BedDouble,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  Wind,
} from 'lucide-react';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { notify } from '@/lib/toast';
import { useHotelsList } from '@/hooks/useHotelsList';
import { cn } from '@/lib/utils';
import type {
  HousekeepingChecklistItem,
  HousekeepingStats,
  HousekeepingTache,
  StatutTacheHousekeeping,
  TypeTacheHousekeeping,
} from '@/shared/types/housekeeping';
import type { Chambre, StatutChambre } from '@/shared/types/hebergement';

const STATUT_TACHE_LABEL: Record<StatutTacheHousekeeping, string> = {
  a_faire: 'À faire',
  en_cours: 'En cours',
  controle: 'Contrôle',
  terminee: 'Terminée',
  annulee: 'Annulée',
};

const STATUT_TACHE_COLOR: Record<StatutTacheHousekeeping, string> = {
  a_faire: 'bg-amber-100 text-amber-800',
  en_cours: 'bg-blue-100 text-blue-800',
  controle: 'bg-purple-100 text-purple-800',
  terminee: 'bg-emerald-100 text-emerald-800',
  annulee: 'bg-gray-100 text-gray-600',
};

const CHAMBRE_STATUT: Record<StatutChambre, { label: string; bg: string }> = {
  libre: { label: 'Libre', bg: 'bg-emerald-50 border-emerald-200' },
  occupee: { label: 'Occupée', bg: 'bg-blue-50 border-blue-200' },
  menage: { label: 'Ménage', bg: 'bg-amber-50 border-amber-200' },
  hors_service: { label: 'HS', bg: 'bg-red-50 border-red-200' },
};

export default function HousekeepingPage() {
  const qc = useQueryClient();
  const { operationalHotels, defaultHotelId, loading: hotelsLoading } = useHotelsList();
  const [hotelId, setHotelId] = useState<number>(0);
  const [tab, setTab] = useState<'taches' | 'plan'>('taches');
  const [statutFilter, setStatutFilter] = useState<StatutTacheHousekeeping | ''>('');
  const [selectedTacheId, setSelectedTacheId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [syncDone, setSyncDone] = useState(false);
  const [form, setForm] = useState<{ chambreId: number; typeTache: TypeTacheHousekeeping; notes: string }>({
    chambreId: 0,
    typeTache: 'checkout',
    notes: '',
  });

  useEffect(() => {
    if (!hotelsLoading && defaultHotelId && hotelId === 0) {
      setHotelId(defaultHotelId);
    }
  }, [hotelsLoading, defaultHotelId, hotelId]);

  useEffect(() => {
    if (!hotelId || syncDone) return;
    void (async () => {
      try {
        const pending = unwrapIpc(await ipcClient.housekeeping.chambresMenageSansTache(hotelId)) as Array<{
          id: number;
          numero: string;
        }>;
        if (pending.length > 0) {
          unwrapIpc(await ipcClient.housekeeping.syncFromChambres(hotelId));
          void qc.invalidateQueries({ queryKey: ['housekeeping'] });
        }
      } catch {
        /* module ou migration non prête */
      } finally {
        setSyncDone(true);
      }
    })();
  }, [hotelId, syncDone, qc]);

  const { data: taches = [], isLoading, error: tachesError } = useQuery({
    queryKey: ['housekeeping-taches', hotelId, statutFilter],
    enabled: hotelId > 0,
    queryFn: async () =>
      unwrapIpc(
        await ipcClient.housekeeping.listTaches(hotelId, statutFilter || undefined),
      ) as HousekeepingTache[],
  });

  const { data: stats } = useQuery({
    queryKey: ['housekeeping-stats', hotelId],
    enabled: hotelId > 0,
    queryFn: async () => unwrapIpc(await ipcClient.housekeeping.stats(hotelId)) as HousekeepingStats,
  });

  const { data: chambres = [] } = useQuery({
    queryKey: ['housekeeping-chambres', hotelId],
    enabled: hotelId > 0,
    queryFn: async () => unwrapIpc(await ipcClient.hebergement.listChambres(hotelId)) as Chambre[],
  });

  const { data: pendingMenage = [] } = useQuery({
    queryKey: ['housekeeping-pending-menage', hotelId],
    enabled: hotelId > 0,
    queryFn: async () =>
      unwrapIpc(await ipcClient.housekeeping.chambresMenageSansTache(hotelId)) as Array<{
        id: number;
        numero: string;
        etage: number;
      }>,
  });

  const { data: checklist = [], isLoading: loadingChecklist } = useQuery({
    queryKey: ['housekeeping-checklist', selectedTacheId],
    enabled: selectedTacheId != null,
    queryFn: async () =>
      unwrapIpc(await ipcClient.housekeeping.listChecklistItems(selectedTacheId!)) as HousekeepingChecklistItem[],
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['housekeeping'] });
    void qc.invalidateQueries({ queryKey: ['housekeeping-chambres'] });
  };

  const createTache = useMutation({
    mutationFn: async () =>
      unwrapIpc(
        await ipcClient.housekeeping.createTache({
          hotelId,
          chambreId: form.chambreId,
          typeTache: form.typeTache,
          notes: form.notes || undefined,
        }),
      ),
    onSuccess: () => {
      invalidate();
      setShowForm(false);
      setForm({ chambreId: 0, typeTache: 'checkout', notes: '' });
      notify.success('Tâche créée');
    },
    onError: (e: Error) => notify.error(e.message),
  });

  const syncMenage = useMutation({
    mutationFn: async () => unwrapIpc(await ipcClient.housekeeping.syncFromChambres(hotelId)) as number,
    onSuccess: (n) => {
      invalidate();
      void qc.invalidateQueries({ queryKey: ['housekeeping-pending-menage'] });
      notify.success(n > 0 ? `${n} tâche(s) créée(s) depuis le plan chambres` : 'Toutes les chambres en ménage ont déjà une tâche');
    },
    onError: (e: Error) => notify.error(e.message),
  });

  const updateStatut = useMutation({
    mutationFn: async ({ id, statut }: { id: number; statut: StatutTacheHousekeeping }) =>
      unwrapIpc(await ipcClient.housekeeping.updateTache(id, { statut })),
    onSuccess: () => {
      invalidate();
      notify.success('Statut mis à jour');
    },
    onError: (e: Error) => notify.error(e.message),
  });

  const toggleChecklist = useMutation({
    mutationFn: async ({ itemId, statut }: { itemId: number; statut: 'ok' | 'pending' }) =>
      unwrapIpc(await ipcClient.housekeeping.updateChecklistItem(itemId, { statut })),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['housekeeping-checklist'] });
      void qc.invalidateQueries({ queryKey: ['housekeeping-taches'] });
    },
  });

  const nextStatut = (current: StatutTacheHousekeeping): StatutTacheHousekeeping | null => {
    if (current === 'a_faire') return 'en_cours';
    if (current === 'en_cours') return 'controle';
    if (current === 'controle') return 'terminee';
    return null;
  };

  const chambresMenage = chambres.filter((c) => c.statut === 'menage');
  const selectedTache = taches.find((t) => t.id === selectedTacheId) ?? null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Sparkles className="w-7 h-7 text-amber-600" />
          <div>
            <h1 className="text-2xl font-bold">Housekeeping</h1>
            <p className="text-sm text-muted-foreground">Plan chambres, tâches ménage et checklists qualité</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select
            value={hotelId || ''}
            onChange={(e) => {
              setSyncDone(false);
              setHotelId(Number(e.target.value));
            }}
            className="border rounded-lg px-3 py-2 text-sm bg-background"
          >
            {operationalHotels.length === 0 ? (
              <option value="">Aucun hôtel opérationnel</option>
            ) : (
              operationalHotels.map((h) => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))
            )}
          </select>
          <button
            type="button"
            onClick={() => syncMenage.mutate()}
            disabled={syncMenage.isPending}
            className="flex items-center gap-2 border rounded-lg px-3 py-2 text-sm hover:bg-muted"
          >
            <RefreshCw className={cn('w-4 h-4', syncMenage.isPending && 'animate-spin')} />
            Sync chambres ménage
          </button>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90"
          >
            <Plus className="w-4 h-4" /> Nouvelle tâche
          </button>
        </div>
      </div>

      {tachesError && (
        <p className="status-banner-error text-sm">
          Impossible de charger les tâches housekeeping. Relancez l&apos;application pour appliquer la migration 074.
        </p>
      )}

      {pendingMenage.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex flex-wrap items-center justify-between gap-2">
          <span>
            {pendingMenage.length} chambre(s) en ménage sans tâche ({pendingMenage.map((c) => c.numero).join(', ')})
          </span>
          <button
            type="button"
            onClick={() => syncMenage.mutate()}
            className="text-xs font-medium underline hover:no-underline"
          >
            Créer les tâches maintenant
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'À faire', value: stats?.aFaire ?? '—', color: 'text-amber-600' },
          { label: 'En cours', value: stats?.enCours ?? '—', color: 'text-blue-600' },
          { label: 'Contrôle', value: stats?.controle ?? '—', color: 'text-purple-600' },
          { label: 'Terminées (jour)', value: stats?.termineesJour ?? '—', color: 'text-emerald-600' },
          { label: 'Chambres ménage', value: stats?.chambresMenage ?? '—', color: 'text-foreground' },
        ].map((k) => (
          <div key={k.label} className="bg-card border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 border-b">
        {[
          { id: 'taches' as const, label: 'Tâches' },
          { id: 'plan' as const, label: 'Plan chambres' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px',
              tab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'plan' ? (
        chambres.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground bg-card border rounded-xl">
            <BedDouble className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>Aucune chambre configurée pour cet hôtel</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {chambres.map((c) => {
              const cfg = CHAMBRE_STATUT[c.statut];
              return (
                <div key={c.id} className={cn('rounded-xl border p-3', cfg.bg)}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{c.numero}</span>
                    {c.statut === 'menage' ? <Wind className="w-4 h-4 text-amber-600" /> : <BedDouble className="w-4 h-4 opacity-50" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Étage {c.etage}</p>
                  <p className="text-xs font-medium mt-2">{cfg.label}</p>
                  {c.statut === 'menage' && (
                    <button
                      type="button"
                      className="mt-2 text-[10px] underline"
                      onClick={() => {
                        setForm({ chambreId: c.id, typeTache: 'checkout', notes: '' });
                        setShowForm(true);
                      }}
                    >
                      Créer tâche
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div className="grid lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3 space-y-3">
            <div className="flex gap-1 flex-wrap">
              {[
                { value: '' as const, label: 'Toutes' },
                { value: 'a_faire' as const, label: 'À faire' },
                { value: 'en_cours' as const, label: 'En cours' },
                { value: 'controle' as const, label: 'Contrôle' },
                { value: 'terminee' as const, label: 'Terminées' },
              ].map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => setStatutFilter(s.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm font-medium',
                    statutFilter === s.value ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80',
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground py-8">
                <Loader2 className="w-4 h-4 animate-spin" /> Chargement…
              </div>
            ) : taches.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground bg-card border rounded-xl">
                <ClipboardCheck className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>Aucune tâche housekeeping</p>
                {chambresMenage.length > 0 && (
                  <button type="button" className="mt-3 text-sm text-primary underline" onClick={() => syncMenage.mutate()}>
                    Synchroniser {chambresMenage.length} chambre(s) en ménage
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {taches.map((t) => (
                  <div
                    key={t.id}
                    className={cn(
                      'bg-card border rounded-xl p-4 cursor-pointer transition-colors',
                      selectedTacheId === t.id && 'ring-2 ring-primary/40',
                    )}
                    onClick={() => setSelectedTacheId(t.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">Ch. {t.chambreNumero}</span>
                          <span className="text-xs text-muted-foreground">Étage {t.chambreEtage}</span>
                          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUT_TACHE_COLOR[t.statut])}>
                            {STATUT_TACHE_LABEL[t.statut]}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 capitalize">{t.typeTache.replace('_', ' ')}</p>
                        <p className="text-xs mt-1">
                          Checklist : {t.checklistProgress.ok}/{t.checklistProgress.total}
                          {t.assigneeNom ? ` · ${t.assigneeNom}` : ''}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        {nextStatut(t.statut) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateStatut.mutate({ id: t.id, statut: nextStatut(t.statut)! });
                            }}
                            className="text-xs bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-lg hover:bg-primary/20"
                          >
                            → {STATUT_TACHE_LABEL[nextStatut(t.statut)!]}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-2 bg-card border rounded-xl p-4 min-h-[280px]">
            {!selectedTache ? (
              <p className="text-sm text-muted-foreground text-center py-12">Sélectionnez une tâche pour voir la checklist</p>
            ) : loadingChecklist ? (
              <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold">Checklist — Ch. {selectedTache.chambreNumero}</h3>
                  <p className="text-xs text-muted-foreground">{STATUT_TACHE_LABEL[selectedTache.statut]}</p>
                </div>
                <ul className="space-y-2">
                  {checklist.map((item) => (
                    <li key={item.id} className="flex items-start gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          toggleChecklist.mutate({
                            itemId: item.id,
                            statut: item.statut === 'ok' ? 'pending' : 'ok',
                          })
                        }
                        className={cn(
                          'mt-0.5 rounded-full p-0.5',
                          item.statut === 'ok' ? 'text-emerald-600' : 'text-muted-foreground',
                        )}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <span className={cn('text-sm', item.statut === 'ok' && 'line-through text-muted-foreground')}>
                        {item.libelle}
                      </span>
                    </li>
                  ))}
                </ul>
                {selectedTache.statut === 'controle' && checklist.every((i) => i.statut === 'ok') && (
                  <button
                    type="button"
                    onClick={() => updateStatut.mutate({ id: selectedTache.id, statut: 'terminee' })}
                    className="w-full mt-2 bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700"
                  >
                    Valider ménage — chambre libre
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold">Nouvelle tâche ménage</h2>
            <select
              value={form.chambreId || ''}
              onChange={(e) => setForm((f) => ({ ...f, chambreId: Number(e.target.value) }))}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
            >
              <option value="">Chambre *</option>
              {chambres.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.numero} — {CHAMBRE_STATUT[c.statut].label}
                </option>
              ))}
            </select>
            <select
              value={form.typeTache}
              onChange={(e) => setForm((f) => ({ ...f, typeTache: e.target.value as TypeTacheHousekeeping }))}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
            >
              <option value="checkout">Checkout (départ)</option>
              <option value="recouche">Recouche</option>
              <option value="grand_menage">Grand ménage</option>
              <option value="controle">Contrôle qualité</option>
            </select>
            <textarea
              placeholder="Notes (optionnel)"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-background resize-none"
            />
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm border hover:bg-muted">
                Annuler
              </button>
              <button
                type="button"
                onClick={() => createTache.mutate()}
                disabled={!form.chambreId || createTache.isPending}
                className="px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground disabled:opacity-50"
              >
                Créer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
