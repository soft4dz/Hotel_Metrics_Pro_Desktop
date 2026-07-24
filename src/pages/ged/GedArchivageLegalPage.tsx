import { useQuery, useMutation } from '@tanstack/react-query';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { notify } from '@/lib/toast';
import type { GedLegalArchive } from '@/shared/types/phase2';
import { Archive, ShieldCheck } from 'lucide-react';

interface RetentionPolicy {
  id: number;
  code: string;
  libelle: string;
  categorieCode: string | null;
  dureeAnnees: number;
}

type GedArchiveExtended = GedLegalArchive & { documentTitre?: string };

export default function GedArchivageLegalPage() {
  const { data: policies = [], isLoading: loadingPolicies } = useQuery({
    queryKey: ['ged-retention-policies'],
    queryFn: async () => unwrapIpc(await ipcClient.gedArchivage.listRetentionPolicies()) as RetentionPolicy[],
  });

  const { data: archives = [], isLoading: loadingArchives } = useQuery({
    queryKey: ['ged-legal-archives'],
    queryFn: async () => unwrapIpc(await ipcClient.gedArchivage.listLegalArchives()) as GedArchiveExtended[],
  });

  const verify = useMutation({
    mutationFn: async (archiveId: number) => unwrapIpc(await ipcClient.gedArchivage.verifyIntegrity(archiveId)),
    onSuccess: (result) => {
      const r = result as { ok: boolean; hashAttendu: string; hashCalcule?: string };
      if (r.ok) notify.success('Intégrité vérifiée — document conforme');
      else notify.error('Intégrité compromise — hash non conforme');
    },
    onError: () => notify.error('Erreur vérification intégrité'),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Archive className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Archivage légal GED</h1>
          <p className="text-sm text-muted-foreground">Politiques de rétention et vérification d'intégrité</p>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Politiques de rétention</h2>
        {loadingPolicies ? (
          <div className="h-24 rounded-xl bg-muted animate-pulse" />
        ) : policies.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune politique configurée.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {policies.map((p) => (
              <div key={p.id} className="bg-card border rounded-xl p-4">
                <div className="font-semibold text-sm">{p.libelle}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Code {p.code} · {p.dureeAnnees} an(s)
                  {p.categorieCode && ` · Cat. ${p.categorieCode}`}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Archives légales</h2>
        {loadingArchives ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : archives.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune archive légale.</p>
        ) : (
          archives.map((a) => (
            <div key={a.id} className="bg-card border rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="font-semibold text-sm truncate">
                  {a.documentNom ?? a.documentTitre ?? `Document #${a.documentId}`}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {a.politiqueCode} · Archivé le {a.horodatage?.slice(0, 10)}
                  · Rétention jusqu'au {a.retentionUntil?.slice(0, 10)}
                </div>
                <div className="text-xs font-mono text-muted-foreground mt-1 truncate">{a.hashSha256}</div>
              </div>
              <button
                onClick={() => verify.mutate(a.id)}
                disabled={verify.isPending}
                className="shrink-0 flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-100"
              >
                <ShieldCheck className="w-3 h-3" /> Vérifier intégrité
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
