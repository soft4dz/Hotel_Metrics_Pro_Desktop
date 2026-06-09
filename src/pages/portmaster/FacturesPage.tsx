import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { formatMoney } from '@/lib/formatters';
import type { FactureListItem } from '@/shared/types/portmaster';

export function FacturesPage() {  const [items, setItems] = useState<FactureListItem[]>([]);
  const [statut, setStatut] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(unwrapIpc(await ipcClient.portmaster.listFactures(statut || undefined)));
    } finally {
      setLoading(false);
    }
  }, [statut]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns: Column<FactureListItem>[] = [
    { key: 'num', header: 'N°', render: (f) => <span className="font-mono">{f.numero}</span> },
    { key: 'client', header: 'Client', render: (f) => f.clientName },
    { key: 'date', header: 'Date', render: (f) => f.dateFacture },
    { key: 'ttc', header: 'TTC', render: (f) => formatMoney(f.montantTtc) },
    { key: 'reste', header: 'Reste', render: (f) => formatMoney(f.reste) },
    {
      key: 'statut',
      header: 'Statut',
      render: (f) => <Badge variant={f.statut === 'validee' ? 'success' : 'muted'}>{f.statut}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      render: (f) => (
        <Link className="text-sm text-brand-turquoise hover:underline" to={`/portmaster/factures/${f.id}`}>
          Détail
        </Link>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Facturation port"
        description="Factures liées aux contrats ou prestations hors contrat"
        action={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/portmaster/factures/new">
                <Plus className="mr-2 h-4 w-4" />
                Hors contrat
              </Link>
            </Button>
          </div>
        }
      />
      <select
        className="mb-4 h-9 rounded-md border px-2 text-sm"
        value={statut}
        onChange={(e) => setStatut(e.target.value)}
      >
        <option value="">Tous statuts</option>
        <option value="brouillon">Brouillon</option>
        <option value="soumise">Soumise</option>
        <option value="validee">Validée</option>
        <option value="payee">Payée</option>
      </select>
      <DataTable columns={columns} data={items} loading={loading} keyExtractor={(f) => f.id} emptyMessage="Aucune facture." />
    </div>
  );
}
