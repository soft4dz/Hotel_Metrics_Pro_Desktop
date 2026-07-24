import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { notify } from '@/lib/toast';
import { useHotelsList } from '@/hooks/useHotelsList';
import { ShoppingCart, Plus, CheckCircle, FileText, Send, Package, Users, ExternalLink } from 'lucide-react';

interface BonCommande {
  id: number;
  numero: string;
  hotelId: number;
  fournisseurNom: string;
  statut: string;
  dateCommande: string;
  dateLivraisonPrevue: string | null;
  montantTtc: number;
}
interface BonLigne {
  id: number;
  designation: string;
  quantite: number;
  qteRecue: number;
  prixUnitaire: number;
  produitId: number | null;
}
interface Fournisseur { id: number; code: string; raisonSociale: string; email: string | null; telephone: string | null }

const statutColor = (s: string) =>
  ({
    brouillon: 'bg-gray-100 text-gray-600',
    valide: 'bg-blue-100 text-blue-700',
    envoye: 'bg-yellow-100 text-yellow-700',
    recu_partiel: 'bg-amber-100 text-amber-800',
    recu: 'bg-green-100 text-green-700',
    annule: 'bg-red-100 text-red-700',
  }[s] ?? 'bg-gray-100 text-gray-600');

export default function AchatsPage() {
  const qc = useQueryClient();
  const { hotels } = useHotelsList();
  const [tab, setTab] = useState<'bons' | 'fournisseurs'>('bons');
  const [hotelId, setHotelId] = useState<number | undefined>();
  const [showForm, setShowForm] = useState(false);
  const [showFournisseur, setShowFournisseur] = useState(false);
  const [receptionBon, setReceptionBon] = useState<BonCommande | null>(null);
  const [receptionLignes, setReceptionLignes] = useState<{ ligneId: number; qteRecue: number; designation: string; reste: number }[]>([]);
  const [lastStockLink, setLastStockLink] = useState<number | null>(null);
  const [form, setForm] = useState({ fournisseurId: 0, notes: '' });
  const [fournisseurForm, setFournisseurForm] = useState({ code: '', raisonSociale: '', email: '', telephone: '' });
  const [lignes, setLignes] = useState([{ designation: '', quantite: 1, prixUnitaire: 0, tvaPct: 19, produitId: undefined as number | undefined }]);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['achats-bons'] });
    void qc.invalidateQueries({ queryKey: ['achats-fournisseurs'] });
  };

  const { data: bons = [], isLoading } = useQuery({
    queryKey: ['achats-bons', hotelId],
    queryFn: async () => unwrapIpc(await ipcClient.achats.listBons(hotelId)) as BonCommande[],
  });
  const { data: fournisseurs = [] } = useQuery({
    queryKey: ['achats-fournisseurs'],
    queryFn: async () => unwrapIpc(await ipcClient.achats.listFournisseurs()) as Fournisseur[],
  });

  const create = useMutation({
    mutationFn: async () =>
      unwrapIpc(
        await ipcClient.achats.createBon({
          hotelId: hotelId ?? hotels[0]?.id ?? 1,
          fournisseurId: form.fournisseurId,
          notes: form.notes,
          lignes,
        }),
      ),
    onSuccess: () => { invalidate(); setShowForm(false); notify.success('Bon de commande créé'); },
    onError: (e) => notify.error(e instanceof Error ? e.message : 'Erreur'),
  });

  const createFournisseur = useMutation({
    mutationFn: async () => unwrapIpc(await ipcClient.achats.createFournisseur(fournisseurForm)),
    onSuccess: () => { invalidate(); setShowFournisseur(false); notify.success('Fournisseur créé'); },
    onError: (e) => notify.error(e instanceof Error ? e.message : 'Erreur'),
  });

  const valider = useMutation({
    mutationFn: async (id: number) => unwrapIpc(await ipcClient.achats.validerBon(id)),
    onSuccess: () => { invalidate(); notify.success('Bon validé'); },
  });

  const envoyer = useMutation({
    mutationFn: async (id: number) => unwrapIpc(await ipcClient.achats.envoyerBon(id)),
    onSuccess: () => { invalidate(); notify.success('Bon envoyé au fournisseur'); },
  });

  const livrer = useMutation({
    mutationFn: async () => {
      if (!receptionBon) return;
      return unwrapIpc(
        await ipcClient.achats.livrerBon(receptionBon.id, {
          lignes: receptionLignes.map((l) => ({ ligneId: l.ligneId, qteRecue: l.qteRecue })),
        }),
      ) as { mouvementsStock: number[] };
    },
    onSuccess: (data) => {
      invalidate();
      setReceptionBon(null);
      if (data?.mouvementsStock?.length) setLastStockLink(receptionBon?.hotelId ?? null);
      notify.success('Réception enregistrée — stock et TVA achats mis à jour');
    },
    onError: (e) => notify.error(e instanceof Error ? e.message : 'Erreur réception'),
  });

  const openReception = async (bon: BonCommande) => {
    try {
      const ls = unwrapIpc(await ipcClient.achats.getBonLignes(bon.id)) as BonLigne[];
      setReceptionLignes(
        ls
          .filter((l) => l.qteRecue < l.quantite)
          .map((l) => ({
            ligneId: l.id,
            designation: l.designation,
            reste: l.quantite - l.qteRecue,
            qteRecue: l.quantite - l.qteRecue,
          })),
      );
      setReceptionBon(bon);
    } catch {
      notify.error('Impossible de charger les lignes');
    }
  };

  const totalBons = bons.reduce((s, b) => s + b.montantTtc, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <ShoppingCart className="w-7 h-7 text-purple-600" />
          <div>
            <h1 className="text-2xl font-bold">Achats & Fournisseurs</h1>
            <p className="text-sm text-muted-foreground">Bons de commande, réception et alimentation stock / TVA</p>
          </div>
        </div>
        <div className="flex gap-3 flex-wrap">
          <select value={hotelId ?? ''} onChange={(e) => setHotelId(e.target.value ? Number(e.target.value) : undefined)} className="border rounded-lg px-3 py-2 text-sm bg-background">
            <option value="">Tous les hôtels</option>
            {hotels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
          {tab === 'bons' ? (
            <button type="button" onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
              <Plus className="w-4 h-4" /> Nouveau bon
            </button>
          ) : (
            <button type="button" onClick={() => setShowFournisseur(true)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
              <Plus className="w-4 h-4" /> Nouveau fournisseur
            </button>
          )}
        </div>
      </div>

      {lastStockLink && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          <Package className="h-4 w-4" />
          Mouvements stock créés.
          <Link to="/stocks" className="inline-flex items-center gap-1 font-medium underline">
            Voir les stocks <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      )}

      <div className="flex gap-1 border-b">
        {(['bons', 'fournisseurs'] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 capitalize ${tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>
            {t === 'bons' ? `Bons (${bons.length})` : `Fournisseurs (${fournisseurs.length})`}
          </button>
        ))}
      </div>

      {tab === 'bons' && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-card border rounded-xl p-4"><p className="text-xs text-muted-foreground">Total bons</p><p className="text-3xl font-bold text-purple-600">{bons.length}</p></div>
            <div className="bg-card border rounded-xl p-4"><p className="text-xs text-muted-foreground">En attente</p><p className="text-3xl font-bold">{bons.filter((b) => b.statut === 'brouillon').length}</p></div>
            <div className="bg-card border rounded-xl p-4"><p className="text-xs text-muted-foreground">Montant total</p><p className="text-2xl font-bold">{totalBons.toLocaleString()} DA</p></div>
          </div>

          {isLoading ? (
            <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}</div>
          ) : bons.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground bg-card border rounded-xl">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>Aucun bon de commande</p>
            </div>
          ) : (
            <div className="space-y-2">
              {bons.map((b) => (
                <div key={b.id} className="bg-card border rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-muted-foreground">{b.numero}</span>
                      <span className="font-medium text-sm">{b.fournisseurNom}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statutColor(b.statut)}`}>{b.statut}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex gap-3 flex-wrap">
                      <span>{b.dateCommande}</span>
                      {b.dateLivraisonPrevue && <span>· Livraison: {b.dateLivraisonPrevue}</span>}
                      <span>· {b.montantTtc.toLocaleString()} DA TTC</span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0 flex-wrap">
                    {b.statut === 'brouillon' && (
                      <button type="button" onClick={() => valider.mutate(b.id)} className="flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg">
                        <CheckCircle className="w-3 h-3" /> Valider
                      </button>
                    )}
                    {b.statut === 'valide' && (
                      <button type="button" onClick={() => envoyer.mutate(b.id)} className="flex items-center gap-1.5 text-xs bg-yellow-50 text-yellow-800 border border-yellow-200 px-3 py-1.5 rounded-lg">
                        <Send className="w-3 h-3" /> Envoyer
                      </button>
                    )}
                    {['valide', 'envoye', 'recu_partiel'].includes(b.statut) && (
                      <button type="button" onClick={() => void openReception(b)} className="flex items-center gap-1.5 text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg">
                        <Package className="w-3 h-3" /> Réceptionner
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'fournisseurs' && (
        <div className="space-y-2">
          {fournisseurs.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground bg-card border rounded-xl">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>Aucun fournisseur</p>
            </div>
          ) : (
            fournisseurs.map((f) => (
              <div key={f.id} className="bg-card border rounded-xl p-4 flex justify-between gap-4">
                <div>
                  <p className="font-medium text-sm">{f.raisonSociale} <span className="text-muted-foreground font-mono text-xs">({f.code})</span></p>
                  <p className="text-xs text-muted-foreground mt-0.5">{f.email ?? '—'} · {f.telephone ?? '—'}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold">Nouveau bon de commande</h2>
            <select value={form.fournisseurId} onChange={(e) => setForm((f) => ({ ...f, fournisseurId: Number(e.target.value) }))} className="w-full border rounded-lg px-3 py-2 text-sm bg-background">
              <option value={0}>Sélectionner un fournisseur</option>
              {fournisseurs.map((f) => <option key={f.id} value={f.id}>{f.raisonSociale}</option>)}
            </select>
            <div className="border rounded-xl p-3 space-y-2">
              {lignes.map((l, i) => (
                <div key={i} className="grid grid-cols-4 gap-2">
                  <input className="col-span-2 border rounded-lg px-2 py-1.5 text-xs bg-background" placeholder="Désignation" value={l.designation} onChange={(e) => setLignes((ls) => ls.map((x, j) => (j === i ? { ...x, designation: e.target.value } : x)))} />
                  <input className="border rounded-lg px-2 py-1.5 text-xs bg-background" type="number" min={1} placeholder="Qté" value={l.quantite} onChange={(e) => setLignes((ls) => ls.map((x, j) => (j === i ? { ...x, quantite: Number(e.target.value) } : x)))} />
                  <input className="border rounded-lg px-2 py-1.5 text-xs bg-background" type="number" min={0} placeholder="Prix HT" value={l.prixUnitaire} onChange={(e) => setLignes((ls) => ls.map((x, j) => (j === i ? { ...x, prixUnitaire: Number(e.target.value) } : x)))} />
                </div>
              ))}
                <button type="button" onClick={() => setLignes((ls) => [...ls, { designation: '', quantite: 1, prixUnitaire: 0, tvaPct: 19, produitId: undefined }])} className="text-xs text-primary flex items-center gap-1"><Plus className="w-3 h-3" /> Ajouter une ligne</button>
            </div>
            <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm bg-background resize-none" />
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm border">Annuler</button>
              <button type="button" onClick={() => create.mutate()} disabled={!form.fournisseurId || create.isPending} className="px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground disabled:opacity-50">Créer</button>
            </div>
          </div>
        </div>
      )}

      {showFournisseur && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold">Nouveau fournisseur</h2>
            <input placeholder="Code *" value={fournisseurForm.code} onChange={(e) => setFournisseurForm((f) => ({ ...f, code: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm bg-background" />
            <input placeholder="Raison sociale *" value={fournisseurForm.raisonSociale} onChange={(e) => setFournisseurForm((f) => ({ ...f, raisonSociale: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm bg-background" />
            <input placeholder="E-mail" value={fournisseurForm.email} onChange={(e) => setFournisseurForm((f) => ({ ...f, email: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm bg-background" />
            <input placeholder="Téléphone" value={fournisseurForm.telephone} onChange={(e) => setFournisseurForm((f) => ({ ...f, telephone: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm bg-background" />
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setShowFournisseur(false)} className="px-4 py-2 rounded-lg text-sm border">Annuler</button>
              <button type="button" onClick={() => createFournisseur.mutate()} disabled={!fournisseurForm.code || !fournisseurForm.raisonSociale} className="px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground">Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {receptionBon && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <h2 className="text-lg font-bold">Réception — {receptionBon.numero}</h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {receptionLignes.map((l, i) => (
                <div key={l.ligneId} className="grid grid-cols-3 gap-2 items-center text-sm border rounded-lg p-2">
                  <span className="col-span-2 truncate">{l.designation}</span>
                  <input type="number" min={0} max={l.reste} step={0.01} value={l.qteRecue} onChange={(e) => setReceptionLignes((rows) => rows.map((r, j) => (j === i ? { ...r, qteRecue: Number(e.target.value) } : r)))} className="border rounded px-2 py-1 text-xs bg-background" />
                </div>
              ))}
            </div>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setReceptionBon(null)} className="px-4 py-2 rounded-lg text-sm border">Annuler</button>
              <button type="button" onClick={() => livrer.mutate()} disabled={livrer.isPending} className="px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground">Confirmer réception</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
