import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  BedDouble,
  Eye,
  Loader2,
  Pencil,
  Search,
  Trash2,
  UtensilsCrossed,
  X,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { StatutBadge } from '@/components/common/StatutBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import { useHotelsList } from '@/hooks/useHotelsList';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { formatDate, formatMoney } from '@/lib/formatters';
import { canSaisieRecettes, isAdminRole } from '@/shared/permissions';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/lib/utils';
import type {
  HistoriqueJourItem,
  HistoriqueItem,
  SaisieJournaliereDto,
} from '@/shared/types/recettes';

/* ─────────────────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────────────────── */

function fmt(v: number) {
  return v === 0
    ? <span className="text-muted-foreground/40">—</span>
    : <span className="tabular-nums">{formatMoney(v)}</span>;
}

function fmtInt(v: number) {
  return v === 0
    ? <span className="text-muted-foreground/40">—</span>
    : <span className="tabular-nums">{v.toLocaleString('fr-FR')}</span>;
}

/* ─────────────────────────────────────────────────────────────────────────
   Dialog — Modifier une ligne
───────────────────────────────────────────────────────────────────────── */

function EditDialog({
  row,
  open,
  onClose,
  onSaved,
}: {
  row: HistoriqueItem | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [montant, setMontant] = useState('');
  const [observation, setObservation] = useState('');
  const [motif, setMotif] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (row && open) {
      setMontant(String(row.montant));
      setObservation(row.observation ?? '');
      setMotif('');
      setError('');
    }
  }, [row, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!row || !motif.trim()) return;
    setSaving(true);
    setError('');
    try {
      unwrapIpc(
        await ipcClient.recettes.updateLigne(
          row.id,
          parseFloat(montant) || 0,
          observation || null,
          motif.trim(),
        ),
      );
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  if (!row) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        title="Modifier la ligne"
        description={`${row.hotelName} · ${formatDate(row.dateJournal)} · ${row.rubriqueLabel}`}
      >
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Montant (DZD)</Label>
            <Input
              type="number" min={0} step="0.01"
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              className="h-10 text-right tabular-nums font-semibold"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Observation</Label>
            <Input
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder="Observation optionnelle…"
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              Motif <span className="text-destructive">*</span>
            </Label>
            <Input
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder="Motif de modification (tracé en audit)…"
              className="h-10"
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />{error}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Annuler</Button>
            <Button type="submit" disabled={saving || !motif.trim()}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Pencil className="mr-2 h-4 w-4" />}
              Enregistrer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Dialog — Supprimer une ligne
───────────────────────────────────────────────────────────────────────── */

function DeleteDialog({
  row,
  open,
  onClose,
  onDeleted,
}: {
  row: HistoriqueItem | null;
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [motif, setMotif] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (open) { setMotif(''); setError(''); } }, [open]);

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!row || !motif.trim()) return;
    setDeleting(true);
    setError('');
    try {
      unwrapIpc(await ipcClient.recettes.deleteLigne(row.id, motif.trim()));
      onDeleted();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setDeleting(false);
    }
  };

  if (!row) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent title="Supprimer cette ligne" description={`${row.hotelName} · ${formatDate(row.dateJournal)}`}>
        <form onSubmit={(e) => void handleDelete(e)} className="space-y-4">
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{row.rubriqueLabel}</span>
              <span className="font-bold tabular-nums text-destructive">{formatMoney(row.montant)}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Action irréversible — tracée dans l'audit.</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Motif <span className="text-destructive">*</span></Label>
            <Input
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder="Motif de suppression…"
              className="h-10" autoFocus
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />{error}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} disabled={deleting}>Annuler</Button>
            <Button type="submit" variant="destructive" disabled={deleting || !motif.trim()}>
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Supprimer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Dialog — Supprimer une journée entière (admin)
───────────────────────────────────────────────────────────────────────── */

