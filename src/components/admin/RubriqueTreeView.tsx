import { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  Pencil,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  buildRubriqueTree,
  filterRubriqueTree,
  resolveDropPosition,
  type DropPosition,
  type RubriqueTreeNode,
  type StatusFilter,
} from '@/lib/rubriqueTree';
import type { RubriqueListItem } from '@/shared/types/admin';

/* ── Per-rubrique accent colours (matches dashboard stacked bar) ── */
const RUB_COLORS: Record<string, string> = {
  HEBERGEMENT:      '#1E3A8A',
  DENREES:          '#F97316',
  RESTAURATION:     '#F97316',
  BOISSONS:         '#16A34A',
  AUTRES:           '#64748B',
  AUTRES_PRESTATIONS:'#64748B',
  PORT:             '#0891B2',
  LOCATIONS:        '#7C3AED',
  DIVERS:           '#CA8A04',
};
function rubColor(code: string): string {
  return RUB_COLORS[code] ?? '#1E3A8A';
}

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all',      label: 'Toutes'    },
  { value: 'active',   label: 'Actives'   },
  { value: 'inactive', label: 'Inactives' },
];

interface RubriqueTreeViewProps {
  rubriques: RubriqueListItem[];
  reordering: boolean;
  onEdit: (rubrique: RubriqueListItem) => void;
  onToggleActive: (rubrique: RubriqueListItem) => void;
  onDelete: (rubrique: RubriqueListItem) => void;
  onReorder: (draggedId: number, targetId: number, position: DropPosition) => void;
}

