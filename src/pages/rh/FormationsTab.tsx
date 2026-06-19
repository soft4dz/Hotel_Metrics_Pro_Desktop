import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, FileUp, GraduationCap, Plus, Star, Trash2 } from 'lucide-react';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import type {
  RhCompetence,
  RhDocument,
  RhEmploye,
  RhEmployeFormation,
  RhEntretien,
  RhFormationCatalog,
  RhPoste,
  RhPosteCompetence,
  StatutEmployeFormation,
  TypeDocumentRh,
  TypeEntretien,
} from '@/shared/types/rh';

type SubTab = 'formations' | 'competences' | 'entretiens' | 'documents';

interface FormationsTabProps {
  initialSub?: SubTab;
  hideDocuments?: boolean;
}

const STATUT_FORMATION: Record<StatutEmployeFormation, 'muted' | 'warning' | 'success' | 'danger' | 'accent'> = {
  planifie: 'muted',
  en_cours: 'accent',
  obtenu: 'success',
  expire: 'danger',
  annule: 'muted',
};

const DOC_TYPES: TypeDocumentRh[] = ['cv', 'contrat', 'certificat', 'identite', 'autre'];
const ENTRETIEN_TYPES: TypeEntretien[] = ['annuel', 'probatoire', 'mi_parcours', 'sortie'];

