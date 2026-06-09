import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { RubriqueTreeView } from '@/components/admin/RubriqueTreeView';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { computeReorder } from '@/lib/rubriqueTree';
import type { DropPosition } from '@/lib/rubriqueTree';
import type { RubriqueListItem } from '@/shared/types/admin';

export function RubriquesPage() {
  const [rubriques, setRubriques] = useState<RubriqueListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [reordering, setReordering] = useState(false);
  const [error, setError] = useState('');

  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formCode, setFormCode] = useState('');
  const [formLabel, setFormLabel] = useState('');
  const [formSortOrder, setFormSortOrder] = useState('');
  const [formParentId, setFormParentId] = useState<number | null>(null);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setRubriques(unwrapIpc(await ipcClient.rubriques.list()));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const roots = useMemo(() => rubriques.filter((r) => r.parentId === null), [rubriques]);

  const defaultSortOrder = useMemo(() => {
    const max = rubriques.reduce((m, r) => Math.max(m, r.sortOrder), 0);
    return String(max + 1);
  }, [rubriques]);

  const resetForm = () => {
    setFormMode(null);
    setEditingId(null);
    setFormCode('');
    setFormLabel('');
    setFormSortOrder('');
    setFormParentId(null);
    setFormIsActive(true);
    setFormError('');
  };

  const startCreate = (parentId: number | null = null) => {
    setFormMode('create');
    setEditingId(null);
    setFormCode('');
    setFormLabel('');
    setFormSortOrder(defaultSortOrder);
    setFormParentId(parentId);
    setFormIsActive(true);
    setFormError('');
  };

  const startEdit = (rubrique: RubriqueListItem) => {
    setFormMode('edit');
    setEditingId(rubrique.id);
    setFormCode(rubrique.code);
    setFormLabel(rubrique.label);
    setFormSortOrder(String(rubrique.sortOrder));
    setFormParentId(rubrique.parentId);
    setFormIsActive(rubrique.isActive);
    setFormError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const parsedSortOrder =
      formSortOrder.trim() === '' ? undefined : Number.parseInt(formSortOrder, 10);
    if (parsedSortOrder !== undefined && Number.isNaN(parsedSortOrder)) {
      setFormError("L'ordre de tri doit être un nombre valide.");
      return;
    }

    try {
      if (formMode === 'edit' && editingId !== null) {
        unwrapIpc(
          await ipcClient.rubriques.update(editingId, {
            code: formCode,
            label: formLabel,
            sortOrder: parsedSortOrder,
            parentId: formParentId,
            isActive: formIsActive,
          }),
        );
      } else {
        unwrapIpc(
          await ipcClient.rubriques.create({
            code: formCode,
            label: formLabel,
            parentId: formParentId,
            sortOrder: parsedSortOrder,
          }),
        );
      }
      resetForm();
      void load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const toggleActive = async (r: RubriqueListItem) => {
    try {
      unwrapIpc(await ipcClient.rubriques.update(r.id, { isActive: !r.isActive }));
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const deleteRubrique = async (r: RubriqueListItem) => {
    const ok = window.confirm(
      `Supprimer la rubrique "${r.label}" ? Cette action est irréversible.`,
    );
    if (!ok) return;
    setError('');
    try {
      unwrapIpc(await ipcClient.rubriques.delete(r.id));
      if (editingId === r.id) resetForm();
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const handleReorder = async (
    draggedId: number,
    targetId: number,
    position: DropPosition,
  ) => {
    const payload = computeReorder(rubriques, draggedId, targetId, position);
    if (!payload) {
      setError('Déplacement impossible pour cette rubrique.');
      return;
    }

    setReordering(true);
    setError('');
    try {
      setRubriques(unwrapIpc(await ipcClient.rubriques.reorder(payload)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de réordonnancement');
      void load();
    } finally {
      setReordering(false);
    }
  };

  const parentOptions = roots.filter((r) => r.id !== editingId);

  return (
    <div>
      <PageHeader
        title="Rubriques de recettes"
        description="Arbre hiérarchique — rubriques principales et sous-rubriques pour la saisie du CA"
        action={
          <Button onClick={() => startCreate()}>
            <Plus className="h-4 w-4" />
            Nouvelle rubrique
          </Button>
        }
      />

      {/* ── Create / Edit form panel ─────────────────── */}
      {formMode && (
        <div className="app-surface mb-1 overflow-hidden">
          {/* Panel header */}
          <div className="flex items-center gap-3 border-b border-border/60 bg-primary/5 px-5 py-3">
            <div className="h-5 w-1 rounded-full bg-primary" />
            <span className="font-heading text-sm font-semibold text-foreground">
              {formMode === 'edit' ? 'Modifier la rubrique' : 'Nouvelle rubrique'}
            </span>
            {formMode === 'edit' && (
              <span className="font-mono text-xs text-muted-foreground">{formCode}</span>
            )}
          </div>

          <div className="p-5">
            <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-wrap items-end gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="rCode" className="section-label">Code</Label>
                <Input
                  id="rCode"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  placeholder="EX_CODE"
                  className="h-9 w-36 font-mono text-sm uppercase"
                  required
                />
              </div>

              <div className="min-w-[220px] space-y-1.5">
                <Label htmlFor="rLabel" className="section-label">Libellé</Label>
                <Input
                  id="rLabel"
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  className="h-9 text-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rSort" className="section-label">Ordre</Label>
                <Input
                  id="rSort"
                  type="number"
                  min={0}
                  value={formSortOrder}
                  onChange={(e) => setFormSortOrder(e.target.value)}
                  className="h-9 w-24 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rParent" className="section-label">Rubrique parente</Label>
                <select
                  id="rParent"
                  className="h-9 min-w-[200px] rounded-md border border-input bg-background px-3 text-sm focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15"
                  value={formParentId ?? ''}
                  onChange={(e) =>
                    setFormParentId(e.target.value ? Number(e.target.value) : null)
                  }
                >
                  <option value="">— Principale —</option>
                  {parentOptions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              {formMode === 'edit' && (
                <label className="flex h-9 cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="h-4 w-4 cursor-pointer accent-primary"
                  />
                  <span className="text-muted-foreground">Active</span>
                </label>
              )}

              <div className="flex items-end gap-2">
                <Button type="submit" className="h-9">
                  {formMode === 'edit' ? 'Mettre à jour' : 'Créer'}
                </Button>
                <Button type="button" variant="outline" size="sm" className="h-9" onClick={resetForm}>
                  Annuler
                </Button>
              </div>
            </form>

            {formError && (
              <p className="status-banner-error mt-3">{formError}</p>
            )}
          </div>
        </div>
      )}

      {error && (
        <p className="status-banner-error mb-3">{error}</p>
      )}

      {loading ? (
        <div className="app-surface flex items-center justify-center py-12">
          <p className="text-sm text-muted-foreground">Chargement des rubriques…</p>
        </div>
      ) : rubriques.length === 0 ? (
        <div className="app-surface flex flex-col items-center gap-2 py-12 text-center">
          <p className="text-sm font-medium text-muted-foreground">Aucune rubrique configurée</p>
          <p className="text-xs text-muted-foreground/60">
            Cliquez sur « Nouvelle rubrique » pour créer les rubriques principales.
          </p>
        </div>
      ) : (
        <RubriqueTreeView
          rubriques={rubriques}
          reordering={reordering}
          onEdit={startEdit}
          onToggleActive={(r) => void toggleActive(r)}
          onDelete={(r) => void deleteRubrique(r)}
          onReorder={(draggedId, targetId, position) =>
            void handleReorder(draggedId, targetId, position)
          }
        />
      )}
    </div>
  );
}
