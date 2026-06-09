import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Plus } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useHotelsList } from '@/hooks/useHotelsList';
import { useAuthStore } from '@/stores/auth.store';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { formatMoney, formatPercent } from '@/lib/formatters';
import { canManageObjectifs } from '@/shared/permissions';
import type { ObjectifListItem } from '@/shared/types/objectifs';

const now = new Date();

export function ObjectifsPage() {  const role = useAuthStore((s) => s.user?.role);
  const { hotels } = useHotelsList();
  const [items, setItems] = useState<ObjectifListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [annee, setAnnee] = useState(now.getFullYear());
  const [mois, setMois] = useState<number | ''>('');
  const [hotelFilter, setHotelFilter] = useState<number | ''>('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = unwrapIpc(
        await ipcClient.objectifs.list({
          annee,
          mois: mois || undefined,
          hotelId: hotelFilter ? Number(hotelFilter) : undefined,
        }),
      );
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, [annee, mois, hotelFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns: Column<ObjectifListItem>[] = [
    { key: 'hotel', header: 'Hôtel', render: (r) => r.hotelName },
    {
      key: 'periode',
      header: 'Période',
      render: (r) => `${String(r.mois).padStart(2, '0')}/${r.annee}`,
    },
    {
      key: 'objectif',
      header: 'Objectif',
      render: (r) => formatMoney(r.objectifTotal),
    },
    {
      key: 'realise',
      header: 'Réalisé',
      render: (r) => formatMoney(r.realiseTotal),
    },
    {
      key: 'taux',
      header: 'Taux',
      render: (r) => (
        <span
          className={
            r.tauxRealisation >= 100
              ? 'font-medium text-brand-success'
              : r.tauxRealisation >= 80
                ? 'text-foreground'
                : 'text-brand-warning'
          }
        >
          {formatPercent(r.tauxRealisation)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-16 text-right',
      render: (r) => (
        <Button variant="ghost" size="icon" asChild>
          <Link to={`/objectifs/edit?hotelId=${r.hotelId}&annee=${r.annee}&mois=${r.mois}`}>
            <Pencil className="h-4 w-4" />
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Objectifs"
        description="Budgets mensuels et suivi de réalisation"
        action={
          canManageObjectifs(role) ? (
            <Button asChild>
              <Link to="/objectifs/edit">
                <Plus className="mr-2 h-4 w-4" />
                Saisir objectifs
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-wrap gap-3 rounded-lg border border-border bg-white p-3">
        <div className="space-y-1">
          <Label className="text-xs">Année</Label>
          <select
            className="h-9 rounded-md border border-input px-2 text-sm"
            value={annee}
            onChange={(e) => setAnnee(Number(e.target.value))}
          >
            {[now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Mois</Label>
          <select
            className="h-9 rounded-md border border-input px-2 text-sm"
            value={mois}
            onChange={(e) => setMois(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">Tous</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {String(i + 1).padStart(2, '0')}
              </option>
            ))}
          </select>
        </div>
        {hotels.length > 1 && (
          <div className="space-y-1">
            <Label className="text-xs">Hôtel</Label>
            <select
              className="h-9 min-w-[180px] rounded-md border border-input px-2 text-sm"
              value={hotelFilter}
              onChange={(e) =>
                setHotelFilter(e.target.value ? Number(e.target.value) : '')
              }
            >
              <option value="">Tous</option>
              {hotels.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {error && (
        <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <DataTable
        columns={columns}
        data={items}
        loading={loading}
        emptyMessage="Aucun objectif."
        keyExtractor={(r) => r.id}
      />
    </div>
  );
}
