import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Search } from 'lucide-react';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import type { HotelListItem } from '@/shared/types/admin';
import type { RhEmploye, RhPoste } from '@/shared/types/rh';
import { EmployeFiche360 } from './EmployeFiche360';
import { EmployeWizard } from './EmployeWizard';

export function EmployesTab() {
  const [items, setItems] = useState<RhEmploye[]>([]);
  const [postes, setPostes] = useState<RhPoste[]>([]);
  const [hotels, setHotels] = useState<HotelListItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [selected, setSelected] = useState<RhEmploye | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [emps, pts, htls] = await Promise.all([
        ipcClient.rh.listEmployes(search || undefined),
        ipcClient.rh.listPostes(),
        ipcClient.hotels.list(),
      ]);
      setItems(unwrapIpc(emps));
      setPostes(unwrapIpc(pts));
      setHotels(unwrapIpc(htls).filter((h) => h.isActive));
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void load();
  }, [load]);

  const openDetail = (e: RhEmploye) => {
    setSelected(e);
    setShowWizard(false);
  };

  const columns: Column<RhEmploye>[] = [
    {
      key: 'nom',
      header: 'Employé',
      render: (e) => (
        <button type="button" className="text-left hover:underline" onClick={() => openDetail(e)}>
          <p className="font-medium">{e.prenom} {e.nom}</p>
          <p className="text-xs text-muted-foreground">{e.emailPersonnel ?? '—'}</p>
        </button>
      ),
    },
    { key: 'poste', header: 'Poste', render: (e) => e.posteNom ?? '—' },
    { key: 'unite', header: 'Unité', render: (e) => e.hotelName ?? '—' },
    {
      key: 'nss',
      header: 'NSS',
      render: (e) => (e.nss ? <span className="text-xs">OK</span> : <Badge variant="warning">Manquant</Badge>),
    },
    {
      key: 'statut',
      header: 'Statut',
      render: (e) => (
        <Badge variant={e.statutRh === 'actif' ? 'success' : e.statutRh === 'sorti' ? 'danger' : 'muted'}>
          {e.statutRh}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (e) => (
        <Button size="sm" variant="ghost" onClick={() => openDetail(e)}>
          <Pencil className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button onClick={() => { setShowWizard(true); setSelected(null); }}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvel employé
        </Button>
      </div>

      {showWizard && (
        <EmployeWizard
          onClose={() => setShowWizard(false)}
          onCreated={(e) => {
            void load();
            setSelected(e);
          }}
        />
      )}

      {selected && !showWizard && (
        <EmployeFiche360
          employe={selected}
          postes={postes}
          hotels={hotels}
          onClose={() => setSelected(null)}
          onUpdated={(e) => {
            setSelected(e);
            void load();
          }}
          onSortie={() => void load()}
        />
      )}

      <DataTable columns={columns} data={items} keyExtractor={(e) => e.id} loading={loading} emptyMessage="Aucun employé." />
    </div>
  );
}
