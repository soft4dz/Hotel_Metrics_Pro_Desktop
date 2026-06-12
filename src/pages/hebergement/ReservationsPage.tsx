import { useState } from 'react';
import { Plus, Search, BedDouble, Calendar, User, MoreHorizontal, CheckCircle, XCircle, LogIn, LogOut } from 'lucide-react';
import { useReservations } from '@/hooks/useHebergement';
import { cn } from '@/lib/utils';
import type { Reservation, StatutReservation, CreateReservationInput } from '@/shared/types/hebergement';
import { useAuthStore } from '@/stores/auth.store';

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

function ReservationRow({ r, onAction }: { r: Reservation; onAction: (id: number, s: StatutReservation) => void }) {
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
      </td>
      <td className="px-4 py-3 relative">
        <button onClick={() => setOpen(!open)}
          className="rounded-lg p-1.5 hover:bg-slate-100 transition-colors">
          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
        </button>
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

function NewReservationModal({ onClose, onSave }: { onClose: () => void; onSave: (input: CreateReservationInput) => Promise<unknown> }) {
  useAuthStore((s) => s.user?.hotelIds ?? []);
  const [form, setForm] = useState<Partial<CreateReservationInput>>({
    dateArrivee: today(), dateDepart: in30(),
    nbAdultes: 1, nbEnfants: 0,
    statut: 'confirmee', source: 'direct',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof CreateReservationInput, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.hotelId || !form.clientNom || !form.dateArrivee || !form.dateDepart) {
      setError('Hôtel, nom client et dates sont obligatoires.'); return;
    }
    setSaving(true); setError(null);
    try { await onSave(form as CreateReservationInput); onClose(); }
    catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  };

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
              <label className="text-xs font-medium text-muted-foreground">Nom client *</label>
              <input className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={form.clientNom ?? ''} onChange={(e) => set('clientNom', e.target.value)} placeholder="Nom" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Prénom</label>
              <input className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={form.clientPrenom ?? ''} onChange={(e) => set('clientPrenom', e.target.value)} placeholder="Prénom" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Téléphone</label>
              <input className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={form.clientTelephone ?? ''} onChange={(e) => set('clientTelephone', e.target.value)} placeholder="0555..." />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Date arrivée *</label>
              <input type="date" className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={form.dateArrivee ?? ''} onChange={(e) => set('dateArrivee', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Date départ *</label>
              <input type="date" className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={form.dateDepart ?? ''} onChange={(e) => set('dateDepart', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Adultes</label>
              <input type="number" min={1} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={form.nbAdultes ?? 1} onChange={(e) => set('nbAdultes', +e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Enfants</label>
              <input type="number" min={0} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={form.nbEnfants ?? 0} onChange={(e) => set('nbEnfants', +e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Montant total (DA)</label>
              <input type="number" min={0} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={form.montantTotal ?? 0} onChange={(e) => set('montantTotal', +e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Source</label>
              <select className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={form.source ?? 'direct'} onChange={(e) => set('source', e.target.value)}>
                {['direct','booking','expedia','airbnb','agence','autre'].map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Notes</label>
              <textarea rows={2} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} placeholder="Remarques..." />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
          <button onClick={onClose} className="rounded-xl border border-border px-5 py-2 text-sm font-medium hover:bg-slate-50 transition-colors">
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors">
            {saving ? 'Enregistrement...' : 'Créer la réservation'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ReservationsPage() {
  const [dateDebut, setDateDebut] = useState(today());
  const [dateFin,   setDateFin]   = useState(in30());
  const [search, setSearch]       = useState('');
  const [showNew, setShowNew]     = useState(false);

  const { data, loading, create, updateStatut } = useReservations(undefined, dateDebut, dateFin);

  const filtered = data.filter((r) =>
    !search || `${r.clientNom} ${r.clientPrenom ?? ''} ${r.chambreNumero ?? ''}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Toolbar */}
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

      {/* Table */}
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
                  <ReservationRow key={r.id} r={r} onAction={updateStatut} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showNew && (
        <NewReservationModal onClose={() => setShowNew(false)} onSave={create} />
      )}
    </div>
  );
}
