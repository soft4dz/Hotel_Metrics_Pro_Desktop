import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pencil } from 'lucide-react';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import type { RhDepartement, RhDirection, RhPoste } from '@/shared/types/rh';

export function ReferentielRhTab() {
  const [directions, setDirections] = useState<RhDirection[]>([]);
  const [departements, setDepartements] = useState<RhDepartement[]>([]);
  const [postes, setPostes] = useState<RhPoste[]>([]);

  const [directionForm, setDirectionForm] = useState({ nom: '', code: '', description: '' });
  const [deptForm, setDeptForm] = useState({ nom: '', directionId: '', description: '' });
  const [posteForm, setPosteForm] = useState({
    nom: '',
    directionId: '',
    departementId: '',
    role: '',
    salaireMin: '',
  });

  const [editDirection, setEditDirection] = useState<RhDirection | null>(null);
  const [editDept, setEditDept] = useState<RhDepartement | null>(null);
  const [editPoste, setEditPoste] = useState<RhPoste | null>(null);

  const load = useCallback(async () => {
    const [dirs, depts, posts] = await Promise.all([
      ipcClient.rh.listDirections(),
      ipcClient.rh.listDepartements(),
      ipcClient.rh.listPostes(),
    ]);
    setDirections(unwrapIpc(dirs));
    setDepartements(unwrapIpc(depts));
    setPostes(unwrapIpc(posts));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const deptOptionsForPoste = useMemo(() => {
    if (!posteForm.directionId) return departements;
    return departements.filter((d) => String(d.directionId) === posteForm.directionId);
  }, [departements, posteForm.directionId]);

  const addDirection = async () => {
    if (!directionForm.nom.trim()) return;
    unwrapIpc(
      await ipcClient.rh.createDirection({
        nom: directionForm.nom.trim(),
        code: directionForm.code.trim() || null,
        description: directionForm.description.trim() || null,
      }),
    );
    setDirectionForm({ nom: '', code: '', description: '' });
    void load();
  };

  const addDept = async () => {
    if (!deptForm.nom.trim() || !deptForm.directionId) return;
    unwrapIpc(
      await ipcClient.rh.createDepartement({
        nom: deptForm.nom.trim(),
        directionId: Number(deptForm.directionId),
        description: deptForm.description.trim() || null,
      }),
    );
    setDeptForm({ nom: '', directionId: '', description: '' });
    void load();
  };

  const addPoste = async () => {
    if (!posteForm.nom.trim() || !posteForm.departementId) return;
    unwrapIpc(
      await ipcClient.rh.createPoste({
        nom: posteForm.nom.trim(),
        departementId: Number(posteForm.departementId),
        roleSystemAssocie: posteForm.role.trim() || null,
        salaireMin: posteForm.salaireMin ? Number(posteForm.salaireMin) : null,
      }),
    );
    setPosteForm({ nom: '', directionId: '', departementId: '', role: '', salaireMin: '' });
    void load();
  };

  const posteColumns: Column<RhPoste>[] = [
    { key: 'direction', header: 'Direction', render: (p) => p.directionNom ?? '—' },
    { key: 'dept', header: 'Département', render: (p) => p.departementNom },
    { key: 'nom', header: 'Poste', render: (p) => <span className="font-medium">{p.nom}</span> },
    { key: 'role', header: 'Rôle système', render: (p) => p.roleSystemAssocie ?? '—' },
    {
      key: 'salaire',
      header: 'Salaire min',
      render: (p) => (p.salaireMin != null ? `${p.salaireMin.toLocaleString('fr-DZ')} DZD` : '—'),
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
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Structure organisationnelle : <strong>Direction</strong> → <strong>Département</strong> →{' '}
        <strong>Poste</strong>. Créez d&apos;abord une direction, puis les départements rattachés, puis les postes.
      </p>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* Directions */}
        <section className="space-y-3 rounded-lg border p-4">
          <h2 className="font-semibold">1. Directions</h2>
          <div className="space-y-2">
            <div>
              <Label>Nom *</Label>
              <Input
                placeholder="ex. Direction hôtelière"
                value={directionForm.nom}
                onChange={(e) => setDirectionForm((f) => ({ ...f, nom: e.target.value }))}
              />
            </div>
            <div>
              <Label>Code</Label>
              <Input
                placeholder="ex. DH"
                value={directionForm.code}
                onChange={(e) => setDirectionForm((f) => ({ ...f, code: e.target.value }))}
              />
            </div>
            <Button className="w-full" onClick={() => void addDirection()}>
              Ajouter la direction
            </Button>
          </div>
          <ul className="text-sm divide-y border rounded-md">
            {directions.length === 0 ? (
              <li className="p-3 text-muted-foreground">Aucune direction.</li>
            ) : (
              directions.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-2 px-3 py-2">
                  <span>
                    {d.nom}
                    {d.code ? <span className="ml-1 text-xs text-muted-foreground">({d.code})</span> : null}
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => setEditDirection({ ...d })}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </li>
              ))
            )}
          </ul>
        </section>

        {/* Départements */}
        <section className="space-y-3 rounded-lg border p-4">
          <h2 className="font-semibold">2. Départements</h2>
          <div className="space-y-2">
            <div>
              <Label>Direction *</Label>
              <select
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                value={deptForm.directionId}
                onChange={(e) => setDeptForm((f) => ({ ...f, directionId: e.target.value }))}
              >
                <option value="">— Choisir —</option>
                {directions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nom}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Nom *</Label>
              <Input
                placeholder="ex. Réception"
                value={deptForm.nom}
                onChange={(e) => setDeptForm((f) => ({ ...f, nom: e.target.value }))}
              />
            </div>
            <Button className="w-full" onClick={() => void addDept()} disabled={directions.length === 0}>
              Ajouter le département
            </Button>
          </div>
          <ul className="text-sm divide-y border rounded-md max-h-48 overflow-y-auto">
            {departements.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-2 px-3 py-2">
                <span>
                  <span className="text-xs text-muted-foreground">{d.directionNom ?? '—'} · </span>
                  {d.nom}
                </span>
                <Button size="sm" variant="ghost" onClick={() => setEditDept({ ...d })}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        </section>

        {/* Postes */}
        <section className="space-y-3 rounded-lg border p-4">
          <h2 className="font-semibold">3. Postes</h2>
          <div className="space-y-2">
            <div>
              <Label>Direction</Label>
              <select
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                value={posteForm.directionId}
                onChange={(e) =>
                  setPosteForm((f) => ({ ...f, directionId: e.target.value, departementId: '' }))
                }
              >
                <option value="">Toutes</option>
                {directions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nom}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Département *</Label>
              <select
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                value={posteForm.departementId}
                onChange={(e) => setPosteForm((f) => ({ ...f, departementId: e.target.value }))}
              >
                <option value="">— Choisir —</option>
                {deptOptionsForPoste.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nom}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Nom du poste *</Label>
              <Input
                placeholder="ex. Réceptionniste"
                value={posteForm.nom}
                onChange={(e) => setPosteForm((f) => ({ ...f, nom: e.target.value }))}
              />
            </div>
            <div>
              <Label>Rôle système</Label>
              <Input
                placeholder="ex. RECEPTIONNISTE"
                value={posteForm.role}
                onChange={(e) => setPosteForm((f) => ({ ...f, role: e.target.value }))}
              />
            </div>
            <div>
              <Label>Salaire min (DZD)</Label>
              <Input
                type="number"
                value={posteForm.salaireMin}
                onChange={(e) => setPosteForm((f) => ({ ...f, salaireMin: e.target.value }))}
              />
            </div>
            <Button className="w-full" onClick={() => void addPoste()} disabled={departements.length === 0}>
              Créer le poste
            </Button>
          </div>
        </section>
      </div>

      {editDirection && (
        <div className="rounded-lg border p-4 grid gap-2 sm:grid-cols-3">
          <h3 className="sm:col-span-3 font-semibold">Modifier direction</h3>
          <div>
            <Label>Nom</Label>
            <Input
              value={editDirection.nom}
              onChange={(e) => setEditDirection((d) => d && { ...d, nom: e.target.value })}
            />
          </div>
          <div>
            <Label>Code</Label>
            <Input
              value={editDirection.code ?? ''}
              onChange={(e) => setEditDirection((d) => d && { ...d, code: e.target.value || null })}
            />
          </div>
          <div className="sm:col-span-3 flex gap-2">
            <Button
              size="sm"
              onClick={() =>
                void (async () => {
                  unwrapIpc(
                    await ipcClient.rh.updateDirection(editDirection.id, {
                      nom: editDirection.nom,
                      code: editDirection.code,
                    }),
                  );
                  setEditDirection(null);
                  void load();
                })()
              }
            >
              Enregistrer
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditDirection(null)}>
              Annuler
            </Button>
          </div>
        </div>
      )}

      {editDept && (
        <div className="rounded-lg border p-4 grid gap-2 sm:grid-cols-3">
          <h3 className="sm:col-span-3 font-semibold">Modifier département</h3>
          <div>
            <Label>Nom</Label>
            <Input value={editDept.nom} onChange={(e) => setEditDept((d) => d && { ...d, nom: e.target.value })} />
          </div>
          <div>
            <Label>Direction</Label>
            <select
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              value={editDept.directionId ?? ''}
              onChange={(e) =>
                setEditDept((d) => d && { ...d, directionId: e.target.value ? Number(e.target.value) : null })
              }
            >
              {directions.map((dir) => (
                <option key={dir.id} value={dir.id}>
                  {dir.nom}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-3 flex gap-2">
            <Button
              size="sm"
              onClick={() =>
                void (async () => {
                  if (!editDept.directionId) return;
                  unwrapIpc(
                    await ipcClient.rh.updateDepartement(editDept.id, {
                      nom: editDept.nom,
                      directionId: editDept.directionId,
                    }),
                  );
                  setEditDept(null);
                  void load();
                })()
              }
            >
              Enregistrer
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditDept(null)}>
              Annuler
            </Button>
          </div>
        </div>
      )}

      {editPoste && (
        <div className="rounded-lg border p-4 grid gap-2 sm:grid-cols-2">
          <h3 className="sm:col-span-2 font-semibold">Modifier poste</h3>
          <div>
            <Label>Nom</Label>
            <Input value={editPoste.nom} onChange={(e) => setEditPoste((p) => p && { ...p, nom: e.target.value })} />
          </div>
          <div>
            <Label>Département</Label>
            <select
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              value={editPoste.departementId}
              onChange={(e) =>
                setEditPoste((p) => p && { ...p, departementId: Number(e.target.value) })
              }
            >
              {departements.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.directionNom ? `${d.directionNom} · ` : ''}
                  {d.nom}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Rôle système</Label>
            <Input
              value={editPoste.roleSystemAssocie ?? ''}
              onChange={(e) =>
                setEditPoste((p) => p && { ...p, roleSystemAssocie: e.target.value || null })
              }
            />
          </div>
          <div>
            <Label>Salaire min</Label>
            <Input
              type="number"
              value={editPoste.salaireMin ?? ''}
              onChange={(e) =>
                setEditPoste((p) => p && { ...p, salaireMin: e.target.value ? Number(e.target.value) : null })
              }
            />
          </div>
          <div className="sm:col-span-2 flex gap-2">
            <Button
              size="sm"
              onClick={() =>
                void (async () => {
                  unwrapIpc(
                    await ipcClient.rh.updatePoste(editPoste.id, {
                      nom: editPoste.nom,
                      departementId: editPoste.departementId,
                      roleSystemAssocie: editPoste.roleSystemAssocie,
                      salaireMin: editPoste.salaireMin,
                      salaireMax: editPoste.salaireMax,
                    }),
                  );
                  setEditPoste(null);
                  void load();
                })()
              }
            >
              Enregistrer
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditPoste(null)}>
              Annuler
            </Button>
          </div>
        </div>
      )}

      <div>
        <h3 className="font-semibold mb-2">Vue consolidée des postes</h3>
        <DataTable columns={posteColumns} data={postes} keyExtractor={(p) => p.id} emptyMessage="Aucun poste." />
      </div>
    </div>
  );
}
