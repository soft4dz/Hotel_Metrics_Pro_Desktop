import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Building2, KeyRound, Shield, Users } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import type { AuditLogItem, HotelListItem, RoleListItem, UserListItem } from '@/shared/types/admin';

export function AdminDashboardPage() {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [hotels, setHotels] = useState<HotelListItem[]>([]);
  const [roles, setRoles] = useState<RoleListItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [usersRes, hotelsRes, rolesRes, auditRes] = await Promise.all([
        ipcClient.users.list(),
        ipcClient.hotels.list(),
        ipcClient.roles.list(),
        ipcClient.audit.list({ module: 'administration', limit: 8 }),
      ]);

      setUsers(unwrapIpc(usersRes));
      setHotels(unwrapIpc(hotelsRes));
      setRoles(unwrapIpc(rolesRes));
      setAuditLogs(unwrapIpc(auditRes));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement du module administration.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const activeUsers = users.filter((user) => user.isActive).length;
    const inactiveUsers = users.length - activeUsers;
    const activeHotels = hotels.filter((hotel) => hotel.isActive).length;
    const superAdmins = users.filter((user) => user.roleCode === 'SUPERADMIN').length;
    const multiUnits = users.filter((user) => user.allHotelsAccess || user.hotelIds.length > 1).length;

    return { activeUsers, inactiveUsers, activeHotels, superAdmins, multiUnits };
  }, [hotels, users]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Chargement du module administration…</p>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Administration & utilisateurs"
        description="Pilotage des comptes, rôles, unités, permissions et traçabilité administrative."
        action={
          <Button asChild>
            <Link to="/admin/users/new">Nouvel utilisateur</Link>
          </Button>
        }
      />

      {error && <p className="status-banner-error">{error}</p>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <AdminMetric icon={Users} label="Utilisateurs actifs" value={stats.activeUsers} helper={`${stats.inactiveUsers} inactif(s)`} />
        <AdminMetric icon={Building2} label="Unités actives" value={stats.activeHotels} helper={`${hotels.length} unité(s) total`} />
        <AdminMetric icon={Shield} label="Rôles" value={roles.length} helper="Profils d’accès" />
        <AdminMetric icon={KeyRound} label="Super admins" value={stats.superAdmins} helper="Accès critiques" />
        <AdminMetric icon={Activity} label="Multi-unités" value={stats.multiUnits} helper="Accès élargis" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="app-surface p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="section-label">Gouvernance</p>
              <h2 className="mt-1 text-xl font-semibold">Accès par rôle</h2>
            </div>
            <Button variant="outline" asChild>
              <Link to="/admin/roles">Matrice des permissions</Link>
            </Button>
          </div>

          <div className="mt-5 space-y-3">
            {roles.map((role) => (
              <div key={role.id} className="flex items-center justify-between gap-4 rounded-2xl border bg-muted/30 p-4">
                <div>
                  <p className="font-semibold">{role.label}</p>
                  <p className="text-xs text-muted-foreground">{role.code} · {role.permissionCodes.length} permission(s)</p>
                </div>
                <Badge variant={role.userCount > 0 ? 'accent' : 'muted'}>{role.userCount} utilisateur(s)</Badge>
              </div>
            ))}
          </div>
        </section>

        <section className="app-surface p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="section-label">Traçabilité</p>
              <h2 className="mt-1 text-xl font-semibold">Activité récente</h2>
            </div>
            <Button variant="outline" asChild>
              <Link to="/audit/logs">Journal complet</Link>
            </Button>
          </div>

          <div className="mt-5 space-y-3">
            {auditLogs.length === 0 ? (
              <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                Aucune activité administrative récente.
              </p>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="rounded-2xl border bg-card p-4">
                  <div className="flex items-center justify-between gap-3">
                    <Badge variant="muted">{log.action}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString('fr-DZ')}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-medium">{log.description}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {log.userEmail ?? 'Système'} · {log.page ?? '—'}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="app-surface p-5">
        <div>
          <p className="section-label">Raccourcis</p>
          <h2 className="mt-1 text-xl font-semibold">Actions administratives</h2>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <AdminShortcut to="/admin/users" title="Utilisateurs" description="Créer, modifier, désactiver et affecter les comptes." />
          <AdminShortcut to="/admin/roles" title="Rôles & permissions" description="Contrôler les droits par profil utilisateur." />
          <AdminShortcut to="/admin/hotels" title="Unités hôtelières" description="Gérer les entités opérationnelles et affectations." />
          <AdminShortcut to="/admin/rubriques" title="Rubriques" description="Maintenir les familles de recettes et l’ordre d’affichage." />
        </div>
      </section>
    </div>
  );
}

function AdminMetric({ icon: Icon, label, value, helper }: { icon: typeof Users; label: string; value: number; helper: string }) {
  return (
    <div className="metric-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="section-label">{label}</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
        </div>
        <div className="rounded-2xl bg-primary/10 p-3 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function AdminShortcut({ to, title, description }: { to: string; title: string; description: string }) {
  return (
    <Link to={to} className="module-card block">
      <p className="font-semibold">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
    </Link>
  );
}
