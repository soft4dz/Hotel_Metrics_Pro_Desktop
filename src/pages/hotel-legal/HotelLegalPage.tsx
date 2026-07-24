import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { notify } from '@/lib/toast';
import { useHotelsList } from '@/hooks/useHotelsList';
import type { FichePolice } from '@/shared/types/phase2';
import { Shield, FileText, Calculator, MapPin } from 'lucide-react';

type Tab = 'police' | 'taxe' | 'tourisme';

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
          {loadingFiches ? (
            <div className="h-40 rounded-xl bg-muted animate-pulse" />
          ) : fiches.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune fiche police.</p>
          ) : (
            fiches.map((f) => (
              <div key={f.id} className="bg-card border rounded-xl p-4">
                <div className="font-semibold text-sm">{f.nom} {f.prenom}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Pièce {f.numeroPiece} · Entrée {f.dateEntree}
                  {f.chambreNumero && ` · Ch. ${f.chambreNumero}`}
                  {f.nationalite && ` · ${f.nationalite}`}
                </div>
                <span className="text-xs capitalize mt-1 inline-block">{f.statut}</span>
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
    </div>
  );
}
