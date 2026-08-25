import { Link } from 'react-router-dom';
import { AlertTriangle, Lock, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLicenseStatus } from '@/hooks/useLicenseStatus';

const DISMISS_KEY = 'hmp:license-alert-dismissed';

export function LicenseExpiryBanner() {
  const { status } = useLicenseStatus();
  const [dismissedLevel, setDismissedLevel] = useState<string | null>(null);

  useEffect(() => {
    try {
      setDismissedLevel(sessionStorage.getItem(DISMISS_KEY));
    } catch {
      setDismissedLevel(null);
    }
  }, []);

  useEffect(() => {
    if (status?.readOnlyMode) {
      document.documentElement.setAttribute('data-license-readonly', 'true');
    } else {
      document.documentElement.removeAttribute('data-license-readonly');
    }
    return () => document.documentElement.removeAttribute('data-license-readonly');
  }, [status?.readOnlyMode]);

  if (!status?.alertMessage || status.alertLevel === 'none') return null;

  const level = status.alertLevel;
  const dismissible = level === 'warning' || level === 'urgent';
  if (dismissible && dismissedLevel === level) return null;

  const styles =
    level === 'expired'
      ? 'border-destructive/40 bg-destructive/10 text-destructive'
      : level === 'urgent'
        ? 'border-amber-500/50 bg-amber-500/15 text-amber-950 dark:text-amber-100 animate-pulse'
        : 'border-amber-400/40 bg-amber-50 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100';

  const Icon = level === 'expired' ? Lock : AlertTriangle;

  return (
    <div
      role="alert"
      className={cn(
        'relative z-40 flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 text-sm shadow-sm',
        styles,
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        <div className="min-w-0 space-y-1">
          <p className="font-semibold">
            {level === 'expired'
              ? status.state === 'revoked'
                ? 'Mode lecture seule — licence révoquée'
                : status.state === 'invalid'
                  ? 'Mode lecture seule — validation requise'
                  : 'Mode lecture seule — licence expirée'
              : level === 'urgent'
                ? `Renouvellement urgent — J-${status.daysRemaining ?? '?'}`
                : `Renouvellement à prévoir — J-${status.daysRemaining ?? '?'}`}
          </p>
          <p className="text-[13px] opacity-90">{status.alertMessage}</p>
          {status.expiresAt && (
            <p className="text-xs opacity-75">
              Date de fin : {status.expiresAt}
              {status.edition ? ` · Édition ${status.edition}` : ''}
            </p>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button size="sm" variant={level === 'expired' ? 'destructive' : 'secondary'} asChild>
          <Link to="/settings/licence">Renouveler / activer</Link>
        </Button>
        {dismissible && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 opacity-70 hover:opacity-100"
            aria-label="Masquer pour cette session"
            onClick={() => {
              try {
                sessionStorage.setItem(DISMISS_KEY, level);
              } catch {
                /* ignore */
              }
              setDismissedLevel(level);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
