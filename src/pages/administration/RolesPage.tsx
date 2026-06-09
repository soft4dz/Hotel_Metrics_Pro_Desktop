import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Pencil, Save, Shield, X } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { canManageRolePermissions } from '@/shared/permissions';
import { useAuthStore } from '@/stores/auth.store';
import type { PermissionListItem, RoleListItem } from '@/shared/types/admin';

const MODULE_LABELS: Record<string, string> = {
  administration: 'Administration',
  recettes: 'Recettes',
  portmaster: 'PortMaster',
  audit: 'Audit',
  sync: 'Synchronisation',
  rapports: 'Rapports',
};

function groupPermissions(perms: PermissionListItem[]): Map<string, PermissionListItem[]> {
  const map = new Map<string, PermissionListItem[]>();
  for (const p of perms) {
    const key = p.module || 'autre';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  }
  return map;
}

export function RolesPage() {
  const userRole = useAuthStore((s) => s.user?.role);
  const canEdit = canManageRolePermissions(userRole);

  const [roles, setRoles] = useState<RoleListItem[]>([]);
  const [allPermissions, setAllPermissions] = useState<PermissionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editingRoleId, setEditingRoleId] = useState<number | null>(null);
  const [draftCodes, setDraftCodes] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const rolesRes = unwrapIpc(await ipcClient.roles.list());
      setRoles(rolesRes);
      if (canEdit) {
        setAllPermissions(unwrapIpc(await ipcClient.roles.listPermissions()));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, [canEdit]);

  useEffect(() => {
    void load();
  }, [load]);

  const permGroups = useMemo(() => groupPermissions(allPermissions), [allPermissions]);

  const startEdit = (role: RoleListItem) => {
    setEditingRoleId(role.id);
    setDraftCodes(new Set(role.permissionCodes));
    setFormError('');
    setMessage('');
  };

  const cancelEdit = () => {
    setEditingRoleId(null);
    setDraftCodes(new Set());
    setFormError('');
  };

  const togglePermission = (code: string) => {
    setDraftCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const savePermissions = async (roleId: number) => {
    setSaving(true);
    setFormError('');
    try {
      const updated = unwrapIpc(
        await ipcClient.roles.updatePermissions(roleId, [...draftCodes]),
      );
      setRoles((prev) => prev.map((r) => (r.id === roleId ? updated : r)));
      setMessage(`Permissions enregistrées pour ${updated.label}.`);
      setEditingRoleId(null);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Chargement…
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Rôles et permissions"
        description={
          canEdit
            ? 'Attribuez les permissions (tâches) à chaque rôle — réservé Administrateur et Super Administrateur.'
            : 'Consultation des profils et de leurs permissions.'
        }
      />

      {error && <p className="mb-4 status-banner-error">{error}</p>}
      {message && <p className="mb-4 status-banner-success">{message}</p>}

      <div className="grid gap-4 md:grid-cols-2">
        {roles.map((role) => {
          const isEditing = editingRoleId === role.id;

          return (
            <Card key={role.id} className={isEditing ? 'ring-2 ring-brand-blue/40' : undefined}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 shrink-0 text-brand-blue" />
                    <CardTitle className="text-base">{role.label}</CardTitle>
                  </div>
                  <Badge variant="muted">{role.code}</Badge>
                </div>
                {role.description && (
                  <CardDescription>{role.description}</CardDescription>
                )}
              </CardHeader>

              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  {role.userCount} utilisateur(s) · {role.permissionCodes.length} permission(s)
                </p>

                {!isEditing && (
                  <div className="flex flex-wrap gap-1">
                    {role.permissionCodes.length === 0 ? (
                      <Badge variant="warning">Aucune permission</Badge>
                    ) : (
                      role.permissionCodes.map((p) => (
                        <Badge key={p} variant="accent" className="font-mono text-[10px]">
                          {p}
                        </Badge>
                      ))
                    )}
                  </div>
                )}

                {(role.code === 'SUPERADMIN' || role.code === 'ADMIN_DEC') && (
                  <p className="text-xs text-muted-foreground">
                    Accès total permanent — toutes les permissions actuelles et futures.
                  </p>
                )}

                {canEdit && role.editable && !isEditing && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-1"
                    onClick={() => startEdit(role)}
                  >
                    <Pencil className="mr-2 h-3.5 w-3.5" />
                    Attribuer les permissions
                  </Button>
                )}

                {isEditing && (
                  <div className="space-y-4 rounded-lg border border-border bg-secondary/30 p-3">
                    {formError && editingRoleId === role.id && (
                      <p className="text-xs text-destructive">{formError}</p>
                    )}

                    {[...permGroups.entries()].map(([module, perms]) => (
                      <div key={module}>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {MODULE_LABELS[module] ?? module}
                        </p>
                        <ul className="space-y-2">
                          {perms.map((perm) => (
                            <li key={perm.code} className="flex items-start gap-2">
                              <input
                                id={`perm-${role.id}-${perm.code}`}
                                type="checkbox"
                                checked={draftCodes.has(perm.code)}
                                onChange={() => togglePermission(perm.code)}
                                className="mt-0.5 h-4 w-4 cursor-pointer rounded border-input text-primary"
                              />
                              <label
                                htmlFor={`perm-${role.id}-${perm.code}`}
                                className="cursor-pointer text-sm leading-tight"
                              >
                                {perm.label}
                                <span className="ml-1 font-mono text-[10px] text-muted-foreground">
                                  ({perm.code})
                                </span>
                              </label>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}

                    <div className="flex gap-2 pt-1">
                      <Button
                        type="button"
                        variant="gold"
                        size="sm"
                        disabled={saving}
                        onClick={() => void savePermissions(role.id)}
                      >
                        {saving ? (
                          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Save className="mr-2 h-3.5 w-3.5" />
                        )}
                        Enregistrer
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={saving}
                        onClick={cancelEdit}
                      >
                        <X className="mr-2 h-3.5 w-3.5" />
                        Annuler
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