function DeleteDayDialog({
  row,
  open,
  onClose,
  onDeleted,
}: {
  row: HistoriqueJourItem | null;
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [motif, setMotif] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (open) { setMotif(''); setError(''); } }, [open]);

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!row || !motif.trim()) return;
    setDeleting(true);
    setError('');
    try {
      unwrapIpc(
        await ipcClient.recettes.deleteJournee(row.hotelId, row.dateJournal, motif.trim()),
      );
      onDeleted();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setDeleting(false);
    }
  };

  if (!row) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        title="Supprimer la journée"
        description={`${row.hotelName} · ${formatDate(row.dateJournal)}`}
      >
        <form onSubmit={(e) => void handleDelete(e)} className="space-y-4">
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm">
            <p className="font-medium text-destructive">Suppression de toutes les lignes de la journée</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Total CA : {formatMoney(row.totalMontant)} — action irréversible, tracée en audit.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Motif <span className="text-destructive">*</span></Label>
            <Input
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder="Motif de suppression de la journée…"
              className="h-10"
              autoFocus
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />{error}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} disabled={deleting}>Annuler</Button>
            <Button type="submit" variant="destructive" disabled={deleting || !motif.trim()}>
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Supprimer la journée
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Dialog — Visualiser la journée complète (avec edit/delete par ligne)
───────────────────────────────────────────────────────────────────────── */

