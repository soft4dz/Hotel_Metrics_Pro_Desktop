import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Plus, Search, UserX } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import type { BateauListItem } from '@/shared/types/portmaster';

export function BateauxPage() {  const [items, setItems] = useState<BateauListItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setItems(unwrapIpc(await ipcClient.portmaster.listBateaux(search || undefined)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 300);
    return () => clearTimeout(t);
  }, [load]);

  const handleDeactivate = async (b: BateauListItem) => {
    if (!window.confirm(`Désactiver le bateau « ${b.nom} » ?`)) return;
    try {
      unwrapIpc(await ipcClient.portmaster.deactivateBateau(b.id));
      void load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const columns: Column<BateauListItem>[] = [
    { key: 'nom', header: 'Nom', render: (b) => <span className="font-medium">{b.nom}</span> },
    {
      key: 'immat',
      header: 'Immatriculation',
      render: (b) => b.immatriculation ?? '—',
    },
    { key: 'type', header: 'Type', render: (b) => b.typeNavire ?? '—' },
    { key: 'prop', header: 'Propriétaire', render: (b) => b.proprietaire },
    {
      key: 'poste',
      header: 'Emplacement',
      render: (b) => b.emplacementCode ?? '—',
    },
    {
      key: 'statut',
      header: 'Statut',
      render: (b) => (
        <Badge variant={b.statut === 'actif' ? 'success' : 'muted'}>{b.statut}</Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-24 text-right',
      render: (b) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" asChild>
            <Link to={`/portmaster/bateaux/${b.id}`}>
              <Pencil className="h-4 w-4" />
            </Link>
          </Button>
          {b.statut === 'actif' && !b.contratActif && (
            <Button variant="ghost" size="icon" onClick={() => void handleDeactivate(b)}>
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
        title="Bateaux"
        description="Flotte et navires enregistrés"
        action={
          <Button asChild>
            <Link to="/portmaster/bateaux/new">
              <Plus className="mr-2 h-4 w-4" />
              Nouveau bateau
            </Link>
          </Button>
        }
      />

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Rechercher…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && (
        <p className="mb-4 text-sm text-destructive">{error}</p>
      )}

      <DataTable
        columns={columns}
        data={items}
        loading={loading}
        emptyMessage="Aucun bateau."
        keyExtractor={(b) => b.id}
      />
    </div>
  );
}
