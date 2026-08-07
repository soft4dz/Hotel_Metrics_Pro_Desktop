import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Plus, UserX } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { useBusinessSector } from '@/hooks/useBusinessSector';
import type { HotelListItem } from '@/shared/types/admin';

export function HotelsPage() {
  const { terminology } = useBusinessSector();
  const [hotels, setHotels] = useState<HotelListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setHotels(unwrapIpc(await ipcClient.hotels.list()));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDeactivate = async (hotel: HotelListItem) => {
    const reason = window.prompt('Motif de désactivation :');
    if (!reason?.trim()) return;
    try {
      unwrapIpc(await ipcClient.hotels.deactivate(hotel.id, reason.trim()));
      void load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const columns: Column<HotelListItem>[] = [
    {
      key: 'logo',
      header: '',
      className: 'w-12',
      render: (h) =>
        h.logoUrl ? (
          <img
            src={h.logoUrl}
            alt=""
            className="h-8 w-8 rounded object-contain"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded bg-secondary text-[10px] font-bold text-muted-foreground">
            {h.code.slice(0, 2)}
          </div>
        ),
    },
    {
      key: 'code',
      header: 'Code',
      render: (h) => <span className="font-mono font-medium">{h.code}</span>,
    },
    { key: 'name', header: 'Nom', render: (h) => h.name },
    { key: 'city', header: 'Ville', render: (h) => h.city ?? '—' },
    {
      key: 'users',
      header: 'Utilisateurs',
      render: (h) => h.userCount,
    },
    {
      key: 'status',
      header: 'Statut',
      render: (h) => (
        <Badge variant={h.isActive ? 'success' : 'muted'}>
          {h.isActive ? 'Actif' : 'Inactif'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-24 text-right',
      render: (h) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" asChild>
            <Link to={`/admin/hotels/${h.id}`}>
              <Pencil className="h-4 w-4" />
            </Link>
          </Button>
          {h.code !== 'SIEGE' && (
            <Button variant="ghost" size="icon" onClick={() => void handleDeactivate(h)}>
              <UserX className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={terminology.unitAdminTitle}
        description="Établissements gérés dans la plateforme"
        action={
          <Button asChild>
            <Link to="/admin/hotels/new">
              <Plus className="h-4 w-4" />
              {terminology.newUnit}
            </Link>
          </Button>
        }
      />

      {error && (
        <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <DataTable
        columns={columns}
        data={hotels}
        keyExtractor={(h) => h.id}
        loading={loading}
        emptyMessage={terminology.unitEmpty}
      />
    </div>
  );
}
