import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { notify } from '@/lib/toast';
import { useHotelsList } from '@/hooks/useHotelsList';
import type { FichePolice } from '@/shared/types/phase2';
import { Shield, FileText, Calculator, MapPin, Plus, Pencil } from 'lucide-react';

type Tab = 'police' | 'taxe' | 'tourisme';
type FicheForm = {
  nom: string;
  prenom: string;
  dateNaissance: string;
  lieuNaissance: string;
  nationalite: string;
  typePiece: FichePolice['typePiece'];
  numeroPiece: string;
  dateEntree: string;
  dateSortiePrevue: string;
  chambreNumero: string;
};

const emptyFicheForm = (): FicheForm => ({
  nom: '', prenom: '', dateNaissance: '', lieuNaissance: '', nationalite: '',
  typePiece: 'cni', numeroPiece: '', dateEntree: new Date().toISOString().slice(0, 10),
  dateSortiePrevue: '', chambreNumero: '',
});

function currentPeriode() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function HotelLegalPage() {
  const qc = useQueryClient();
  const { hotels, defaultHotelId } = useHotelsList();
  const [tab, setTab] = useState<Tab>('police');
  const [hotelId, setHotelId] = useState<number>(defaultHotelId || 0);
  const [periode, setPeriode] = useState(currentPeriode());
  const [tauxTaxe, setTauxTaxe] = useState('200');
  const [taxeResult, setTaxeResult] = useState<unknown>(null);
  const [showFicheForm, setShowFicheForm] = useState(false);
  const [editingFicheId, setEditingFicheId] = useState<number | null>(null);
  const [ficheForm, setFicheForm] = useState<FicheForm>(emptyFicheForm);

  const { data: fiches = [], isLoading: loadingFiches } = useQuery({
    queryKey: ['fiches-police', hotelId],
    queryFn: async () =>
      unwrapIpc(await ipcClient.hotelLegal.listFichesPolice(hotelId)) as FichePolice[],
    enabled: hotelId > 0 && tab === 'police',
  });

  const { data: rapports = [] } = useQuery({
    queryKey: ['rapports-tourisme', hotelId],
    queryFn: async () => unwrapIpc(await ipcClient.hotelLegal.listRapportsTourisme(hotelId)),
    enabled: hotelId > 0 && tab === 'tourisme',
  });

  const calculerTaxe = useMutation({
    mutationFn: async () =>
      unwrapIpc(await ipcClient.hotelLegal.calculerTaxeSejour(hotelId, periode, Number(tauxTaxe))),
    onSuccess: (data) => {
      setTaxeResult(data);
      notify.success('Taxe de séjour calculée');
    },
    onError: () => notify.error('Erreur calcul taxe'),
  });

  const genererRapport = useMutation({
    mutationFn: async () => unwrapIpc(await ipcClient.hotelLegal.genererRapportTourisme(hotelId, periode)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rapports-tourisme'] });
      notify.success('Rapport tourisme généré');
    },
    onError: () => notify.error('Erreur génération rapport'),
  });

  const saveFiche = useMutation({
    mutationFn: async () => {
      const input = {
        ...ficheForm,
        dateNaissance: ficheForm.dateNaissance || null,
        lieuNaissance: ficheForm.lieuNaissance || null,
        nationalite: ficheForm.nationalite || null,
        dateSortiePrevue: ficheForm.dateSortiePrevue || null,
        chambreNumero: ficheForm.chambreNumero || null,
      };
      return editingFicheId
        ? unwrapIpc(await ipcClient.hotelLegal.updateFichePolice(editingFicheId, input))
        : unwrapIpc(await ipcClient.hotelLegal.createFichePolice({ hotelId, ...input }));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fiches-police'] });
      setShowFicheForm(false);
      setEditingFicheId(null);
      setFicheForm(emptyFicheForm());
      notify.success('Fiche police enregistrée');
    },
    onError: (error) => notify.error(error instanceof Error ? error.message : 'Erreur fiche police'),
  });

  const openCreateFiche = () => {
    setEditingFicheId(null);
    setFicheForm(emptyFicheForm());
    setShowFicheForm(true);
  };

  const openEditFiche = (fiche: FichePolice) => {
    setEditingFicheId(fiche.id);
    setFicheForm({
      nom: fiche.nom,
      prenom: fiche.prenom,
      dateNaissance: fiche.dateNaissance ?? '',
      lieuNaissance: fiche.lieuNaissance ?? '',
      nationalite: fiche.nationalite ?? '',
      typePiece: fiche.typePiece,
      numeroPiece: fiche.numeroPiece === 'A COMPLETER' ? '' : fiche.numeroPiece,
      dateEntree: fiche.dateEntree,
      dateSortiePrevue: fiche.dateSortiePrevue ?? '',
      chambreNumero: fiche.chambreNumero ?? '',
    });
    setShowFicheForm(true);
  };

  const tabs: { id: Tab; label: string; icon: typeof Shield }[] = [
    { id: 'police', label: 'Fiches police', icon: FileText },
    { id: 'taxe', label: 'Taxe de séjour', icon: Calculator },
    { id: 'tourisme', label: 'Rapports tourisme', icon: MapPin },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Conformité hôtelière</h1>
          <p className="text-sm text-muted-foreground">Fiches police, taxe de séjour et rapports tourisme</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={hotelId || ''}
          onChange={(e) => setHotelId(Number(e.target.value))}
          className="border rounded-lg px-3 py-2 text-sm bg-background"
        >
          <option value="">Sélectionner un hôtel</option>
          {hotels.map((h) => (
            <option key={h.id} value={h.id}>{h.name}</option>
          ))}
        </select>
        <div className="flex gap-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === id ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
            >
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'police' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={openCreateFiche} disabled={!hotelId} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
              <Plus className="w-4 h-4" /> Nouvelle fiche
            </button>
          </div>
          {loadingFiches ? (
            <div className="h-40 rounded-xl bg-muted animate-pulse" />
          ) : fiches.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune fiche police.</p>
          ) : (
            fiches.map((f) => (
              <div key={f.id} className="bg-card border rounded-xl p-4 flex items-start justify-between gap-4">
                <div>
                  <div className="font-semibold text-sm">{f.nom} {f.prenom}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {f.typePiece.toUpperCase()} {f.numeroPiece} · Entrée {f.dateEntree}
                    {f.chambreNumero && ` · Ch. ${f.chambreNumero}`}
                    {f.nationalite && ` · ${f.nationalite}`}
                  </div>
                  {(!f.dateNaissance || !f.nationalite || f.numeroPiece === 'A COMPLETER') && (
                    <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 mt-2 inline-block">À compléter</span>
                  )}
                  <span className="text-xs capitalize mt-1 ml-2 inline-block">{f.statut}</span>
                </div>
                <button onClick={() => openEditFiche(f)} className="flex items-center gap-1 text-xs border rounded-lg px-3 py-1.5 hover:bg-muted">
                  <Pencil className="w-3.5 h-3.5" /> Modifier
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'taxe' && (
        <div className="bg-card border rounded-xl p-4 space-y-4 max-w-md">
          <input
            type="month"
            value={periode}
            onChange={(e) => setPeriode(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm bg-background w-full"
          />
          <input
            type="number"
            placeholder="Taux (DZD/nuit)"
            value={tauxTaxe}
            onChange={(e) => setTauxTaxe(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm bg-background w-full"
          />
          <button
            onClick={() => calculerTaxe.mutate()}
            disabled={!hotelId || calculerTaxe.isPending}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            Calculer la taxe de séjour
          </button>
          {taxeResult != null && (
            <pre className="text-xs bg-muted rounded-lg p-3 overflow-auto">{JSON.stringify(taxeResult, null, 2)}</pre>
          )}
        </div>
      )}

      {tab === 'tourisme' && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <input
              type="month"
              value={periode}
              onChange={(e) => setPeriode(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm bg-background"
            />
            <button
              onClick={() => genererRapport.mutate()}
              disabled={!hotelId || genererRapport.isPending}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              Générer rapport
            </button>
          </div>
          {(rapports as unknown[]).length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun rapport tourisme.</p>
          ) : (
            (rapports as Record<string, unknown>[]).map((r, i) => (
              <div key={i} className="bg-card border rounded-xl p-4 text-sm">
                <pre className="text-xs overflow-auto">{JSON.stringify(r, null, 2)}</pre>
              </div>
            ))
          )}
        </div>
      )}

      {showFicheForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold">{editingFicheId ? 'Compléter la fiche police' : 'Nouvelle fiche police'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input placeholder="Nom *" value={ficheForm.nom} onChange={(e) => setFicheForm((f) => ({ ...f, nom: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm bg-background" />
              <input placeholder="Prénom *" value={ficheForm.prenom} onChange={(e) => setFicheForm((f) => ({ ...f, prenom: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm bg-background" />
              <label className="text-xs text-muted-foreground">Date de naissance<input type="date" value={ficheForm.dateNaissance} onChange={(e) => setFicheForm((f) => ({ ...f, dateNaissance: e.target.value }))} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background text-foreground" /></label>
              <input placeholder="Lieu de naissance" value={ficheForm.lieuNaissance} onChange={(e) => setFicheForm((f) => ({ ...f, lieuNaissance: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm bg-background self-end" />
              <input placeholder="Nationalité" value={ficheForm.nationalite} onChange={(e) => setFicheForm((f) => ({ ...f, nationalite: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm bg-background" />
              <select value={ficheForm.typePiece} onChange={(e) => setFicheForm((f) => ({ ...f, typePiece: e.target.value as FichePolice['typePiece'] }))} className="border rounded-lg px-3 py-2 text-sm bg-background">
                <option value="cni">Carte nationale d’identité</option>
                <option value="passeport">Passeport</option>
                <option value="permis_sejour">Permis de séjour</option>
                <option value="autre">Autre pièce</option>
              </select>
              <input placeholder="Numéro de pièce *" value={ficheForm.numeroPiece} onChange={(e) => setFicheForm((f) => ({ ...f, numeroPiece: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm bg-background" />
              <input placeholder="Numéro de chambre" value={ficheForm.chambreNumero} onChange={(e) => setFicheForm((f) => ({ ...f, chambreNumero: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm bg-background" />
              <label className="text-xs text-muted-foreground">Date d’entrée<input type="date" value={ficheForm.dateEntree} onChange={(e) => setFicheForm((f) => ({ ...f, dateEntree: e.target.value }))} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background text-foreground" /></label>
              <label className="text-xs text-muted-foreground">Sortie prévue<input type="date" value={ficheForm.dateSortiePrevue} onChange={(e) => setFicheForm((f) => ({ ...f, dateSortiePrevue: e.target.value }))} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background text-foreground" /></label>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowFicheForm(false)} className="px-4 py-2 rounded-lg text-sm border hover:bg-muted">Annuler</button>
              <button onClick={() => saveFiche.mutate()} disabled={!ficheForm.nom.trim() || !ficheForm.prenom.trim() || !ficheForm.numeroPiece.trim() || !ficheForm.dateEntree || saveFiche.isPending} className="px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground disabled:opacity-50">Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