/* ── Single tree row ─────────────────────────────────────────────── */
function TreeRow({
  rubrique, depth, childCount, reordering,
  dragOver, dropHint,
  onEdit, onToggleActive, onDelete,
  onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd,
}: {
  rubrique: RubriqueListItem;
  depth: number;
  childCount: number;
  reordering: boolean;
  dragOver: boolean;
  dropHint: DropPosition | null;
  onEdit: (r: RubriqueListItem) => void;
  onToggleActive: (r: RubriqueListItem) => void;
  onDelete: (r: RubriqueListItem) => void;
  onDragStart: (id: number) => void;
  onDragOver: (id: number, el: HTMLElement, clientY: number, allowInside: boolean) => void;
  onDragLeave: () => void;
  onDrop: (id: number, el: HTMLElement, clientY: number, allowInside: boolean) => void;
  onDragEnd: () => void;
}) {
  const allowInside = depth === 0;
  const isParent    = depth === 0;
  const color       = rubColor(rubrique.code);

  return (
    <div
      draggable={!reordering}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(rubrique.id));
        onDragStart(rubrique.id);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        onDragOver(rubrique.id, e.currentTarget as HTMLElement, e.clientY, allowInside);
      }}
      onDragLeave={onDragLeave}
      onDrop={(e) => {
        e.preventDefault();
        onDrop(rubrique.id, e.currentTarget as HTMLElement, e.clientY, allowInside);
      }}
      onDragEnd={onDragEnd}
      className={cn(
        'group relative flex items-center justify-between gap-3 rounded-lg border transition-all duration-150',
        isParent
          ? 'bg-card pl-0 pr-3 py-2.5 shadow-sm hover:shadow-card border-border/70'
          : 'bg-secondary/20 border-transparent px-3 py-2 hover:bg-secondary/40',
        !rubrique.isActive && 'opacity-55',
        dragOver && dropHint !== 'before' && dropHint !== 'after' && 'bg-primary/5 ring-1 ring-primary/25',
        dropHint === 'before' && 'border-t-2 border-t-primary',
        dropHint === 'after'  && 'border-b-2 border-b-primary',
        dropHint === 'inside' && 'bg-primary/8 border-primary/30',
      )}
    >
      {/* Left accent bar — parents only */}
      {isParent && (
        <div
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
          style={{ background: color }}
        />
      )}

      {/* Grip */}
      <div className={cn('flex items-center pl-3', isParent && 'pl-4')}>
        <GripVertical
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground/30',
            !reordering && 'cursor-grab group-active:cursor-grabbing',
            reordering && 'opacity-20',
          )}
        />
      </div>

      {/* Indent chevron for children */}
      {!isParent && (
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
      )}

      {/* Color dot for children */}
      {!isParent && rubrique.parentLabel && (
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ background: rubColor(rubrique.code) }}
        />
      )}

      {/* Labels */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
          <span className="font-mono text-[11px] font-medium text-muted-foreground">
            {rubrique.code}
          </span>
          <span
            className={cn(
              'truncate text-sm',
              isParent ? 'font-semibold text-foreground' : 'text-foreground/80',
            )}
          >
            {rubrique.label}
          </span>
          {isParent && childCount > 0 && (
            <span className="section-label">
              {childCount} ss-rub.
            </span>
          )}
          {dropHint === 'inside' && (
            <span className="text-[10px] font-semibold text-primary">→ déplacer ici</span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground/50">#{rubrique.sortOrder}</span>
          <Badge
            variant={rubrique.isActive ? 'success' : 'muted'}
            className="h-4 px-1.5 text-[9px]"
          >
            {rubrique.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-primary"
          title="Modifier"
          onClick={() => onEdit(rubrique)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-7 w-7',
            rubrique.isActive
              ? 'text-muted-foreground hover:text-amber-600'
              : 'text-muted-foreground hover:text-emerald-600',
          )}
          title={rubrique.isActive ? 'Désactiver' : 'Activer'}
          onClick={() => onToggleActive(rubrique)}
          disabled={reordering}
        >
          {rubrique.isActive
            ? <ToggleRight className="h-4 w-4" />
            : <ToggleLeft  className="h-4 w-4" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive disabled:opacity-30"
          title="Supprimer"
          onClick={() => onDelete(rubrique)}
          disabled={reordering || (isParent && childCount > 0)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

/* ── Tree branch (parent + children) ────────────────────────────── */
function TreeBranch({
  node, expanded, onToggleExpand, dragState, reordering,
  onEdit, onToggleActive, onDelete,
  onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd,
}: {
  node: RubriqueTreeNode;
  expanded: boolean;
  onToggleExpand: (id: number) => void;
  dragState: { draggedId: number | null; overId: number | null; hint: DropPosition | null };
  reordering: boolean;
  onEdit: (r: RubriqueListItem) => void;
  onToggleActive: (r: RubriqueListItem) => void;
  onDelete: (r: RubriqueListItem) => void;
  onDragStart: (id: number) => void;
  onDragOver: (id: number, el: HTMLElement, clientY: number, allowInside: boolean) => void;
  onDragLeave: () => void;
  onDrop: (id: number, el: HTMLElement, clientY: number, allowInside: boolean) => void;
  onDragEnd: () => void;
}) {
  const hasChildren = node.children.length > 0;
  const color       = rubColor(node.rubrique.code);

  return (
    <div className="space-y-1">
      <div className="flex items-stretch gap-1">
        {/* Expand toggle */}
        <button
          type="button"
          className={cn(
            'mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors',
            hasChildren
              ? 'text-muted-foreground hover:bg-secondary cursor-pointer'
              : 'opacity-0 pointer-events-none',
          )}
          onClick={() => hasChildren && onToggleExpand(node.rubrique.id)}
          aria-label={expanded ? 'Replier' : 'Déplier'}
        >
          {expanded
            ? <ChevronDown  className="h-4 w-4" />
            : <ChevronRight className="h-4 w-4" />}
        </button>

        <div className="min-w-0 flex-1">
          <TreeRow
            rubrique={node.rubrique}
            depth={0}
            childCount={node.children.length}
            reordering={reordering}
            dragOver={dragState.overId === node.rubrique.id}
            dropHint={dragState.overId === node.rubrique.id ? dragState.hint : null}
            onEdit={onEdit}
            onToggleActive={onToggleActive}
            onDelete={onDelete}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onDragEnd={onDragEnd}
          />
        </div>
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div
          className="ml-8 space-y-0.5 rounded-b-lg border-l-2 pb-1 pl-3"
          style={{ borderLeftColor: `${color}30` }}
        >
          {node.children.map((child) => (
            <TreeRow
              key={child.rubrique.id}
              rubrique={child.rubrique}
              depth={1}
              childCount={0}
              reordering={reordering}
              dragOver={dragState.overId === child.rubrique.id}
              dropHint={dragState.overId === child.rubrique.id ? dragState.hint : null}
              onEdit={onEdit}
              onToggleActive={onToggleActive}
              onDelete={onDelete}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onDragEnd={onDragEnd}
            />
          ))}
        </div>
      )}

      {/* Empty children hint */}
      {hasChildren && expanded && node.children.length === 0 && (
        <p className="ml-11 text-[11px] italic text-muted-foreground/50">
          Aucune sous-rubrique
        </p>
      )}
    </div>
  );
}

/* ── Main tree view ──────────────────────────────────────────────── */
export function RubriqueTreeView({
  rubriques, reordering,
  onEdit, onToggleActive, onDelete, onReorder,
}: RubriqueTreeViewProps) {
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [expanded,     setExpanded]     = useState<Set<number>>(() => new Set());
  const [dragState,    setDragState]    = useState<{
    draggedId: number | null;
    overId: number | null;
    hint: DropPosition | null;
  }>({ draggedId: null, overId: null, hint: null });

  const tree         = useMemo(() => buildRubriqueTree(rubriques), [rubriques]);
  const filteredTree = useMemo(
    () => filterRubriqueTree(tree, search, statusFilter),
    [tree, search, statusFilter],
  );

  const isFiltering  = search.trim().length > 0 || statusFilter !== 'all';
  const dragEnabled  = !isFiltering && !reordering;

  const toggleExpand = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const expandAll   = () =>
    setExpanded(new Set(tree.filter((n) => n.children.length > 0).map((n) => n.rubrique.id)));
  const collapseAll = () => setExpanded(new Set());

  const handleDragStart = (id: number) => {
    if (!dragEnabled) return;
    setDragState({ draggedId: id, overId: null, hint: null });
  };

  const handleDragOver = (id: number, el: HTMLElement, clientY: number, allowInside: boolean) => {
    if (!dragEnabled || dragState.draggedId === null) return;
    const hint = resolveDropPosition(el, clientY, allowInside);
    setDragState((s) => ({ ...s, overId: id, hint }));
  };

  const handleDrop = (targetId: number, el: HTMLElement, clientY: number, allowInside: boolean) => {
    if (!dragEnabled || dragState.draggedId === null) return;
    const position = resolveDropPosition(el, clientY, allowInside);
    onReorder(dragState.draggedId, targetId, position);
    setDragState({ draggedId: null, overId: null, hint: null });
  };

  const handleDragEnd = () =>
    setDragState({ draggedId: null, overId: null, hint: null });

  const totalRoots    = tree.length;
  const totalChildren = rubriques.filter((r) => r.parentId !== null).length;

  return (
    <div className="space-y-3">
      {/* ── Toolbar ─────────────────────────────────────── */}
      <div className="app-surface flex flex-wrap items-center gap-3 px-4 py-3">
        <Input
          placeholder="Rechercher code ou libellé…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 max-w-[240px] text-sm"
        />

        {/* Status pill filter */}
        <div className="flex overflow-hidden rounded-lg border border-border">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatusFilter(opt.value)}
              className={cn(
                'px-3 py-1 text-xs font-medium transition-colors',
                statusFilter === opt.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-muted-foreground hover:bg-secondary',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={expandAll}>
            Tout déplier
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={collapseAll}>
            Tout replier
          </Button>
        </div>

        <div className="ml-auto flex items-center gap-4">
          <span className="section-label">
            {totalRoots} principale{totalRoots > 1 ? 's' : ''} · {totalChildren} ss-rub.
          </span>
          {isFiltering && (
            <span className="text-[11px] text-amber-600">Filtrage actif — glisser désactivé</span>
          )}
          {!isFiltering && (
            <span className="text-[11px] text-muted-foreground/60">Glissez pour réordonner</span>
          )}
        </div>
      </div>

      {/* ── Empty state ─────────────────────────────────── */}
      {filteredTree.length === 0 && (
        <div className="app-surface flex flex-col items-center gap-2 py-12 text-center">
          <p className="text-sm font-medium text-muted-foreground">Aucune rubrique trouvée</p>
          <p className="text-xs text-muted-foreground/60">Modifiez les filtres ou ajoutez une nouvelle rubrique</p>
        </div>
      )}

      {/* ── Tree ────────────────────────────────────────── */}
      {filteredTree.length > 0 && (
        <div className="app-surface divide-y divide-border/40 overflow-hidden p-4">
          <div className="space-y-2">
            {filteredTree.map((node) => (
              <TreeBranch
                key={node.rubrique.id}
                node={node}
                expanded={isFiltering || expanded.has(node.rubrique.id) || node.children.length === 0}
                onToggleExpand={toggleExpand}
                dragState={dragState}
                reordering={reordering || !dragEnabled}
                onEdit={onEdit}
                onToggleActive={onToggleActive}
                onDelete={onDelete}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragLeave={() => setDragState((s) => ({ ...s, overId: null, hint: null }))}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
