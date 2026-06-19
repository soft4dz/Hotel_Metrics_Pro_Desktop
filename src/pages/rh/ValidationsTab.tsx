import { useCallback, useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import type { RhValidationN1Item } from '@/shared/types/rh';

interface ValidationsTabProps {
  filter?: 'all' | 'absence' | 'pointage' | 'document';
}

export function ValidationsTab({ filter = 'all' }: ValidationsTabProps) {
  const [items, setItems] = useState<RhValidationN1Item[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(unwrapIpc(await ipcClient.rh.listValidationsN1()));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = filter === 'all' ? items : items.filter((i) => {
    if (filter === 'absence') return i.type === 'absence';
    if (filter === 'pointage') return i.type === 'pointage';
    return i.type === 'document';
  });

  const traiter = async (row: RhValidationN1Item, approuve: boolean) => {
    try {
      if (row.type === 'absence') {
        unwrapIpc(await ipcClient.rh.validerN1Absence(row.id, approuve));
      } else if (row.type === 'pointage') {
        unwrapIpc(await ipcClient.rh.validerN1Pointage(row.id, approuve));
      } else {
        unwrapIpc(await ipcClient.rh.validerN1Document(row.id, approuve));
      }
      void load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const typeLabel: Record<RhValidationN1Item['type'], string> = {
    absence: 'Absence',
    pointage: 'Pointage',
    document: 'Document',
  };

  const columns: Column<RhValidationN1Item>[] = [
    {
      key: 'type',
      header: 'Type',
      render: (r) => <Badge variant="muted">{typeLabel[r.type]}</Badge>,
    },
    { key: 'employeNom', header: 'Employé', render: (r) => r.employeNom },
    { key: 'libelle', header: 'Détail', render: (r) => r.libelle },
    { key: 'createdAt', header: 'Date', render: (r) => r.createdAt.slice(0, 10) },
    {
      key: 'actions',
      header: 'Décision N+1',
      render: (r) => (
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={() => void traiter(r, true)}>
            <Check className="h-4 w-4 text-emerald-600" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => void traiter(r, false)}>
            <X className="h-4 w-4 text-red-600" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Validations N+1</h2>
        <p className="text-sm text-muted-foreground">
          File d&apos;attente pour les chefs d&apos;équipe : absences, pointages et documents scannés
        </p>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          keyExtractor={(r) => `${r.type}-${r.id}`}
          emptyMessage="Aucune validation en attente pour votre périmètre."
        />
      )}
    </div>
  );
}
