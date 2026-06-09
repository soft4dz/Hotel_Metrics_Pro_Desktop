import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Loader2,
  Lock,
  Save,
  Send,
  X,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useHotelsList } from '@/hooks/useHotelsList';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { RecetteLigne, RecetteStatut, SaisieJournaliereDto } from '@/shared/types/recettes';

/* ─────────────────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────────────────── */

const today = () => new Date().toISOString().slice(0, 10);

function shiftDate(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDateFr(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   Status config
───────────────────────────────────────────────────────────────────────── */

const STATUT_CONFIG: Record<
  RecetteStatut,
  { label: string; icon: typeof CheckCircle2; bg: string; text: string; border: string }
> = {
  brouillon: {
    label: 'Brouillon',
    icon: Save,
    bg: 'bg-muted/60',
    text: 'text-muted-foreground',
    border: 'border-border',
  },
  soumis: {
    label: 'En attente de validation',
    icon: ClipboardCheck,
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800',
  },
  valide: {
    label: 'Journée validée',
    icon: CheckCircle2,
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  refuse: {
    label: 'Journée refusée',
    icon: X,
    bg: 'bg-red-50 dark:bg-red-950/30',
    text: 'text-red-700 dark:text-red-400',
    border: 'border-red-200 dark:border-red-800',
  },
};

/* ─────────────────────────────────────────────────────────────────────────
   Completion badge
───────────────────────────────────────────────────────────────────────── */

function CompletionBadge({ lignes }: { lignes: RecetteLigne[] }) {
  const filled = lignes.filter((l) => l.montant > 0).length;
  const total = lignes.length;
  const pct = total === 0 ? 0 : Math.round((filled / total) * 100);

  const color =
    pct === 100
      ? 'text-emerald-600'
      : pct >= 50
        ? 'text-amber-600'
        : 'text-muted-foreground';

  return (
    <div className="flex items-center gap-2">
      <div className="relative h-7 w-7">
        <svg className="h-7 w-7 -rotate-90" viewBox="0 0 28 28">
          <circle cx="14" cy="14" r="11" strokeWidth="2.5" className="fill-none stroke-border" />
          <circle
            cx="14"
            cy="14"
            r="11"
            strokeWidth="2.5"
            className={cn(
              'fill-none transition-all duration-500',
              pct === 100 ? 'stroke-emerald-500' : pct >= 50 ? 'stroke-amber-500' : 'stroke-primary',
            )}
            strokeDasharray={`${2 * Math.PI * 11}`}
            strokeDashoffset={`${2 * Math.PI * 11 * (1 - pct / 100)}`}
            strokeLinecap="round"
          />
        </svg>
      </div>
      <span className={cn('text-xs font-semibold tabular-nums', color)}>
        {filled}/{total} rubriques
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Group anchor nav
───────────────────────────────────────────────────────────────────────── */

function GroupNav({ groups }: { groups: string[] }) {
  if (groups.length <= 1) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {groups.map((g) => (
        <button
          key={g}
          type="button"
          onClick={() =>
            document
              .getElementById(`group-${g.replace(/\s+/g, '-')}`)
              ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
          className="cursor-pointer rounded-full border border-border bg-card px-3 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
        >
          {g}
        </button>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Ligne row
───────────────────────────────────────────────────────────────────────── */

function LigneRow({
  ligne: l,
  canEdit,
  onUpdate,
  inputRef,
  onEnter,
}: {
  ligne: RecetteLigne;
  canEdit: boolean;
  onUpdate: (id: number, field: 'montant' | 'observation', value: string) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  onEnter?: () => void;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <tr
      className={cn(
        'group border-b border-border/50 transition-colors last:border-0',
        focused && canEdit ? 'bg-primary/[0.03]' : 'hover:bg-muted/30',
      )}
    >
      {/* Rubrique label */}
      <td className="px-4 py-2.5">
        <span className="text-sm font-medium text-foreground">{l.rubriqueLabel}</span>
        {l.montant > 0 && (
          <span className="ml-2 text-[11px] font-semibold text-primary">
            {formatMoney(l.montant)}
          </span>
        )}
      </td>

      {/* Montant */}
      <td className="px-3 py-2 text-right">
        <Input
          ref={inputRef}
          type="number"
          min={0}
          step="0.01"
          disabled={!canEdit}
          value={l.montant || ''}
          placeholder="0"
          className={cn(
            'ml-auto h-9 w-36 text-right tabular-nums transition-shadow',
            !canEdit && 'cursor-default opacity-60',
            l.montant > 0 && canEdit && 'border-primary/30 bg-primary/[0.02]',
          )}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => onUpdate(l.rubriqueId, 'montant', e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onEnter?.();
            }
          }}
        />
      </td>

      {/* Observation */}
      <td className="px-3 py-2">
        <Input
          disabled={!canEdit}
          value={l.observation ?? ''}
          placeholder={canEdit ? 'Observation…' : '—'}
          className={cn(
            'h-9 text-sm transition-colors',
            !canEdit && 'cursor-default opacity-60',
          )}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => onUpdate(l.rubriqueId, 'observation', e.target.value)}
        />
      </td>
    </tr>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Lignes table — groups with subtotals + keyboard navigation
───────────────────────────────────────────────────────────────────────── */

function LignesTable({
  lignes,
  canEdit,
  onUpdate,
}: {
  lignes: RecetteLigne[];
  canEdit: boolean;
  onUpdate: (id: number, field: 'montant' | 'observation', value: string) => void;
}) {
  const inputRefs = useRef<Array<React.RefObject<HTMLInputElement | null>>>([]);

  // Build flat ordered list for keyboard nav
  const ordered = lignes;
  if (inputRefs.current.length !== ordered.length) {
    inputRefs.current = ordered.map(() => ({ current: null }));
  }

  const focusNext = (idx: number) => {
    const next = inputRefs.current[idx + 1];
    if (next?.current) next.current.focus();
  };

  const hasParents = lignes.some((l) => l.parentLabel !== null);

  const tableHead = (small = false) => (
    <thead>
      <tr className={cn('border-b border-border bg-muted/40', small && 'bg-muted/20')}>
        <th className={cn('px-4 py-2.5 text-left', small ? 'text-[11px]' : 'text-xs font-semibold uppercase tracking-wide text-muted-foreground')}>
          {small ? 'Sous-rubrique' : 'Rubrique'}
        </th>
        <th className={cn('px-3 py-2.5 text-right', small ? 'text-[11px]' : 'text-xs font-semibold uppercase tracking-wide text-muted-foreground w-40')}>
          Montant (DZD)
        </th>
        <th className={cn('px-3 py-2.5 text-left', small ? 'text-[11px]' : 'text-xs font-semibold uppercase tracking-wide text-muted-foreground')}>
          Observation
        </th>
      </tr>
    </thead>
  );

  if (!hasParents) {
    return (
      <Card className="overflow-hidden">
        <table className="w-full">
          {tableHead()}
          <tbody>
            {ordered.map((l, idx) => (
              <LigneRow
                key={l.rubriqueId}
                ligne={l}
                canEdit={canEdit}
                onUpdate={onUpdate}
                inputRef={inputRefs.current[idx]}
                onEnter={() => focusNext(idx)}
              />
            ))}
          </tbody>
        </table>
      </Card>
    );
  }

  // Group by parent
  const groups = new Map<string, RecetteLigne[]>();
  for (const l of ordered) {
    const key = l.parentLabel ?? l.rubriqueLabel;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(l);
  }

  let globalIdx = 0;

  return (
    <div className="space-y-3">
      {[...groups.entries()].map(([group, rows]) => {
        const subtotal = rows.reduce((s, r) => s + r.montant, 0);
        const startIdx = globalIdx;
        globalIdx += rows.length;

        return (
          <Card
            key={group}
            id={`group-${group.replace(/\s+/g, '-')}`}
            className="scroll-mt-4 overflow-hidden"
          >
            {/* Group header */}
            <div className="flex items-center justify-between border-b border-border/60 bg-muted/50 px-4 py-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-foreground/70">
                {group}
              </span>
              {subtotal > 0 && (
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">
                  {formatMoney(subtotal)}
                </span>
              )}
            </div>

            <table className="w-full">
              {tableHead(true)}
              <tbody>
                {rows.map((l, i) => {
                  const absIdx = startIdx + i;
                  return (
                    <LigneRow
                      key={l.rubriqueId}
                      ligne={l}
                      canEdit={canEdit}
                      onUpdate={onUpdate}
                      inputRef={inputRefs.current[absIdx]}
                      onEnter={() => focusNext(absIdx)}
                    />
                  );
                })}
              </tbody>
            </table>
          </Card>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Indicateur KPI (chambres, nuitées, couverts, encaissement HT)
───────────────────────────────────────────────────────────────────────── */

function KpiInput({
  label,
  value,
  onChange,
  disabled,
  isFloat,
  icon,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled: boolean;
  isFloat?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="group flex flex-col gap-1.5">
      <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {icon}
        {label}
      </Label>
      <Input
        type="number"
        min={0}
        step={isFloat ? '0.01' : '1'}
        disabled={disabled}
        value={value || ''}
        placeholder="0"
        className={cn(
          'h-10 text-right tabular-nums font-semibold transition-colors',
          !disabled && 'focus:border-primary/40',
          disabled && 'cursor-default opacity-70',
        )}
        onChange={(e) =>
          onChange(isFloat ? parseFloat(e.target.value) || 0 : parseInt(e.target.value, 10) || 0)
        }
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Flash message
───────────────────────────────────────────────────────────────────────── */

function FlashMessage({
  type,
  text,
  onDismiss,
}: {
  type: 'error' | 'success';
  text: string;
  onDismiss: () => void;
}) {
  const isError = type === 'error';
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl border px-4 py-3 text-sm',
        isError
          ? 'border-destructive/30 bg-destructive/5 text-destructive'
          : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400',
      )}
    >
      {isError ? (
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
      )}
      <span className="flex-1">{text}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="ml-1 cursor-pointer opacity-60 transition-opacity hover:opacity-100"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Page principale
───────────────────────────────────────────────────────────────────────── */

export function SaisieJournalierePage() {
  const { hotels, loading: hotelsLoading, defaultHotelId } = useHotelsList();

  const [hotelId, setHotelId] = useState(0);
  const [dateJournal, setDateJournal] = useState(today());
  const [saisie, setSaisie] = useState<SaisieJournaliereDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<'' | 'brouillon' | 'soumis'>('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (defaultHotelId && !hotelId) setHotelId(defaultHotelId);
  }, [defaultHotelId, hotelId]);

  const loadSaisie = useCallback(async () => {
    if (!hotelId || !dateJournal) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const data = unwrapIpc(await ipcClient.recettes.getSaisie(hotelId, dateJournal));
      setSaisie(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement');
      setSaisie(null);
    } finally {
      setLoading(false);
    }
  }, [hotelId, dateJournal]);

  useEffect(() => {
    void loadSaisie();
  }, [loadSaisie]);

  const updateLigne = (rubriqueId: number, field: 'montant' | 'observation', value: string) => {
    if (!saisie) return;
    setSaisie({
      ...saisie,
      lignes: saisie.lignes.map((l) =>
        l.rubriqueId === rubriqueId
          ? { ...l, [field]: field === 'montant' ? parseFloat(value) || 0 : value }
          : l,
      ),
      totalMontant:
        field === 'montant'
          ? saisie.lignes.reduce((s, l) => {
              const m = l.rubriqueId === rubriqueId ? parseFloat(value) || 0 : l.montant;
              return s + m;
            }, 0)
          : saisie.totalMontant,
    });
  };

  const save = async (statut: 'brouillon' | 'soumis') => {
    if (!saisie) return;
    setSaving(statut);
    setError('');
    setSuccess('');
    try {
      const result = unwrapIpc(
        await ipcClient.recettes.saveSaisie({
          hotelId: saisie.hotelId,
          dateJournal: saisie.dateJournal,
          statut,
          lignes: saisie.lignes.map((l) => ({
            rubriqueId: l.rubriqueId,
            montant: l.montant,
            observation: l.observation ?? undefined,
          })),
          encaissementHt: saisie.encaissementHt,
          chambres: saisie.chambres,
          nuitees: saisie.nuitees,
          couverts: saisie.couverts,
        }),
      );
      setSaisie(result);
      setSuccess(
        statut === 'soumis'
          ? 'Journée soumise pour validation avec succès.'
          : 'Brouillon enregistré.',
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la sauvegarde');
    } finally {
      setSaving('');
    }
  };

  // Group names for nav
  const groupNames = saisie
    ? [...new Map(saisie.lignes.map((l) => [l.parentLabel ?? l.rubriqueLabel, true])).keys()]
    : [];

  const isFuture = dateJournal > today();

  const statutCfg = saisie ? STATUT_CONFIG[saisie.statut] : null;
  const StatusIcon = statutCfg?.icon ?? Save;

  return (
    <div className="page-shell">
      <PageHeader
        title="Saisie journalière"
        description="Enregistrez le chiffre d'affaires par rubrique pour la journée"
      />

      {/* ── Barre de sélection ─────────────────────────── */}
      <Card className="mb-5">
        <CardContent className="pt-5 pb-4">
          <div className="flex flex-wrap items-end gap-4">

            {/* Hôtel */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Établissement</Label>
              <select
                className="flex h-10 min-w-[220px] rounded-lg border border-input bg-background px-3 text-sm font-medium shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:opacity-50"
                value={hotelId}
                onChange={(e) => setHotelId(Number(e.target.value))}
                disabled={hotelsLoading || hotels.length <= 1}
              >
                {hotels.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date + navigation */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Date</Label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Jour précédent"
                  onClick={() => setDateJournal(shiftDate(dateJournal, -1))}
                  className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-input bg-background transition-colors hover:bg-muted"
                >
                  <ArrowLeft className="h-4 w-4 text-muted-foreground" />
                </button>
                <Input
                  type="date"
                  value={dateJournal}
                  max={today()}
                  className="h-10 w-44 cursor-pointer text-sm font-medium"
                  onChange={(e) => setDateJournal(e.target.value)}
                />
                <button
                  type="button"
                  aria-label="Jour suivant"
                  disabled={dateJournal >= today()}
                  onClick={() => setDateJournal(shiftDate(dateJournal, 1))}
                  className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-input bg-background transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </button>
                {dateJournal !== today() && (
                  <button
                    type="button"
                    onClick={() => setDateJournal(today())}
                    className="cursor-pointer rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/10"
                  >
                    Aujourd'hui
                  </button>
                )}
              </div>
            </div>

            {/* Loader indicator */}
            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Chargement…
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Flash messages ─────────────────────────────── */}
      {error && (
        <FlashMessage type="error" text={error} onDismiss={() => setError('')} />
      )}
      {success && (
        <FlashMessage type="success" text={success} onDismiss={() => setSuccess('')} />
      )}

      {/* ── Avertissement date future ──────────────────── */}
      {isFuture && !loading && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          La date sélectionnée est dans le futur — la saisie n'est pas disponible.
        </div>
      )}

      {/* ── Contenu saisie ─────────────────────────────── */}
      {saisie && !loading && (
        <div className="space-y-5">

          {/* En-tête journée */}
          <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold text-foreground">{saisie.hotelName}</h2>
                {statutCfg && (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
                      statutCfg.bg,
                      statutCfg.text,
                      statutCfg.border,
                    )}
                  >
                    <StatusIcon className="h-3 w-3" />
                    {statutCfg.label}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground capitalize">
                {formatDateFr(saisie.dateJournal)}
              </p>
            </div>

            <div className="flex flex-col items-end gap-2">
              <p className="text-2xl font-extrabold tabular-nums text-primary">
                {formatMoney(saisie.totalMontant)}
              </p>
              <CompletionBadge lignes={saisie.lignes} />
            </div>
          </div>

          {/* Indicateurs opérationnels */}
          <Card>
            <CardContent className="pt-5 pb-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Indicateurs opérationnels
              </p>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <KpiInput
                  label="Encaissement HT"
                  value={saisie.encaissementHt}
                  disabled={!saisie.canEdit}
                  isFloat
                  onChange={(v) => setSaisie({ ...saisie, encaissementHt: v })}
                />
                <KpiInput
                  label="Chambres occupées"
                  value={saisie.chambres}
                  disabled={!saisie.canEdit}
                  onChange={(v) => setSaisie({ ...saisie, chambres: v })}
                />
                <KpiInput
                  label="Nuitées"
                  value={saisie.nuitees}
                  disabled={!saisie.canEdit}
                  onChange={(v) => setSaisie({ ...saisie, nuitees: v })}
                />
                <KpiInput
                  label="Couverts restaurant"
                  value={saisie.couverts}
                  disabled={!saisie.canEdit}
                  onChange={(v) => setSaisie({ ...saisie, couverts: v })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Navigation par groupe */}
          {groupNames.length > 1 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">Aller à :</span>
              <GroupNav groups={groupNames} />
            </div>
          )}

          {/* Tableau des rubriques */}
          <LignesTable
            lignes={saisie.lignes}
            canEdit={saisie.canEdit}
            onUpdate={updateLigne}
          />

          {/* Barre d'actions */}
          {saisie.canEdit ? (
            <div className="sticky bottom-4 z-10">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/90 px-5 py-4 shadow-lg backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <p className="text-xs text-muted-foreground">
                    Utilisez <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">Entrée</kbd> pour passer au champ suivant
                  </p>
                </div>
                <div className="flex gap-2.5">
                  <Button
                    variant="outline"
                    disabled={saving !== ''}
                    className="gap-2"
                    onClick={() => void save('brouillon')}
                  >
                    {saving === 'brouillon' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Enregistrer brouillon
                  </Button>
                  <Button
                    disabled={saving !== ''}
                    className="gap-2"
                    onClick={() => void save('soumis')}
                  >
                    {saving === 'soumis' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Soumettre pour validation
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div
              className={cn(
                'flex items-center gap-3 rounded-xl border px-4 py-3 text-sm',
                saisie.statut === 'valide'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400'
                  : saisie.statut === 'soumis'
                    ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400'
                    : 'border-border bg-muted/40 text-muted-foreground',
              )}
            >
              <Lock className="h-4 w-4 shrink-0" />
              {saisie.statut === 'valide'
                ? 'Cette journée a été validée — modification impossible.'
                : saisie.statut === 'soumis'
                  ? 'Cette journée est soumise et en attente de validation par un directeur ou administrateur.'
                  : 'La modification de cette journée est désactivée.'}
            </div>
          )}
        </div>
      )}

      {/* ── État vide ──────────────────────────────────── */}
      {!saisie && !loading && !error && hotelId > 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-muted/20 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            Sélectionnez un hôtel et une date pour charger la saisie.
          </p>
        </div>
      )}
    </div>
  );
}
