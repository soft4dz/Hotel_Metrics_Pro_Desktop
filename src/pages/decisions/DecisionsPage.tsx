import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { notify } from '@/lib/toast';
import { BookOpen, Plus, Archive, Eye, ChevronDown, Filter } from 'lucide-react';

const TYPES = ['strategique', 'operationnelle', 'rh', 'financiere', 'technique', 'autre'];
const PRIORITES = ['basse', 'normale', 'haute', 'urgente'];

interface DecisionRow {
  id: number; titre: string; contenu: string; type: string; priorite: string; statut: string;
  auteurNom: string | null; dateEmission: string; dateEcheance: string | null;
  nbDestinataires: number; nbLu: number;
}

interface UserRow { id: number; fullName: string }

const prioriteColor = (p: string) => ({ basse: 'bg-gray-100 text-gray-600', normale: 'bg-blue-100 text-blue-700', haute: 'bg-orange-100 text-orange-700', urgente: 'bg-red-100 text-red-700' }[p] ?? 'bg-gray-100');

export default function DecisionsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [form, setForm] = useState({ titre: '', contenu: '', type: 'operationnelle', priorite: 'normale', dateEcheance: '', destinataireIds: [] as number[] });

  const { data: decisions = [], isLoading } = useQuery({
    queryKey: ['decisions', unreadOnly],
    queryFn: async () => unwrapIpc(await ipcClient.decisions.listForUser({ unreadOnly })) as DecisionRow[],
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users-list-decisions'],
    queryFn: async () => unwrapIpc(await ipcClient.users.list()) as UserRow[],
  });

  const { data: destinataires = [] } = useQuery({
    queryKey: ['decisions-dest', expanded],
    queryFn: async () => expanded ? unwrapIpc(await ipcClient.decisions.destinataires(expanded)) as { userId: number; userNom: string; lu: boolean }[] : [],
    enabled: expanded != null,
  });

  const create = useMutation({
    mutationFn: async () => unwrapIpc(await ipcClient.decisions.create({
      titre: form.titre,
      contenu: form.contenu,
      type: form.type,
      priorite: form.priorite,
      dateEcheance: form.dateEcheance || undefined,
      destinataireIds: form.destinataireIds.length ? form.destinataireIds : undefined,
    })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['decisions'] });
      setShowForm(false);
      setForm({ titre: '', contenu: '', type: 'operationnelle', priorite: 'normale', dateEcheance: '', destinataireIds: [] });
      notify.success('Décision enregistrée');
    },
    onError: () => notify.error('Erreur lors de l\'enregistrement'),
  });

  const archiver = useMutation({
    mutationFn: async (id: number) => unwrapIpc(await ipcClient.decisions.archiver(id)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['decisions'] }); notify.success('Décision archivée'); },
  });

  const marquerLu = useMutation({
    mutationFn: async (id: number) => unwrapIpc(await ipcClient.decisions.marquerLu(id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['decisions'] }),
  });

  const toggleDest = (uid: number) => {
    setForm((f) => ({
      ...f,
      destinataireIds: f.destinataireIds.includes(uid)
        ? f.destinataireIds.filter((x) => x !== uid)
        : [...f.destinataireIds, uid],
    }));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <BookOpen className="w-7 h-7 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold">Décisions & Instructions</h1>
            <p className="text-sm text-muted-foreground">Diffusion et suivi des décisions de direction</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setUnreadOnly((v) => !v)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border ${unreadOnly ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
            <Filter className="w-4 h-4" /> Non lues
          </button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
            <Plus className="w-4 h-4" /> Nouvelle décision
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : decisions.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Aucune décision{unreadOnly ? ' non lue' : ''}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {decisions.map((d) => (
            <div key={d.id} className="bg-card border rounded-xl overflow-hidden">
              <div className="p-4 flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold">{d.titre}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${prioriteColor(d.priorite)}`}>{d.priorite}</span>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{d.type}</span>
                    {d.nbDestinataires > 0 && (
                      <span className="text-xs text-muted-foreground">Lu {d.nbLu}/{d.nbDestinataires}</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground flex gap-3">
                    <span>{d.dateEmission}</span>
                    {d.dateEcheance && <span>· Échéance: {d.dateEcheance}</span>}
                    {d.auteurNom && <span>· {d.auteurNom}</span>}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => { setExpanded(expanded === d.id ? null : d.id); if (expanded !== d.id) marquerLu.mutate(d.id); }} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
                    {expanded === d.id ? <ChevronDown className="w-4 h-4 rotate-180" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button onClick={() => archiver.mutate(d.id)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
                    <Archive className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {expanded === d.id && (
                <div className="px-4 pb-4 border-t pt-3 space-y-3">
                  <p className="text-sm whitespace-pre-wrap text-foreground/80">{d.contenu}</p>
                  {destinataires.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      <p className="font-semibold text-foreground mb-1">Destinataires</p>
                      {destinataires.map((dd) => (
                        <span key={dd.userId} className={`inline-block mr-2 mb-1 px-2 py-0.5 rounded-full ${dd.lu ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
                          {dd.userNom} {dd.lu ? '✓' : '· non lu'}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold">Nouvelle décision</h2>
            <div className="space-y-3">
              <input placeholder="Titre *" value={form.titre} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm bg-background" />
              <textarea placeholder="Contenu / Instructions *" value={form.contenu} onChange={e => setForm(f => ({ ...f, contenu: e.target.value }))} rows={5} className="w-full border rounded-lg px-3 py-2 text-sm bg-background resize-none" />
              <div>
                <p className="text-xs font-semibold mb-2">Destinataires</p>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {users.map((u) => (
                    <button key={u.id} type="button" onClick={() => toggleDest(u.id)} className={`text-xs px-2 py-1 rounded-full border ${form.destinataireIds.includes(u.id) ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted'}`}>
                      {u.fullName}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm bg-background">
                  {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select value={form.priorite} onChange={e => setForm(f => ({ ...f, priorite: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm bg-background">
                  {PRIORITES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <input type="date" value={form.dateEcheance} onChange={e => setForm(f => ({ ...f, dateEcheance: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm bg-background" />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm border hover:bg-muted">Annuler</button>
              <button onClick={() => create.mutate()} disabled={!form.titre || !form.contenu || create.isPending} className="px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground disabled:opacity-50">
                {create.isPending ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
