import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, BedDouble, Calendar, User, MoreHorizontal, CheckCircle, XCircle, LogIn, LogOut, FileText } from 'lucide-react';
import { useReservations } from '@/hooks/useHebergement';
import { useChambres } from '@/hooks/useHebergement';
import { usePlans, useFormules } from '@/hooks/useTarifs';
import { useHotelsList } from '@/hooks/useHotelsList';
import { ipcClient } from '@/lib/ipcClient';
import { cn } from '@/lib/utils';
import type { ClientFacturation } from '@/shared/types/facturation';
import type { Reservation, StatutReservation, CreateReservationInput } from '@/shared/types/hebergement';

const STATUT_COLORS: Record<StatutReservation, string> = {
  provisoire:  'bg-slate-100 text-slate-600',
  confirmee:   'bg-blue-50 text-blue-700',
  arrivee:     'bg-emerald-50 text-emerald-700',
  depart:      'bg-violet-50 text-violet-700',
  annulee:     'bg-red-50 text-red-500',
  no_show:     'bg-orange-50 text-orange-600',
};

const STATUT_LABELS: Record<StatutReservation, string> = {
  provisoire: 'Provisoire', confirmee: 'Confirmée', arrivee: 'Arrivée',
  depart: 'Départ', annulee: 'Annulée', no_show: 'No show',
};

