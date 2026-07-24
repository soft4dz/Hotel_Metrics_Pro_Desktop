import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { notify } from '@/lib/toast';
import { useHotelsList } from '@/hooks/useHotelsList';
import { formatMoney } from '@/lib/formatters';
import { FileSignature, Plus, AlertTriangle } from 'lucide-react';

interface ContratHotel {
  id: number;
  reference: string;
  typeContrat: string;
  clientLabel: string | null;
  dateDebut: string;
  dateFin: string;
  montant: number;
  statut: string;
  joursAvantEcheance: number | null;
}

const TYPES = [
  { value: 'convention_entreprise', label: 'Convention entreprise' },
  { value: 'allotement', label: 'Allotement' },
  { value: 'mice', label: 'MICE' },
  { value: 'prestation_restauration', label: 'Prestation restauration' },
];

export default function ContratsHotelPage() {
  const qc = useQueryClient();
  const { hotels } = useHotelsList();
  const [hotelId, setHotelId] = useState<number | undefined>();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    hotelId: hotels[0]?.id ?? 1,
    reference: '',
    typeContrat: 'convention_entreprise',
    dateDebut: new Date().toISOString().slice(0, 10),
    dateFin: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
    montant: 0,
    notes: '',
  });

  const { data: contrats = [], isLoading } = useQuery({
    queryKey: ['contrats-hotel', hotelId],
    queryFn: async () => unwrapIpc(await ipcClient.contratsHotel.list(hotelId)) as ContratHotel[],
  });

  const { data: echeances = [] } = useQuery({
    queryKey: ['contrats-hotel-echeances'],
    queryFn: async () => unwrapIpc(await ipcClient.contratsHotel.echeances(30)) as ContratHotel[],
  });

  const create = useMutation({
    mutationFn: async () => unwrapIpc(await ipcClient.contratsHotel.create(form)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contrats-hotel'] });
      setShowForm(false);
      notify.success('Contrat créé');
    },
    onError: (e: Error) => notify.error(e.message || 'Erreur'),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <FileSignature className="w-7 h-7 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold">Contrats hôteliers</h1>
            <p className="text-sm text-muted-foreground">Conventions, allotements et prestations</p>
          </div>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
          <Plus className="w-4 h-4" /> Nouveau contrat
        </button>
      </div>

      {echeances.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-900">{echeances.length} contrat(s) expirent sous 30 jours</p>
            <p className="text-xs text-amber-800 mt-1">{echeances.map((c) => c.reference).join(', ')}</p>
          </div>
        </div>
      )}

      <select value={hotelId ?? ''} onChange={(e) => setHotelId(e.target.value ? Number(e.target.value) : undefined)} className="border rounded-lg px-3 py-2 text-sm bg-background">
        <option value="">Tous les hôtels</option>
        {hotels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
      </select>

      {isLoading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : contrats.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground bg-card border rounded-xl">
          <FileSignature className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>Aucun contrat</p>
        </div>
      ) : (
        <div className="space-y-2">
          {contrats.map((c) => (
            <div key={c.id} className="bg-card border rounded-xl p-4 flex items-center justify-between gap-4">
              <div>
                <div className="font-semibold text-sm">{c.reference}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {c.clientLabel} · {c.typeContrat} · {c.dateDebut} → {c.dateFin}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-sm">{formatMoney(c.montant)}</p>
                <p className="text-xs text-muted-foreground capitalize">{c.statut}</p>
                {c.joursAvantEcheance != null && c.joursAvantEcheance <= 30 && c.joursAvantEcheance >= 0 && (
                  <p className="text-xs text-amber-600">J-{c.joursAvantEcheance}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <h2 className="text-lg font-bold">Nouveau contrat</h2>
            <div className="space-y-3">
              <select value={form.hotelId} onChange={(e) => setForm((f) => ({ ...f, hotelId: Number(e.target.value) }))} className="w-full border rounded-lg px-3 py-2 text-sm bg-background">
                {hotels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
              <input placeholder="Référence *" value={form.reference} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm bg-background" />
              <select value={form.typeContrat} onChange={(e) => setForm((f) => ({ ...f, typeContrat: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm bg-background">
                {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <input type="date" value={form.dateDebut} onChange={(e) => setForm((f) => ({ ...f, dateDebut: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm bg-background" />
                <input type="date" value={form.dateFin} onChange={(e) => setForm((f) => ({ ...f, dateFin: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm bg-background" />
              </div>
              <input type="number" placeholder="Montant (DA)" value={form.montant || ''} onChange={(e) => setForm((f) => ({ ...f, montant: Number(e.target.value) }))} className="w-full border rounded-lg px-3 py-2 text-sm bg-background" />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm border hover:bg-muted">Annuler</button>
              <button onClick={() => create.mutate()} disabled={!form.reference || create.isPending} className="px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground disabled:opacity-50">
                {create.isPending ? 'Création...' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
