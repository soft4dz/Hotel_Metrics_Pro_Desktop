import { useCallback, useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { Button } from '@/components/ui/button';
import { useHotelsList } from '@/hooks/useHotelsList';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { formatDate, formatMoney } from '@/lib/formatters';
import type { ValidationJourItem } from '@/shared/types/recettes';

export function ValidationRecettesPage() {
  const { hotels, defaultHotelId } = useHotelsList();
  const [hotelFilter, setHotelFilter] = useState<number | ''>('');
  const [items, setItems] = useState<ValidationJourItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (defaultHotelId && hotelFilter === '') setHotelFilter(defaultHotelId);
  }, [defaultHotelId, hotelFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = unwrapIpc(
        await ipcClient.recettes.listAValider(hotelFilter ? Number(hotelFilter) : undefined,
        ),
      );
      setItems(data);
    } finally {
      setLoading(false);
    }
  }, [hotelFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const valider = async (row: ValidationJourItem) => {
    try {
      unwrapIpc(await ipcClient.recettes.validerJour(row.hotelId, row.dateJournal));
      void load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const refuser = async (row: ValidationJourItem) => {
    const motif = window.prompt('Motif de refus (obligatoire) :');
    if (!motif?.trim()) return;
    try {
      unwrapIpc(
        await ipcClient.recettes.refuserJour(row.hotelId, row.dateJournal, motif),
      );
      void load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const columns: Column<ValidationJourItem>[] = [
    { key: 'date', header: 'Date', render: (r) => formatDate(r.dateJournal) },
    { key: 'hotel', header: 'Hôtel', render: (r) => r.hotelName },
    {
      key: 'total',
      header: 'Total CA',
      className: 'text-right',
      render: (r) => formatMoney(r.totalMontant),
    },
    { key: 'lines', header: 'Lignes', render: (r) => r.ligneCount },
    {
      key: 'actions',
      header: '',
      className: 'w-40 text-right',
      render: (r) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="default" onClick={() => void valider(r)}>
            <Check className="h-4 w-4" />
            Valider
          </Button>
          <Button size="sm" variant="outline" onClick={() => void refuser(r)}>
            <X className="h-4 w-4" />
            Refuser
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Validation des recettes"
        description="Journées soumises en attente de validation"
      />

      <div className="mb-4 flex gap-3">
        <select
          className="h-10 rounded-md border px-3 text-sm"
          value={hotelFilter}
          onChange={(e) =>
            setHotelFilter(e.target.value ? Number(e.target.value) : '')
          }
        >
          <option value="">Tous les hôtels</option>
          {hotels.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
        <Button variant="secondary" onClick={() => void load()}>
          Actualiser
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={items}
        keyExtractor={(r) => `${r.hotelId}-${r.dateJournal}`}
        loading={loading}
        emptyMessage="Aucune journée en attente de validation"
      />
    </div>
  );
}