function today() { return new Date().toISOString().slice(0, 10); }
function in30() {
  const d = new Date(); d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

function ReservationRow({
  r,
  onAction,
  onCreateFacture,
}: {
  r: Reservation;
  onAction: (id: number, s: StatutReservation) => void;
  onCreateFacture: (id: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const actions: { label: string; statut: StatutReservation; icon: React.ElementType }[] = (
    [
      { label: 'Check-in',    statut: 'arrivee'   as StatutReservation, icon: LogIn },
      { label: 'Check-out',   statut: 'depart'    as StatutReservation, icon: LogOut },
      { label: 'Confirmer',   statut: 'confirmee' as StatutReservation, icon: CheckCircle },
      { label: 'Annuler',     statut: 'annulee'   as StatutReservation, icon: XCircle },
      { label: 'No show',     statut: 'no_show'   as StatutReservation, icon: XCircle },
    ] as { label: string; statut: StatutReservation; icon: React.ElementType }[]
  ).filter((a) => a.statut !== r.statut);

  return (
    <tr className="border-b border-border/20 hover:bg-slate-50/40 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <User className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">{r.clientNom} {r.clientPrenom ?? ''}</p>
            {r.clientEmail && <p className="text-xs text-muted-foreground">{r.clientEmail}</p>}
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        {r.chambreNumero ? (
          <div className="flex items-center gap-1.5">
            <BedDouble className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm font-medium">Ch. {r.chambreNumero}</span>
            {r.typeChambreLabel && <span className="text-xs text-muted-foreground">({r.typeChambreLabel})</span>}
          </div>
        ) : <span className="text-xs text-muted-foreground">—</span>}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 text-sm">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{r.dateArrivee}</span>
          <span className="text-muted-foreground">→</span>
          <span>{r.dateDepart}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{r.nbNuits} nuit{r.nbNuits > 1 ? 's' : ''} · {r.nbAdultes} adulte{r.nbAdultes > 1 ? 's' : ''}</p>
      </td>
      <td className="px-4 py-3">
        <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', STATUT_COLORS[r.statut])}>
          {STATUT_LABELS[r.statut]}
        </span>
      </td>
      <td className="px-4 py-3 text-sm font-medium">
        {r.montantTotal.toLocaleString('fr-DZ')} DA
        {r.factureId && <p className="text-xs text-muted-foreground font-normal">Facture #{r.factureId}</p>}
      </td>
      <td className="px-4 py-3 relative">
        <div className="flex items-center justify-end gap-1">
          {!r.factureId && r.statut !== 'annulee' && r.statut !== 'no_show' && (
            <button
              title="Générer facture"
              onClick={() => onCreateFacture(r.id)}
              className="rounded-lg p-1.5 hover:bg-emerald-50 text-emerald-700 transition-colors"
            >
              <FileText className="h-4 w-4" />
            </button>
          )}
          <button onClick={() => setOpen(!open)}
            className="rounded-lg p-1.5 hover:bg-slate-100 transition-colors">
            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        {open && (
          <div className="absolute right-4 top-10 z-20 min-w-[160px] rounded-xl border border-border bg-white shadow-lg py-1">
            {actions.map((a) => (
              <button key={a.statut}
                onClick={() => { onAction(r.id, a.statut); setOpen(false); }}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-slate-50 transition-colors">
                <a.icon className="h-3.5 w-3.5 text-muted-foreground" />
                {a.label}
              </button>
            ))}
          </div>
        )}
      </td>
    </tr>
  );
}

function NewReservationModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (input: CreateReservationInput) => Promise<unknown>;
}) {
  const { hotels, defaultHotelId } = useHotelsList();
  const [form, setForm] = useState<Partial<CreateReservationInput>>({
    hotelId: defaultHotelId,
    dateArrivee: today(), dateDepart: in30(),
    nbAdultes: 1, nbEnfants: 0,
    statut: 'confirmee', source: 'direct',
  });
  const [clients, setClients] = useState<ClientFacturation[]>([]);
  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hotelId = form.hotelId;
  const { data: chambres } = useChambres(hotelId);
  const { data: plans } = usePlans(hotelId);
  const { data: formules } = useFormules(hotelId);

  useEffect(() => {
    void ipcClient.facturation.listClients().then((r) => {
      if (r.ok && r.data) setClients(r.data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (defaultHotelId && !form.hotelId) {
      setForm((f) => ({ ...f, hotelId: defaultHotelId }));
    }
  }, [defaultHotelId, form.hotelId]);

  useEffect(() => {
    if (!form.hotelId || !form.dateArrivee || !form.dateDepart) {
      setEstimatedPrice(null);
      return;
    }
    const t = setTimeout(() => {
      void ipcClient.hebergement.estimatePrice({
        hotelId: form.hotelId!,
        chambreId: form.chambreId,
        planId: form.planId,
        formuleId: form.formuleId,
        dateArrivee: form.dateArrivee!,
        dateDepart: form.dateDepart!,
        nbAdultes: form.nbAdultes,
        nbEnfants: form.nbEnfants,
        clientId: form.clientId,
      }).then((r) => {
        if (r.ok && r.data != null) setEstimatedPrice(r.data);
        else setEstimatedPrice(null);
      }).catch(() => setEstimatedPrice(null));
    }, 300);
    return () => clearTimeout(t);
  }, [form.hotelId, form.chambreId, form.planId, form.formuleId, form.dateArrivee, form.dateDepart, form.nbAdultes, form.nbEnfants, form.clientId]);

  const set = (k: keyof CreateReservationInput, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const handleClientChange = (clientId: string) => {
    if (!clientId) {
      setForm((f) => ({ ...f, clientId: undefined, clientNom: '', clientPrenom: '' }));
      return;
    }
    const c = clients.find((x) => x.id === Number(clientId));
    if (!c) return;
    setForm((f) => ({
      ...f,
      clientId: c.id,
      clientNom: c.type === 'entreprise' ? (c.raisonSociale ?? c.nom) : c.nom,
      clientPrenom: null,
      clientEmail: c.email ?? undefined,
      clientTelephone: c.telephone ?? undefined,
    }));
  };

  const handleSubmit = async () => {
    if (!form.hotelId || !form.dateArrivee || !form.dateDepart) {
      setError('Hôtel et dates sont obligatoires.'); return;
    }
    if (!form.clientId && !form.clientNom?.trim()) {
      setError('Sélectionnez un client ou saisissez un nom.'); return;
    }
    setSaving(true); setError(null);
    try {
      await onSave({
        ...form,
        montantTotal: form.montantTotal ?? estimatedPrice ?? undefined,
      } as CreateReservationInput);
      onClose();
    }
    catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  };

  const selectCls = 'mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30';
  const inputCls = selectCls;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold">Nouvelle réservation</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-slate-100"><XCircle className="h-5 w-5 text-muted-foreground" /></button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Unité hôtelière *</label>
              <select className={selectCls} value={form.hotelId ?? ''} onChange={(e) => set('hotelId', Number(e.target.value))}>
                <option value="">—</option>
                {hotels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Client facturation</label>
              <select className={selectCls} value={form.clientId ?? ''} onChange={(e) => handleClientChange(e.target.value)}>
                <option value="">Saisie manuelle</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.type === 'entreprise' ? (c.raisonSociale ?? c.nom) : c.nom}
                  </option>
                ))}
              </select>
            </div>
            {!form.clientId && (
              <>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-muted-foreground">Nom client *</label>
                  <input className={inputCls} value={form.clientNom ?? ''} onChange={(e) => set('clientNom', e.target.value)} placeholder="Nom" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Prénom</label>
                  <input className={inputCls} value={form.clientPrenom ?? ''} onChange={(e) => set('clientPrenom', e.target.value)} placeholder="Prénom" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Téléphone</label>
                  <input className={inputCls} value={form.clientTelephone ?? ''} onChange={(e) => set('clientTelephone', e.target.value)} placeholder="0555..." />
                </div>
              </>
            )}
            <div>
              <label className="text-xs font-medium text-muted-foreground">Chambre</label>
              <select className={selectCls} value={form.chambreId ?? ''} onChange={(e) => set('chambreId', e.target.value ? Number(e.target.value) : null)}>
                <option value="">—</option>
                {chambres.filter((c) => c.actif).map((c) => (
                  <option key={c.id} value={c.id}>Ch. {c.numero} {c.typeChambreLabel ? `(${c.typeChambreLabel})` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Plan tarifaire</label>
              <select className={selectCls} value={form.planId ?? ''} onChange={(e) => set('planId', e.target.value ? Number(e.target.value) : undefined)}>
                <option value="">Par défaut</option>
                {plans.filter((p) => p.actif).map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Formule (optionnel)</label>
              <select className={selectCls} value={form.formuleId ?? ''} onChange={(e) => set('formuleId', e.target.value ? Number(e.target.value) : null)}>
                <option value="">—</option>
                {formules.filter((f) => f.actif).map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Date arrivée *</label>
              <input type="date" className={inputCls} value={form.dateArrivee ?? ''} onChange={(e) => set('dateArrivee', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Date départ *</label>
              <input type="date" className={inputCls} value={form.dateDepart ?? ''} onChange={(e) => set('dateDepart', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Adultes</label>
              <input type="number" min={1} className={inputCls} value={form.nbAdultes ?? 1} onChange={(e) => set('nbAdultes', +e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Enfants</label>
              <input type="number" min={0} className={inputCls} value={form.nbEnfants ?? 0} onChange={(e) => set('nbEnfants', +e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Montant total (DA)</label>
              <input type="number" min={0} className={inputCls}
                value={form.montantTotal ?? estimatedPrice ?? ''}
                onChange={(e) => set('montantTotal', e.target.value ? +e.target.value : undefined)}
                placeholder={estimatedPrice != null ? String(estimatedPrice) : 'Auto'} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Source</label>
              <select className={selectCls} value={form.source ?? 'direct'} onChange={(e) => set('source', e.target.value)}>
                {['direct','booking','expedia','airbnb','agence','autre'].map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
            {estimatedPrice != null && (
              <div className="col-span-2 rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
                Tarif estimé : <strong>{estimatedPrice.toLocaleString('fr-DZ')} DA</strong> (grille tarifaire + conventions)
              </div>
            )}
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Notes</label>
              <textarea rows={2} className={`${inputCls} resize-none`} value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} placeholder="Remarques..." />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
          <button onClick={onClose} className="rounded-xl border border-border px-5 py-2 text-sm font-medium hover:bg-slate-50 transition-colors">
            Annuler
          </button>
          <button onClick={() => void handleSubmit()} disabled={saving}
            className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors">
            {saving ? 'Enregistrement...' : 'Créer la réservation'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ReservationsPage() {
  const navigate = useNavigate();
  const [dateDebut, setDateDebut] = useState(today());
  const [dateFin,   setDateFin]   = useState(in30());
  const [search, setSearch]       = useState('');
  const [showNew, setShowNew]     = useState(false);

  const { data, loading, create, updateStatut, createFactureFromReservation, refresh } = useReservations(undefined, dateDebut, dateFin);

  const filtered = data.filter((r) =>
    !search || `${r.clientNom} ${r.clientPrenom ?? ''} ${r.chambreNumero ?? ''}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateFacture = async (reservationId: number) => {
    try {
      const facture = await createFactureFromReservation(reservationId);
      if (window.confirm(`Facture ${facture.numero} créée. Ouvrir le détail ?`)) {
        void navigate(`/facturation/factures/${facture.id}`);
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input placeholder="Rechercher client, chambre..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-border pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)}
          className="rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        <span className="text-muted-foreground text-sm">→</span>
        <input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)}
          className="rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        <button onClick={() => setShowNew(true)}
          className="ml-auto flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" /> Nouvelle réservation
        </button>
      </div>

      <div className="rounded-xl border border-border/60 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <p className="text-sm text-muted-foreground animate-pulse">Chargement...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Calendar className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Aucune réservation sur cette période</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30 bg-slate-50/60">
                  {['Client', 'Chambre', 'Période', 'Statut', 'Montant', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <ReservationRow key={r.id} r={r} onAction={updateStatut} onCreateFacture={(id) => void handleCreateFacture(id)} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showNew && (
        <NewReservationModal
          onClose={() => { setShowNew(false); void refresh(); }}
          onSave={create}
        />
      )}
    </div>
  );
}
