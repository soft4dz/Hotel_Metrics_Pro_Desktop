import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Plus, Search } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { formatMoney } from '@/lib/formatters';
import type { ClientListItem } from '@/shared/types/portmaster';

const dossierVariant: Record<string, 'success' | 'warning' | 'danger' | 'muted'> = {
  complet: 'success',
  incomplet: 'warning',
  a_regulariser: 'warning',
  bloque: 'danger',
};

export function ClientsPage() {  const [items, setItems] = useState<ClientListItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(unwrapIpc(await ipcClient.portmaster.listClients(search || undefined)));
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 300);
    return () => clearTimeout(t);
  }, [load]);

  const columns: Column<ClientListItem>[] = [
    { key: 'name', header: 'Client', render: (c) => <span className="font-medium">{c.displayName}</span> },
    {
      key: 'type',
      header: 'Type',
      render: (c) => (c.typeClient === 'morale' ? 'Personne morale' : 'Personne physique'),
    },
    { key: 'tel', header: 'Téléphone', render: (c) => c.telephone ?? '—' },
    { key: 'email', header: 'E-mail', render: (c) => c.email ?? '—' },
    {
      key: 'dossier',
      header: 'Dossier',
      render: (c) => (
        <Badge variant={dossierVariant[c.statutDossier] ?? 'muted'}>{c.statutDossier}</Badge>
      ),
    },
    { key: 'bateaux', header: 'Bateaux', render: (c) => c.bateauCount },
    {
      key: 'creances',
      header: 'Créances',
      render: (c) => formatMoney(c.soldeCreances),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-12',
      render: (c) => (
        <Button variant="ghost" size="icon" asChild>
          <Link to={`/portmaster/clients/${c.id}`}>
            <Pencil className="h-4 w-4" />
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Clients portuaires"
        description="Dossiers clients — personnes physiques et morales"
        action={
          <Button asChild>
            <Link to="/portmaster/clients/new">
              <Plus className="mr-2 h-4 w-4" />
              Nouveau client
            </Link>
          </Button>
        }
      />
      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Nom, e-mail, téléphone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <DataTable
        columns={columns}
        data={items}
        loading={loading}
        emptyMessage="Aucun client."
        keyExtractor={(c) => c.id}
      />
    </div>
  );
}
