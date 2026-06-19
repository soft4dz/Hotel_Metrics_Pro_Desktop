import { useCallback, useEffect, useState } from 'react';
import { Plus, UserX } from 'lucide-react';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { useAuthStore } from '@/stores/auth.store';
import { canManageRh } from '@/shared/permissions';
import type { HotelListItem } from '@/shared/types/admin';
import type { RhAffectation, RhEmploye, RhPoste, TypeAffectation } from '@/shared/types/rh';

const TYPE_LABELS: Record<TypeAffectation, string> = {
  principale: 'Principale',
  temporaire: 'Temporaire',
  renfort: 'Renfort',
};

export function AffectationsTab() {
  const role = useAuthStore((s) => s.user?.role);
  const canManage = canManageRh(role);
  const [items, setItems] = useState<RhAffectation[]>([]);
  const [employes, setEmployes] = useState<RhEmploye[]>([]);
  const [postes, setPostes] = useState<RhPoste[]>([]);
  const [hotels, setHotels] = useState<HotelListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatut, setFilterStatut] = useState<'all' | 'active' | 'terminee'>('active');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    employeId: '',
    hotelId: '',
    posteId: '',
    type: 'principale' as TypeAffectation,
    dateDebut: new Date().toISOString().slice(0, 10),
    dateFin: '',
    notes: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [affs, emps, pts, htls] = await Promise.all([
        ipcClient.rh.listAffectations(
          filterStatut === 'all' ? undefined : { statut: filterStatut },
        ),
        ipcClient.rh.listEmployes(),
        ipcClient.rh.listPostes(),
        ipcClient.hotels.list(),
      ]);
      setItems(unwrapIpc(affs));
      setEmployes(unwrapIpc(emps).filter((e) => e.statutRh === 'actif'));
      setPostes(unwrapIpc(pts));
      setHotels(unwrapIpc(htls).filter((h) => h.isActive));
    } finally {
      setLoading(false);
    }
  }, [filterStatut]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async () => {
    if (!form.employeId || !form.hotelId || !form.posteId) return;
    try {
      unwrapIpc(
        await ipcClient.rh.createAffectation({
          employeId: Number(form.employeId),
          hotelId: Number(form.hotelId),
          posteId: Number(form.posteId),
          type: form.type,
          dateDebut: form.dateDebut,
          dateFin: form.dateFin.trim() || null,
          notes: form.notes.trim() || null,
        }),
      );
      setShowForm(false);
      setForm({
        employeId: '',
        hotelId: '',
        posteId: '',
        type: 'principale',
        dateDebut: new Date().toISOString().slice(0, 10),
        dateFin: '',
        notes: '',
      });
      void load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const handleTerminer = async (aff: RhAffectation) => {
    if (!window.confirm(`Terminer l'affectation de ${aff.employeNom} chez ${aff.hotelName} ?`)) return;
    try {
      unwrapIpc(await ipcClient.rh.terminerAffectation(aff.id));
      void load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const columns: Column<RhAffectation>[] = [
    {
      key: 'employe',
      header: 'Employé',
      render: (a) => <span className="font-medium">{a.employeNom}</span>,
    },
    { key: 'hotel', header: 'Unité', render: (a) => a.hotelName },
    {
      key: 'poste',
      header: 'Poste / département',
      render: (a) => (
        <div>
          <p>{a.posteNom}</p>
          {a.departementNom && (
            <p className="text-xs text-muted-foreground">{a.departementNom}</p>
          )}
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (a) => TYPE_LABELS[a.type],
    },
    {
      key: 'periode',
      header: 'Période',
      render: (a) => `${a.dateDebut} → ${a.dateFin ?? 'en cours'}`,
    },
    {
      key: 'statut',
      header: 'Statut',
      render: (a) => (
        <Badge variant={a.statut === 'active' ? 'success' : 'muted'}>
          {a.statut === 'active' ? 'Active' : 'Terminée'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-12 text-right',
      render: (a) =>
        canManage && a.statut === 'active' ? (
          <Button
            size="sm"
            variant="ghost"
            title="Terminer l'affectation"
            onClick={() => void handleTerminer(a)}
          >
            <UserX className="h-4 w-4 text-red-500" />
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Affectez les employés aux unités hôtelières et postes. Une seule affectation active par employé ;
        la fiche employé est mise à jour automatiquement.
      </p>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {(['active', 'terminee', 'all'] as const).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={filterStatut === s ? 'default' : 'outline'}
              onClick={() => setFilterStatut(s)}
            >
              {s === 'active' ? 'Actives' : s === 'terminee' ? 'Terminées' : 'Toutes'}
            </Button>
          ))}
        </div>
        {canManage && (
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle affectation
          </Button>
        )}
      </div>

      {showForm && canManage && (
        <div className="rounded-lg border bg-card p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <Label>Employé</Label>
            <select
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              value={form.employeId}
              onChange={(e) => setForm((f) => ({ ...f, employeId: e.target.value }))}
            >
              <option value="">— Sélectionner —</option>
              {employes.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.prenom} {e.nom}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Unité hôtelière</Label>
            <select
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              value={form.hotelId}
              onChange={(e) => setForm((f) => ({ ...f, hotelId: e.target.value }))}
            >
              <option value="">— Sélectionner —</option>
              {hotels.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
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
              <option value="">— Sélectionner —</option>
              {postes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nom} ({p.departementNom})
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Type</Label>
            <select
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as TypeAffectation }))}
            >
              {(Object.keys(TYPE_LABELS) as TypeAffectation[]).map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Date début</Label>
            <Input
              type="date"
              value={form.dateDebut}
              onChange={(e) => setForm((f) => ({ ...f, dateDebut: e.target.value }))}
            />
          </div>
          <div>
            <Label>Date fin (optionnel)</Label>
            <Input
              type="date"
              value={form.dateFin}
              onChange={(e) => setForm((f) => ({ ...f, dateFin: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <Label>Notes</Label>
            <Input
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Motif, remplacement, mission temporaire…"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3 flex gap-2">
            <Button onClick={() => void handleCreate()}>Enregistrer</Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Annuler
            </Button>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={items}
        keyExtractor={(a) => a.id}
        loading={loading}
        emptyMessage="Aucune affectation."
      />
    </div>
  );
}
