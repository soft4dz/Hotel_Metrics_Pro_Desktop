import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { UserPlus, Trash2, Users, AlertCircle } from 'lucide-react';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { useFournisseursAo } from '@/hooks/useAppelsOffres';
import { cn } from '@/lib/utils';
import type { AppelOffres } from '@/shared/types/appelsOffres';

interface Fournisseur { id: number; raisonSociale: string }

const STATUT_LABELS = { invite: 'Invité', a_repondu: 'A répondu', decline: 'Décliné' } as const;
const STATUT_COLORS = {
  invite: 'bg-slate-100 text-slate-600', a_repondu: 'bg-emerald-50 text-emerald-700', decline: 'bg-red-50 text-red-500',
} as const;

export function FournisseursTab({ dossier }: { dossier: AppelOffres }) {
  const { data: invites, loading, invite, remove } = useFournisseursAo(dossier.id);
  const { data: allFournisseurs = [] } = useQuery({
    queryKey: ['fournisseurs-all'],
    queryFn: async () => unwrapIpc(await ipcClient.achats.listFournisseurs()) as Fournisseur[],
  });
  const editable = dossier.statut === 'brouillon';

  const invitedIds = new Set(invites.map((i) => i.fournisseurId));
  const [selected, setSelected] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!selected.length) return;
    setSaving(true); setError(null);
    try { await invite(selected); setSelected([]); }
    catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      {editable && (
        <div className="rounded-xl border border-border/60 bg-white p-4 space-y-3">
          <h3 className="text-sm font-semibold">Inviter des fournisseurs</h3>
          {error && <p className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2"><AlertCircle className="h-3.5 w-3.5 shrink-0" />{error}</p>}
          <div className="flex flex-wrap gap-2">
            {allFournisseurs.filter((f) => !invitedIds.has(f.id)).map((f) => {
              const sel = selected.includes(f.id);
              return (
                <label key={f.id} className={cn(
                  'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs cursor-pointer',
                  sel ? 'border-primary bg-primary/5' : 'border-border',
                )}>
                  <input type="checkbox" checked={sel} className="rounded border-border"
                    onChange={(e) => setSelected(e.target.checked ? [...selected, f.id] : selected.filter((id) => id !== f.id))} />
                  {f.raisonSociale}
                </label>
              );
            })}
          </div>
          <button onClick={submit} disabled={!selected.length || saving}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 disabled:opacity-50">
            <UserPlus className="h-3.5 w-3.5" /> {saving ? 'Invitation…' : `Inviter (${selected.length})`}
          </button>
        </div>
      )}

      {loading ? (
        <div className="h-24 rounded-xl border border-border/40 bg-slate-50 animate-pulse" />
      ) : invites.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <Users className="h-8 w-8 text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">Aucun fournisseur invité{editable ? ' — invitez-en au moins un pour publier' : ''}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {invites.map((i) => (
            <div key={i.id} className="flex items-center gap-3 rounded-xl border border-border/60 bg-white px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{i.fournisseurNom}</p>
              </div>
              <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', STATUT_COLORS[i.statut])}>{STATUT_LABELS[i.statut]}</span>
              {editable && (
                <button onClick={() => remove(i.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
