import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Plus } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { formatDate, formatMoney } from '@/lib/formatters';
import type { ContratListItem } from '@/shared/types/portmaster';

export function ContratsPage() {  const [items, setItems] = useState<ContratListItem[]>([]);
  const [statutFilter, setStatutFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setItems(
        unwrapIpc(
          await ipcClient.portmaster.listContrats(statutFilter || undefined,
          ),
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, [statutFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns: Column<ContratListItem>[] = [
    { key: 'num', header: 'N° contrat', render: (c) => <span className="font-mono">{c.numero}</span> },
    { key: 'bateau', header: 'Bateau', render: (c) => c.bateauNom },
    { key: 'emp', header: 'Poste', render: (c) => c.emplacementCode },
    {
      key: 'debut',
      header: 'Début',
      render: (c) => formatDate(c.dateDebut),
    },
    {
      key: 'fin',
      header: 'Fin',
      render: (c) => (c.dateFin ? formatDate(c.dateFin) : '—'),
    },
    {
      key: 'total',
      header: 'Montant',
      render: (c) => formatMoney(c.montantTotal),
    },
    {
      key: 'reste',
      header: 'Reste dû',
      render: (c) => (
        <span className={c.resteARecouvrer > 0 ? 'font-medium text-brand-warning' : ''}>
          {formatMoney(c.resteARecouvrer)}
        </span>
      ),
    },
    {
      key: 'statut',
      header: 'Statut',
      render: (c) => (
        <Badge variant={c.statut === 'actif' ? 'success' : 'muted'}>{c.statut}</Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-12 text-right',
      render: (c) => (
        <Button variant="ghost" size="icon" asChild>
          <Link to={`/portmaster/contrats/${c.id}`}>
            <Pencil className="h-4 w-4" />
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Contrats d'amarrage"
        description="Gestion des contrats et encaissements"
        action={
          <Button asChild>
            <Link to="/portmaster/contrats/new">
              <Plus className="mr-2 h-4 w-4" />
              Nouveau contrat
            </Link>
          </Button>
        }
      />

      <div className="mb-4 flex items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Statut</Label>
          <select
            className="h-9 rounded-md border border-input px-2 text-sm"
            value={statutFilter}
            onChange={(e) => setStatutFilter(e.target.value)}
          >
            <option value="">Tous</option>
            <option value="actif">Actif</option>
            <option value="resilie">Résilié</option>
            <option value="expire">Expiré</option>
          </select>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      <DataTable
        columns={columns}
        data={items}
        loading={loading}
        emptyMessage="Aucun contrat."
        keyExtractor={(c) => c.id}
      />
    </div>
  );
}
