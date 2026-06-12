import { useCallback, useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import type { RhPointage } from '@/shared/types/rh';

interface Props {
  canValidate: boolean;
}

export function PointagesTab({ canValidate }: Props) {
  const [items, setItems] = useState<RhPointage[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const fin = new Date().toISOString().slice(0, 10);
      const debut = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
      setItems(unwrapIpc(await ipcClient.rh.listPointages(debut, fin)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const valider = async (id: number, approuve: boolean) => {
    try {
      unwrapIpc(await ipcClient.rh.validerPointage(id, approuve));
      void load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const statutBadge = (s: RhPointage['statut']) => {
    const map = { brouillon: 'muted', soumis: 'warning', valide: 'success', refuse: 'danger' } as const;
    return <Badge variant={map[s]}>{s}</Badge>;
  };

  const columns: Column<RhPointage>[] = [
    { key: 'date', header: 'Date', render: (p) => p.date },
    { key: 'employe', header: 'Employé', render: (p) => p.employeNom },
    { key: 'entree', header: 'Entrée', render: (p) => p.heureEntree ?? '—' },
    { key: 'sortie', header: 'Sortie', render: (p) => p.heureSortie ?? '—' },
    { key: 'heures', header: 'Heures', render: (p) => (p.heuresTravaillees != null ? `${p.heuresTravaillees} h` : '—') },
    { key: 'statut', header: 'Statut', render: (p) => statutBadge(p.statut) },
    {
      key: 'actions',
      header: '',
      className: 'w-24 text-right',
      render: (p) =>
        canValidate && p.statut === 'soumis' ? (
          <div className="flex justify-end gap-1">
            <Button size="sm" variant="ghost" onClick={() => void valider(p.id, true)}><Check className="h-4 w-4 text-emerald-600" /></Button>
            <Button size="sm" variant="ghost" onClick={() => void valider(p.id, false)}><X className="h-4 w-4 text-red-500" /></Button>
          </div>
        ) : null,
    },
  ];

  return <DataTable columns={columns} data={items} keyExtractor={(p) => p.id} loading={loading} emptyMessage="Aucun pointage sur la période." />;
}
