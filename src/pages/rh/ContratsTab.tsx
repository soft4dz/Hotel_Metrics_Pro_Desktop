import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Plus } from 'lucide-react';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { formatMoney } from '@/lib/formatters';
import type { RhContratListe, RhEmploye, RhPoste, TypeContrat } from '@/shared/types/rh';

const TYPES: TypeContrat[] = ['CDI', 'CDD', 'Interim'];

export function ContratsTab() {
  const [items, setItems] = useState<RhContratListe[]>([]);
  const [employes, setEmployes] = useState<RhEmploye[]>([]);
  const [postes, setPostes] = useState<RhPoste[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    employeId: '',
    posteId: '',
    type: 'CDI' as TypeContrat,
    dateDebut: new Date().toISOString().slice(0, 10),
    dateFin: '',
    salaireBrut: '',
    heuresHebdo: '35',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cts, emps, pts] = await Promise.all([
        ipcClient.rh.listAllContrats(),
        ipcClient.rh.listEmployes(),
        ipcClient.rh.listPostes(),
      ]);
      setItems(unwrapIpc(cts));
      setEmployes(unwrapIpc(emps).filter((e) => e.statutRh === 'actif'));
      setPostes(unwrapIpc(pts));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async () => {
    if (!form.employeId || !form.posteId || !form.salaireBrut) return;
    try {
      unwrapIpc(
        await ipcClient.rh.createContrat({
          employeId: Number(form.employeId),
          posteId: Number(form.posteId),
          type: form.type,
          dateDebut: form.dateDebut,
          dateFin: form.type === 'CDI' ? null : form.dateFin.trim() || null,
          salaireBrut: Number(form.salaireBrut),
          heuresHebdo: Number(form.heuresHebdo) || 35,
        }),
      );
      setShowForm(false);
      void load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const columns: Column<RhContratListe>[] = [
    { key: 'employe', header: 'Employé', render: (c) => <span className="font-medium">{c.employeNom}</span> },
    { key: 'poste', header: 'Poste', render: (c) => c.posteNom },
    { key: 'type', header: 'Type', render: (c) => c.type },
    {
      key: 'periode',
      header: 'Période',
      render: (c) => `${c.dateDebut} → ${c.dateFin ?? '—'}`,
    },
    {
      key: 'salaire',
      header: 'Salaire brut',
      render: (c) => formatMoney(c.salaireBrut),
    },
    {
      key: 'echeance',
      header: 'Échéance',
      render: (c) => {
        if (!c.dateFin || c.joursRestants === null) return '—';
        if (c.joursRestants < 0) return <Badge variant="muted">Expiré</Badge>;
        if (c.joursRestants <= 60) {
          return (
            <Badge variant="warning" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              {c.joursRestants} j
            </Badge>
          );
        }
        return <span className="text-muted-foreground">{c.joursRestants} j</span>;
      },
    },
  ];

  const alertes = items.filter(
    (c) => c.dateFin && c.joursRestants !== null && c.joursRestants >= 0 && c.joursRestants <= 60,
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Contrats actifs et alertes CDD/intérim (&le; 60 jours).
          {alertes > 0 && (
            <span className="ml-2 text-amber-700 font-medium">{alertes} échéance(s) proche(s)</span>
          )}
        </p>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau contrat
        </Button>
      </div>

      {showForm && (
        <div className="rounded-lg border bg-card p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <Label>Employé</Label>
            <select
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              value={form.employeId}
              onChange={(e) => setForm((f) => ({ ...f, employeId: e.target.value }))}
            >
              <option value="">—</option>
              {employes.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.prenom} {e.nom}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Poste</Label>
            <select
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              value={form.posteId}
              onChange={(e) => setForm((f) => ({ ...f, posteId: e.target.value }))}
            >
              <option value="">—</option>
              {postes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nom}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Type</Label>
            <select
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as TypeContrat }))}
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Date début</Label>
            <Input type="date" value={form.dateDebut} onChange={(e) => setForm((f) => ({ ...f, dateDebut: e.target.value }))} />
          </div>
          {form.type !== 'CDI' && (
            <div>
              <Label>Date fin</Label>
              <Input type="date" value={form.dateFin} onChange={(e) => setForm((f) => ({ ...f, dateFin: e.target.value }))} />
            </div>
          )}
          <div>
            <Label>Salaire brut</Label>
            <Input type="number" value={form.salaireBrut} onChange={(e) => setForm((f) => ({ ...f, salaireBrut: e.target.value }))} />
          </div>
          <div>
            <Label>Heures / semaine</Label>
            <Input type="number" value={form.heuresHebdo} onChange={(e) => setForm((f) => ({ ...f, heuresHebdo: e.target.value }))} />
          </div>
          <div className="sm:col-span-2 lg:col-span-3 flex gap-2">
            <Button onClick={() => void handleCreate()}>Enregistrer</Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Annuler
            </Button>
          </div>
        </div>
      )}

      <DataTable columns={columns} data={items} keyExtractor={(c) => c.id} loading={loading} emptyMessage="Aucun contrat actif." />
    </div>
  );
}
