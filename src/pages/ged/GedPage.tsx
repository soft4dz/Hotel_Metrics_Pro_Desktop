import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, ExternalLink, FileSignature, FileText, History, ScanText, Search, ShieldCheck, Upload } from 'lucide-react';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { notify } from '@/lib/toast';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface GedDocument { id: number; titre: string; categorieLabel: string | null; nomFichier: string; taille: number | null; statut: string; version: string; confidentiel: boolean; uploaderNom: string | null; createdAt: string }
interface GedCategorie { id: number; label: string }
interface GedVersion { id: number; nom_fichier: string; version: string; content_hash: string | null; is_current: number }
interface GedSignature { id: number; signataire_nom: string; role_code: string; signature_hash: string; statut: string; signed_at: string }
interface OcrResult { id: number; titre: string; extrait: string }

function formatBytes(value: number | null) {
  if (!value) return '—';
  if (value < 1024) return `${value} o`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} Ko`;
  return `${(value / 1024 / 1024).toFixed(1)} Mo`;
}

export default function GedPage() {
  const qc = useQueryClient();
  const [categorieId, setCategorieId] = useState<number>();
  const [search, setSearch] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [selected, setSelected] = useState<GedDocument | null>(null);
  const [ocrText, setOcrText] = useState('');
  const [ocrSearch, setOcrSearch] = useState('');
  const [ocrResults, setOcrResults] = useState<OcrResult[]>([]);
  const [form, setForm] = useState({ titre: '', description: '', categorieId: 0, confidentiel: false });

  const { data: categories = [] } = useQuery({ queryKey: ['ged-categories'], queryFn: async () => unwrapIpc(await ipcClient.ged.listCategories()) as GedCategorie[] });
  const { data: documents = [], isLoading } = useQuery({ queryKey: ['ged-documents', categorieId, search], queryFn: async () => unwrapIpc(await ipcClient.ged.listDocuments(undefined, categorieId, search || undefined)) as GedDocument[] });
  const { data: versions = [] } = useQuery({ queryKey: ['ged-versions', selected?.id], queryFn: async () => unwrapIpc(await ipcClient.ged.listVersions(selected!.id)) as unknown as GedVersion[], enabled: Boolean(selected) });
  const { data: signatures = [] } = useQuery({ queryKey: ['ged-signatures', selected?.id], queryFn: async () => unwrapIpc(await ipcClient.ged.listSignatures(selected!.id)) as unknown as GedSignature[], enabled: Boolean(selected) });

  const upload = useMutation({ mutationFn: async () => unwrapIpc(await ipcClient.ged.upload({ ...form, categorieId: form.categorieId || undefined })), onSuccess: () => { void qc.invalidateQueries({ queryKey: ['ged-documents'] }); setShowUpload(false); setForm({ titre: '', description: '', categorieId: 0, confidentiel: false }); notify.success('Document importé'); }, onError: errorToast });
  const open = useMutation({ mutationFn: async (id: number) => unwrapIpc(await ipcClient.ged.ouvrir(id)), onError: errorToast });
  const archive = useMutation({ mutationFn: async (id: number) => unwrapIpc(await ipcClient.ged.archiver(id)), onSuccess: () => { void qc.invalidateQueries({ queryKey: ['ged-documents'] }); notify.success('Document archivé'); }, onError: errorToast });
  const addVersion = useMutation({ mutationFn: async () => unwrapIpc(await ipcClient.ged.addVersion(selected!.id)), onSuccess: () => { void qc.invalidateQueries({ queryKey: ['ged-documents'] }); void qc.invalidateQueries({ queryKey: ['ged-versions'] }); notify.success('Nouvelle version enregistrée'); }, onError: errorToast });
  const requestOcr = useMutation({ mutationFn: async () => unwrapIpc(await ipcClient.ged.requestOcr(selected!.id, 'fra')) as { statut: string; texte_extrait?: string }, onSuccess: job => { if (job?.texte_extrait) setOcrText(job.texte_extrait); notify.success(job?.statut === 'termine' ? 'Texte extrait et indexé' : 'Document placé dans la file OCR'); }, onError: errorToast });
  const completeOcr = useMutation({ mutationFn: async () => unwrapIpc(await ipcClient.ged.completeOcr(selected!.id, ocrText)), onSuccess: () => notify.success('Texte OCR validé et indexé'), onError: errorToast });
  const sign = useMutation({ mutationFn: async () => unwrapIpc(await ipcClient.ged.sign(selected!.id, 'Validation documentaire interne')), onSuccess: () => { void qc.invalidateQueries({ queryKey: ['ged-signatures'] }); notify.success('Signature interne enregistrée'); }, onError: errorToast });
  const archiveLegal = useMutation({ mutationFn: async () => unwrapIpc(await ipcClient.gedArchivage.archiveLegally(selected!.id)), onSuccess: () => notify.success('Archive légale scellée'), onError: errorToast });

  async function fullTextSearch() {
    try { setOcrResults(unwrapIpc(await ipcClient.ged.searchOcr(ocrSearch)) as unknown as OcrResult[]); } catch (error) { errorToast(error); }
  }

  return <div className="space-y-4 sm:space-y-6">
    <PageHeader title="Gestion documentaire" description="OCR, versions, signatures, archivage légal et conformité ANPDP" action={<Button onClick={() => setShowUpload(true)}><Upload className="h-4 w-4" />Importer</Button>}/>

    <div className="flex gap-3 flex-wrap">
      <div className="relative flex-1 min-w-52"><Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input aria-label="Rechercher un document par titre" value={search} onChange={event => setSearch(event.target.value)} placeholder="Rechercher par titre…" className="pl-9" /></div>
      <select aria-label="Filtrer par catégorie" value={categorieId ?? ''} onChange={event => setCategorieId(event.target.value ? Number(event.target.value) : undefined)} className="h-10 rounded-lg border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><option value="">Toutes les catégories</option>{categories.map(category => <option key={category.id} value={category.id}>{category.label}</option>)}</select>
    </div>

    {isLoading ? <div className="h-24 rounded-xl bg-muted animate-pulse" /> : documents.length === 0 ? <div className="text-center py-14 text-muted-foreground bg-card border rounded-xl"><FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />Aucun document trouvé</div> : <div className="space-y-2">{documents.map(document => <div key={document.id} className="bg-card border rounded-xl p-4 flex items-center justify-between gap-4">
      <div className="flex gap-3 items-start min-w-0"><FileText className="w-5 h-5 text-indigo-500 shrink-0" /><div className="min-w-0"><div className="flex gap-2 flex-wrap"><span className="font-medium text-sm">{document.titre}</span>{document.categorieLabel && <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">{document.categorieLabel}</span>}{document.confidentiel && <span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full">Confidentiel</span>}<span className="text-xs text-muted-foreground">v{document.version}</span></div><div className="text-xs text-muted-foreground truncate">{document.nomFichier} · {formatBytes(document.taille)} · {new Date(document.createdAt).toLocaleDateString('fr-FR')}</div></div></div>
      <div className="flex gap-1"><IconButton title="Cycle de vie" onClick={() => { setSelected(document); setOcrText(''); }}><History /></IconButton><IconButton title="Ouvrir" onClick={() => open.mutate(document.id)}><ExternalLink /></IconButton><IconButton title="Archiver" onClick={() => archive.mutate(document.id)}><Archive /></IconButton></div>
    </div>)}</div>}

    <section className="bg-card border rounded-xl p-4 space-y-3"><div className="flex items-center gap-2"><ScanText className="w-5 h-5 text-indigo-600" /><h2 className="font-semibold">Recherche plein texte OCR</h2></div><div className="flex gap-2"><input value={ocrSearch} onChange={event => setOcrSearch(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') void fullTextSearch(); }} placeholder="Rechercher dans le contenu…" className="flex-1 border rounded-lg px-3 py-2 text-sm bg-background" /><button onClick={() => void fullTextSearch()} disabled={!ocrSearch.trim()} className="px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground disabled:opacity-50">Rechercher</button></div>{ocrResults.map(result => <div key={result.id} className="border rounded-lg p-3"><span className="font-medium text-sm">{result.titre}</span><p className="text-xs text-muted-foreground mt-1">{result.extrait.replace(/<\/?mark>/g, '')}</p></div>)}</section>

    {selected && <LifecycleModal document={selected} versions={versions} signatures={signatures} ocrText={ocrText} setOcrText={setOcrText} close={() => setSelected(null)} actions={{ addVersion: () => addVersion.mutate(), requestOcr: () => requestOcr.mutate(), completeOcr: () => completeOcr.mutate(), sign: () => sign.mutate(), archiveLegal: () => archiveLegal.mutate() }} />}
    {showUpload && <UploadModal form={form} setForm={setForm} close={() => setShowUpload(false)} submit={() => upload.mutate()} pending={upload.isPending} categories={categories} />}
  </div>;
}

function LifecycleModal({ document, versions, signatures, ocrText, setOcrText, close, actions }: { document: GedDocument; versions: GedVersion[]; signatures: GedSignature[]; ocrText: string; setOcrText: (value: string) => void; close: () => void; actions: Record<'addVersion' | 'requestOcr' | 'completeOcr' | 'sign' | 'archiveLegal', () => void> }) {
  return <Dialog open onOpenChange={open => { if (!open) close(); }}><DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto" title={`Cycle de vie — ${document.titre}`} description="Traçabilité documentaire et conformité"><div className="space-y-5">
    <div className="grid sm:grid-cols-2 gap-3"><Action icon={<History />} title="Ajouter une version" text="Historique et empreinte SHA-256." onClick={actions.addVersion} /><Action icon={<FileSignature />} title="Signer en interne" text="Empreinte, utilisateur et rôle." onClick={actions.sign} /><Action icon={<ScanText />} title="Lancer l’OCR" text="Extraction texte ou file du moteur OCR." onClick={actions.requestOcr} /><Action icon={<ShieldCheck />} title="Archiver légalement" text="Conservation et contrôle d’intégrité." onClick={actions.archiveLegal} /></div>
    <section><h3 className="font-semibold text-sm mb-2">Texte OCR / correction</h3><textarea value={ocrText} onChange={event => setOcrText(event.target.value)} rows={5} placeholder="Texte extrait ou corrigé à indexer…" className="w-full border rounded-lg p-3 text-sm bg-background" /><button onClick={actions.completeOcr} disabled={!ocrText.trim()} className="mt-2 px-3 py-2 rounded-lg text-sm bg-primary text-primary-foreground disabled:opacity-50">Valider et indexer</button></section>
    <div className="grid md:grid-cols-2 gap-5"><section><h3 className="font-semibold text-sm mb-2">Versions</h3>{versions.map(version => <div key={version.id} className="border rounded-lg p-2 text-xs mb-2"><div className="flex justify-between"><b>v{version.version}</b><span>{version.is_current ? 'Courante' : 'Archivée'}</span></div><div className="truncate text-muted-foreground">{version.nom_fichier}</div><div className="font-mono truncate text-muted-foreground">{version.content_hash ?? 'Empreinte historique indisponible'}</div></div>)}</section><section><h3 className="font-semibold text-sm mb-2">Signatures</h3>{signatures.length === 0 && <p className="text-xs text-muted-foreground">Aucune signature.</p>}{signatures.map(signature => <div key={signature.id} className="border rounded-lg p-2 text-xs mb-2"><div className="flex justify-between"><b>{signature.signataire_nom}</b><span>{signature.statut}</span></div><div className="text-muted-foreground">{signature.role_code} · {new Date(signature.signed_at).toLocaleString('fr-FR')}</div><div className="font-mono truncate text-muted-foreground">{signature.signature_hash}</div></div>)}</section></div>
    <p className="text-xs text-muted-foreground">La signature interne prouve l’intégrité et la traçabilité. Une signature électronique qualifiée nécessite un prestataire de confiance externe.</p>
  </div></DialogContent></Dialog>;
}

function UploadModal({ form, setForm, close, submit, pending, categories }: { form: { titre: string; description: string; categorieId: number; confidentiel: boolean }; setForm: React.Dispatch<React.SetStateAction<{ titre: string; description: string; categorieId: number; confidentiel: boolean }>>; close: () => void; submit: () => void; pending: boolean; categories: GedCategorie[] }) {
  return <Dialog open onOpenChange={open => { if (!open) close(); }}><DialogContent title="Importer un document" description="Renseignez les métadonnées avant de sélectionner le fichier."><div className="space-y-4"><Input aria-label="Titre du document" placeholder="Titre *" value={form.titre} onChange={event => setForm(value => ({ ...value, titre: event.target.value }))} /><Input aria-label="Description du document" placeholder="Description" value={form.description} onChange={event => setForm(value => ({ ...value, description: event.target.value }))} /><select aria-label="Catégorie du document" value={form.categorieId} onChange={event => setForm(value => ({ ...value, categorieId: Number(event.target.value) }))} className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><option value={0}>Catégorie (optionnel)</option>{categories.map(category => <option key={category.id} value={category.id}>{category.label}</option>)}</select><label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={form.confidentiel} onChange={event => setForm(value => ({ ...value, confidentiel: event.target.checked }))} />Document confidentiel</label><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="outline" onClick={close}>Annuler</Button><Button onClick={submit} disabled={!form.titre || pending}>{pending ? 'Import…' : 'Sélectionner et importer'}</Button></div></div></DialogContent></Dialog>;
}

function IconButton({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactElement }) { return <Button type="button" variant="ghost" size="icon" aria-label={title} title={title} onClick={onClick}>{children}</Button>; }
function Action({ icon, title, text, onClick }: { icon: React.ReactElement; title: string; text: string; onClick: () => void }) { return <button type="button" onClick={onClick} className="min-h-24 rounded-xl border p-3 text-left transition-colors hover:border-primary/30 hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:mb-2 [&_svg]:h-5 [&_svg]:w-5 [&_svg]:text-primary"><span className="font-medium text-sm">{icon}{title}</span><p className="text-xs text-muted-foreground">{text}</p></button>; }
function errorToast(error: unknown) { notify.error(error instanceof Error ? error.message : 'Opération impossible'); }
