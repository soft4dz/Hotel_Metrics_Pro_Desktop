import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { notify } from '@/lib/toast';
import { FolderOpen, Upload, ExternalLink, Archive, Search, FileText } from 'lucide-react';

interface GedDocument { id: number; titre: string; categorieLabel: string | null; nomFichier: string; taille: number | null; statut: string; version: string; confidentiel: boolean; tags: string[]; dateDocument: string | null; uploaderNom: string | null; createdAt: string }
interface GedCategorie { id: number; code: string; label: string }

function formatBytes(b: number | null) {
  if (!b) return '—';
  if (b < 1024) return `${b} o`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} Ko`;
  return `${(b / (1024 * 1024)).toFixed(1)} Mo`;
}

export default function GedPage() {
  const qc = useQueryClient();
  const [categorieId, setCategorieId] = useState<number | undefined>();
  const [search, setSearch] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [form, setForm] = useState({ titre: '', description: '', categorieId: 0, confidentiel: false });

  const { data: categories = [] } = useQuery({
    queryKey: ['ged-categories'],
    queryFn: async () => unwrapIpc(await ipcClient.ged.listCategories()) as GedCategorie[],
  });
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['ged-documents', categorieId, search],
    queryFn: async () => unwrapIpc(await ipcClient.ged.listDocuments(undefined, categorieId, search || undefined)) as GedDocument[],
  });

  const upload = useMutation({
    mutationFn: async () => unwrapIpc(await ipcClient.ged.upload({ ...form, categorieId: form.categorieId || undefined })),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ged-documents'] }); setShowUpload(false); setForm({ titre: '', description: '', categorieId: 0, confidentiel: false }); notify.success('Document uploadé'); },
    onError: (e: unknown) => notify.error(e instanceof Error ? e.message : 'Erreur upload'),
  });

  const ouvrir = useMutation({
    mutationFn: async (id: number) => unwrapIpc(await ipcClient.ged.ouvrir(id)),
    onError: () => notify.error('Impossible d\'ouvrir le document'),
  });

  const archiver = useMutation({
    mutationFn: async (id: number) => unwrapIpc(await ipcClient.ged.archiver(id)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ged-documents'] }); notify.success('Document archivé'); },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <FolderOpen className="w-7 h-7 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold">Gestion Documentaire</h1>
            <p className="text-sm text-muted-foreground">Archivage et consultation des documents de l'établissement</p>
          </div>
        </div>
        <button onClick={() => setShowUpload(true)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
          <Upload className="w-4 h-4" /> Importer un document
        </button>
      </div>

      {/* Filtres */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm bg-background" />
        </div>
        <select value={categorieId ?? ''} onChange={e => setCategorieId(e.target.value ? Number(e.target.value) : undefined)} className="border rounded-lg px-3 py-2 text-sm bg-background">
          <option value="">Toutes les catégories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </div>

      {/* Documents */}
      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : documents.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground bg-card border rounded-xl">
          <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>Aucun document trouvé</p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map(d => (
            <div key={d.id} className="bg-card border rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="flex gap-3 items-start min-w-0">
                <FileText className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{d.titre}</span>
                    {d.categorieLabel && <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">{d.categorieLabel}</span>}
                    {d.confidentiel && <span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full">Confidentiel</span>}
                    <span className="text-xs text-muted-foreground">v{d.version}</span>
                  </div>
                  <div className="text-xs text-muted-foreground flex gap-3 mt-0.5">
                    <span>{d.nomFichier}</span>
                    <span>· {formatBytes(d.taille)}</span>
                    {d.uploaderNom && <span>· {d.uploaderNom}</span>}
                    <span>· {new Date(d.createdAt).toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => ouvrir.mutate(d.id)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground" title="Ouvrir">
                  <ExternalLink className="w-4 h-4" />
                </button>
                <button onClick={() => archiver.mutate(d.id)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground" title="Archiver">
                  <Archive className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <h2 className="text-lg font-bold">Importer un document</h2>
            <p className="text-sm text-muted-foreground">Un sélecteur de fichier s'ouvrira après avoir rempli les métadonnées.</p>
            <div className="space-y-3">
              <input placeholder="Titre *" value={form.titre} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm bg-background" />
              <input placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm bg-background" />
              <select value={form.categorieId} onChange={e => setForm(f => ({ ...f, categorieId: Number(e.target.value) }))} className="w-full border rounded-lg px-3 py-2 text-sm bg-background">
                <option value={0}>Catégorie (optionnel)</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.confidentiel} onChange={e => setForm(f => ({ ...f, confidentiel: e.target.checked }))} className="rounded" />
                Document confidentiel
              </label>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowUpload(false)} className="px-4 py-2 rounded-lg text-sm border hover:bg-muted">Annuler</button>
              <button onClick={() => upload.mutate()} disabled={!form.titre || upload.isPending} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50">
                <Upload className="w-4 h-4" />
                {upload.isPending ? 'Import...' : 'Sélectionner et importer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
