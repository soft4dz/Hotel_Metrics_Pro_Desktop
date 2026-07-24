import { RotateCcw, AlertCircle, AlertTriangle, Info, CalendarClock, Target, ClipboardX, BarChart3, RefreshCw, ShieldAlert, Bell } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { notify } from '@/lib/toast';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionBlock } from '@/components/common/SectionBlock';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUiStore, type NotifPrefs } from '@/stores/ui.store';

/* ── Toggle switch ────────────────────────────────────── */
function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-[22px] w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
        checked ? 'bg-primary' : 'bg-muted-foreground/25',
        disabled && 'cursor-not-allowed opacity-40',
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-[18px] w-[18px] transform rounded-full bg-white shadow transition-transform duration-200',
          checked ? 'translate-x-[18px]' : 'translate-x-0',
        )}
      />
    </button>
  );
}

/* ── Row ──────────────────────────────────────────────── */
function NotifRow({
  icon: Icon,
  iconColor,
  label,
  description,
  checked,
  onChange,
  disabled,
  children,
}: {
  icon: typeof AlertCircle;
  iconColor: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-4 rounded-xl border border-border bg-card p-4 transition-colors duration-150',
        checked ? 'border-primary/20 bg-primary/[0.02]' : '',
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ background: `${iconColor}18`, color: iconColor }}
        >
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
          {checked && children && (
            <div className="mt-3">{children}</div>
          )}
        </div>
      </div>
      <div className="mt-0.5 shrink-0">
        <Toggle checked={checked} onChange={onChange} disabled={disabled} />
      </div>
    </div>
  );
}

/* ── Active count badge ───────────────────────────────── */
function ActiveBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
      {count} actif{count > 1 ? 's' : ''}
    </span>
  );
}

