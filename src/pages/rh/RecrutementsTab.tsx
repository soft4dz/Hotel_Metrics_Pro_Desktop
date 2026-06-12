import { useCallback, useEffect, useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import type { RhPoste, RhRecrutement } from '@/shared/types/rh';

export function RecrutementsTab() {
  const [items, setItems] = useState<RhRecrutement[]>([]);
  const [postes, setPostes] = useState<RhPoste[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ posteId: '', candidatNom: '', candidatPrenom: '', candidatEmail: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [recs, pts] = await Promise.all([
        ipcClient.rh.listRecrutements(),
        ipcClient.rh.listPostes(),
      ]);
      setItems(unwrapIpc(recs));
      setPostes(unwrapIpc(pts));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async () => {
    if (!form.posteId || !form.candidatNom.trim()) return;
    try {
      unwrapIpc(await ipcClient.rh.createRecrutement({
        posteId: Number(form.posteId),
        candidatNom: form.candidatNom.trim(),
        candidatPrenom: form.candidatPrenom.trim() || null,
        candidatEmail: form.candidatEmail.trim() || null,
      }));
      setShowForm(false);
      setForm({ posteId: '', candidatNom: '', candidatPrenom: '', candidatEmail: '' });
      void load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const handleValider = async (id: number) => {
    if (!window.confirm('Valider ce recrutement ? Un employé et un compte en attente seront créés.')) return;
    try {
      unwrapIpc(await ipcClient.rh.validerRecrutement(id));
      void load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const handleRefuser = async (id: number) => {
    const motif = window.prompt('Motif du refus (optionnel) :');
    try {
      unwrapIpc(await ipcClient.rh.refuserRecrutement(id, motif ?? undefined));
      void load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const statutBadge = (s: RhRecrutement['statut']) => {
    if (s === 'valide') return <Badge variant="success">Validé</Badge>;
    if (s === 'refuse') return <Badge variant="muted">Refusé</Badge>;
    return <Badge variant="warning">En cours</Badge>;
  };

  const columns: Column<RhRecrutement>[] = [
    {
      key: 'candidat',
      header: 'Candidat',
      render: (r) => (
        <div>
          <p className="font-medium">{[r.candidatPrenom, r.candidatNom].filter(Boolean).join(' ')}</p>
          <p className="text-xs text-muted-foreground">{r.candidatEmail ?? '—'}</p>
        </div>
      ),
    },
    { key: 'poste', header: 'Poste', render: (r) => `${r.posteNom} (${r.departementNom})` },
    { key: 'statut', header: 'Statut', render: (r) => statutBadge(r.statut) },
    {
      key: 'actions',
      header: '',
      className: 'w-32 text-right',
      render: (r) =>
        r.statut === 'en_cours' ? (
          <div className="flex justify-end gap-1">
            <Button size="sm" variant="ghost" onClick={() => void handleValider(r.id)} title="Valider">
              <Check className="h-4 w-4 text-emerald-600" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => void handleRefuser(r.id)} title="Refuser">
              <X className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        ) : r.utilisateurCreeId ? (
          <span className="text-xs text-muted-foreground">Compte #{r.utilisateurCreeId}</span>
        ) : null,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau recrutement
        </Button>
      </div>

      {showForm && (
        <div className="rounded-lg border bg-card p-4 grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Poste</Label>
            <select
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              value={form.posteId}
              onChange={(e) => setForm((f) => ({ ...f, posteId: e.target.value }))}
            >
              <option value="">— Sélectionner —</option>
              {postes.map((p) => (
                <option key={p.id} value={p.id}>{p.nom} — {p.departementNom}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Nom candidat</Label>
            <Input value={form.candidatNom} onChange={(e) => setForm((f) => ({ ...f, candidatNom: e.target.value }))} />
          </div>
          <div>
            <Label>Prénom</Label>
            <Input value={form.candidatPrenom} onChange={(e) => setForm((f) => ({ ...f, candidatPrenom: e.target.value }))} />
          </div>
          <div>
            <Label>E-mail</Label>
            <Input type="email" value={form.candidatEmail} onChange={(e) => setForm((f) => ({ ...f, candidatEmail: e.target.value }))} />
          </div>
          <div className="sm:col-span-2 flex gap-2">
            <Button onClick={() => void handleCreate()}>Enregistrer</Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
          </div>
        </div>
      )}

      <DataTable columns={columns} data={items} keyExtractor={(r) => r.id} loading={loading} emptyMessage="Aucun recrutement." />
    </div>
  );
}