export function FormationsTab({ initialSub = 'formations', hideDocuments = false }: FormationsTabProps) {
  const [sub, setSub] = useState<SubTab>(initialSub);
  const [loading, setLoading] = useState(true);
  const [catalog, setCatalog] = useState<RhFormationCatalog[]>([]);
  const [suivis, setSuivis] = useState<RhEmployeFormation[]>([]);
  const [competences, setCompetences] = useState<RhCompetence[]>([]);
  const [posteCompetences, setPosteCompetences] = useState<RhPosteCompetence[]>([]);
  const [entretiens, setEntretiens] = useState<RhEntretien[]>([]);
  const [documents, setDocuments] = useState<RhDocument[]>([]);
  const [employes, setEmployes] = useState<RhEmploye[]>([]);
  const [postes, setPostes] = useState<RhPoste[]>([]);
  const [filtreEcheance, setFiltreEcheance] = useState(false);

  const [assignForm, setAssignForm] = useState({ employeId: '', formationId: '', statut: 'planifie' as StatutEmployeFormation });
  const [matricePosteId, setMatricePosteId] = useState('');
  const [matriceCompId, setMatriceCompId] = useState('');
  const [matriceNiveau, setMatriceNiveau] = useState('3');
  const [entretienForm, setEntretienForm] = useState({
    employeId: '',
    date: new Date().toISOString().slice(0, 10),
    type: 'annuel' as TypeEntretien,
    evaluateurId: '',
  });
  const [docForm, setDocForm] = useState({ employeId: '', type: 'certificat' as TypeDocumentRh });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cat, su, comp, pc, ent, docs, emps, pts] = await Promise.all([
        ipcClient.rh.listFormationsCatalog(),
        ipcClient.rh.listEmployeFormations(filtreEcheance ? { echeanceProche: true } : undefined),
        ipcClient.rh.listCompetences(),
        ipcClient.rh.listPosteCompetences(matricePosteId ? Number(matricePosteId) : undefined),
        ipcClient.rh.listEntretiens(),
        ipcClient.rh.listRhDocuments(),
        ipcClient.rh.listEmployes(),
        ipcClient.rh.listPostes(),
      ]);
      setCatalog(unwrapIpc(cat));
      setSuivis(unwrapIpc(su));
      setCompetences(unwrapIpc(comp));
      setPosteCompetences(unwrapIpc(pc));
      setEntretiens(unwrapIpc(ent));
      setDocuments(unwrapIpc(docs));
      setEmployes(unwrapIpc(emps).filter((e) => e.statutRh === 'actif'));
      setPostes(unwrapIpc(pts).filter((p) => p.actif));
    } finally {
      setLoading(false);
    }
  }, [filtreEcheance, matricePosteId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setSub(initialSub);
  }, [initialSub]);

  const suivisColumns: Column<RhEmployeFormation>[] = [
    { key: 'emp', header: 'Employé', render: (s) => s.employeNom },
    { key: 'form', header: 'Formation', render: (s) => <span>{s.formationLibelle} <span className="text-muted-foreground text-xs">({s.formationCode})</span></span> },
    { key: 'echeance', header: 'Échéance', render: (s) => s.dateEcheance ?? '—' },
    {
      key: 'statut',
      header: 'Statut',
      render: (s) => <Badge variant={STATUT_FORMATION[s.statut]}>{s.statut}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      render: (s) => (
        <div className="flex gap-1 justify-end">
          {s.statut !== 'obtenu' && (
            <Button size="sm" variant="outline" onClick={() => void (async () => {
              unwrapIpc(await ipcClient.rh.updateEmployeFormation(s.id, {
                statut: 'obtenu',
                dateObtention: new Date().toISOString().slice(0, 10),
              }));
              void load();
            })()}>
              Valider
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => void (async () => {
            if (!window.confirm('Supprimer ce suivi ?')) return;
            unwrapIpc(await ipcClient.rh.deleteEmployeFormation(s.id));
            void load();
          })()}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const entretienColumns: Column<RhEntretien>[] = [
    { key: 'emp', header: 'Employé', render: (e) => e.employeNom },
    { key: 'date', header: 'Date', render: (e) => e.dateEntretien },
    { key: 'type', header: 'Type', render: (e) => e.type },
    { key: 'eval', header: 'Évaluateur', render: (e) => e.evaluateurNom ?? '—' },
    { key: 'note', header: 'Note', render: (e) => (e.noteGlobale != null ? `${e.noteGlobale}/5` : '—') },
    {
      key: 'statut',
      header: 'Statut',
      render: (e) => <Badge variant={e.statut === 'realise' ? 'success' : e.statut === 'planifie' ? 'warning' : 'muted'}>{e.statut}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      render: (e) => e.statut === 'planifie' ? (
        <Button size="sm" variant="outline" onClick={() => void (async () => {
          unwrapIpc(await ipcClient.rh.updateEntretien(e.id, { statut: 'realise', noteGlobale: 3 }));
          void load();
        })()}>
          Réalisé
        </Button>
      ) : null,
    },
  ];

  const docColumns: Column<RhDocument>[] = [
    { key: 'emp', header: 'Employé', render: (d) => d.employeNom },
    { key: 'type', header: 'Type', render: (d) => d.type },
    { key: 'nom', header: 'Nom', render: (d) => d.nom },
    { key: 'date', header: 'Ajouté', render: (d) => d.createdAt.slice(0, 10) },
    {
      key: 'actions',
      header: '',
      render: (d) => (
        <div className="flex gap-1 justify-end">
          <Button size="sm" variant="ghost" onClick={() => void ipcClient.rh.openRhDocument(d.id)}>
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => void (async () => {
            if (!window.confirm('Supprimer ce document ?')) return;
            unwrapIpc(await ipcClient.rh.deleteRhDocument(d.id));
            void load();
          })()}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {!hideDocuments && (
        <div className="flex flex-wrap gap-2">
          {(['formations', 'competences', 'entretiens', 'documents'] as const).map((t) => (
            <Button key={t} size="sm" variant={sub === t ? 'default' : 'outline'} onClick={() => setSub(t)}>
              {t === 'formations' ? 'Formations' : t === 'competences' ? 'Compétences' : t === 'entretiens' ? 'Entretiens' : 'Documents'}
            </Button>
          ))}
        </div>
      )}

      {sub === 'formations' && (
        <div className="space-y-4">
          <div className="rounded-lg border p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label>Employé</Label>
              <select className="mt-1 w-full rounded-md border px-3 py-2 text-sm" value={assignForm.employeId} onChange={(e) => setAssignForm((f) => ({ ...f, employeId: e.target.value }))}>
                <option value="">—</option>
                {employes.map((e) => <option key={e.id} value={e.id}>{e.prenom} {e.nom}</option>)}
              </select>
            </div>
            <div>
              <Label>Formation</Label>
              <select className="mt-1 w-full rounded-md border px-3 py-2 text-sm" value={assignForm.formationId} onChange={(e) => setAssignForm((f) => ({ ...f, formationId: e.target.value }))}>
                <option value="">—</option>
                {catalog.map((f) => <option key={f.id} value={f.id}>{f.libelle}{f.obligatoire ? ' *' : ''}</option>)}
              </select>
            </div>
            <div>
              <Label>Statut initial</Label>
              <select className="mt-1 w-full rounded-md border px-3 py-2 text-sm" value={assignForm.statut} onChange={(e) => setAssignForm((f) => ({ ...f, statut: e.target.value as StatutEmployeFormation }))}>
                <option value="planifie">Planifié</option>
                <option value="en_cours">En cours</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => void (async () => {
                  if (!assignForm.employeId || !assignForm.formationId) return;
                  unwrapIpc(await ipcClient.rh.assignEmployeFormation({
                    employeId: Number(assignForm.employeId),
                    formationId: Number(assignForm.formationId),
                    statut: assignForm.statut,
                  }));
                  setAssignForm({ employeId: '', formationId: '', statut: 'planifie' });
                  void load();
                })()}
              >
                <Plus className="mr-1 h-4 w-4" />
                Assigner
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="filtre-echeance" checked={filtreEcheance} onChange={(e) => setFiltreEcheance(e.target.checked)} />
            <Label htmlFor="filtre-echeance">Échéances dans les 90 prochains jours</Label>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <DataTable columns={suivisColumns} data={suivis} keyExtractor={(s) => s.id} loading={loading} emptyMessage="Aucun suivi formation." />
            </div>
            <div className="rounded-lg border p-4 space-y-2">
              <h3 className="font-semibold flex items-center gap-2"><GraduationCap className="h-4 w-4" /> Catalogue</h3>
              <ul className="text-sm divide-y max-h-80 overflow-y-auto">
                {catalog.map((f) => (
                  <li key={f.id} className="py-2">
                    <span className="font-medium">{f.code}</span> — {f.libelle}
                    {f.obligatoire && <Badge variant="warning" className="ml-2">Obligatoire</Badge>}
                    {f.validiteMois && <p className="text-xs text-muted-foreground">Validité : {f.validiteMois} mois</p>}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {sub === 'competences' && (
        <div className="space-y-4">
          <div className="rounded-lg border p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label>Poste</Label>
              <select className="mt-1 w-full rounded-md border px-3 py-2 text-sm" value={matricePosteId} onChange={(e) => setMatricePosteId(e.target.value)}>
                <option value="">Tous les postes</option>
                {postes.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
              </select>
            </div>
            <div>
              <Label>Compétence</Label>
              <select className="mt-1 w-full rounded-md border px-3 py-2 text-sm" value={matriceCompId} onChange={(e) => setMatriceCompId(e.target.value)}>
                <option value="">—</option>
                {competences.map((c) => <option key={c.id} value={c.id}>{c.libelle}</option>)}
              </select>
            </div>
            <div>
              <Label>Niveau requis (1-5)</Label>
              <Input type="number" min={1} max={5} value={matriceNiveau} onChange={(e) => setMatriceNiveau(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button
                disabled={!matricePosteId || !matriceCompId}
                onClick={() => void (async () => {
                  unwrapIpc(await ipcClient.rh.setPosteCompetence({
                    posteId: Number(matricePosteId),
                    competenceId: Number(matriceCompId),
                    niveauRequis: Number(matriceNiveau),
                  }));
                  void load();
                })()}
              >
                <Star className="mr-1 h-4 w-4" />
                Lier au poste
              </Button>
            </div>
          </div>
          <ul className="text-sm divide-y border rounded-lg">
            {posteCompetences.length === 0 ? (
              <li className="p-3 text-muted-foreground">Aucune compétence liée.</li>
            ) : (
              posteCompetences.map((pc) => (
                <li key={pc.id} className="p-3 flex justify-between items-center">
                  <span><strong>{pc.posteNom}</strong> — {pc.competenceLibelle} (niveau {pc.niveauRequis}/5)</span>
                  <Button size="sm" variant="ghost" onClick={() => void (async () => {
                    unwrapIpc(await ipcClient.rh.removePosteCompetence(pc.id));
                    void load();
                  })()}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))
            )}
          </ul>
          <div className="text-xs text-muted-foreground">
            Référentiel : {competences.map((c) => c.code).join(', ')}
          </div>
        </div>
      )}

      {sub === 'entretiens' && (
        <div className="space-y-4">
          <div className="rounded-lg border p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <Label>Employé</Label>
              <select className="mt-1 w-full rounded-md border px-3 py-2 text-sm" value={entretienForm.employeId} onChange={(e) => setEntretienForm((f) => ({ ...f, employeId: e.target.value }))}>
                <option value="">—</option>
                {employes.map((e) => <option key={e.id} value={e.id}>{e.prenom} {e.nom}</option>)}
              </select>
            </div>
            <div><Label>Date</Label><Input type="date" value={entretienForm.date} onChange={(e) => setEntretienForm((f) => ({ ...f, date: e.target.value }))} /></div>
            <div>
              <Label>Type</Label>
              <select className="mt-1 w-full rounded-md border px-3 py-2 text-sm" value={entretienForm.type} onChange={(e) => setEntretienForm((f) => ({ ...f, type: e.target.value as TypeEntretien }))}>
                {ENTRETIEN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <Label>Évaluateur</Label>
              <select className="mt-1 w-full rounded-md border px-3 py-2 text-sm" value={entretienForm.evaluateurId} onChange={(e) => setEntretienForm((f) => ({ ...f, evaluateurId: e.target.value }))}>
                <option value="">—</option>
                {employes.map((e) => <option key={e.id} value={e.id}>{e.prenom} {e.nom}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => void (async () => {
                  if (!entretienForm.employeId) return;
                  unwrapIpc(await ipcClient.rh.createEntretien({
                    employeId: Number(entretienForm.employeId),
                    dateEntretien: entretienForm.date,
                    type: entretienForm.type,
                    evaluateurEmployeId: entretienForm.evaluateurId ? Number(entretienForm.evaluateurId) : null,
                  }));
                  setEntretienForm({ employeId: '', date: new Date().toISOString().slice(0, 10), type: 'annuel', evaluateurId: '' });
                  void load();
                })()}
              >
                <Plus className="mr-1 h-4 w-4" />
                Planifier
              </Button>
            </div>
          </div>
          <DataTable columns={entretienColumns} data={entretiens} keyExtractor={(e) => e.id} loading={loading} emptyMessage="Aucun entretien." />
        </div>
      )}

      {sub === 'documents' && (
        <div className="space-y-4">
          <div className="rounded-lg border p-4 flex flex-wrap gap-4 items-end">
            <div>
              <Label>Employé</Label>
              <select className="mt-1 w-48 rounded-md border px-3 py-2 text-sm" value={docForm.employeId} onChange={(e) => setDocForm((f) => ({ ...f, employeId: e.target.value }))}>
                <option value="">—</option>
                {employes.map((e) => <option key={e.id} value={e.id}>{e.prenom} {e.nom}</option>)}
              </select>
            </div>
            <div>
              <Label>Type</Label>
              <select className="mt-1 w-40 rounded-md border px-3 py-2 text-sm" value={docForm.type} onChange={(e) => setDocForm((f) => ({ ...f, type: e.target.value as TypeDocumentRh }))}>
                {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <Button
              disabled={!docForm.employeId}
              onClick={() => void (async () => {
                try {
                  unwrapIpc(await ipcClient.rh.uploadRhDocument(Number(docForm.employeId), docForm.type));
                  void load();
                } catch (e) {
                  alert(e instanceof Error ? e.message : 'Erreur');
                }
              })()}
            >
              <FileUp className="mr-2 h-4 w-4" />
              Importer un fichier
            </Button>
          </div>
          <DataTable columns={docColumns} data={documents} keyExtractor={(d) => d.id} loading={loading} emptyMessage="Aucun document RH." />
        </div>
      )}
    </div>
  );
}
