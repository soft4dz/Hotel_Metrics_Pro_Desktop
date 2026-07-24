import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChefHat, Plus, CheckCircle, Play, Trash2, ShoppingCart } from 'lucide-react';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { notify } from '@/lib/toast';
import { useHotelsList } from '@/hooks/useHotelsList';
import type { CuisineRecette, CuisineOrdreProduction, CuisineVentePos } from '@/shared/types/cuisine';
import type { StockProduit } from '@/shared/types/stocks';

type Tab = 'fiches' | 'production' | 'pos';

export default function CuisinePage() {
  const qc = useQueryClient();
  const { hotels } = useHotelsList();
  const [hotelId, setHotelId] = useState<number>(hotels[0]?.id ?? 1);
  const [tab, setTab] = useState<Tab>('fiches');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newRecette, setNewRecette] = useState({ code: '', nom: '', portions: 1, prixVente: '' });
  const [ligneForm, setLigneForm] = useState({ produitId: 0, quantite: 1, tauxPerte: 0 });
  const [ordreForm, setOrdreForm] = useState({ recetteId: 0, dateProduction: new Date().toISOString().slice(0, 10), portionsPrevues: 1 });
  const [posForm, setPosForm] = useState({ recetteId: 0, quantite: 1, referenceTicket: '', montantTtc: '' });

  const { data: recettes = [] } = useQuery({
    queryKey: ['cuisine-recettes', hotelId],
    queryFn: async () => unwrapIpc(await ipcClient.cuisine.listRecettes(hotelId)) as CuisineRecette[],
  });
  const { data: ordres = [] } = useQuery({
    queryKey: ['cuisine-ordres', hotelId],
    queryFn: async () => unwrapIpc(await ipcClient.cuisine.listOrdres(hotelId)) as CuisineOrdreProduction[],
    enabled: tab === 'production',
  });
  const { data: ventes = [] } = useQuery({
    queryKey: ['cuisine-ventes-pos', hotelId],
    queryFn: async () => unwrapIpc(await ipcClient.cuisine.listVentesPos(hotelId)) as CuisineVentePos[],
    enabled: tab === 'pos',
  });
  const { data: produits = [] } = useQuery({
    queryKey: ['stocks-produits'],
    queryFn: async () => unwrapIpc(await ipcClient.stocks.listProduits()) as StockProduit[],
  });

  const selected = recettes.find((r) => r.id === selectedId) ?? null;

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['cuisine-recettes', hotelId] });
    void qc.invalidateQueries({ queryKey: ['cuisine-ordres', hotelId] });
    void qc.invalidateQueries({ queryKey: ['cuisine-ventes-pos', hotelId] });
    void qc.invalidateQueries({ queryKey: ['stocks-niveaux', hotelId] });
  };

  const createRecette = useMutation({
    mutationFn: async () => unwrapIpc(await ipcClient.cuisine.createRecette({
      hotelId,
      code: newRecette.code,
      nom: newRecette.nom,
      portions: newRecette.portions,
      prixVente: newRecette.prixVente ? Number(newRecette.prixVente) : null,
    })),
    onSuccess: (r) => {
      setShowNew(false);
      setNewRecette({ code: '', nom: '', portions: 1, prixVente: '' });
      setSelectedId((r as CuisineRecette).id);
      invalidate();
      notify.success('Fiche technique créée');
    },
    onError: (e) => notify.error(e instanceof Error ? e.message : 'Erreur'),
  });

  const validerRecette = useMutation({
    mutationFn: async (id: number) => unwrapIpc(await ipcClient.cuisine.validerRecette(id)),
    onSuccess: () => { invalidate(); notify.success('Fiche validée — coût matière calculé'); },
    onError: (e) => notify.error(e instanceof Error ? e.message : 'Erreur'),
  });

  const addLigne = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      return unwrapIpc(await ipcClient.cuisine.upsertRecetteLigne(selected.id, {
        produitId: ligneForm.produitId,
        quantite: ligneForm.quantite,
        tauxPerte: ligneForm.tauxPerte,
      }));
    },
    onSuccess: () => { invalidate(); notify.success('Ingrédient ajouté'); },
    onError: (e) => notify.error(e instanceof Error ? e.message : 'Erreur'),
  });

  const removeLigne = useMutation({
    mutationFn: async (ligneId: number) => {
      if (!selected) return;
      return unwrapIpc(await ipcClient.cuisine.removeRecetteLigne(selected.id, ligneId));
    },
    onSuccess: () => { invalidate(); notify.success('Ligne supprimée'); },
  });

  const createOrdre = useMutation({
    mutationFn: async () => unwrapIpc(await ipcClient.cuisine.createOrdre({
      hotelId,
      recetteId: ordreForm.recetteId,
      dateProduction: ordreForm.dateProduction,
      portionsPrevues: ordreForm.portionsPrevues,
    })),
    onSuccess: () => { invalidate(); notify.success('Ordre de production planifié'); },
    onError: (e) => notify.error(e instanceof Error ? e.message : 'Erreur'),
  });

  const executerOrdre = useMutation({
    mutationFn: async (id: number) => unwrapIpc(await ipcClient.cuisine.executerOrdre(id)),
    onSuccess: () => { invalidate(); notify.success('Production exécutée — stocks mis à jour'); },
    onError: (e) => notify.error(e instanceof Error ? e.message : 'Erreur'),
  });

  const ventePos = useMutation({
    mutationFn: async () => unwrapIpc(await ipcClient.cuisine.enregistrerVentePos({
      hotelId,
      recetteId: posForm.recetteId,
      quantite: posForm.quantite,
      referenceTicket: posForm.referenceTicket || null,
      montantTtc: posForm.montantTtc ? Number(posForm.montantTtc) : null,
    })),
    onSuccess: () => {
      invalidate();
      setPosForm({ recetteId: 0, quantite: 1, referenceTicket: '', montantTtc: '' });
      notify.success('Vente POS enregistrée — stock décrémenté + compta SCF');
    },
    onError: (e) => notify.error(e instanceof Error ? e.message : 'Erreur'),
  });

  const recettesValidees = recettes.filter((r) => r.statut === 'valide');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <ChefHat className="w-7 h-7 text-orange-600" />
          <div>
            <h1 className="text-2xl font-bold">Production & Fiches techniques</h1>
            <p className="text-sm text-muted-foreground">Nomenclature cuisine → coût matière → sorties stock automatiques</p>
          </div>
        </div>
        <select value={hotelId} onChange={(e) => setHotelId(Number(e.target.value))} className="border rounded-lg px-3 py-2 text-sm bg-background">
          {hotels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
      </div>

      <div className="flex gap-2 border-b">
        {(['fiches', 'production', 'pos'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === t ? 'border-orange-600 text-orange-600' : 'border-transparent text-muted-foreground'}`}
          >
            {t === 'fiches' ? 'Fiches techniques' : t === 'production' ? 'Ordres de production' : 'Ventes POS'}
          </button>
        ))}
      </div>

      {tab === 'fiches' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="font-semibold">Recettes ({recettes.length})</h2>
              <button type="button" onClick={() => setShowNew(true)} className="flex items-center gap-1 text-sm bg-primary text-primary-foreground px-3 py-1.5 rounded-lg">
                <Plus className="w-4 h-4" /> Nouvelle fiche
              </button>
            </div>
            <div className="border rounded-xl divide-y max-h-[480px] overflow-auto">
              {recettes.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedId(r.id)}
                  className={`w-full text-left p-3 hover:bg-muted/50 ${selectedId === r.id ? 'bg-orange-50 dark:bg-orange-950/30' : ''}`}
                >
                  <div className="flex justify-between">
                    <span className="font-medium">{r.nom}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${r.statut === 'valide' ? 'bg-green-100 text-green-800' : 'bg-muted'}`}>{r.statut}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{r.code} · {r.lignes.length} ingrédient(s)</p>
                  {r.coutRevient != null && <p className="text-xs mt-1">Coût revient : {r.coutRevient.toLocaleString()} DA{r.margePct != null ? ` · Marge ${r.margePct}%` : ''}</p>}
                </button>
              ))}
            </div>
          </div>

          <div className="border rounded-xl p-4 space-y-4">
            {!selected ? (
              <p className="text-muted-foreground text-sm">Sélectionnez une fiche ou créez-en une nouvelle.</p>
            ) : (
              <>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold">{selected.nom}</h3>
                    <p className="text-sm text-muted-foreground">{selected.portions} portion(s) · {selected.statut}</p>
                  </div>
                  {selected.statut === 'brouillon' && selected.lignes.length > 0 && (
                    <button type="button" onClick={() => validerRecette.mutate(selected.id)} className="flex items-center gap-1 text-sm bg-green-600 text-white px-3 py-1.5 rounded-lg">
                      <CheckCircle className="w-4 h-4" /> Valider (production)
                    </button>
                  )}
                </div>
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-muted-foreground border-b"><th className="py-2">Ingrédient</th><th>Qté</th><th>Coût</th><th /></tr></thead>
                  <tbody>
                    {selected.lignes.map((l) => (
                      <tr key={l.id} className="border-b">
                        <td className="py-2">{l.produitDesignation}</td>
                        <td>{l.quantite} {l.unite}{l.tauxPerte > 0 ? ` (+${l.tauxPerte}% perte)` : ''}</td>
                        <td>{l.coutLigne?.toLocaleString() ?? '—'} DA</td>
                        <td>{selected.statut === 'brouillon' && (
                          <button type="button" onClick={() => removeLigne.mutate(l.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></button>
                        )}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {selected.statut === 'brouillon' && (
                  <div className="flex flex-wrap gap-2 items-end pt-2 border-t">
                    <select value={ligneForm.produitId} onChange={(e) => setLigneForm({ ...ligneForm, produitId: Number(e.target.value) })} className="border rounded px-2 py-1 text-sm flex-1 min-w-[140px]">
                      <option value={0}>Ingrédient…</option>
                      {produits.map((p) => <option key={p.id} value={p.id}>{p.designation}</option>)}
                    </select>
                    <input type="number" min={0.01} step={0.01} value={ligneForm.quantite} onChange={(e) => setLigneForm({ ...ligneForm, quantite: Number(e.target.value) })} className="border rounded px-2 py-1 text-sm w-20" />
                    <button type="button" disabled={!ligneForm.produitId} onClick={() => addLigne.mutate()} className="text-sm bg-primary text-primary-foreground px-3 py-1.5 rounded-lg">Ajouter</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {tab === 'production' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-end border rounded-xl p-4">
            <div>
              <label className="text-xs text-muted-foreground">Recette validée</label>
              <select value={ordreForm.recetteId} onChange={(e) => setOrdreForm({ ...ordreForm, recetteId: Number(e.target.value) })} className="block border rounded px-2 py-1.5 text-sm mt-1">
                <option value={0}>Choisir…</option>
                {recettesValidees.map((r) => <option key={r.id} value={r.id}>{r.nom}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Date</label>
              <input type="date" value={ordreForm.dateProduction} onChange={(e) => setOrdreForm({ ...ordreForm, dateProduction: e.target.value })} className="block border rounded px-2 py-1.5 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Portions</label>
              <input type="number" min={1} value={ordreForm.portionsPrevues} onChange={(e) => setOrdreForm({ ...ordreForm, portionsPrevues: Number(e.target.value) })} className="block border rounded px-2 py-1.5 text-sm mt-1 w-24" />
            </div>
            <button type="button" disabled={!ordreForm.recetteId} onClick={() => createOrdre.mutate()} className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-lg">Planifier</button>
          </div>
          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50"><tr><th className="p-3 text-left">Date</th><th>Plat</th><th>Portions</th><th>Coût théorique</th><th>Statut</th><th /></tr></thead>
              <tbody>
                {ordres.map((o) => (
                  <tr key={o.id} className="border-t">
                    <td className="p-3">{o.dateProduction}</td>
                    <td>{o.recetteNom}</td>
                    <td>{o.portionsPrevues}</td>
                    <td>{o.coutTheorique?.toLocaleString() ?? '—'} DA</td>
                    <td>{o.statut}</td>
                    <td className="p-3 text-right">
                      {o.statut !== 'termine' && (
                        <button type="button" onClick={() => executerOrdre.mutate(o.id)} className="inline-flex items-center gap-1 text-green-700 text-xs font-medium">
                          <Play className="w-3 h-3" /> Exécuter → stock
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'pos' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-end border rounded-xl p-4">
            <ShoppingCart className="w-5 h-5 text-orange-600 hidden sm:block" />
            <div>
              <label className="text-xs text-muted-foreground">Plat vendu</label>
              <select value={posForm.recetteId} onChange={(e) => setPosForm({ ...posForm, recetteId: Number(e.target.value) })} className="block border rounded px-2 py-1.5 text-sm mt-1 min-w-[180px]">
                <option value={0}>Choisir…</option>
                {recettesValidees.map((r) => <option key={r.id} value={r.id}>{r.nom}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Quantité</label>
              <input type="number" min={1} value={posForm.quantite} onChange={(e) => setPosForm({ ...posForm, quantite: Number(e.target.value) })} className="block border rounded px-2 py-1.5 text-sm mt-1 w-20" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Ticket</label>
              <input value={posForm.referenceTicket} onChange={(e) => setPosForm({ ...posForm, referenceTicket: e.target.value })} placeholder="TCK-001" className="block border rounded px-2 py-1.5 text-sm mt-1 w-28" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Montant TTC</label>
              <input value={posForm.montantTtc} onChange={(e) => setPosForm({ ...posForm, montantTtc: e.target.value })} placeholder="auto" className="block border rounded px-2 py-1.5 text-sm mt-1 w-24" />
            </div>
            <button type="button" disabled={!posForm.recetteId} onClick={() => ventePos.mutate()} className="text-sm bg-orange-600 text-white px-4 py-2 rounded-lg">Enregistrer vente</button>
          </div>
          <p className="text-xs text-muted-foreground">Déclenche automatiquement : sortie stock BOM → écriture comptable SCF (601/311).</p>
          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50"><tr><th className="p-3 text-left">Date</th><th>Plat</th><th>Qté</th><th>Montant</th><th>Ticket</th></tr></thead>
              <tbody>
                {ventes.map((v) => (
                  <tr key={v.id} className="border-t">
                    <td className="p-3">{v.dateVente}</td>
                    <td>{v.recetteNom}</td>
                    <td>{v.quantite}</td>
                    <td>{v.montantTtc?.toLocaleString() ?? '—'} DA</td>
                    <td>{v.referenceTicket ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showNew && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-background border rounded-xl p-6 w-full max-w-md space-y-4">
            <h3 className="font-semibold text-lg">Nouvelle fiche technique</h3>
            <input placeholder="Code (ex. PLT-001)" value={newRecette.code} onChange={(e) => setNewRecette({ ...newRecette, code: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" />
            <input placeholder="Nom du plat" value={newRecette.nom} onChange={(e) => setNewRecette({ ...newRecette, nom: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" />
            <div className="flex gap-3">
              <input type="number" min={1} placeholder="Portions" value={newRecette.portions} onChange={(e) => setNewRecette({ ...newRecette, portions: Number(e.target.value) })} className="border rounded px-3 py-2 text-sm w-24" />
              <input placeholder="Prix vente DA" value={newRecette.prixVente} onChange={(e) => setNewRecette({ ...newRecette, prixVente: e.target.value })} className="border rounded px-3 py-2 text-sm flex-1" />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowNew(false)} className="px-4 py-2 text-sm">Annuler</button>
              <button type="button" disabled={!newRecette.code || !newRecette.nom} onClick={() => createRecette.mutate()} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg">Créer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