/* ── Page ─────────────────────────────────────────────── */
export function NotificationsPage() {
  const qc = useQueryClient();
  const { notifPrefs, setNotifPref, resetNotifPrefs } = useUiStore();
  const set = <K extends keyof NotifPrefs>(k: K) => (v: NotifPrefs[K]) => setNotifPref(k, v);

  const { data: rules = [] } = useQuery({
    queryKey: ['notification-rules'],
    queryFn: async () => unwrapIpc(await ipcClient.notifications.getRules()) as { code: string; module: string; conditionLabel: string; actif: boolean }[],
  });

  const updateRule = useMutation({
    mutationFn: async ({ code, actif }: { code: string; actif: boolean }) =>
      unwrapIpc(await ipcClient.notifications.updateRule({ code, actif })),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notification-rules'] }); notify.success('Règle mise à jour'); },
  });

  const generateSystem = useMutation({
    mutationFn: async () => unwrapIpc(await ipcClient.notifications.generateSystem()),
    onSuccess: (n) => notify.success(`${n ?? 0} notification(s) générée(s)`),
  });

  const alertCount = [
    notifPrefs.alertesCritiques,
    notifPrefs.alertesAvertissements,
    notifPrefs.alertesInformations,
  ].filter(Boolean).length;

  const opCount = [
    notifPrefs.saisiesManquantes,
    notifPrefs.objectifsSeuil,
  ].filter(Boolean).length;

  const reportCount = [
    notifPrefs.resumeQuotidien,
    notifPrefs.resumeHebdomadaire,
  ].filter(Boolean).length;

  const sysCount = [
    notifPrefs.syncStatus,
    notifPrefs.erreursCritiques,
  ].filter(Boolean).length;

  return (
    <div className="page-shell">
      <PageHeader
        title="Notifications"
        description="Configurez les alertes et rapports automatiques"
        backTo="/settings"
        action={
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer gap-1.5"
            onClick={resetNotifPrefs}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Réinitialiser
          </Button>
        }
      />

      <SectionBlock
        title="Règles système (backend)"
        description="Alertes persistées en base — synchronisées avec la cloche navbar"
        action={
          <button type="button" onClick={() => generateSystem.mutate()} className="text-xs border rounded-lg px-3 py-1.5 hover:bg-muted flex items-center gap-1">
            <Bell className="w-3 h-3" /> Générer maintenant
          </button>
        }
      >
        <div className="flex flex-col gap-2">
          {rules.map((r) => (
            <div key={r.code} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-3">
              <div>
                <p className="text-sm font-medium">{r.conditionLabel}</p>
                <p className="text-xs text-muted-foreground">{r.module} · {r.code}</p>
              </div>
              <Toggle checked={r.actif} onChange={(v) => updateRule.mutate({ code: r.code, actif: v })} />
            </div>
          ))}
        </div>
      </SectionBlock>

      {/* ── Alertes dashboard ──────────────────────────── */}
      <SectionBlock
        title="Alertes du tableau de bord"
        description="Notifications générées automatiquement par le moteur d'analyse"
        action={<ActiveBadge count={alertCount} />}
      >
        <div className="flex flex-col gap-3">
          <NotifRow
            icon={AlertCircle}
            iconColor="#DC2626"
            label="Alertes critiques"
            description="Objectifs gravement sous les seuils, créances impayées à risque élevé, anomalies bloquantes."
            checked={notifPrefs.alertesCritiques}
            onChange={set('alertesCritiques')}
          />
          <NotifRow
            icon={AlertTriangle}
            iconColor="#F97316"
            label="Avertissements"
            description="Seuils en approche, tendances défavorables, saisies en retard non critiques."
            checked={notifPrefs.alertesAvertissements}
            onChange={set('alertesAvertissements')}
          />
          <NotifRow
            icon={Info}
            iconColor="#3B82F6"
            label="Informations"
            description="Confirmations de synchronisation, objectifs atteints, résumés de période."
            checked={notifPrefs.alertesInformations}
            onChange={set('alertesInformations')}
          />
        </div>
      </SectionBlock>

      {/* ── Opérationnel ───────────────────────────────── */}
      <SectionBlock
        title="Opérationnel"
        description="Suivi des saisies et de l'atteinte des objectifs"
        action={<ActiveBadge count={opCount} />}
      >
        <div className="flex flex-col gap-3">
          <NotifRow
            icon={ClipboardX}
            iconColor="#F97316"
            label="Saisies manquantes"
            description="Notifie quand des journées de recettes ne sont pas encore saisies pour les unités actives."
            checked={notifPrefs.saisiesManquantes}
            onChange={set('saisiesManquantes')}
          />
          <NotifRow
            icon={Target}
            iconColor="#1E3A8A"
            label="Objectifs sous seuil"
            description="Alerte lorsque le taux de réalisation mensuel descend sous le seuil configuré."
            checked={notifPrefs.objectifsSeuil}
            onChange={set('objectifsSeuil')}
          >
            <div className="flex items-center gap-4">
              <div className="flex flex-1 flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Seuil d'alerte</span>
                  <span className="font-mono font-semibold text-primary">
                    {notifPrefs.seuilObjectifPct} %
                  </span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  step={5}
                  value={notifPrefs.seuilObjectifPct}
                  onChange={(e) => setNotifPref('seuilObjectifPct', Number(e.target.value))}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-border accent-primary"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground/60">
                  <span>10 %</span>
                  <span>50 %</span>
                  <span>100 %</span>
                </div>
              </div>
            </div>
          </NotifRow>
        </div>
      </SectionBlock>

      {/* ── Rapports automatiques ───────────────────────── */}
      <SectionBlock
        title="Rapports automatiques"
        description="Résumés périodiques envoyés en notification in-app"
        action={<ActiveBadge count={reportCount} />}
      >
        <div className="flex flex-col gap-3">
          <NotifRow
            icon={CalendarClock}
            iconColor="#0891B2"
            label="Résumé quotidien"
            description="Synthèse journalière du CA, saisies réalisées et alertes actives."
            checked={notifPrefs.resumeQuotidien}
            onChange={set('resumeQuotidien')}
          >
            <div className="flex items-center gap-3">
              <label className="text-xs text-muted-foreground">Heure d'envoi</label>
              <input
                type="time"
                value={notifPrefs.heureResume}
                onChange={(e) => setNotifPref('heureResume', e.target.value)}
                className="app-input h-8 w-28 text-xs"
              />
            </div>
          </NotifRow>

          <NotifRow
            icon={BarChart3}
            iconColor="#16A34A"
            label="Résumé hebdomadaire"
            description="Bilan de la semaine écoulée — CA consolidé, objectifs, tendances et points d'attention."
            checked={notifPrefs.resumeHebdomadaire}
            onChange={set('resumeHebdomadaire')}
          />
        </div>
      </SectionBlock>

      {/* ── Système ────────────────────────────────────── */}
      <SectionBlock
        title="Système"
        description="Événements techniques et statuts de l'application"
        action={<ActiveBadge count={sysCount} />}
      >
        <div className="flex flex-col gap-3">
          <NotifRow
            icon={RefreshCw}
            iconColor="#0891B2"
            label="Statut de synchronisation"
            description="Confirme les synchronisations réussies avec le serveur central et signale les échecs."
            checked={notifPrefs.syncStatus}
            onChange={set('syncStatus')}
          />
          <NotifRow
            icon={ShieldAlert}
            iconColor="#DC2626"
            label="Erreurs critiques système"
            description="Problèmes de base de données, erreurs d'accès ou pannes affectant les données."
            checked={notifPrefs.erreursCritiques}
            onChange={set('erreursCritiques')}
          />
        </div>
      </SectionBlock>

      {/* ── Résumé ─────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-secondary/30 px-5 py-4">
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">
            {alertCount + opCount + reportCount + sysCount} notification{alertCount + opCount + reportCount + sysCount !== 1 ? 's' : ''} active{alertCount + opCount + reportCount + sysCount !== 1 ? 's' : ''}
          </span>
          {' '}— Les notifications s'affichent dans l'application uniquement.
          Les canaux e-mail et SMS seront disponibles dans une prochaine version.
        </p>
      </div>
    </div>
  );
}
