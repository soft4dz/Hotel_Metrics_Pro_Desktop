import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Minus, Plus, Trash2, TrendingDown, TrendingUp, UserPlus } from 'lucide-react';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { KpiCard } from '@/components/common/KpiCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import type { HotelListItem } from '@/shared/types/admin';
import type { RhEmploye, RhOrganisationLigne, RhOrganisationSynthese, RhPoste } from '@/shared/types/rh';

const STATUT_LABELS = {
  ok: 'Équilibré',
  surplus: 'Surplus',
  manque: 'Manque',
} as const;

const STATUT_VARIANT: Record<RhOrganisationLigne['statut'], 'success' | 'danger' | 'muted'> = {
  ok: 'muted',
  surplus: 'success',
  manque: 'danger',
};

export function OrganisationTab() {
  const navigate = useNavigate();
  const [data, setData] = useState<RhOrganisationSynthese | null>(null);
  const [employes, setEmployes] = useState<RhEmploye[]>([]);
  const [postes, setPostes] = useState<RhPoste[]>([]);
  const [hotels, setHotels] = useState<HotelListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterHotelId, setFilterHotelId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    hotelId: '',
    posteId: '',
    effectifCible: '1',
    responsableEmployeId: '',
    notes: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const hotelId = filterHotelId ? Number(filterHotelId) : undefined;
      const [org, emps, pts, htls] = await Promise.all([
        ipcClient.rh.listOrganisation(hotelId),
        ipcClient.rh.listEmployes(),
        ipcClient.rh.listPostes(),
        ipcClient.hotels.list(),
      ]);
      setData(unwrapIpc(org));
      setEmployes(unwrapIpc(emps).filter((e) => e.statutRh === 'actif'));
      setPostes(unwrapIpc(pts).filter((p) => p.actif));
      setHotels(unwrapIpc(htls).filter((h) => h.isActive));
    } finally {
      setLoading(false);
    }
  }, [filterHotelId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleUpsert = async () => {
    if (!form.hotelId || !form.posteId) return;
    const cible = Number(form.effectifCible);
    if (!Number.isFinite(cible) || cible < 0) {
      alert("L'effectif cible doit être un nombre positif ou zéro.");
      return;
    }
    try {
      unwrapIpc(
        await ipcClient.rh.upsertOrganisation({
          hotelId: Number(form.hotelId),
          posteId: Number(form.posteId),
          effectifCible: cible,
          responsableEmployeId: form.responsableEmployeId ? Number(form.responsableEmployeId) : null,
          notes: form.notes.trim() || null,
        }),
      );
      setShowForm(false);
      setForm({
        hotelId: filterHotelId || '',
        posteId: '',
        effectifCible: '1',
        responsableEmployeId: '',
        notes: '',
      });
      void load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const handleDelete = async (ligne: RhOrganisationLigne) => {
    if (!window.confirm(`Supprimer la ligne organisation pour ${ligne.posteNom} — ${ligne.hotelName} ?`)) return;
    try {
      unwrapIpc(await ipcClient.rh.deleteOrganisation(ligne.id));
      void load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const columns: Column<RhOrganisationLigne>[] = [
    { key: 'hotel', header: 'Unité', render: (l) => l.hotelName },
    {
      key: 'poste',
      header: 'Poste / département',
      render: (l) => (
        <div>
          <p className="font-medium">{l.posteNom}</p>
          {l.departementNom && <p className="text-xs text-muted-foreground">{l.departementNom}</p>}
        </div>
      ),
    },
    {
      key: 'responsable',
      header: 'Responsable',
      render: (l) => l.responsableNom ?? <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'cible',
      header: 'Effectif cible',
      render: (l) => <span className="tabular-nums font-medium">{l.effectifCible}</span>,
    },
    {
      key: 'actuel',
      header: 'Effectif réel',
      render: (l) => <span className="tabular-nums">{l.effectifActuel}</span>,
    },
    {
      key: 'ecart',
      header: 'Écart',
      render: (l) => (
        <span
          className={`tabular-nums font-semibold ${
            l.ecart > 0 ? 'text-emerald-600' : l.ecart < 0 ? 'text-destructive' : 'text-muted-foreground'
          }`}
        >
          {l.ecart > 0 ? `+${l.ecart}` : l.ecart}
        </span>
      ),
    },
    {
      key: 'statut',
      header: 'Statut',
      render: (l) => <Badge variant={STATUT_VARIANT[l.statut]}>{STATUT_LABELS[l.statut]}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      render: (l) => (
        <div className="flex justify-end gap-1">
          {l.statut === 'manque' && (
            <Button
              variant="ghost"
              size="icon"
              title="Lancer un recrutement"
              onClick={() =>
                navigate(
                  `/rh/talents/recrutements?posteId=${l.posteId}&notes=${encodeURIComponent(
                    `Besoin ${l.hotelName} — manque de ${Math.abs(l.ecart)} poste(s)`,
                  )}`,
                )
              }
            >
              <UserPlus className="h-4 w-4 text-primary" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => void handleDelete(l)} title="Supprimer">
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            Définissez par unité et poste l&apos;effectif cible et le responsable. L&apos;effectif réel est calculé
            depuis les affectations actives.
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus className="mr-2 h-4 w-4" />
          {showForm ? 'Fermer' : 'Ajouter un poste'}
        </Button>
      </div>

      {data && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <KpiCard
            title="Manque total"
            value={String(data.totalManque)}
            subtitle={`${data.postesEnManque} poste(s)`}
            icon={TrendingDown}
            accent="warning"
          />
          <KpiCard
            title="Surplus total"
            value={String(data.totalSurplus)}
            subtitle={`${data.postesEnSurplus} poste(s)`}
            icon={TrendingUp}
            accent="success"
          />
          <KpiCard
            title="Postes équilibrés"
            value={String(data.postesEquilibres)}
            icon={CheckCircle2}
            accent="primary"
          />
          <KpiCard
            title="En manque"
            value={String(data.postesEnManque)}
            icon={AlertTriangle}
            accent="warning"
          />
          <KpiCard title="En surplus" value={String(data.postesEnSurplus)} icon={Minus} accent="neutral" />
        </div>
      )}

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="filter-hotel">Filtrer par unité</Label>
          <select
            id="filter-hotel"
            className="flex h-9 w-56 rounded-md border border-input bg-background px-3 text-sm"
            value={filterHotelId}
            onChange={(e) => setFilterHotelId(e.target.value)}
          >
            <option value="">Toutes les unités</option>
            {hotels.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {showForm && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-4">
          <h3 className="font-semibold">Poste organisationnel</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Unité *</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.hotelId}
                onChange={(e) => setForm((f) => ({ ...f, hotelId: e.target.value }))}
              >
                <option value="">Sélectionner…</option>
                {hotels.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Poste *</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.posteId}
                onChange={(e) => setForm((f) => ({ ...f, posteId: e.target.value }))}
              >
                <option value="">Sélectionner…</option>
                {postes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nom} {p.departementNom ? `(${p.departementNom})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Effectif cible *</Label>
              <Input
                type="number"
                min={0}
                value={form.effectifCible}
                onChange={(e) => setForm((f) => ({ ...f, effectifCible: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Responsable</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.responsableEmployeId}
                onChange={(e) => setForm((f) => ({ ...f, responsableEmployeId: e.target.value }))}
              >
                <option value="">Aucun</option>
                {employes.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.prenom} {e.nom}
                    {e.posteNom ? ` — ${e.posteNom}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Notes</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Optionnel"
              />
            </div>
          </div>
          <Button onClick={() => void handleUpsert()}>Enregistrer</Button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={data?.lignes ?? []}
        keyExtractor={(l) => l.id}
        loading={loading}
        emptyMessage="Aucun poste organisationnel défini. Ajoutez une ligne pour suivre les écarts d'effectif."
      />
    </div>
  );
}
