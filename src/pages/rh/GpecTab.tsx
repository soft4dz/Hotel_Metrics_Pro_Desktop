import { useCallback, useEffect, useState } from 'react';
import { Check, Play, Plus, Target } from 'lucide-react';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import type {
  RhCampagneEvaluation,
  RhCampagneEvaluationLigne,
  RhCampagneSynthese,
  RhCompetence,
  RhEmploye,
  RhMatriceGpec,
} from '@/shared/types/rh';

type View = 'campagnes' | 'matrice';

export function GpecTab() {
  const [view, setView] = useState<View>('campagnes');
  const [campagnes, setCampagnes] = useState<RhCampagneEvaluation[]>([]);
  const [selectedCampagne, setSelectedCampagne] = useState<RhCampagneEvaluation | null>(null);
  const [evaluations, setEvaluations] = useState<RhCampagneEvaluationLigne[]>([]);
  const [synthese, setSynthese] = useState<RhCampagneSynthese | null>(null);
  const [employes, setEmployes] = useState<RhEmploye[]>([]);
  const [competences, setCompetences] = useState<RhCompetence[]>([]);
  const [matrice, setMatrice] = useState<RhMatriceGpec | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    titre: '',
    description: '',
    periodeDebut: new Date().toISOString().slice(0, 10),
    periodeFin: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
  });
  const [matriceEmployeId, setMatriceEmployeId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [camps, emps, comps] = await Promise.all([
        ipcClient.rh.listCampagnesEvaluation(),
        ipcClient.rh.listEmployes(),
        ipcClient.rh.listCompetences(),
      ]);
      setCampagnes(unwrapIpc(camps));
      setEmployes(unwrapIpc(emps));
      setCompetences(unwrapIpc(comps));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCampagneDetail = useCallback(async (c: RhCampagneEvaluation) => {
    const [evs, syn] = await Promise.all([
      ipcClient.rh.listCampagneEvaluations(c.id),
      ipcClient.rh.getCampagneSynthese(c.id),
    ]);
    setEvaluations(unwrapIpc(evs));
    setSynthese(unwrapIpc(syn));
    setSelectedCampagne(c);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusy('');
    }
  };

  const campagneColumns: Column<RhCampagneEvaluation>[] = [
    { key: 'titre', header: 'Campagne', render: (c) => <span className="font-medium">{c.titre}</span> },
    { key: 'periode', header: 'Période', render: (c) => `${c.periodeDebut} → ${c.periodeFin}` },
    { key: 'statut', header: 'Statut', render: (c) => <Badge variant={c.statut === 'cloturee' ? 'success' : c.statut === 'en_cours' ? 'warning' : 'muted'}>{c.statut}</Badge> },
    { key: 'prog', header: 'Progression', render: (c) => `${c.nbValidees}/${c.nbEvaluations}` },
    {
      key: 'actions',
      header: '',
      render: (c) => (
        <Button size="sm" variant="outline" onClick={() => void loadCampagneDetail(c)}>Détail</Button>
      ),
    },
  ];

  const evalColumns: Column<RhCampagneEvaluationLigne>[] = [
    { key: 'employe', header: 'Employé', render: (l) => l.employeNom },
    { key: 'comp', header: 'Compétence', render: (l) => l.competenceLibelle },
    { key: 'requis', header: 'Requis', render: (l) => String(l.niveauRequis) },
    {
      key: 'observe',
      header: 'Observé',
      render: (l) => (
        l.statut === 'brouillon' ? (
          <Input
            type="number"
            min={1}
            max={5}
            className="w-16 h-8"
            placeholder="1-5"
            onBlur={(e) => {
              const v = Number(e.target.value);
              if (v >= 1 && v <= 5) {
                void run(`s-${l.id}`, async () => {
                  unwrapIpc(await ipcClient.rh.soumettreEvaluationLigne(l.id, { niveauObserve: v }));
                  if (selectedCampagne) void loadCampagneDetail(selectedCampagne);
                });
              }
            }}
          />
        ) : String(l.niveauObserve ?? '—')
      ),
    },
    { key: 'ecart', header: 'Écart', render: (l) => (l.ecart != null ? (l.ecart >= 0 ? `+${l.ecart}` : String(l.ecart)) : '—') },
    { key: 'statut', header: 'Statut', render: (l) => <Badge variant={l.statut === 'valide' ? 'success' : l.statut === 'soumis' ? 'warning' : 'muted'}>{l.statut}</Badge> },
    {
      key: 'val',
      header: '',
      render: (l) => l.statut === 'soumis' ? (
        <Button size="sm" variant="ghost" onClick={() => void run(`v-${l.id}`, async () => {
          unwrapIpc(await ipcClient.rh.validerEvaluationLigne(l.id));
          if (selectedCampagne) void loadCampagneDetail(selectedCampagne);
        })}>
          <Check className="h-4 w-4" />
        </Button>
      ) : null,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between gap-3">
        <div className="flex gap-2">
          <Button size="sm" variant={view === 'campagnes' ? 'default' : 'outline'} onClick={() => setView('campagnes')}>
            Campagnes
          </Button>
          <Button size="sm" variant={view === 'matrice' ? 'default' : 'outline'} onClick={() => setView('matrice')}>
            <Target className="mr-2 h-4 w-4" />
            Matrice compétences
          </Button>
        </div>
        {view === 'campagnes' && (
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle campagne
          </Button>
        )}
      </div>

      {showForm && (
        <div className="rounded-lg border p-4 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><Label>Titre</Label><Input value={form.titre} onChange={(e) => setForm((f) => ({ ...f, titre: e.target.value }))} /></div>
          <div><Label>Début</Label><Input type="date" value={form.periodeDebut} onChange={(e) => setForm((f) => ({ ...f, periodeDebut: e.target.value }))} /></div>
          <div><Label>Fin</Label><Input type="date" value={form.periodeFin} onChange={(e) => setForm((f) => ({ ...f, periodeFin: e.target.value }))} /></div>
          <div className="sm:col-span-2 flex gap-2">
            <Button disabled={!!busy} onClick={() => void run('create', async () => {
              unwrapIpc(await ipcClient.rh.createCampagneEvaluation({
                titre: form.titre,
                description: form.description || null,
                periodeDebut: form.periodeDebut,
                periodeFin: form.periodeFin,
              }));
              setShowForm(false);
              void load();
            })}>Créer</Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
          </div>
        </div>
      )}

      {view === 'campagnes' && (
        <>
          <DataTable columns={campagneColumns} data={campagnes} keyExtractor={(c) => c.id} loading={loading} emptyMessage="Aucune campagne GPEC." />

          {selectedCampagne && (
            <div className="rounded-lg border p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{selectedCampagne.titre}</h3>
                  {synthese && (
                    <p className="text-sm text-muted-foreground">
                      {synthese.valides}/{synthese.totalLignes} validées — {synthese.tauxCompletion}% — {synthese.ecartsNegatifs} écart(s) négatif(s)
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {selectedCampagne.statut === 'brouillon' && (
                    <Button size="sm" disabled={!!busy} onClick={() => void run('lancer', async () => {
                      unwrapIpc(await ipcClient.rh.lancerCampagneEvaluation(selectedCampagne.id));
                      void load();
                      void loadCampagneDetail(selectedCampagne);
                    })}>
                      <Play className="mr-2 h-4 w-4" />
                      Lancer
                    </Button>
                  )}
                  {selectedCampagne.statut === 'en_cours' && (
                    <Button size="sm" variant="outline" disabled={!!busy} onClick={() => void run('cloture', async () => {
                      unwrapIpc(await ipcClient.rh.cloturerCampagneEvaluation(selectedCampagne.id));
                      void load();
                      setSelectedCampagne(null);
                    })}>
                      Clôturer
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setSelectedCampagne(null)}>Fermer</Button>
                </div>
              </div>
              <DataTable columns={evalColumns} data={evaluations} keyExtractor={(l) => l.id} emptyMessage="Lancez la campagne pour générer les évaluations." />
            </div>
          )}
        </>
      )}

      {view === 'matrice' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label>Employé</Label>
              <select
                className="mt-1 rounded-md border px-3 py-2 text-sm min-w-[220px]"
                value={matriceEmployeId}
                onChange={(e) => setMatriceEmployeId(e.target.value)}
              >
                <option value="">— Sélectionner —</option>
                {employes.map((e) => (
                  <option key={e.id} value={e.id}>{e.prenom} {e.nom}</option>
                ))}
              </select>
            </div>
            <Button
              disabled={!matriceEmployeId || !!busy}
              onClick={() => void run('matrice', async () => {
                setMatrice(unwrapIpc(await ipcClient.rh.getMatriceGpec(Number(matriceEmployeId))));
              })}
            >
              Afficher matrice
            </Button>
          </div>

          {matrice && (
            <div className="rounded-lg border p-4 space-y-3">
              <p className="font-semibold">{matrice.employeNom} — {matrice.posteNom ?? 'Sans poste'}</p>
              <p className="text-sm text-muted-foreground">Couverture compétences : {matrice.tauxCouverture}%</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-2 pr-4">Compétence</th>
                      <th className="py-2 pr-4">Requis</th>
                      <th className="py-2 pr-4">Actuel</th>
                      <th className="py-2 pr-4">Écart</th>
                      <th className="py-2">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matrice.lignes.map((l) => (
                      <tr key={l.competenceId} className="border-b">
                        <td className="py-2 pr-4">{l.competenceLibelle}</td>
                        <td className="py-2 pr-4">{l.niveauRequis}</td>
                        <td className="py-2 pr-4">
                          <Input
                            type="number"
                            min={1}
                            max={5}
                            className="w-16 h-8"
                            defaultValue={l.niveauActuel || ''}
                            onBlur={(e) => {
                              const v = Number(e.target.value);
                              if (v >= 1 && v <= 5 && matriceEmployeId) {
                                void run(`set-${l.competenceId}`, async () => {
                                  unwrapIpc(await ipcClient.rh.setEmployeCompetence({
                                    employeId: Number(matriceEmployeId),
                                    competenceId: l.competenceId,
                                    niveauActuel: v,
                                  }));
                                  setMatrice(unwrapIpc(await ipcClient.rh.getMatriceGpec(Number(matriceEmployeId))));
                                });
                              }
                            }}
                          />
                        </td>
                        <td className="py-2 pr-4">{l.ecart >= 0 ? `+${l.ecart}` : l.ecart}</td>
                        <td className="py-2">
                          <Badge variant={l.statut === 'ok' ? 'success' : l.statut === 'partiel' ? 'warning' : 'muted'}>{l.statut}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {competences.length > 0 && matrice.lignes.length === 0 && (
                <p className="text-sm text-muted-foreground">Aucune compétence requise définie pour ce poste. Configurez la matrice poste/compétences.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
