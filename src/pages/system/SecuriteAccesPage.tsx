import { useEffect, useState } from 'react';
import { Eye, EyeOff, KeyRound, Loader2, LogOut, Save, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionBlock } from '@/components/common/SectionBlock';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { useAuthStore } from '@/stores/auth.store';
import { canManageUsers } from '@/shared/permissions';
import type { UserProfileDto } from '@/shared/types/auth';

/* ── Password visibility input ────────────────────────── */
function PasswordField({
  id,
  label,
  value,
  onChange,
  show,
  onToggleShow,
  hint,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
  hint?: string;
  autoComplete?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-medium">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 pr-10 text-sm"
          autoComplete={autoComplete ?? 'off'}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={onToggleShow}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

/* ── Password strength bar ────────────────────────────── */
function PasswordStrength({ password }: { password: string }) {
  const score = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

  const segmentColor = ['', 'bg-destructive', 'bg-amber-500', 'bg-blue-500', 'bg-emerald-500'][score];
  const label        = ['', 'Faible', 'Moyen', 'Fort', 'Très fort'][score];
  const labelColor   = ['', 'text-destructive', 'text-amber-500', 'text-blue-500', 'text-emerald-500'][score];

  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors duration-200',
              i <= score ? segmentColor : 'bg-border',
            )}
          />
        ))}
      </div>
      {score > 0 && <p className={cn('text-[10px]', labelColor)}>{label}</p>}
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────── */
export function SecuriteAccesPage() {
  const { user, logout } = useAuthStore();
  const isAdmin  = canManageUsers(user?.role);

  /* ── Profile detail ── */
  const [userDetail, setUserDetail] = useState<UserProfileDto | null>(null);

  useEffect(() => {
    ipcClient.auth.getProfile()
      .then((profile) => { if (profile) setUserDetail(profile); })
      .catch(() => { /* non-critical */ });
  }, []);

  /* ── Password change ── */
  const [pwOld,     setPwOld]     = useState('');
  const [pwNew,     setPwNew]     = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [showOld,   setShowOld]   = useState(false);
  const [showNew,   setShowNew]   = useState(false);
  const [pwSaving,  setPwSaving]  = useState(false);
  const [pwMsg,     setPwMsg]     = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);

    if (pwNew.length < 8) {
      setPwMsg({ type: 'err', text: 'Le mot de passe doit contenir au moins 8 caractères.' });
      return;
    }
    if (pwNew !== pwConfirm) {
      setPwMsg({ type: 'err', text: 'Les mots de passe ne correspondent pas.' });
      return;
    }

    setPwSaving(true);
    try {
      const result = await ipcClient.auth.changePassword({ currentPassword: pwOld, newPassword: pwNew });
      if (!result.success) {
        setPwMsg({ type: 'err', text: result.error ?? 'Erreur' });
        return;
      }
      const fresh = await ipcClient.auth.getCurrentUser();
      if (fresh) {
        useAuthStore.setState({ user: fresh });
      }
      setPwMsg({ type: 'ok', text: 'Mot de passe mis à jour avec succès.' });
      setPwOld('');
      setPwNew('');
      setPwConfirm('');
    } catch (err) {
      setPwMsg({ type: 'err', text: err instanceof Error ? err.message : 'Erreur' });
    } finally {
      setPwSaving(false);
    }
  };

  /* ── Security policy (admin) ── */
  const [tauxTva,    setTauxTva]    = useState('19');
  const [maxAttempts, setMaxAttempts] = useState('5');
  const [lockoutMin,  setLockoutMin]  = useState('15');
  const [secLoading,  setSecLoading]  = useState(isAdmin);
  const [secSaving,   setSecSaving]   = useState(false);
  const [secMsg,      setSecMsg]      = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    setSecLoading(true);
    ipcClient.settings.getAppInfo()
      .then((r) => {
        try {
          const info = unwrapIpc(r);
          setTauxTva(String(info.settings.tauxTvaPort));
          setMaxAttempts(String(info.settings.maxLoginAttempts));
          setLockoutMin(String(info.settings.lockoutMinutes));
        } catch { /* ignore */ }
      })
      .catch(() => { /* ignore */ })
      .finally(() => setSecLoading(false));
  }, [isAdmin]);

  const handleSecSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecSaving(true);
    setSecMsg(null);
    try {
      unwrapIpc(await ipcClient.settings.update({
        tauxTvaPort:       parseFloat(tauxTva),
        maxLoginAttempts:  parseInt(maxAttempts, 10),
        lockoutMinutes:    parseInt(lockoutMin, 10),
      }));
      setSecMsg({ type: 'ok', text: 'Politique de connexion enregistrée.' });
    } catch (err) {
      setSecMsg({ type: 'err', text: err instanceof Error ? err.message : 'Erreur' });
    } finally {
      setSecSaving(false);
    }
  };

  /* ── Initials ── */
  const initials = (user?.fullName ?? '')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';

  return (
    <div className="page-shell">
      <PageHeader
        title="Sécurité & Accès"
        description="Mot de passe, session et politique de connexion"
        backTo={user?.mustChangePassword ? undefined : '/settings'}
      />

      {user?.mustChangePassword && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
          Vous devez changer votre mot de passe avant de continuer à utiliser l&apos;application.
        </div>
      )}

      {/* ── Compte actif ───────────────────────────────── */}
      <SectionBlock
        title="Compte actif"
        description="Informations du compte connecté à cette session"
      >
        <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-xl font-bold text-primary-foreground shadow-sm">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground">{user?.fullName}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{user?.email}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                <ShieldCheck className="h-3 w-3" />
                {user?.roleLabel ?? user?.role}
              </span>
              {userDetail?.lastLoginAt && (
                <span className="text-[11px] text-muted-foreground">
                  Dernière connexion :{' '}
                  {new Date(userDetail.lastLoginAt).toLocaleString('fr-FR', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </span>
              )}
            </div>
          </div>
        </div>
      </SectionBlock>

      {/* ── Mot de passe ───────────────────────────────── */}
      <SectionBlock
        title="Changer le mot de passe"
        description="Mettez à jour vos identifiants de connexion"
      >
        <form
          onSubmit={(e) => void handlePasswordChange(e)}
          className="flex max-w-sm flex-col gap-4"
        >
          <PasswordField
            id="pw-old"
            label="Mot de passe actuel"
            value={pwOld}
            onChange={setPwOld}
            show={showOld}
            onToggleShow={() => setShowOld((v) => !v)}
            autoComplete="current-password"
          />
          <PasswordField
            id="pw-new"
            label="Nouveau mot de passe"
            value={pwNew}
            onChange={setPwNew}
            show={showNew}
            onToggleShow={() => setShowNew((v) => !v)}
            hint="8 caractères minimum — majuscule, chiffre et symbole recommandés"
            autoComplete="new-password"
          />
          {pwNew && <PasswordStrength password={pwNew} />}
          <PasswordField
            id="pw-confirm"
            label="Confirmer le nouveau mot de passe"
            value={pwConfirm}
            onChange={setPwConfirm}
            show={showNew}
            onToggleShow={() => setShowNew((v) => !v)}
            autoComplete="new-password"
          />

          {pwMsg && (
            <p className={cn('text-sm', pwMsg.type === 'ok' ? 'text-emerald-600' : 'text-destructive')}>
              {pwMsg.text}
            </p>
          )}

          <Button
            type="submit"
            size="sm"
            disabled={pwSaving || !pwOld || !pwNew || !pwConfirm}
            className="w-fit cursor-pointer gap-1.5"
          >
            {pwSaving
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <KeyRound className="h-3.5 w-3.5" />}
            Mettre à jour
          </Button>
        </form>
      </SectionBlock>

      {/* ── Politique de connexion (admin) ─────────────── */}
      {isAdmin && (
        <SectionBlock
          title="Politique de connexion"
          description="Nombre de tentatives échouées avant verrouillage du compte"
        >
          {secLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Chargement…
            </div>
          ) : (
            <form
              onSubmit={(e) => void handleSecSave(e)}
              className="flex flex-col gap-5"
            >
              <div className="grid max-w-sm gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="max-attempts" className="text-xs font-medium">
                    Tentatives max
                  </Label>
                  <Input
                    id="max-attempts"
                    type="number"
                    min={3}
                    max={20}
                    value={maxAttempts}
                    onChange={(e) => setMaxAttempts(e.target.value)}
                    className="h-9 text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground">Entre 3 et 20</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lockout-min" className="text-xs font-medium">
                    Durée de verrouillage
                  </Label>
                  <div className="relative">
                    <Input
                      id="lockout-min"
                      type="number"
                      min={5}
                      max={120}
                      value={lockoutMin}
                      onChange={(e) => setLockoutMin(e.target.value)}
                      className="h-9 pr-10 text-sm"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      min
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Entre 5 et 120 minutes</p>
                </div>
              </div>

              {/* Visual hint */}
              <div className="flex max-w-sm items-center gap-3 rounded-lg border border-border bg-secondary/40 px-4 py-3 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4 shrink-0 text-primary" strokeWidth={1.75} />
                Après{' '}
                <span className="font-semibold text-foreground">{maxAttempts} tentatives</span>{' '}
                échouées, le compte est verrouillé pendant{' '}
                <span className="font-semibold text-foreground">{lockoutMin} min</span>.
              </div>

              <div className="flex items-center gap-4">
                <Button
                  type="submit"
                  size="sm"
                  disabled={secSaving}
                  className="w-fit cursor-pointer gap-1.5"
                >
                  {secSaving
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Save className="h-3.5 w-3.5" />}
                  Enregistrer
                </Button>
                {secMsg && (
                  <p className={cn('text-sm', secMsg.type === 'ok' ? 'text-emerald-600' : 'text-destructive')}>
                    {secMsg.text}
                  </p>
                )}
              </div>
            </form>
          )}
        </SectionBlock>
      )}

      {/* ── Session ────────────────────────────────────── */}
      <SectionBlock
        title="Session"
        description="Gestion de la session active"
      >
        <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Se déconnecter</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Ferme la session en cours et retourne à l'écran de connexion.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer gap-1.5 text-destructive hover:border-destructive/30 hover:bg-destructive/5 hover:text-destructive"
            onClick={() => void logout()}
          >
            <LogOut className="h-3.5 w-3.5" />
            Déconnexion
          </Button>
        </div>
      </SectionBlock>
    </div>
  );
}
