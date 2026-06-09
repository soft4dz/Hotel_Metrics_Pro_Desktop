import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { useAuthStore } from '@/stores/auth.store';
import { isSuperAdmin } from '@/shared/permissions';
import type { RoleOption } from '@/shared/types/admin';

export function UserFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id && id !== 'new');
  const navigate = useNavigate();
  const actorRole = useAuthStore((s) => s.user?.role);
  const actorIsSuperAdmin = isSuperAdmin(actorRole);

  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [hotels, setHotels] = useState<Array<{ id: number; name: string; code: string }>>([]);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState('');
  const [allHotelsAccess, setAllHotelsAccess] = useState(false);
  const [selectedHotelIds, setSelectedHotelIds] = useState<number[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const init = async () => {
      try {
        const rolesRes = unwrapIpc(await ipcClient.roles.listForSelect());
        // SUPERADMIN role is only visible / selectable by other SUPERADMINs
        setRoles(actorIsSuperAdmin ? rolesRes : rolesRes.filter((r) => r.code !== 'SUPERADMIN'));
        const hotelsRes = unwrapIpc(await ipcClient.hotels.list());
        setHotels(hotelsRes.map((h) => ({ id: h.id, name: h.name, code: h.code })));

        if (isEdit && id) {
          const user = unwrapIpc(await ipcClient.users.get(Number(id)));
          if (!user) {
            setError('Utilisateur introuvable');
            return;
          }
          setEmail(user.email);
          setFullName(user.fullName);
          setRoleId(String(user.roleId));
          setAllHotelsAccess(user.allHotelsAccess);
          setSelectedHotelIds(user.hotelIds.length > 0 ? user.hotelIds : user.hotelId ? [user.hotelId] : []);
          setIsActive(user.isActive);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur');
      } finally {
        setLoading(false);
      }
    };
    void init();
  }, [id, isEdit, actorIsSuperAdmin]);

  const toggleHotel = (id: number) => {
    setSelectedHotelIds((prev) =>
      prev.includes(id) ? prev.filter((h) => h !== id) : [...prev, id],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        email,
        fullName,
        roleId: Number(roleId),
        hotelIds: allHotelsAccess ? [] : selectedHotelIds,
        allHotelsAccess,
        isActive,
      };
      if (isEdit && id) {
        unwrapIpc(
          await ipcClient.users.update(Number(id), {
            ...payload,
            password: password.trim() || undefined,
          }),
        );
      } else {
        if (!password.trim()) {
          setError('Mot de passe requis pour un nouveau compte.');
          setSaving(false);
          return;
        }
        if (!allHotelsAccess && selectedHotelIds.length === 0) {
          setError('Sélectionnez au moins une unité ou cochez « Toutes les unités ».');
          setSaving(false);
          return;
        }
        unwrapIpc(
          await ipcClient.users.create({
            ...payload,
            password,
          }),
        );
      }
      navigate('/admin/users');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Chargement...</p>;
  }

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
        backTo="/admin/users"
      />

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="mx-auto max-w-lg space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nom complet</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">
                {isEdit ? 'Nouveau mot de passe (optionnel)' : 'Mot de passe'}
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isEdit ? 'Laisser vide pour ne pas changer' : '8 caractères min.'}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="roleId">Rôle</Label>
              <select
                id="roleId"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                required
              >
                <option value="">— Choisir —</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-3 rounded-lg border border-border p-4">
              <div className="flex items-center gap-2">
                <input
                  id="allHotelsAccess"
                  type="checkbox"
                  checked={allHotelsAccess}
                  onChange={(e) => setAllHotelsAccess(e.target.checked)}
                  className="h-4 w-4"
                />
                <Label htmlFor="allHotelsAccess">Accès à toutes les unités</Label>
              </div>

              {!allHotelsAccess && (
                <div className="space-y-2">
                  <Label>Unités assignées</Label>
                  <p className="text-xs text-muted-foreground">
                    Cochez une ou plusieurs unités. L&apos;utilisateur ne verra que celles-ci.
                  </p>
                  <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border border-input p-3">
                    {hotels.filter((h) => h.code !== 'SIEGE').map((h) => (
                      <label key={h.id} className="flex cursor-pointer items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedHotelIds.includes(h.id)}
                          onChange={() => toggleHotel(h.id)}
                          className="h-4 w-4"
                        />
                        <span>{h.code} — {h.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                id="isActive"
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="isActive">Compte actif</Label>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEdit ? 'Enregistrer' : 'Créer'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/admin/users')}>
                Annuler
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
