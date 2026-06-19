import { useCallback, useEffect, useState } from 'react';
import { Pencil } from 'lucide-react';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import type { RhDepartement, RhPoste } from '@/shared/types/rh';

export function ReferentielRhTab() {
  const [departements, setDepartements] = useState<RhDepartement[]>([]);
  const [postes, setPostes] = useState<RhPoste[]>([]);
  const [deptNom, setDeptNom] = useState('');
  const [posteForm, setPosteForm] = useState({ nom: '', departementId: '', role: '', salaireMin: '' });
  const [editDept, setEditDept] = useState<RhDepartement | null>(null);
  const [editPoste, setEditPoste] = useState<RhPoste | null>(null);

  const load = useCallback(async () => {
    const [d, p] = await Promise.all([ipcClient.rh.listDepartements(), ipcClient.rh.listPostes()]);
    setDepartements(unwrapIpc(d));
    setPostes(unwrapIpc(p));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const addDept = async () => {
    if (!deptNom.trim()) return;
    unwrapIpc(await ipcClient.rh.createDepartement({ nom: deptNom.trim() }));
    setDeptNom('');
    void load();
  };

  const addPoste = async () => {
    if (!posteForm.nom.trim() || !posteForm.departementId) return;
    unwrapIpc(await ipcClient.rh.createPoste({
      nom: posteForm.nom.trim(),
      departementId: Number(posteForm.departementId),
      roleSystemAssocie: posteForm.role.trim() || null,
      salaireMin: posteForm.salaireMin ? Number(posteForm.salaireMin) : null,
    }));
    setPosteForm({ nom: '', departementId: '', role: '', salaireMin: '' });
    void load();
  };

  const saveDept = async () => {
    if (!editDept) return;
    unwrapIpc(await ipcClient.rh.updateDepartement(editDept.id, { nom: editDept.nom, description: editDept.description }));
    setEditDept(null);
    void load();
  };

  const savePoste = async () => {
    if (!editPoste) return;
    unwrapIpc(await ipcClient.rh.updatePoste(editPoste.id, {
      nom: editPoste.nom,
      salaireMin: editPoste.salaireMin,
      salaireMax: editPoste.salaireMax,
      roleSystemAssocie: editPoste.roleSystemAssocie,
      description: editPoste.description,
    }));
    setEditPoste(null);
    void load();
  };

  const posteColumns: Column<RhPoste>[] = [
    { key: 'nom', header: 'Poste', render: (p) => p.nom },
    { key: 'dept', header: 'Département', render: (p) => p.departementNom },
    { key: 'role', header: 'Rôle système', render: (p) => p.roleSystemAssocie ?? '—' },
    {
      key: 'salaire',
      header: 'Fourchette salariale',
      render: (p) =>
        p.salaireMin != null || p.salaireMax != null
          ? `${p.salaireMin ?? '?'} – ${p.salaireMax ?? '?'}`
          : '—',
    },
    {
      key: 'actions',
      header: '',
      render: (p) => (
        <Button size="sm" variant="ghost" onClick={() => setEditPoste({ ...p })}>
          <Pencil className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-3">
        <h2 className="font-semibold">Départements</h2>
        <div className="flex gap-2">
          <Input placeholder="Nom du département" value={deptNom} onChange={(e) => setDeptNom(e.target.value)} />
          <Button onClick={() => void addDept()}>Ajouter</Button>
        </div>
        <ul className="text-sm space-y-1">
          {departements.map((d) => (
            <li key={d.id} className="rounded border px-3 py-2 flex items-center justify-between">
              <span>{d.nom}</span>
              <Button size="sm" variant="ghost" onClick={() => setEditDept({ ...d })}>
                <Pencil className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
        {editDept && (
          <div className="rounded border p-3 space-y-2">
            <Label>Modifier département</Label>
            <Input value={editDept.nom} onChange={(e) => setEditDept((d) => d && { ...d, nom: e.target.value })} />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => void saveDept()}>Enregistrer</Button>
              <Button size="sm" variant="outline" onClick={() => setEditDept(null)}>Annuler</Button>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="font-semibold">Nouveau poste</h2>
        <div className="grid gap-2">
          <div><Label>Nom</Label><Input value={posteForm.nom} onChange={(e) => setPosteForm((f) => ({ ...f, nom: e.target.value }))} /></div>
          <div>
            <Label>Département</Label>
            <select className="mt-1 w-full rounded-md border px-3 py-2 text-sm" value={posteForm.departementId} onChange={(e) => setPosteForm((f) => ({ ...f, departementId: e.target.value }))}>
              <option value="">—</option>
              {departements.map((d) => <option key={d.id} value={d.id}>{d.nom}</option>)}
            </select>
          </div>
          <div><Label>Rôle système associé</Label><Input placeholder="ex. RECEPTIONNISTE" value={posteForm.role} onChange={(e) => setPosteForm((f) => ({ ...f, role: e.target.value }))} /></div>
          <div><Label>Salaire min</Label><Input type="number" value={posteForm.salaireMin} onChange={(e) => setPosteForm((f) => ({ ...f, salaireMin: e.target.value }))} /></div>
          <Button onClick={() => void addPoste()}>Créer le poste</Button>
        </div>
      </div>

      {editPoste && (
        <div className="lg:col-span-2 rounded border p-4 grid gap-2 sm:grid-cols-2">
          <h3 className="sm:col-span-2 font-semibold">Modifier poste</h3>
          <div><Label>Nom</Label><Input value={editPoste.nom} onChange={(e) => setEditPoste((p) => p && { ...p, nom: e.target.value })} /></div>
          <div><Label>Rôle système</Label><Input value={editPoste.roleSystemAssocie ?? ''} onChange={(e) => setEditPoste((p) => p && { ...p, roleSystemAssocie: e.target.value || null })} /></div>
          <div><Label>Salaire min</Label><Input type="number" value={editPoste.salaireMin ?? ''} onChange={(e) => setEditPoste((p) => p && { ...p, salaireMin: e.target.value ? Number(e.target.value) : null })} /></div>
          <div><Label>Salaire max</Label><Input type="number" value={editPoste.salaireMax ?? ''} onChange={(e) => setEditPoste((p) => p && { ...p, salaireMax: e.target.value ? Number(e.target.value) : null })} /></div>
          <div className="sm:col-span-2 flex gap-2">
            <Button onClick={() => void savePoste()}>Enregistrer</Button>
            <Button variant="outline" onClick={() => setEditPoste(null)}>Annuler</Button>
          </div>
        </div>
      )}

      <div className="lg:col-span-2">
        <DataTable columns={posteColumns} data={postes} keyExtractor={(p) => p.id} emptyMessage="Aucun poste." />
      </div>
    </div>
  );
}
