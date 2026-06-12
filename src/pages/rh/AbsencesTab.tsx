import { useCallback, useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import type { RhAbsence } from '@/shared/types/rh';

interface Props {
  canValidate: boolean;
}

export function AbsencesTab({ canValidate }: Props) {
  const [items, setItems] = useState<RhAbsence[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(unwrapIpc(await ipcClient.rh.listAbsences()));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const decider = async (id: number, approuve: boolean) => {
    try {
      unwrapIpc(await ipcClient.rh.deciderAbsence(id, approuve));
      void load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const statutBadge = (s: RhAbsence['statut']) => {
    if (s === 'approuvee') return <Badge variant="success">Approuvée</Badge>;
    if (s === 'refusee') return <Badge variant="danger">Refusée</Badge>;
    return <Badge variant="warning">Demandée</Badge>;
  };

  const columns: Column<RhAbsence>[] = [
    { key: 'employe', header: 'Employé', render: (a) => a.employeNom },
    { key: 'type', header: 'Type', render: (a) => a.type },
    { key: 'periode', header: 'Période', render: (a) => `${a.dateDebut} → ${a.dateFin}` },
    { key: 'motif', header: 'Motif', render: (a) => a.motif ?? '—' },
    { key: 'statut', header: 'Statut', render: (a) => statutBadge(a.statut) },
    {
      key: 'actions',
      header: '',
      className: 'w-24 text-right',
      render: (a) =>
        canValidate && a.statut === 'demandee' ? (
          <div className="flex justify-end gap-1">
            <Button size="sm" variant="ghost" onClick={() => void decider(a.id, true)}><Check className="h-4 w-4 text-emerald-600" /></Button>
            <Button size="sm" variant="ghost" onClick={() => void decider(a.id, false)}><X className="h-4 w-4 text-red-500" /></Button>
          </div>
        ) : null,
    },
  ];

  return <DataTable columns={columns} data={items} keyExtractor={(a) => a.id} loading={loading} emptyMessage="Aucune absence enregistrée." />;
}
