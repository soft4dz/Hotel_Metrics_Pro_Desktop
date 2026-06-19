import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { notify } from '@/lib/toast';
import type { StockNiveau } from '@/shared/types/stocks';
import { useHotelsList } from '@/hooks/useHotelsList';
import { Package, Plus, AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react';

const TYPES_MVMT = ['entree', 'sortie', 'ajustement', 'perte'];

export default function StocksPage() {
  const qc = useQueryClient();
  const { hotels } = useHotelsList();
  const [hotelId, setHotelId] = useState<number>(hotels[0]?.id ?? 1);
  const [showMvmt, setShowMvmt] = useState<StockNiveau | null>(null);
  const [showProduit, setShowProduit] = useState(false);
  const [mvmt, setMvmt] = useState({ typeMouvement: 'entree', quantite: 1, motif: '' });
  const [newProduit, setNewProduit] = useState({ code: '', designation: '', unite: 'pièce', seuilAlerte: 0 });

  const { data: niveaux = [], isLoading } = useQuery({
    queryKey: ['stocks-niveaux', hotelId],
    queryFn: async () => unwrapIpc(await ipcClient.stocks.getNiveaux(hotelId)) as StockNiveau[],
  });
  useQuery({
    queryKey: ['stocks-produits'],
    queryFn: async () => unwrapIpc(await ipcClient.stocks.listProduits()),
  });

  const createMvmt = useMutation({
    mutationFn: async () => {
      if (!showMvmt) return;
      return unwrapIpc(await ipcClient.stocks.createMouvement({ hotelId, produitId: showMvmt.produitId, typeMouvement: mvmt.typeMouvement, quantite: mvmt.quantite, motif: mvmt.motif }));
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stocks'] }); setShowMvmt(null); notify.success('Mouvement enregistré'); },
    onError: () => notify.error('Erreur'),
  });

  const createProduit = useMutation({
    mutationFn: async () => unwrapIpc(await ipcClient.stocks.createProduit(newProduit)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stocks'] }); setShowProduit(false); setNewProduit({ code: '', designation: '', unite: 'pièce', seuilAlerte: 0 }); notify.success('Produit créé'); },
    onError: () => notify.error('Erreur'),
  });

  const alertes = niveaux.filter(n => n.enAlerte);
  const valeurTotale = niveaux.reduce((s, n) => s + n.valeur, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Package className="w-7 h-7 text-amber-600" />
          <div>
            <h1 className="text-2xl font-bold">Gestion des Stocks</h1>
            <p className="text-sm text-muted-foreground">Suivi des niveaux de stock et mouvements</p>
          </div>
        </div>
        <div className="flex gap-3">
          <select value={hotelId} onChange={e => setHotelId(Number(e.target.value))} className="border rounded-lg px-3 py-2 text-sm bg-background">
            {hotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
          <button onClick={() => setShowProduit(true)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
            <Plus className="w-4 h-4" /> Nouveau produit
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Références</p>
          <p className="text-3xl font-bold text-amber-600">{niveaux.length}</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">En alerte</p>
          <p className={`text-3xl font-bold ${alertes.length > 0 ? 'text-red-500' : 'text-green-600'}`}>{alertes.length}</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Valeur totale</p>
          <p className="text-2xl font-bold">{valeurTotale.toLocaleString()} DA</p>
        </div>
      </div>

      {alertes.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3 items-start">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-700 text-sm">{alertes.length} produit(s) en rupture de stock</p>
            <p className="text-red-600 text-xs mt-0.5">{alertes.map(a => a.produitDesignation).join(', ')}</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : niveaux.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground bg-card border rounded-xl">
          <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>Aucun stock enregistré pour cet hôtel</p>
        </div>
      ) : (
        <div className="space-y-2">
          {niveaux.map(n => (
            <div key={n.produitId} className={`bg-card border rounded-xl p-4 flex items-center justify-between gap-4 ${n.enAlerte ? 'border-red-200 bg-red-50/50' : ''}`}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {n.enAlerte ? <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" /> : <Package className="w-4 h-4 text-muted-foreground shrink-0" />}
                  <span className="font-medium text-sm">{n.produitDesignation}</span>
                  <span className="text-xs text-muted-foreground">({n.produitCode})</span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 ml-6">
                  Seuil alerte: {n.seuilAlerte} {n.unite} · Valeur: {n.valeur.toLocaleString()} DA
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right">
                  <p className={`text-xl font-bold ${n.enAlerte ? 'text-red-600' : 'text-foreground'}`}>{n.quantite}</p>
                  <p className="text-xs text-muted-foreground">{n.unite}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setShowMvmt(n); setMvmt(m => ({ ...m, typeMouvement: 'entree' })); }} className="p-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100" title="Entrée">
                    <TrendingUp className="w-4 h-4" />
                  </button>
                  <button onClick={() => { setShowMvmt(n); setMvmt(m => ({ ...m, typeMouvement: 'sortie' })); }} className="p-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100" title="Sortie">
                    <TrendingDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mouvement modal */}
      {showMvmt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-bold">Mouvement de stock</h2>
            <p className="text-sm text-muted-foreground">{showMvmt.produitDesignation}</p>
            <div className="space-y-3">
              <select value={mvmt.typeMouvement} onChange={e => setMvmt(m => ({ ...m, typeMouvement: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm bg-background">
                {TYPES_MVMT.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <input type="number" min={1} placeholder="Quantité" value={mvmt.quantite} onChange={e => setMvmt(m => ({ ...m, quantite: Number(e.target.value) }))} className="w-full border rounded-lg px-3 py-2 text-sm bg-background" />
              <input placeholder="Motif" value={mvmt.motif} onChange={e => setMvmt(m => ({ ...m, motif: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm bg-background" />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowMvmt(null)} className="px-4 py-2 rounded-lg text-sm border hover:bg-muted">Annuler</button>
              <button onClick={() => createMvmt.mutate()} disabled={!mvmt.quantite || createMvmt.isPending} className="px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50">
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Nouveau produit modal */}
      {showProduit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-bold">Nouveau produit</h2>
            <div className="space-y-3">
              <input placeholder="Code *" value={newProduit.code} onChange={e => setNewProduit(p => ({ ...p, code: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm bg-background" />
              <input placeholder="Désignation *" value={newProduit.designation} onChange={e => setNewProduit(p => ({ ...p, designation: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm bg-background" />
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Unité" value={newProduit.unite} onChange={e => setNewProduit(p => ({ ...p, unite: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm bg-background" />
                <input type="number" placeholder="Seuil alerte" value={newProduit.seuilAlerte} onChange={e => setNewProduit(p => ({ ...p, seuilAlerte: Number(e.target.value) }))} className="border rounded-lg px-3 py-2 text-sm bg-background" />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowProduit(false)} className="px-4 py-2 rounded-lg text-sm border hover:bg-muted">Annuler</button>
              <button onClick={() => createProduit.mutate()} disabled={!newProduit.code || !newProduit.designation || createProduit.isPending} className="px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50">
                Créer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
