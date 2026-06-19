import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { notify } from '@/lib/toast';
import { useHotelsList } from '@/hooks/useHotelsList';
import { ShoppingCart, Plus, CheckCircle, FileText } from 'lucide-react';

interface BonCommande { id: number; numero: string; hotelId: number; fournisseurNom: string; statut: string; dateCommande: string; dateLivraisonPrevue: string | null; montantTtc: number }
interface Fournisseur { id: number; code: string; raisonSociale: string }

const statutColor = (s: string) => ({ brouillon: 'bg-gray-100 text-gray-600', valide: 'bg-blue-100 text-blue-700', envoye: 'bg-yellow-100 text-yellow-700', livre: 'bg-green-100 text-green-700', annule: 'bg-red-100 text-red-700' }[s] ?? 'bg-gray-100 text-gray-600');

export default function AchatsPage() {
  const qc = useQueryClient();
  const { hotels } = useHotelsList();
  const [hotelId, setHotelId] = useState<number | undefined>();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ fournisseurId: 0, notes: '' });
  const [lignes, setLignes] = useState([{ designation: '', quantite: 1, prixUnitaire: 0, tvaPct: 19 }]);

  const { data: bons = [], isLoading } = useQuery({
    queryKey: ['achats-bons', hotelId],
    queryFn: async () => unwrapIpc(await ipcClient.achats.listBons(hotelId)) as BonCommande[],
  });
  const { data: fournisseurs = [] } = useQuery({
    queryKey: ['achats-fournisseurs'],
    queryFn: async () => unwrapIpc(await ipcClient.achats.listFournisseurs()) as Fournisseur[],
  });

  const create = useMutation({
    mutationFn: async () => unwrapIpc(await ipcClient.achats.createBon({ hotelId: hotelId ?? hotels[0]?.id ?? 1, fournisseurId: form.fournisseurId, notes: form.notes, lignes })),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['achats'] }); setShowForm(false); notify.success('Bon de commande créé'); },
    onError: () => notify.error('Erreur'),
  });

  const valider = useMutation({
    mutationFn: async (id: number) => unwrapIpc(await ipcClient.achats.validerBon(id)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['achats'] }); notify.success('Bon validé'); },
  });

  const totalBons = bons.reduce((s, b) => s + b.montantTtc, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <ShoppingCart className="w-7 h-7 text-purple-600" />
          <div>
            <h1 className="text-2xl font-bold">Achats & Fournisseurs</h1>
            <p className="text-sm text-muted-foreground">Gestion des bons de commande et fournisseurs</p>
          </div>
        </div>
        <div className="flex gap-3">
          <select value={hotelId ?? ''} onChange={e => setHotelId(e.target.value ? Number(e.target.value) : undefined)} className="border rounded-lg px-3 py-2 text-sm bg-background">
            <option value="">Tous les hôtels</option>
            {hotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
            <Plus className="w-4 h-4" /> Nouveau bon
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Total bons</p>
          <p className="text-3xl font-bold text-purple-600">{bons.length}</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">En attente</p>
          <p className="text-3xl font-bold">{bons.filter(b => b.statut === 'brouillon').length}</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Montant total</p>
          <p className="text-2xl font-bold">{totalBons.toLocaleString()} DA</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : bons.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground bg-card border rounded-xl">
          <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>Aucun bon de commande</p>
        </div>
      ) : (
        <div className="space-y-2">
          {bons.map(b => (
            <div key={b.id} className="bg-card border rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs text-muted-foreground">{b.numero}</span>
                  <span className="font-medium text-sm">{b.fournisseurNom}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statutColor(b.statut)}`}>{b.statut}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 flex gap-3">
                  <span>{b.dateCommande}</span>
                  {b.dateLivraisonPrevue && <span>· Livraison: {b.dateLivraisonPrevue}</span>}
                  <span>· {b.montantTtc.toLocaleString()} DA TTC</span>
                </div>
              </div>
              {b.statut === 'brouillon' && (
                <button onClick={() => valider.mutate(b.id)} className="shrink-0 flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-100">
                  <CheckCircle className="w-3 h-3" /> Valider
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold">Nouveau bon de commande</h2>
            <div className="space-y-3">
              <select value={form.fournisseurId} onChange={e => setForm(f => ({ ...f, fournisseurId: Number(e.target.value) }))} className="w-full border rounded-lg px-3 py-2 text-sm bg-background">
                <option value={0}>Sélectionner un fournisseur</option>
                {fournisseurs.map(f => <option key={f.id} value={f.id}>{f.raisonSociale}</option>)}
              </select>
              <div className="border rounded-xl p-3 space-y-2">
                <h3 className="text-sm font-medium">Lignes de commande</h3>
                {lignes.map((l, i) => (
                  <div key={i} className="grid grid-cols-4 gap-2">
                    <input className="col-span-2 border rounded-lg px-2 py-1.5 text-xs bg-background" placeholder="Désignation" value={l.designation} onChange={e => setLignes(ls => ls.map((x, j) => j === i ? { ...x, designation: e.target.value } : x))} />
                    <input className="border rounded-lg px-2 py-1.5 text-xs bg-background" type="number" min={1} placeholder="Qté" value={l.quantite} onChange={e => setLignes(ls => ls.map((x, j) => j === i ? { ...x, quantite: Number(e.target.value) } : x))} />
                    <input className="border rounded-lg px-2 py-1.5 text-xs bg-background" type="number" min={0} placeholder="Prix HT" value={l.prixUnitaire} onChange={e => setLignes(ls => ls.map((x, j) => j === i ? { ...x, prixUnitaire: Number(e.target.value) } : x))} />
                  </div>
                ))}
                <button onClick={() => setLignes(ls => [...ls, { designation: '', quantite: 1, prixUnitaire: 0, tvaPct: 19 }])} className="text-xs text-primary flex items-center gap-1 mt-1">
                  <Plus className="w-3 h-3" /> Ajouter une ligne
                </button>
              </div>
              <textarea placeholder="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm bg-background resize-none" />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm border hover:bg-muted">Annuler</button>
              <button onClick={() => create.mutate()} disabled={!form.fournisseurId || create.isPending} className="px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50">
                {create.isPending ? 'Création...' : 'Créer le bon'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
