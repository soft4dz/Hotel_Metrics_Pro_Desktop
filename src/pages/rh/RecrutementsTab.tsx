import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Briefcase,
  Calendar,
  Check,
  ChevronRight,
  LayoutGrid,
  List,
  Plus,
  X,
} from 'lucide-react';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import type {
  EtapeRecrutement,
  RhOffreEmploi,
  RhPipelineRecrutement,
  RhPoste,
  RhRecrutement,
  RhRecrutementEntretien,
  RhRecrutementHistorique,
  StatutOffreEmploi,
  TypeEntretienRecrutement,
} from '@/shared/types/rh';

type ViewMode = 'pipeline' | 'offres' | 'liste';

const ETAPES: { id: EtapeRecrutement; label: string }[] = [
  { id: 'candidature', label: 'Candidature' },
  { id: 'preselection', label: 'Présélection' },
  { id: 'entretien_rh', label: 'Entretien RH' },
  { id: 'entretien_metier', label: 'Entretien métier' },
  { id: 'proposition', label: 'Proposition' },
  { id: 'embauche', label: 'Embauche' },
  { id: 'refuse', label: 'Refusé' },
];

const ETAPES_ACTIVES: EtapeRecrutement[] = [
  'candidature',
  'preselection',
  'entretien_rh',
  'entretien_metier',
  'proposition',
];

const OFFRE_STATUT_BADGE: Record<StatutOffreEmploi, 'muted' | 'warning' | 'success' | 'accent'> = {
  brouillon: 'muted',
  publiee: 'success',
  pourvue: 'accent',
  archivee: 'muted',
};

function candidatLabel(r: RhRecrutement): string {
  return [r.candidatPrenom, r.candidatNom].filter(Boolean).join(' ');
}

function nextEtape(etape: EtapeRecrutement): EtapeRecrutement | null {
  const idx = ETAPES_ACTIVES.indexOf(etape);
  if (idx < 0 || idx >= ETAPES_ACTIVES.length - 1) return null;
  return ETAPES_ACTIVES[idx + 1];
}

