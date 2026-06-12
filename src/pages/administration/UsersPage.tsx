import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Crown, Pencil, Plus, Search, UserCheck, UserX } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { useAuthStore } from '@/stores/auth.store';
import { isSuperAdmin } from '@/shared/permissions';
import type { UserListItem } from '@/shared/types/admin';

export function UsersPage() {
  const actorRole = useAuthStore((s) => s.user?.role);
  const actorIsSuperAdmin = isSuperAdmin(actorRole);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterPending, setFilterPending] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [result, pending] = await Promise.all([
        ipcClient.users.list(search || undefined),
        ipcClient.users.pendingCount(),
      ]);
      setUsers(unwrapIpc(result));
      setPendingCount(unwrapIpc(pending));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleActivate = async (user: UserListItem) => {
    if (!window.confirm(`Activer le compte de ${user.fullName} ?`)) return;
    try {
      unwrapIpc(await ipcClient.users.activatePending(user.id));
      void load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const handleDeactivate = async (user: UserListItem) => {
    const reason = window.prompt('Motif de désactivation (obligatoire) :');
    if (!reason?.trim()) return;
    try {
      unwrapIpc(await ipcClient.users.deactivate(user.id, reason.trim()));
      void load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const columns: Column<UserListItem>[] = [
    {
      key: 'name',
      header: 'Utilisateur',
      render: (u) => (
        <div>
          <p className="font-medium">{u.fullName}</p>
          <p className="text-xs text-muted-foreground">{u.email}</p>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Rôle',
      render: (u) => (
        <div className="flex items-center gap-1.5">
          {u.roleCode === 'SUPERADMIN' && (
            <Crown className="h-3.5 w-3.5 shrink-0 text-amber-500" />
          )}
          <Badge variant={u.roleCode === 'SUPERADMIN' ? 'warning' : 'accent'}>
            {u.roleLabel}
          </Badge>
        </div>
      ),
    },
    {
      key: 'hotel',
      header: 'Unités',
      render: (u) => u.hotelsLabel || u.hotelName || '—',
    },
    {
      key: 'status',
      header: 'Statut',
      render: (u) => {
        if (u.accountStatus === 'en_attente') {
          return <Badge variant="warning">En attente d&apos;activation</Badge>;
        }
        return (
          <Badge variant={u.isActive ? 'success' : 'muted'}>
            {u.isActive ? 'Actif' : 'Inactif'}
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      className: 'w-36 text-right',
      render: (u) => {
        const targetIsSuperAdmin = u.roleCode === 'SUPERADMIN';
        const canAct = actorIsSuperAdmin || !targetIsSuperAdmin;
        return (
          <div className="flex justify-end gap-1">
            {u.accountStatus === 'en_attente' && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => void handleActivate(u)}
                aria-label="Activer le compte"
                title="Activer le compte"
              >
                <UserCheck className="h-4 w-4 text-emerald-600" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              asChild
              disabled={!canAct}
              title={!canAct ? 'Réservé aux super-administrateurs' : undefined}
            >
              <Link to={`/admin/users/${u.id}`} aria-label="Modifier">
                <Pencil className="h-4 w-4" />
              </Link>
            </Button>
            {u.accountStatus !== 'en_attente' && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => void handleDeactivate(u)}
                disabled={!canAct}
                aria-label="Désactiver"
                title={!canAct ? 'Réservé aux super-administrateurs' : undefined}
              >
                <UserX className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Liste des utilisateurs"
        description="Comptes ayant accès à l'application"
        action={
          <Button asChild>
            <Link to="/admin/users/new">
              <Plus className="h-4 w-4" />
              Nouvel utilisateur
            </Link>
          </Button>
        }
      />

      <div className="mb-4 flex gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-10"
            placeholder="Rechercher par nom ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button
          variant={filterPending ? 'default' : 'outline'}
          onClick={() => setFilterPending((v) => !v)}
        >
          En attente
          {pendingCount > 0 && (
            <span className="ml-2 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              {pendingCount}
            </span>
          )}
        </Button>
        <Button variant="secondary" onClick={() => void load()}>
          Actualiser
        </Button>
      </div>

      {error && (
        <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <DataTable
        columns={columns}
        data={filterPending ? users.filter((u) => u.accountStatus === 'en_attente') : users}
        keyExtractor={(u) => u.id}
        loading={loading}
        emptyMessage={filterPending ? 'Aucun compte en attente' : 'Aucun utilisateur trouvé'}
      />
    </div>
  );
}
