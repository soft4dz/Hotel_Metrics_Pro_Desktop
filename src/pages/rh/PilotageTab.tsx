import { useCallback, useEffect, useState } from 'react';
import { Anchor, BarChart3, CheckCircle2, TrendingUp } from 'lucide-react';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { formatMoney } from '@/lib/formatters';
import type { HotelListItem } from '@/shared/types/admin';
import type {
  RhComparatifUnite,
  RhEmploye,
  RhOnboardingSuivi,
  RhPortRhSynthese,
  RhPrevisionEffectif,
  TypeActiviteEmploye,
} from '@/shared/types/rh';

type SubTab = 'comparatif' | 'previsions' | 'onboarding' | 'port';

interface PilotageTabProps {
  initialSub?: SubTab;
  compactNav?: boolean;
}

export function PilotageTab({ initialSub = 'comparatif', compactNav = false }: PilotageTabProps) {
  const [sub, setSub] = useState<SubTab>(initialSub);
  const [loading, setLoading] = useState(true);
  const [comparatif, setComparatif] = useState<RhComparatifUnite[]>([]);
  const [previsions, setPrevisions] = useState<RhPrevisionEffectif[]>([]);
  const [onboarding, setOnboarding] = useState<RhOnboardingSuivi[]>([]);
  const [port, setPort] = useState<RhPortRhSynthese | null>(null);
  const [hotels, setHotels] = useState<HotelListItem[]>([]);
  const [employes, setEmployes] = useState<RhEmploye[]>([]);
  const [hotelFiltre, setHotelFiltre] = useState('');
  const [enCoursOnly, setEnCoursOnly] = useState(true);
  const [portTypeForm, setPortTypeForm] = useState({ employeId: '', type: 'port' as TypeActiviteEmploye });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const hId = hotelFiltre ? Number(hotelFiltre) : undefined;
      const [comp, prev, ob, pt, htls, emps] = await Promise.all([
        ipcClient.rh.getComparatifUnites(),
        ipcClient.rh.getPrevisionsEffectif({ hotelId: hId, moisAhead: 3 }),
        ipcClient.rh.listOnboardingSuivi({ enCoursOnly }),
        ipcClient.rh.getPortRhSynthese(),
        ipcClient.hotels.list(),
        ipcClient.rh.listEmployes(),
      ]);
      setComparatif(unwrapIpc(comp));
      setPrevisions(unwrapIpc(prev));
      setOnboarding(unwrapIpc(ob));
      setPort(unwrapIpc(pt));
      setHotels(unwrapIpc(htls).filter((h) => h.isActive));
      setEmployes(unwrapIpc(emps).filter((e) => e.statutRh === 'actif'));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [hotelFiltre, enCoursOnly]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setSub(initialSub);
  }, [initialSub]);

  const comparatifColumns: Column<RhComparatifUnite>[] = [
    { key: 'hotel', header: 'Unité', render: (r) => <span className="font-medium">{r.hotelName}</span> },
    { key: 'eff', header: 'Effectif', render: (r) => r.effectifActif },
    { key: 'rec', header: 'Recettes', render: (r) => formatMoney(r.recettes) },
    { key: 'masse', header: 'Masse sal.', render: (r) => formatMoney(r.masseSalariale) },
    { key: 'rpe', header: 'Rec./effectif', render: (r) => formatMoney(r.recettesParEffectif) },
    { key: 'cout', header: 'MS/CA %', render: (r) => `${r.coutMainOeuvreSurCa} %` },
    {
      key: 'manque',
      header: 'Manque',
      render: (r) => (
        <Badge variant={r.manqueEffectif > 0 ? 'warning' : 'success'}>{r.manqueEffectif}</Badge>
      ),
    },
  ];

  const previsionColumns: Column<RhPrevisionEffectif>[] = [
    { key: 'mois', header: 'Mois', render: (p) => p.mois },
    { key: 'hotel', header: 'Unité', render: (p) => p.hotelName },
    { key: 'actuel', header: 'Effectif actuel', render: (p) => p.effectifActuel },
    { key: 'reco', header: 'Recommandé', render: (p) => p.effectifRecommande },
    {
      key: 'delta',
      header: 'Écart',
      render: (p) => (
        <Badge variant={p.delta > 0 ? 'warning' : p.delta < -1 ? 'accent' : 'success'}>
          {p.delta > 0 ? `+${p.delta}` : p.delta}
        </Badge>
      ),
    },
    { key: 'occ', header: 'Occup. prévue', render: (p) => `${p.tauxOccupationPrevu} %` },
    { key: 'msg', header: 'Analyse', render: (p) => <span className="text-xs">{p.message}</span> },
  ];

  const groupedOnboarding = onboarding.reduce<Record<number, { nom: string; steps: RhOnboardingSuivi[] }>>((acc, s) => {
    if (!acc[s.employeId]) acc[s.employeId] = { nom: s.employeNom, steps: [] };
    acc[s.employeId].steps.push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {!compactNav && (
        <div className="flex flex-wrap gap-2">
          {(['comparatif', 'previsions', 'onboarding', 'port'] as const).map((t) => (
            <Button key={t} size="sm" variant={sub === t ? 'default' : 'outline'} onClick={() => setSub(t)}>
              {t === 'comparatif' ? 'Comparatif unités' : t === 'previsions' ? 'Prévisions' : t === 'onboarding' ? 'Onboarding' : 'PortMaster'}
            </Button>
          ))}
        </div>
      )}

      {sub === 'comparatif' && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Comparatif inter-unités sur les 30 derniers jours : effectif, recettes, masse salariale et coût main-d&apos;œuvre / CA.
          </p>
          <DataTable
            columns={comparatifColumns}
            data={comparatif}
            keyExtractor={(r) => r.hotelId}
            loading={loading}
            emptyMessage="Aucune unité active."
          />
        </div>
      )}

      {sub === 'previsions' && (
        <div className="space-y-4">
          <div className="flex items-end gap-4">
            <div>
              <Label>Filtrer par unité</Label>
              <select className="mt-1 w-56 rounded-md border px-3 py-2 text-sm" value={hotelFiltre} onChange={(e) => setHotelFiltre(e.target.value)}>
                <option value="">Toutes</option>
                {hotels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </div>
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Prévisions sur 3 mois : historique saisonnier, occupation hébergement et benchmark recettes/effectif.
          </p>
          <DataTable columns={previsionColumns} data={previsions} keyExtractor={(p) => `${p.hotelId}-${p.mois}`} loading={loading} emptyMessage="Aucune prévision." />
        </div>
      )}

      {sub === 'onboarding' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <input type="checkbox" id="ob-encours" checked={enCoursOnly} onChange={(e) => setEnCoursOnly(e.target.checked)} />
            <Label htmlFor="ob-encours">Uniquement les parcours en cours</Label>
          </div>
          {Object.keys(groupedOnboarding).length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun onboarding en cours.</p>
          ) : (
            Object.entries(groupedOnboarding).map(([empId, g]) => {
              const done = g.steps.filter((s) => s.statut === 'fait').length;
              const total = g.steps.length;
              return (
                <div key={empId} className="rounded-lg border p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold">{g.nom}</h3>
                    <Badge variant={done === total ? 'success' : 'warning'}>{done}/{total}</Badge>
                  </div>
                  <ul className="text-sm space-y-1">
                    {g.steps.map((s) => (
                      <li key={s.stepCode} className="flex justify-between items-center gap-2">
                        <span className={s.statut === 'fait' ? 'text-muted-foreground line-through' : ''}>{s.stepLibelle}</span>
                        {s.statut === 'a_faire' ? (
                          <Button size="sm" variant="outline" onClick={() => void (async () => {
                            unwrapIpc(await ipcClient.rh.completeOnboardingStep(s.employeId, s.stepCode));
                            void load();
                          })()}>
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Valider
                          </Button>
                        ) : (
                          <Badge variant="success">Fait</Badge>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })
          )}
        </div>
      )}

      {sub === 'port' && (
        <div className="space-y-4">
          {loading && <p className="text-sm text-muted-foreground">Chargement…</p>}
          {!loading && !port && (
            <p className="text-sm text-muted-foreground">Données PortMaster indisponibles.</p>
          )}
          {!loading && port && (
          <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Employés Port / mixte</p>
              <p className="text-2xl font-semibold">{port.totalEmployesPort}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Contrats port actifs</p>
              <p className="text-2xl font-semibold">{port.contratsPortActifs}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Factures port ouvertes</p>
              <p className="text-2xl font-semibold">{port.facturesPortOuvertes}</p>
            </div>
          </div>

          <div className="rounded-lg border p-4 grid gap-3 sm:grid-cols-3">
            <div>
              <Label>Employé hôtel → lier au port</Label>
              <select className="mt-1 w-full rounded-md border px-3 py-2 text-sm" value={portTypeForm.employeId} onChange={(e) => setPortTypeForm((f) => ({ ...f, employeId: e.target.value }))}>
                <option value="">—</option>
                {employes.map((e) => <option key={e.id} value={e.id}>{e.prenom} {e.nom} ({e.typeActivite})</option>)}
              </select>
            </div>
            <div>
              <Label>Type activité</Label>
              <select className="mt-1 w-full rounded-md border px-3 py-2 text-sm" value={portTypeForm.type} onChange={(e) => setPortTypeForm((f) => ({ ...f, type: e.target.value as TypeActiviteEmploye }))}>
                <option value="hotel">Hôtel</option>
                <option value="port">Port</option>
                <option value="mixte">Mixte</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button
                disabled={!portTypeForm.employeId}
                onClick={() => void (async () => {
                  unwrapIpc(await ipcClient.rh.updateEmployeTypeActivite({
                    employeId: Number(portTypeForm.employeId),
                    typeActivite: portTypeForm.type,
                  }));
                  void load();
                })()}
              >
                <Anchor className="mr-1 h-4 w-4" />
                Enregistrer
              </Button>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Équipe PortMaster</h3>
            <ul className="text-sm divide-y border rounded-lg">
              {port.employesPort.length === 0 ? (
                <li className="p-3 text-muted-foreground">Aucun employé lié au port. Assignez le type « port » ou « mixte ».</li>
              ) : (
                port.employesPort.map((e) => (
                  <li key={e.employeId} className="p-3 flex justify-between">
                    <span>{e.employeNom} — {e.posteNom ?? 'Sans poste'}</span>
                    <Badge variant="accent">{e.typeActivite}</Badge>
                  </li>
                ))
              )}
            </ul>
          </div>
          </>
          )}
        </div>
      )}
    </div>
  );
}
