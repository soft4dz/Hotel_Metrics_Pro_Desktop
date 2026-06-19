import { useCallback, useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import type { RhPointage } from '@/shared/types/rh';

interface Props {
  /** Validation finale RH (après accord N+1) */
  canValidateRh: boolean;
  /** Chef d'équipe : orienter vers le centre validations */
  showN1Hint?: boolean;
}

export function PointagesTab({ canValidateRh, showN1Hint }: Props) {
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

  const validerRh = async (id: number, approuve: boolean) => {
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

  const n1Badge = (s: RhPointage['statutN1']) => {
    if (s === 'approuve') return <Badge variant="success">N+1 OK</Badge>;
    if (s === 'refuse') return <Badge variant="danger">N+1 refusé</Badge>;
    if (s === 'na') return <Badge variant="muted">N+1 N/A</Badge>;
    return <Badge variant="warning">N+1 en attente</Badge>;
  };

  const columns: Column<RhPointage>[] = [
    { key: 'date', header: 'Date', render: (p) => p.date },
    { key: 'employe', header: 'Employé', render: (p) => p.employeNom },
    { key: 'entree', header: 'Entrée', render: (p) => p.heureEntree ?? '—' },
    { key: 'sortie', header: 'Sortie', render: (p) => p.heureSortie ?? '—' },
    { key: 'heures', header: 'Heures', render: (p) => (p.heuresTravaillees != null ? `${p.heuresTravaillees} h` : '—') },
    { key: 'n1', header: 'N+1', render: (p) => n1Badge(p.statutN1) },
    { key: 'statut', header: 'Statut RH', render: (p) => statutBadge(p.statut) },
    {
      key: 'actions',
      header: '',
      className: 'w-24 text-right',
      render: (p) =>
        canValidateRh && p.statut === 'soumis' && p.statutN1 === 'approuve' ? (
          <div className="flex justify-end gap-1">
            <Button size="sm" variant="ghost" onClick={() => void validerRh(p.id, true)}>
              <Check className="h-4 w-4 text-emerald-600" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => void validerRh(p.id, false)}>
              <X className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        ) : null,
    },
  ];

  return (
    <div className="space-y-4">
      {showN1Hint && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Les pointages soumis doivent d&apos;abord être validés par le N+1 dans le{' '}
          <Link to="/rh/validations/pointages" className="font-medium underline">
            Centre validations
          </Link>
          . La validation RH intervient ensuite.
        </p>
      )}
      <DataTable
        columns={columns}
        data={items}
        keyExtractor={(p) => p.id}
        loading={loading}
        emptyMessage="Aucun pointage sur la période."
      />
    </div>
  );
}