export function RecrutementsTab() {
  const [searchParams] = useSearchParams();
  const [view, setView] = useState<ViewMode>('pipeline');
  const [pipeline, setPipeline] = useState<RhPipelineRecrutement | null>(null);
  const [items, setItems] = useState<RhRecrutement[]>([]);
  const [offres, setOffres] = useState<RhOffreEmploi[]>([]);
  const [postes, setPostes] = useState<RhPoste[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterOffreId, setFilterOffreId] = useState<number | ''>('');
  const [selected, setSelected] = useState<RhRecrutement | null>(null);
  const [entretiens, setEntretiens] = useState<RhRecrutementEntretien[]>([]);
  const [historique, setHistorique] = useState<RhRecrutementHistorique[]>([]);
  const [showCandidatForm, setShowCandidatForm] = useState(false);
  const [showOffreForm, setShowOffreForm] = useState(false);
  const [busy, setBusy] = useState('');

  const [candidatForm, setCandidatForm] = useState({
    posteId: '',
    offreId: '',
    candidatNom: '',
    candidatPrenom: '',
    candidatEmail: '',
    candidatTelephone: '',
    source: '',
    notes: '',
  });

  const [offreForm, setOffreForm] = useState({
    posteId: '',
    titre: '',
    description: '',
    nbPostes: '1',
    statut: 'publiee' as StatutOffreEmploi,
  });

  const [entretienForm, setEntretienForm] = useState({
    type: 'rh' as TypeEntretienRecrutement,
    dateHeure: '',
    lieu: '',
    notes: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const offreFilter = filterOffreId === '' ? undefined : Number(filterOffreId);
      const [pipe, recs, ofs, pts] = await Promise.all([
        ipcClient.rh.getPipelineRecrutement(offreFilter),
        ipcClient.rh.listRecrutements(),
        ipcClient.rh.listOffresEmploi(),
        ipcClient.rh.listPostes(),
      ]);
      setPipeline(unwrapIpc(pipe));
      setItems(unwrapIpc(recs));
      setOffres(unwrapIpc(ofs));
      setPostes(unwrapIpc(pts));
    } finally {
      setLoading(false);
    }
  }, [filterOffreId]);

  const loadDetail = useCallback(async (rec: RhRecrutement) => {
    const [ents, hist] = await Promise.all([
      ipcClient.rh.listEntretiensRecrutement(rec.id),
      ipcClient.rh.listHistoriqueCandidature(rec.id),
    ]);
    setEntretiens(unwrapIpc(ents));
    setHistorique(unwrapIpc(hist));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const posteId = searchParams.get('posteId');
    const notes = searchParams.get('notes');
    if (posteId) {
      setShowCandidatForm(true);
      setCandidatForm((f) => ({
        ...f,
        posteId,
        candidatNom: 'À pourvoir',
        notes: notes ?? '',
      }));
    }
  }, [searchParams]);

  useEffect(() => {
    if (selected) void loadDetail(selected);
  }, [selected, loadDetail]);

  const pipelineColumns = useMemo(() => {
    if (!pipeline) return [];
    return ETAPES.map((e) => ({
      ...e,
      items: pipeline[e.id] ?? [],
    }));
  }, [pipeline]);

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

  const handleCreateCandidat = () =>
    run('candidat', async () => {
      if (!candidatForm.candidatNom.trim()) return;
      const posteId = candidatForm.offreId
        ? offres.find((o) => o.id === Number(candidatForm.offreId))?.posteId
        : Number(candidatForm.posteId);
      if (!posteId) {
        alert('Sélectionnez un poste ou une offre.');
        return;
      }
      unwrapIpc(
        await ipcClient.rh.createCandidature({
          posteId,
          offreId: candidatForm.offreId ? Number(candidatForm.offreId) : null,
          candidatNom: candidatForm.candidatNom.trim(),
          candidatPrenom: candidatForm.candidatPrenom.trim() || null,
          candidatEmail: candidatForm.candidatEmail.trim() || null,
          candidatTelephone: candidatForm.candidatTelephone.trim() || null,
          source: candidatForm.source.trim() || null,
          notes: candidatForm.notes.trim() || null,
        }),
      );
      setShowCandidatForm(false);
      setCandidatForm({
        posteId: '',
        offreId: '',
        candidatNom: '',
        candidatPrenom: '',
        candidatEmail: '',
        candidatTelephone: '',
        source: '',
        notes: '',
      });
      void load();
    });

  const handleCreateOffre = () =>
    run('offre', async () => {
      if (!offreForm.posteId || !offreForm.titre.trim()) return;
      unwrapIpc(
        await ipcClient.rh.createOffreEmploi({
          posteId: Number(offreForm.posteId),
          titre: offreForm.titre.trim(),
          description: offreForm.description.trim() || null,
          nbPostes: Number(offreForm.nbPostes) || 1,
          statut: offreForm.statut,
          dateOuverture: new Date().toISOString().slice(0, 10),
        }),
      );
      setShowOffreForm(false);
      setOffreForm({ posteId: '', titre: '', description: '', nbPostes: '1', statut: 'publiee' });
      void load();
    });

  const handleAvancer = (rec: RhRecrutement, etape: EtapeRecrutement) =>
    run(`avancer-${rec.id}`, async () => {
      const msg =
        etape === 'embauche'
          ? 'Confirmer l\'embauche ? Un employé et un compte en attente seront créés.'
          : etape === 'refuse'
            ? undefined
            : `Passer à l'étape « ${ETAPES.find((e) => e.id === etape)?.label} » ?`;
      if (etape === 'embauche' && !window.confirm(msg)) return;
      if (etape === 'refuse') {
        const motif = window.prompt('Motif du refus (optionnel) :');
        if (motif === null) return;
        unwrapIpc(await ipcClient.rh.avancerCandidature({ recrutementId: rec.id, etape, commentaire: motif }));
      } else {
        unwrapIpc(await ipcClient.rh.avancerCandidature({ recrutementId: rec.id, etape }));
      }
      setSelected(null);
      void load();
    });

  const handleCreateEntretien = () =>
    run('entretien', async () => {
      if (!selected || !entretienForm.dateHeure) return;
      unwrapIpc(
        await ipcClient.rh.createEntretienRecrutement({
          recrutementId: selected.id,
          type: entretienForm.type,
          dateHeure: entretienForm.dateHeure,
          lieu: entretienForm.lieu.trim() || null,
          notes: entretienForm.notes.trim() || null,
        }),
      );
      setEntretienForm({ type: 'rh', dateHeure: '', lieu: '', notes: '' });
      void loadDetail(selected);
    });

  const etapeBadge = (etape: EtapeRecrutement) => {
    const label = ETAPES.find((e) => e.id === etape)?.label ?? etape;
    if (etape === 'embauche') return <Badge variant="success">{label}</Badge>;
    if (etape === 'refuse') return <Badge variant="muted">{label}</Badge>;
    return <Badge variant="warning">{label}</Badge>;
  };

  const listeColumns: Column<RhRecrutement>[] = [
    {
      key: 'candidat',
      header: 'Candidat',
      render: (r) => (
        <button type="button" className="text-left" onClick={() => setSelected(r)}>
          <p className="font-medium">{candidatLabel(r)}</p>
          <p className="text-xs text-muted-foreground">{r.candidatEmail ?? '—'}</p>
        </button>
      ),
    },
    { key: 'poste', header: 'Poste', render: (r) => `${r.posteNom} (${r.departementNom})` },
    { key: 'offre', header: 'Offre', render: (r) => r.offreTitre ?? '—' },
    { key: 'etape', header: 'Étape', render: (r) => etapeBadge(r.etape) },
    { key: 'source', header: 'Source', render: (r) => r.source ?? '—' },
  ];

  const offreColumns: Column<RhOffreEmploi>[] = [
    { key: 'titre', header: 'Titre', render: (o) => <span className="font-medium">{o.titre}</span> },
    { key: 'poste', header: 'Poste', render: (o) => `${o.posteNom} — ${o.departementNom}` },
    { key: 'statut', header: 'Statut', render: (o) => <Badge variant={OFFRE_STATUT_BADGE[o.statut]}>{o.statut}</Badge> },
    { key: 'candidats', header: 'Candidats', render: (o) => String(o.nbCandidatures) },
    {
      key: 'actions',
      header: '',
      render: (o) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setFilterOffreId(o.id);
            setView('pipeline');
          }}
        >
          Voir pipeline
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {([
            { id: 'pipeline' as const, label: 'Pipeline', icon: LayoutGrid },
            { id: 'offres' as const, label: 'Offres', icon: Briefcase },
            { id: 'liste' as const, label: 'Liste', icon: List },
          ]).map(({ id, label, icon: Icon }) => (
            <Button key={id} size="sm" variant={view === id ? 'default' : 'outline'} onClick={() => setView(id)}>
              <Icon className="mr-2 h-4 w-4" />
              {label}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {view === 'pipeline' && (
            <select
              className="rounded-md border px-3 py-2 text-sm"
              value={filterOffreId}
              onChange={(e) => setFilterOffreId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">Toutes les offres</option>
              {offres.map((o) => (
                <option key={o.id} value={o.id}>{o.titre}</option>
              ))}
            </select>
          )}
          <Button variant="outline" onClick={() => setShowOffreForm((v) => !v)}>
            <Briefcase className="mr-2 h-4 w-4" />
            Nouvelle offre
          </Button>
          <Button onClick={() => setShowCandidatForm((v) => !v)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle candidature
          </Button>
        </div>
      </div>

      {showOffreForm && (
        <div className="rounded-lg border bg-card p-4 grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Poste</Label>
            <select
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              value={offreForm.posteId}
              onChange={(e) => setOffreForm((f) => ({ ...f, posteId: e.target.value }))}
            >
              <option value="">— Sélectionner —</option>
              {postes.map((p) => (
                <option key={p.id} value={p.id}>{p.nom} — {p.departementNom}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Titre de l&apos;offre</Label>
            <Input value={offreForm.titre} onChange={(e) => setOffreForm((f) => ({ ...f, titre: e.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <Label>Description</Label>
            <Input value={offreForm.description} onChange={(e) => setOffreForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="sm:col-span-2 flex gap-2">
            <Button disabled={!!busy} onClick={() => void handleCreateOffre()}>Publier l&apos;offre</Button>
            <Button variant="outline" onClick={() => setShowOffreForm(false)}>Annuler</Button>
          </div>
        </div>
      )}

      {showCandidatForm && (
        <div className="rounded-lg border bg-card p-4 grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Offre (optionnel)</Label>
            <select
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              value={candidatForm.offreId}
              onChange={(e) => setCandidatForm((f) => ({ ...f, offreId: e.target.value }))}
            >
              <option value="">— Sans offre —</option>
              {offres.filter((o) => o.statut === 'publiee' || o.statut === 'brouillon').map((o) => (
                <option key={o.id} value={o.id}>{o.titre}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Poste {!candidatForm.offreId && '*'}</Label>
            <select
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              value={candidatForm.posteId}
              disabled={!!candidatForm.offreId}
              onChange={(e) => setCandidatForm((f) => ({ ...f, posteId: e.target.value }))}
            >
              <option value="">— Sélectionner —</option>
              {postes.map((p) => (
                <option key={p.id} value={p.id}>{p.nom} — {p.departementNom}</option>
              ))}
            </select>
          </div>
          <div><Label>Nom *</Label><Input value={candidatForm.candidatNom} onChange={(e) => setCandidatForm((f) => ({ ...f, candidatNom: e.target.value }))} /></div>
          <div><Label>Prénom</Label><Input value={candidatForm.candidatPrenom} onChange={(e) => setCandidatForm((f) => ({ ...f, candidatPrenom: e.target.value }))} /></div>
          <div><Label>E-mail</Label><Input type="email" value={candidatForm.candidatEmail} onChange={(e) => setCandidatForm((f) => ({ ...f, candidatEmail: e.target.value }))} /></div>
          <div><Label>Téléphone</Label><Input value={candidatForm.candidatTelephone} onChange={(e) => setCandidatForm((f) => ({ ...f, candidatTelephone: e.target.value }))} /></div>
          <div><Label>Source</Label><Input placeholder="LinkedIn, cooptation…" value={candidatForm.source} onChange={(e) => setCandidatForm((f) => ({ ...f, source: e.target.value }))} /></div>
          <div className="sm:col-span-2"><Label>Notes</Label><Input value={candidatForm.notes} onChange={(e) => setCandidatForm((f) => ({ ...f, notes: e.target.value }))} /></div>
          <div className="sm:col-span-2 flex gap-2">
            <Button disabled={!!busy} onClick={() => void handleCreateCandidat()}>Enregistrer</Button>
            <Button variant="outline" onClick={() => setShowCandidatForm(false)}>Annuler</Button>
          </div>
        </div>
      )}

      {view === 'pipeline' && (
        <div className="overflow-x-auto pb-2">
          {loading ? (
            <p className="text-sm text-muted-foreground">Chargement du pipeline…</p>
          ) : (
            <div className="flex gap-3 min-w-max">
              {pipelineColumns.map((col) => (
                <div key={col.id} className="w-56 shrink-0 rounded-lg border bg-muted/20">
                  <div className="border-b px-3 py-2 flex items-center justify-between">
                    <span className="text-sm font-semibold">{col.label}</span>
                    <Badge variant="muted">{col.items.length}</Badge>
                  </div>
                  <div className="p-2 space-y-2 min-h-[120px]">
                    {col.items.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        className="w-full rounded-md border bg-card p-2 text-left hover:border-primary/50 transition-colors"
                        onClick={() => setSelected(r)}
                      >
                        <p className="text-sm font-medium truncate">{candidatLabel(r)}</p>
                        <p className="text-xs text-muted-foreground truncate">{r.posteNom}</p>
                        {r.source && <p className="text-xs text-muted-foreground mt-1">{r.source}</p>}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {view === 'offres' && (
        <DataTable columns={offreColumns} data={offres} keyExtractor={(o) => o.id} loading={loading} emptyMessage="Aucune offre." />
      )}

      {view === 'liste' && (
        <DataTable columns={listeColumns} data={items} keyExtractor={(r) => r.id} loading={loading} emptyMessage="Aucune candidature." />
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border bg-background shadow-lg">
            <div className="flex items-start justify-between border-b p-4">
              <div>
                <h3 className="text-lg font-semibold">{candidatLabel(selected)}</h3>
                <p className="text-sm text-muted-foreground">{selected.posteNom} — {selected.departementNom}</p>
                <div className="mt-2">{etapeBadge(selected.etape)}</div>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setSelected(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4 p-4">
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <p><span className="text-muted-foreground">E-mail :</span> {selected.candidatEmail ?? '—'}</p>
                <p><span className="text-muted-foreground">Tél. :</span> {selected.candidatTelephone ?? '—'}</p>
                <p><span className="text-muted-foreground">Offre :</span> {selected.offreTitre ?? '—'}</p>
                <p><span className="text-muted-foreground">Source :</span> {selected.source ?? '—'}</p>
              </div>

              {selected.statut === 'en_cours' && (
                <div className="flex flex-wrap gap-2">
                  {nextEtape(selected.etape) && (
                    <Button
                      size="sm"
                      disabled={!!busy}
                      onClick={() => void handleAvancer(selected, nextEtape(selected.etape)!)}
                    >
                      <ChevronRight className="mr-1 h-4 w-4" />
                      {ETAPES.find((e) => e.id === nextEtape(selected.etape))?.label}
                    </Button>
                  )}
                  {selected.etape === 'proposition' && (
                    <Button size="sm" variant="default" disabled={!!busy} onClick={() => void handleAvancer(selected, 'embauche')}>
                      <Check className="mr-1 h-4 w-4" />
                      Embaucher
                    </Button>
                  )}
                  <Button size="sm" variant="outline" disabled={!!busy} onClick={() => void handleAvancer(selected, 'refuse')}>
                    Refuser
                  </Button>
                </div>
              )}

              {selected.statut === 'en_cours' && (
                <div className="rounded-lg border p-3 space-y-3">
                  <h4 className="font-medium flex items-center gap-2"><Calendar className="h-4 w-4" /> Entretiens</h4>
                  {entretiens.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucun entretien planifié.</p>
                  ) : (
                    <ul className="space-y-2 text-sm">
                      {entretiens.map((en) => (
                        <li key={en.id} className="flex justify-between gap-2 border-b pb-2">
                          <span>{en.type} — {new Date(en.dateHeure).toLocaleString('fr-FR')}</span>
                          <Badge variant={en.statut === 'realise' ? 'success' : 'muted'}>{en.statut}</Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <Label>Type</Label>
                      <select
                        className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                        value={entretienForm.type}
                        onChange={(e) => setEntretienForm((f) => ({ ...f, type: e.target.value as TypeEntretienRecrutement }))}
                      >
                        <option value="telephone">Téléphone</option>
                        <option value="rh">RH</option>
                        <option value="technique">Technique</option>
                        <option value="direction">Direction</option>
                        <option value="autre">Autre</option>
                      </select>
                    </div>
                    <div>
                      <Label>Date et heure</Label>
                      <Input
                        type="datetime-local"
                        value={entretienForm.dateHeure}
                        onChange={(e) => setEntretienForm((f) => ({ ...f, dateHeure: e.target.value }))}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Lieu / lien</Label>
                      <Input value={entretienForm.lieu} onChange={(e) => setEntretienForm((f) => ({ ...f, lieu: e.target.value }))} />
                    </div>
                  </div>
                  <Button size="sm" disabled={!!busy} onClick={() => void handleCreateEntretien()}>
                    Planifier entretien
                  </Button>
                </div>
              )}

              {historique.length > 0 && (
                <div className="rounded-lg border p-3">
                  <h4 className="font-medium mb-2 flex items-center gap-2"><ArrowRight className="h-4 w-4" /> Historique</h4>
                  <ul className="space-y-1 text-sm">
                    {historique.map((h) => (
                      <li key={h.id} className="text-muted-foreground">
                        {new Date(h.createdAt).toLocaleString('fr-FR')} — {h.etapeAvant ?? '—'} → {h.etapeApres}
                        {h.commentaire && ` (${h.commentaire})`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
