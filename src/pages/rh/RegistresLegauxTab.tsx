import { useCallback, useEffect, useState } from 'react';
import { Download, FileText, Plus } from 'lucide-react';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { formatMoney } from '@/lib/formatters';
import type {
  RhAccidentTravail,
  RhEmploye,
  RhExportResult,
  RhRegistreCongesLigne,
  RhRegistrePersonnelLigne,
  RhRuptureContrat,
  RhVisiteMedicale,
  TypeRuptureContrat,
  TypeVisiteMedicale,
} from '@/shared/types/rh';

type SubView = 'personnel' | 'conges' | 'accidents' | 'visites' | 'ruptures';

const RUPTURE_LABELS: Record<TypeRuptureContrat, string> = {
  demission: 'Démission',
  licenciement: 'Licenciement',
  fin_cdd: 'Fin CDD',
  retraite: 'Retraite',
  rupture_conventionnelle: 'Rupture conventionnelle',
};

export function RegistresLegauxTab() {
  const [view, setView] = useState<SubView>('personnel');
  const [annee, setAnnee] = useState(() => new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [personnel, setPersonnel] = useState<RhRegistrePersonnelLigne[]>([]);
  const [conges, setConges] = useState<RhRegistreCongesLigne[]>([]);
  const [accidents, setAccidents] = useState<RhAccidentTravail[]>([]);
  const [visites, setVisites] = useState<RhVisiteMedicale[]>([]);
  const [ruptures, setRuptures] = useState<RhRuptureContrat[]>([]);
  const [employes, setEmployes] = useState<RhEmploye[]>([]);
  const [showAccidentForm, setShowAccidentForm] = useState(false);
  const [showVisiteForm, setShowVisiteForm] = useState(false);
  const [accidentForm, setAccidentForm] = useState({
    employeId: '',
    dateAccident: new Date().toISOString().slice(0, 10),
    lieu: '',
    nature: '',
    mesuresPrises: '',
    declarationCnas: false,
  });
  const [visiteForm, setVisiteForm] = useState({
    employeId: '',
    typeVisite: 'periodique' as TypeVisiteMedicale,
    dateVisite: new Date().toISOString().slice(0, 10),
    dateEcheance: '',
    medecin: '',
    apte: true,
    restrictions: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [emps, pers, cong, acc, vis, rup] = await Promise.all([
        ipcClient.rh.listEmployes(),
        ipcClient.rh.listRegistrePersonnel(),
        ipcClient.rh.listRegistreConges(annee),
        ipcClient.rh.listAccidentsTravail(),
        ipcClient.rh.listVisitesMedicales(),
        ipcClient.rh.listRupturesContrat(),
      ]);
      setEmployes(unwrapIpc(emps).filter((e) => e.statutRh === 'actif'));
      setPersonnel(unwrapIpc(pers));
      setConges(unwrapIpc(cong));
      setAccidents(unwrapIpc(acc));
      setVisites(unwrapIpc(vis));
      setRuptures(unwrapIpc(rup));
    } finally {
      setLoading(false);
    }
  }, [annee]);

  useEffect(() => {
    void load();
  }, [load]);

  const runExport = async (label: string, fn: () => Promise<{ ok: boolean; data?: RhExportResult; error?: string; errorCode?: string }>) => {
    setBusy(label);
    try {
      const raw = await fn();
      if (!raw.ok) throw new Error(raw.error ?? 'Erreur export');
      const res = raw.data as RhExportResult;
      if (res.ok && res.filePath) alert(`Export enregistré : ${res.filePath}`);
      else if (!res.ok) alert(res.message ?? 'Export annulé.');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur export');
    } finally {
      setBusy('');
    }
  };

  const personnelCols: Column<RhRegistrePersonnelLigne>[] = [
    { key: 'n', header: 'N°', render: (r) => r.numeroOrdre },
    { key: 'nom', header: 'Employé', render: (r) => `${r.prenom} ${r.nom}` },
    { key: 'entree', header: 'Entrée', render: (r) => r.dateEmbauche },
    { key: 'sortie', header: 'Sortie', render: (r) => r.dateSortie ?? '—' },
    { key: 'poste', header: 'Poste', render: (r) => r.posteNom ?? '—' },
    { key: 'nss', header: 'NSS', render: (r) => r.nss ?? '—' },
    { key: 'statut', header: 'Statut', render: (r) => <Badge variant={r.statutRh === 'actif' ? 'success' : 'muted'}>{r.statutRh}</Badge> },
  ];

  const congesCols: Column<RhRegistreCongesLigne>[] = [
    { key: 'emp', header: 'Employé', render: (r) => r.employeNom },
    { key: 'type', header: 'Type', render: (r) => r.type },
    { key: 'acquis', header: 'Acquis', render: (r) => r.acquis },
    { key: 'pris', header: 'Pris', render: (r) => r.pris },
    { key: 'reste', header: 'Reste', render: (r) => r.reste },
  ];

  const accidentCols: Column<RhAccidentTravail>[] = [
    { key: 'date', header: 'Date', render: (r) => r.dateAccident },
    { key: 'emp', header: 'Employé', render: (r) => r.employeNom },
    { key: 'nature', header: 'Nature', render: (r) => r.nature },
    { key: 'lieu', header: 'Lieu', render: (r) => r.lieu ?? '—' },
    { key: 'cnas', header: 'CNAS', render: (r) => (r.declarationCnas ? 'Déclaré' : 'Non') },
  ];

  const visiteCols: Column<RhVisiteMedicale>[] = [
    { key: 'emp', header: 'Employé', render: (r) => r.employeNom },
    { key: 'type', header: 'Type', render: (r) => r.typeVisite },
    { key: 'visite', header: 'Visite', render: (r) => r.dateVisite },
    { key: 'echeance', header: 'Échéance', render: (r) => r.dateEcheance ?? '—' },
    {
      key: 'apte',
      header: 'Résultat',
      render: (r) => (
        <Badge variant={r.apte ? 'success' : 'danger'}>{r.apte ? 'Apte' : 'Inapte'}</Badge>
      ),
    },
  ];

  const ruptureCols: Column<RhRuptureContrat>[] = [
    { key: 'emp', header: 'Employé', render: (r) => r.employeNom },
    { key: 'date', header: 'Sortie', render: (r) => r.dateSortie },
    { key: 'type', header: 'Type', render: (r) => RUPTURE_LABELS[r.typeRupture] },
    { key: 'net', header: 'Net STC', render: (r) => formatMoney(r.netAPayer) },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="outline" title="Certificat de travail" onClick={() => void runExport('cert', () => ipcClient.rh.exportCertificatTravailPdf(r.id))}>
            <FileText className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" title="STC PDF" onClick={() => void runExport('stc', () => ipcClient.rh.exportStcPdf(r.id))}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const submitAccident = async () => {
    if (!accidentForm.employeId || !accidentForm.nature.trim()) return;
    try {
      unwrapIpc(
        await ipcClient.rh.createAccidentTravail({
          employeId: Number(accidentForm.employeId),
          dateAccident: accidentForm.dateAccident,
          lieu: accidentForm.lieu || null,
          nature: accidentForm.nature,
          mesuresPrises: accidentForm.mesuresPrises || null,
          declarationCnas: accidentForm.declarationCnas,
        }),
      );
      setShowAccidentForm(false);
      void load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const submitVisite = async () => {
    if (!visiteForm.employeId) return;
    try {
      unwrapIpc(
        await ipcClient.rh.createVisiteMedicale({
          employeId: Number(visiteForm.employeId),
          typeVisite: visiteForm.typeVisite,
          dateVisite: visiteForm.dateVisite,
          dateEcheance: visiteForm.dateEcheance || null,
          medecin: visiteForm.medecin || null,
          apte: visiteForm.apte,
          restrictions: visiteForm.restrictions || null,
        }),
      );
      setShowVisiteForm(false);
      void load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Registres légaux — conformité Algérie</h2>
        <p className="text-sm text-muted-foreground">
          Registres obligatoires (personnel, congés, accidents, visites médicales) et archives des ruptures/STC.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ['personnel', 'Personnel'],
            ['conges', 'Congés payés'],
            ['accidents', 'Accidents'],
            ['visites', 'Visites médicales'],
            ['ruptures', 'Ruptures & STC'],
          ] as const
        ).map(([id, label]) => (
          <Button key={id} size="sm" variant={view === id ? 'default' : 'outline'} onClick={() => setView(id)}>
            {label}
          </Button>
        ))}
      </div>

      {view === 'personnel' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={!!busy} onClick={() => void runExport('pdf', () => ipcClient.rh.exportRegistrePersonnelPdf())}>
              <Download className="mr-1 h-4 w-4" /> PDF
            </Button>
            <Button size="sm" variant="outline" disabled={!!busy} onClick={() => void runExport('csv', () => ipcClient.rh.exportRegistrePersonnelCsv())}>
              <Download className="mr-1 h-4 w-4" /> CSV
            </Button>
          </div>
          <DataTable columns={personnelCols} data={personnel} keyExtractor={(r) => r.employeId} loading={loading} emptyMessage="Aucun employé." />
        </div>
      )}

      {view === 'conges' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label>Année</Label>
              <Input type="number" className="w-28" value={annee} onChange={(e) => setAnnee(Number(e.target.value))} />
            </div>
            <Button size="sm" variant="outline" disabled={!!busy} onClick={() => void runExport('conges', () => ipcClient.rh.exportRegistreCongesPdf(annee))}>
              <Download className="mr-1 h-4 w-4" /> Export PDF
            </Button>
          </div>
          <DataTable columns={congesCols} data={conges} keyExtractor={(r) => `${r.employeId}-${r.type}`} loading={loading} emptyMessage="Aucun solde — synchronisez les congés légaux (Conformité DZ)." />
        </div>
      )}

      {view === 'accidents' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setShowAccidentForm((v) => !v)}><Plus className="mr-1 h-4 w-4" /> Déclarer</Button>
            <Button size="sm" variant="outline" disabled={!!busy} onClick={() => void runExport('acc', () => ipcClient.rh.exportRegistreAccidentsPdf())}>
              <Download className="mr-1 h-4 w-4" /> PDF
            </Button>
          </div>
          {showAccidentForm && (
            <div className="grid gap-3 rounded-lg border p-4 md:grid-cols-2">
              <div>
                <Label>Employé</Label>
                <select className="w-full rounded-md border px-3 py-2 text-sm" value={accidentForm.employeId} onChange={(e) => setAccidentForm((f) => ({ ...f, employeId: e.target.value }))}>
                  <option value="">—</option>
                  {employes.map((e) => <option key={e.id} value={e.id}>{e.prenom} {e.nom}</option>)}
                </select>
              </div>
              <div><Label>Date</Label><Input type="date" value={accidentForm.dateAccident} onChange={(e) => setAccidentForm((f) => ({ ...f, dateAccident: e.target.value }))} /></div>
              <div><Label>Nature</Label><Input value={accidentForm.nature} onChange={(e) => setAccidentForm((f) => ({ ...f, nature: e.target.value }))} /></div>
              <div><Label>Lieu</Label><Input value={accidentForm.lieu} onChange={(e) => setAccidentForm((f) => ({ ...f, lieu: e.target.value }))} /></div>
              <div className="md:col-span-2"><Label>Mesures prises</Label><Input value={accidentForm.mesuresPrises} onChange={(e) => setAccidentForm((f) => ({ ...f, mesuresPrises: e.target.value }))} /></div>
              <label className="flex items-center gap-2 text-sm md:col-span-2">
                <input type="checkbox" checked={accidentForm.declarationCnas} onChange={(e) => setAccidentForm((f) => ({ ...f, declarationCnas: e.target.checked }))} />
                Déclaration CNAS effectuée
              </label>
              <Button onClick={() => void submitAccident()}>Enregistrer</Button>
            </div>
          )}
          <DataTable columns={accidentCols} data={accidents} keyExtractor={(r) => r.id} loading={loading} emptyMessage="Aucun accident enregistré." />
        </div>
      )}

      {view === 'visites' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setShowVisiteForm((v) => !v)}><Plus className="mr-1 h-4 w-4" /> Ajouter</Button>
            <Button size="sm" variant="outline" disabled={!!busy} onClick={() => void runExport('vis', () => ipcClient.rh.exportRegistreVisitesPdf())}>
              <Download className="mr-1 h-4 w-4" /> PDF
            </Button>
          </div>
          {showVisiteForm && (
            <div className="grid gap-3 rounded-lg border p-4 md:grid-cols-2">
              <div>
                <Label>Employé</Label>
                <select className="w-full rounded-md border px-3 py-2 text-sm" value={visiteForm.employeId} onChange={(e) => setVisiteForm((f) => ({ ...f, employeId: e.target.value }))}>
                  <option value="">—</option>
                  {employes.map((e) => <option key={e.id} value={e.id}>{e.prenom} {e.nom}</option>)}
                </select>
              </div>
              <div>
                <Label>Type</Label>
                <select className="w-full rounded-md border px-3 py-2 text-sm" value={visiteForm.typeVisite} onChange={(e) => setVisiteForm((f) => ({ ...f, typeVisite: e.target.value as TypeVisiteMedicale }))}>
                  <option value="embauche">Embauche</option>
                  <option value="periodique">Périodique</option>
                  <option value="reprise">Reprise</option>
                </select>
              </div>
              <div><Label>Date visite</Label><Input type="date" value={visiteForm.dateVisite} onChange={(e) => setVisiteForm((f) => ({ ...f, dateVisite: e.target.value }))} /></div>
              <div><Label>Échéance</Label><Input type="date" value={visiteForm.dateEcheance} onChange={(e) => setVisiteForm((f) => ({ ...f, dateEcheance: e.target.value }))} /></div>
              <div><Label>Médecin</Label><Input value={visiteForm.medecin} onChange={(e) => setVisiteForm((f) => ({ ...f, medecin: e.target.value }))} /></div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={visiteForm.apte} onChange={(e) => setVisiteForm((f) => ({ ...f, apte: e.target.checked }))} />
                Apte au poste
              </label>
              <Button onClick={() => void submitVisite()}>Enregistrer</Button>
            </div>
          )}
          <DataTable columns={visiteCols} data={visites} keyExtractor={(r) => r.id} loading={loading} emptyMessage="Aucune visite médicale." />
        </div>
      )}

      {view === 'ruptures' && (
        <DataTable columns={ruptureCols} data={ruptures} keyExtractor={(r) => r.id} loading={loading} emptyMessage="Aucune rupture enregistrée — utilisez la fiche employé pour traiter une sortie avec STC." />
      )}
    </div>
  );
}
