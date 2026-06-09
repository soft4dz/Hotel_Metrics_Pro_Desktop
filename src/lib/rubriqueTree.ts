import type { ReorderRubriqueItem, RubriqueListItem } from '@/shared/types/admin';

export type StatusFilter = 'all' | 'active' | 'inactive';
export type DropPosition = 'before' | 'after' | 'inside';

export interface RubriqueTreeNode {
  rubrique: RubriqueListItem;
  children: RubriqueTreeNode[];
}

function sortRubriques(a: RubriqueListItem, b: RubriqueListItem): number {
  return a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, 'fr');
}

export function buildRubriqueTree(rubriques: RubriqueListItem[]): RubriqueTreeNode[] {
  const roots = rubriques.filter((r) => r.parentId === null).sort(sortRubriques);
  const byParent = new Map<number, RubriqueListItem[]>();

  for (const r of rubriques) {
    if (r.parentId === null) continue;
    if (!byParent.has(r.parentId)) byParent.set(r.parentId, []);
    byParent.get(r.parentId)!.push(r);
  }
  for (const group of byParent.values()) {
    group.sort(sortRubriques);
  }

  return roots.map((root) => ({
    rubrique: root,
    children: (byParent.get(root.id) ?? []).map((child) => ({
      rubrique: child,
      children: [],
    })),
  }));
}

function matchesFilter(r: RubriqueListItem, search: string, status: StatusFilter): boolean {
  if (status === 'active' && !r.isActive) return false;
  if (status === 'inactive' && r.isActive) return false;
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return (
    r.label.toLowerCase().includes(q) ||
    r.code.toLowerCase().includes(q) ||
    (r.parentLabel?.toLowerCase().includes(q) ?? false)
  );
}

export function filterRubriqueTree(
  nodes: RubriqueTreeNode[],
  search: string,
  status: StatusFilter,
): RubriqueTreeNode[] {
  const hasFilter = search.trim().length > 0 || status !== 'all';
  if (!hasFilter) return nodes;

  const walk = (node: RubriqueTreeNode): RubriqueTreeNode | null => {
    const filteredChildren = node.children.map(walk).filter(Boolean) as RubriqueTreeNode[];
    const selfMatch = matchesFilter(node.rubrique, search, status);

    if (selfMatch) {
      return { rubrique: node.rubrique, children: node.children };
    }
    if (filteredChildren.length > 0) {
      return { rubrique: node.rubrique, children: filteredChildren };
    }
    return null;
  };

  return nodes.map(walk).filter(Boolean) as RubriqueTreeNode[];
}

export function flattenTreeNodes(nodes: RubriqueTreeNode[]): RubriqueListItem[] {
  const out: RubriqueListItem[] = [];
  for (const node of nodes) {
    out.push(node.rubrique);
    for (const child of node.children) out.push(child.rubrique);
  }
  return out;
}

export function regroupSortOrders(rubriques: RubriqueListItem[]): ReorderRubriqueItem[] {
  const items = rubriques.map((r) => ({ ...r }));
  const result: ReorderRubriqueItem[] = [];

  const roots = items.filter((r) => r.parentId === null).sort(sortRubriques);
  roots.forEach((root, rootIdx) => {
    root.sortOrder = rootIdx + 1;
    result.push({ id: root.id, sortOrder: root.sortOrder, parentId: null });

    const children = items.filter((r) => r.parentId === root.id).sort(sortRubriques);
    children.forEach((child, childIdx) => {
      child.sortOrder = childIdx + 1;
      result.push({ id: child.id, sortOrder: child.sortOrder, parentId: root.id });
    });
  });

  const knownParents = new Set(roots.map((r) => r.id));
  const orphans = items.filter(
    (r) => r.parentId !== null && !knownParents.has(r.parentId),
  );
  orphans.sort(sortRubriques).forEach((orphan, idx) => {
    orphan.sortOrder = idx + 1;
    result.push({ id: orphan.id, sortOrder: orphan.sortOrder, parentId: orphan.parentId });
  });

  return result;
}

export function computeReorder(
  rubriques: RubriqueListItem[],
  draggedId: number,
  targetId: number,
  position: DropPosition,
): ReorderRubriqueItem[] | null {
  if (draggedId === targetId) return null;

  const items = rubriques.map((r) => ({ ...r }));
  const dragged = items.find((r) => r.id === draggedId);
  const target = items.find((r) => r.id === targetId);
  if (!dragged || !target) return null;

  const draggedHasChildren = items.some((r) => r.parentId === draggedId);
  if (position === 'inside') {
    if (target.parentId !== null) return null;
    if (draggedHasChildren) return null;
    dragged.parentId = target.id;
    return regroupSortOrders(items);
  }

  const newParentId = target.parentId;
  if (draggedHasChildren && newParentId !== null) return null;
  if (newParentId !== null) {
    const parent = items.find((r) => r.id === newParentId);
    if (!parent || parent.parentId !== null) return null;
  }

  dragged.parentId = newParentId;

  const siblings = items
    .filter((r) => r.parentId === newParentId && r.id !== draggedId)
    .sort(sortRubriques);

  const targetIdx = siblings.findIndex((r) => r.id === targetId);
  const insertIdx = position === 'before' ? Math.max(0, targetIdx) : targetIdx + 1;
  siblings.splice(insertIdx, 0, dragged);

  siblings.forEach((r, idx) => {
    r.sortOrder = idx + 1;
  });

  return regroupSortOrders(items);
}

export function resolveDropPosition(
  element: HTMLElement,
  clientY: number,
  allowInside: boolean,
): DropPosition {
  const rect = element.getBoundingClientRect();
  const relY = clientY - rect.top;
  const third = rect.height / 3;

  if (allowInside && relY > third && relY < third * 2) return 'inside';
  return relY < rect.height / 2 ? 'before' : 'after';
}
