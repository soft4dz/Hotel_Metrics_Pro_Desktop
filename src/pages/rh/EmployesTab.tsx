import { useCallback, useEffect, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import type { RhEmploye, RhPoste } from '@/shared/types/rh';

export function EmployesTab() {
  const [items, setItems] = useState<RhEmploye[]>([]);
  const [postes, setPostes] = useState<RhPoste[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nom: '', prenom: '', email: '', dateEmbauche: new Date().toISOString().slice(0, 10), posteId: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [emps, pts] = await Promise.all([
        ipcClient.rh.listEmployes(search || undefined),
        ipcClient.rh.listPostes(),
      ]);
      setItems(unwrapIpc(emps));
      setPostes(unwrapIpc(pts));
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async () => {
    if (!form.nom.trim() || !form.prenom.trim()) return;
    try {
      unwrapIpc(await ipcClient.rh.createEmploye({
        nom: form.nom.trim(),
        prenom: form.prenom.trim(),
        emailPersonnel: form.email.trim() || null,
        dateEmbauche: form.dateEmbauche,
        posteActuelId: form.posteId ? Number(form.posteId) : null,
      }));
      setShowForm(false);
      void load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const columns: Column<RhEmploye>[] = [
    {
      key: 'nom',
      header: 'Employé',
      render: (e) => (
        <div>
          <p className="font-medium">{e.prenom} {e.nom}</p>
          <p className="text-xs text-muted-foreground">{e.emailPersonnel ?? '—'}</p>
        </div>
      ),
    },
    { key: 'poste', header: 'Poste', render: (e) => e.posteNom ?? '—' },
    { key: 'dept', header: 'Département', render: (e) => e.departementNom ?? '—' },
    {
      key: 'statut',
      header: 'Statut RH',
      render: (e) => (
        <Badge variant={e.statutRh === 'actif' ? 'success' : 'muted'}>{e.statutRh}</Badge>
      ),
    },
    {
      key: 'compte',
      header: 'Compte',
      render: (e) =>
        e.accountStatus === 'en_attente' ? (
          <Badge variant="warning">En attente</Badge>
        ) : e.userEmail ? (
          <span className="text-xs">{e.userEmail}</span>
        ) : (
          '—'
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvel employé
        </Button>
      </div>

      {showForm && (
        <div className="rounded-lg border bg-card p-4 grid gap-3 sm:grid-cols-2">
          <div><Label>Prénom</Label><Input value={form.prenom} onChange={(e) => setForm((f) => ({ ...f, prenom: e.target.value }))} /></div>
          <div><Label>Nom</Label><Input value={form.nom} onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} /></div>
          <div><Label>E-mail personnel</Label><Input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></div>
          <div><Label>Date embauche</Label><Input type="date" value={form.dateEmbauche} onChange={(e) => setForm((f) => ({ ...f, dateEmbauche: e.target.value }))} /></div>
          <div className="sm:col-span-2">
            <Label>Poste</Label>
            <select className="mt-1 w-full rounded-md border px-3 py-2 text-sm" value={form.posteId} onChange={(e) => setForm((f) => ({ ...f, posteId: e.target.value }))}>
              <option value="">— Optionnel —</option>
              {postes.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2 flex gap-2">
            <Button onClick={() => void handleCreate()}>Enregistrer</Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
          </div>
        </div>
      )}

      <DataTable columns={columns} data={items} keyExtractor={(e) => e.id} loading={loading} emptyMessage="Aucun employé." />
    </div>
  );
}
