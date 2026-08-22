import { useState } from 'react';
import { Upload, Trash2, FileText, ExternalLink, AlertCircle } from 'lucide-react';
import { useDocumentsAo, useLotsAo } from '@/hooks/useAppelsOffres';
import type { AppelOffres, TypeDocumentAo } from '@/shared/types/appelsOffres';

const TYPE_LABELS: Record<TypeDocumentAo, string> = {
  cahier_charges: 'Cahier des charges', reglement_consultation: 'Règlement de consultation', autre: 'Autre',
};

function formatSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function DocumentsTab({ dossier }: { dossier: AppelOffres }) {
  const { data: documents, loading, upload, ouvrir, remove } = useDocumentsAo(dossier.id);
  const { data: lots } = useLotsAo(dossier.id);

  const [form, setForm] = useState<{ titre: string; typeDocument: TypeDocumentAo; lotId: number }>({
    titre: '', typeDocument: 'cahier_charges', lotId: 0,
  });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!form.titre.trim()) { setError('Renseignez un titre avant de sélectionner le fichier.'); return; }
    setUploading(true); setError(null);
    try {
      await upload({ appelOffresId: dossier.id, lotId: form.lotId || undefined, typeDocument: form.typeDocument, titre: form.titre.trim() });
      setForm({ titre: '', typeDocument: 'cahier_charges', lotId: 0 });
    } catch (e) { setError((e as Error).message); }
    finally { setUploading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/60 bg-white p-4 space-y-3">
        <h3 className="text-sm font-semibold">Ajouter un document</h3>
        {error && <p className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2"><AlertCircle className="h-3.5 w-3.5 shrink-0" />{error}</p>}
        <div className="flex flex-wrap gap-2 items-end">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Titre</label>
            <input className="mt-1 rounded-lg border border-border px-3 py-1.5 text-sm" placeholder="ex: Cahier des charges lot 1"
              value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Type</label>
            <select className="mt-1 rounded-lg border border-border px-3 py-1.5 text-sm"
              value={form.typeDocument} onChange={(e) => setForm({ ...form, typeDocument: e.target.value as TypeDocumentAo })}>
              <option value="cahier_charges">Cahier des charges</option>
              <option value="reglement_consultation">Règlement de consultation</option>
              <option value="autre">Autre</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Lot (optionnel)</label>
            <select className="mt-1 rounded-lg border border-border px-3 py-1.5 text-sm"
              value={form.lotId} onChange={(e) => setForm({ ...form, lotId: +e.target.value })}>
              <option value={0}>Dossier entier</option>
              {lots.map((l) => <option key={l.id} value={l.id}>{l.numeroLot}</option>)}
            </select>
          </div>
          <button onClick={submit} disabled={uploading}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 disabled:opacity-50">
            <Upload className="h-3.5 w-3.5" /> {uploading ? 'Sélection…' : 'Choisir le fichier'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-24 rounded-xl border border-border/40 bg-slate-50 animate-pulse" />
      ) : documents.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <FileText className="h-8 w-8 text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">Aucun document attaché</p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((d) => (
            <div key={d.id} className="flex items-center gap-3 rounded-xl border border-border/60 bg-white px-4 py-3">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{d.titre}</p>
                <p className="text-[11px] text-muted-foreground">{TYPE_LABELS[d.typeDocument]} · {d.nomFichier} {formatSize(d.taille) && `· ${formatSize(d.taille)}`}</p>
              </div>
              <button onClick={() => ouvrir(d.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-primary" title="Ouvrir">
                <ExternalLink className="h-4 w-4" />
              </button>
              <button onClick={() => remove(d.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500" title="Supprimer">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