function ViewDayDialog({
  hotelId,
  hotelName,
  dateJournal,
  open,
  onClose,
  isAdmin,
  canEdit,
  onLineUpdated,
}: {
  hotelId: number;
  hotelName: string;
  dateJournal: string;
  open: boolean;
  onClose: () => void;
  isAdmin: boolean;
  canEdit: boolean;
  onLineUpdated: () => void;
}) {
  const [saisie, setSaisie] = useState<SaisieJournaliereDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editRow, setEditRow] = useState<HistoriqueItem | null>(null);
  const [deleteRow, setDeleteRow] = useState<HistoriqueItem | null>(null);

  const loadSaisie = useCallback(() => {
    if (!open || !hotelId || !dateJournal) return;
    setLoading(true);
    setError('');
    setSaisie(null);
    ipcClient.recettes
      .getSaisie(hotelId, dateJournal)
      .then((r) => {
        try { setSaisie(unwrapIpc(r)); }
        catch (e) { setError(e instanceof Error ? e.message : 'Erreur'); }
      })
      .catch(() => setError('Impossible de charger la journée.'))
      .finally(() => setLoading(false));
  }, [open, hotelId, dateJournal]);

  useEffect(() => { loadSaisie(); }, [loadSaisie]);

  const dateFr = (() => {
    try {
      return new Date(dateJournal).toLocaleDateString('fr-FR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      });
    } catch { return dateJournal; }
  })();

  const groups = saisie
    ? (() => {
        const m = new Map<string, typeof saisie.lignes>();
        for (const l of saisie.lignes) {
          const key = l.parentLabel ?? l.rubriqueLabel;
          if (!m.has(key)) m.set(key, []);
          m.get(key)!.push(l);
        }
        return [...m.entries()];
      })()
    : [];

  const hasParents = saisie?.lignes.some((l) => l.parentLabel !== null) ?? false;

  // Convert a saisie ligne to HistoriqueItem for dialogs
  const toHistItem = (l: SaisieJournaliereDto['lignes'][number]): HistoriqueItem => ({
    id: l.id ?? 0,
    hotelId,
    hotelName,
    dateJournal,
    rubriqueLabel: l.rubriqueLabel,
    montant: l.montant,
    statut: saisie!.statut,
    observation: l.observation,
    updatedAt: '',
  });

  const canEditLine = (l: SaisieJournaliereDto['lignes'][number]) =>
    l.id !== null && (isAdmin || (canEdit && saisie?.statut !== 'valide'));

  const editableLines = saisie?.lignes.filter((l) => canEditLine(l)) ?? [];

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent
          className="max-w-2xl"
          title={`Journée — ${dateFr}`}
          description={hotelName}
        >
          {loading && (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Chargement…
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/5 px-3 py-3 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />{error}
            </div>
          )}

          {saisie && !loading && (
            <div className="space-y-4">
              {/* KPIs */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: 'Total CA', value: formatMoney(saisie.totalMontant), highlight: true },
                  { label: 'Chambres', value: String(saisie.chambres || '—'), icon: <BedDouble className="h-3 w-3" /> },
                  { label: 'Nuitées', value: String(saisie.nuitees || '—'), icon: <Calendar className="h-3 w-3" /> },
                  { label: 'Couverts', value: String(saisie.couverts || '—'), icon: <UtensilsCrossed className="h-3 w-3" /> },
                ].map((k) => (
                  <div key={k.label} className={cn(
                    'rounded-xl border px-3 py-2.5 text-center',
                    k.highlight ? 'border-primary/20 bg-primary/[0.04]' : 'border-border bg-muted/30',
                  )}>
                    <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                      {k.icon}{k.label}
                    </div>
                    <p className={cn('mt-0.5 text-base font-bold tabular-nums', k.highlight ? 'text-primary' : '')}>
                      {k.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Statut */}
              <div className="flex items-center gap-2">
                <StatutBadge statut={saisie.statut} />
                {saisie.statut === 'valide' && (
                  <span className="flex items-center gap-1 text-xs text-emerald-600">
                    <CheckCircle2 className="h-3.5 w-3.5" />Validée
                  </span>
                )}
                {isAdmin && saisie.statut === 'valide' && (
                  <span className="text-xs text-amber-600">(Admin : modification autorisée)</span>
                )}
              </div>

              {isAdmin && editableLines.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Modifiez ou supprimez chaque ligne avec les boutons à droite du tableau.
                </p>
              )}

              {/* Lignes */}
              <div className="max-h-[340px] space-y-2 overflow-y-auto pr-1">
                {groups.map(([group, lignes]) => {
                  const subtotal = lignes.reduce((s, l) => s + l.montant, 0);
                  return (
                    <div key={group} className="overflow-hidden rounded-xl border border-border">
                      {hasParents && (
                        <div className="flex items-center justify-between border-b border-border/60 bg-muted/50 px-3 py-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-foreground/70">{group}</span>
                          {subtotal > 0 && (
                            <span className="text-[11px] font-bold text-primary">{formatMoney(subtotal)}</span>
                          )}
                        </div>
                      )}
                      <table className="w-full text-sm">
                        <tbody className="divide-y divide-border/40">
                          {lignes.map((l) => (
                            <tr key={l.rubriqueId} className="group hover:bg-muted/20">
                              <td className="px-3 py-2.5 font-medium">{l.rubriqueLabel}</td>
                              <td className="px-3 py-2.5 text-right tabular-nums font-semibold">
                                {l.montant > 0 ? formatMoney(l.montant) : <span className="text-muted-foreground/40">—</span>}
                              </td>
                              <td className="px-3 py-2.5 text-xs text-muted-foreground">{l.observation ?? ''}</td>
                              <td className="px-2 py-1.5 text-right">
                                {canEditLine(l) && (
                                  <div className={cn(
                                    'flex justify-end gap-0.5',
                                    !isAdmin && 'opacity-0 transition-opacity group-hover:opacity-100',
                                  )}>
                                    <Button
                                      variant="ghost" size="icon"
                                      className="h-7 w-7"
                                      title="Modifier la ligne"
                                      onClick={() => setEditRow(toHistItem(l))}
                                    >
                                      <Pencil className={cn('h-3.5 w-3.5', isAdmin && saisie.statut === 'valide' ? 'text-amber-500' : 'text-muted-foreground')} />
                                    </Button>
                                    <Button
                                      variant="ghost" size="icon"
                                      className="h-7 w-7"
                                      title="Supprimer la ligne"
                                      onClick={() => setDeleteRow(toHistItem(l))}
                                    >
                                      <Trash2 className="h-3.5 w-3.5 text-destructive/70" />
                                    </Button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <DialogClose asChild>
              <Button variant="outline" onClick={onClose}>
                <X className="mr-2 h-4 w-4" />Fermer
              </Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sub-dialogs lancés depuis le détail journée */}
      <EditDialog
        row={editRow}
        open={editRow !== null}
        onClose={() => setEditRow(null)}
        onSaved={() => { onLineUpdated(); loadSaisie(); }}
      />
      <DeleteDialog
        row={deleteRow}
        open={deleteRow !== null}
        onClose={() => setDeleteRow(null)}
        onDeleted={() => { onLineUpdated(); loadSaisie(); }}
      />
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Tableau groupé (1 ligne / unité / jour)
───────────────────────────────────────────────────────────────────────── */

function GroupedTable({
  rows,
  loading,
  isAdmin,
  onView,
  onDeleteDay,
}: {
  rows: HistoriqueJourItem[];
  loading: boolean;
  isAdmin: boolean;
  onView: (row: HistoriqueJourItem) => void;
  onDeleteDay: (row: HistoriqueJourItem) => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-16 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />Chargement…
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/80 bg-secondary/20 py-16 text-center text-sm text-muted-foreground">
        Aucune recette pour ces critères
      </div>
    );
  }

  const COL_H = 'px-3 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground';
  const COL_D = 'px-3 py-3.5 text-sm';

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-border bg-gradient-to-r from-secondary/80 to-secondary/40">
              <th className={cn(COL_H, 'text-left w-28')}>Date</th>
              <th className={cn(COL_H, 'text-left min-w-[140px]')}>Unité</th>
              <th className={cn(COL_H, 'text-right')}>Hébergement</th>
              <th className={cn(COL_H, 'text-right')}>Denrées</th>
              <th className={cn(COL_H, 'text-right')}>Boissons</th>
              <th className={cn(COL_H, 'text-right')}>Autres prest.</th>
              <th className={cn(COL_H, 'text-right bg-primary/5')}>Total CA</th>
              <th className={cn(COL_H, 'text-right')}>Enc. HT</th>
              <th className={cn(COL_H, 'text-center')}>
                <div className="flex flex-col items-center gap-0.5">
                  <BedDouble className="h-3.5 w-3.5" />
                  <span>Ch. occ.</span>
                </div>
              </th>
              <th className={cn(COL_H, 'text-center')}>Nuitées</th>
              <th className={cn(COL_H, 'text-center')}>
                <div className="flex flex-col items-center gap-0.5">
                  <UtensilsCrossed className="h-3.5 w-3.5" />
                  <span>Couverts</span>
                </div>
              </th>
              <th className={cn(COL_H, 'text-center')}>Statut</th>
              <th className={cn(COL_H, 'text-right', isAdmin ? 'w-28' : 'w-16')}>
                {isAdmin ? 'Actions' : ''}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {rows.map((r) => (
              <tr
                key={`${r.hotelId}-${r.dateJournal}`}
                className="bg-card transition-colors hover:bg-secondary/20"
              >
                {/* Date */}
                <td className={cn(COL_D, 'font-mono text-xs tabular-nums text-muted-foreground')}>
                  {formatDate(r.dateJournal)}
                </td>

                {/* Unité */}
                <td className={cn(COL_D, 'font-semibold text-foreground')}>
                  {r.hotelName}
                </td>

                {/* Hébergement */}
                <td className={cn(COL_D, 'text-right')}>{fmt(r.montantHebergement)}</td>

                {/* Denrées */}
                <td className={cn(COL_D, 'text-right')}>{fmt(r.montantDenrees)}</td>

                {/* Boissons */}
                <td className={cn(COL_D, 'text-right')}>{fmt(r.montantBoissons)}</td>

                {/* Autres */}
                <td className={cn(COL_D, 'text-right')}>{fmt(r.montantAutres)}</td>

                {/* Total CA — mis en valeur */}
                <td className={cn(COL_D, 'text-right bg-primary/[0.02]')}>
                  <span className="font-bold tabular-nums text-primary">
                    {formatMoney(r.totalMontant)}
                  </span>
                </td>

                {/* Encaissement HT */}
                <td className={cn(COL_D, 'text-right')}>{fmt(r.encaissementHt)}</td>

                {/* Chambres */}
                <td className={cn(COL_D, 'text-center')}>{fmtInt(r.chambres)}</td>

                {/* Nuitées */}
                <td className={cn(COL_D, 'text-center')}>{fmtInt(r.nuitees)}</td>

                {/* Couverts */}
                <td className={cn(COL_D, 'text-center')}>{fmtInt(r.couverts)}</td>

                {/* Statut */}
                <td className={cn(COL_D, 'text-center')}>
                  <StatutBadge statut={r.statut} />
                </td>

                {/* Actions */}
                <td className={cn(COL_D, 'text-right')}>
                  <div className="flex justify-end gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      title={isAdmin ? 'Modifier la journée (lignes)' : 'Visualiser la journée'}
                      onClick={() => onView(r)}
                    >
                      {isAdmin ? (
                        <Pencil className="h-4 w-4 text-amber-600" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Supprimer la journée"
                        onClick={() => onDeleteDay(r)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive/70" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>

          {/* Ligne de totaux */}
          {rows.length > 1 && (
            <tfoot>
              <tr className="border-t-2 border-border bg-muted/60">
                <td className={cn(COL_D, 'font-bold text-foreground')} colSpan={2}>
                  Total ({rows.length} journées)
                </td>
                <td className={cn(COL_D, 'text-right font-semibold tabular-nums')}>
                  {formatMoney(rows.reduce((s, r) => s + r.montantHebergement, 0))}
                </td>
                <td className={cn(COL_D, 'text-right font-semibold tabular-nums')}>
                  {formatMoney(rows.reduce((s, r) => s + r.montantDenrees, 0))}
                </td>
                <td className={cn(COL_D, 'text-right font-semibold tabular-nums')}>
                  {formatMoney(rows.reduce((s, r) => s + r.montantBoissons, 0))}
                </td>
                <td className={cn(COL_D, 'text-right font-semibold tabular-nums')}>
                  {formatMoney(rows.reduce((s, r) => s + r.montantAutres, 0))}
                </td>
                <td className={cn(COL_D, 'text-right bg-primary/[0.04]')}>
                  <span className="font-extrabold tabular-nums text-primary">
                    {formatMoney(rows.reduce((s, r) => s + r.totalMontant, 0))}
                  </span>
                </td>
                <td className={cn(COL_D, 'text-right font-semibold tabular-nums')}>
                  {formatMoney(rows.reduce((s, r) => s + r.encaissementHt, 0))}
                </td>
                <td className={cn(COL_D, 'text-center font-semibold tabular-nums')}>
                  {rows.reduce((s, r) => s + r.chambres, 0).toLocaleString('fr-FR')}
                </td>
                <td className={cn(COL_D, 'text-center font-semibold tabular-nums')}>
                  {rows.reduce((s, r) => s + r.nuitees, 0).toLocaleString('fr-FR')}
                </td>
                <td className={cn(COL_D, 'text-center font-semibold tabular-nums')}>
                  {rows.reduce((s, r) => s + r.couverts, 0).toLocaleString('fr-FR')}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Page principale
───────────────────────────────────────────────────────────────────────── */

export function HistoriqueRecettesPage() {
  const role = useAuthStore((s) => s.user?.role);
  const { hotels, defaultHotelId } = useHotelsList();

  const [rows, setRows] = useState<HistoriqueJourItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hotelId, setHotelId] = useState<number | ''>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');

  const [viewDay, setViewDay] = useState<{ hotelId: number; hotelName: string; dateJournal: string } | null>(null);
  const [deleteDay, setDeleteDay] = useState<HistoriqueJourItem | null>(null);
  const [loadError, setLoadError] = useState('');

  const isAdmin = isAdminRole(role);
  const canEdit = canSaisieRecettes(role);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = unwrapIpc(
        await ipcClient.recettes.historiqueGrouped({
          hotelId: hotelId ? Number(hotelId) : undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          search: search || undefined,
        }),
      );
      setRows(data);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Erreur de chargement');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [hotelId, dateFrom, dateTo, search]);

  useEffect(() => {
    if (defaultHotelId && hotelId === '') setHotelId(defaultHotelId);
  }, [defaultHotelId, hotelId]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="page-shell">
      <PageHeader
        title="Historique des recettes"
        description="Synthèse journalière par unité — une ligne par établissement par jour"
      />

      {/* Filtres */}
      <div className="mb-5 grid gap-3 rounded-xl border border-border bg-card p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Hôtel</Label>
          <select
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring/30"
            value={hotelId}
            onChange={(e) => setHotelId(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">Tous les hôtels</option>
            {hotels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Du</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-10" />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Au</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-10" />
        </div>

        <div className="space-y-1.5 lg:col-span-2">
          <Label className="text-xs font-medium text-muted-foreground">Recherche</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-10 pl-10"
              placeholder="Nom d'établissement…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Erreur de chargement */}
      {loadError && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {loadError}
          {loadError.includes('historiqueGrouped') && (
            <span className="ml-1 text-muted-foreground">— Redémarrez l'application Electron pour activer le nouvel endpoint.</span>
          )}
        </div>
      )}

      {/* Note admin */}
      {isAdmin && (
        <div className="mb-3 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400">
          <Pencil className="h-3.5 w-3.5 shrink-0 text-amber-500" />
          Mode administrateur — crayon pour modifier les lignes, corbeille pour supprimer une journée entière (y compris validée).
        </div>
      )}

      <GroupedTable
        rows={rows}
        loading={loading}
        isAdmin={isAdmin}
        onView={(r) => setViewDay(r)}
        onDeleteDay={(r) => setDeleteDay(r)}
      />

      {/* Dialog détail journée */}
      {viewDay && (
        <ViewDayDialog
          hotelId={viewDay.hotelId}
          hotelName={viewDay.hotelName}
          dateJournal={viewDay.dateJournal}
          open
          onClose={() => setViewDay(null)}
          isAdmin={isAdmin}
          canEdit={canEdit}
          onLineUpdated={() => void load()}
        />
      )}

      <DeleteDayDialog
        row={deleteDay}
        open={deleteDay !== null}
        onClose={() => setDeleteDay(null)}
        onDeleted={() => void load()}
      />
    </div>
  );
}
