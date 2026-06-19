import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, FolderOpen, GripVertical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { SemanticCatalog, SemanticFieldOption } from '@/shared/types/reports';

const DRAG_TYPE = 'application/x-report-field';

export function fieldDragPayload(field: SemanticFieldOption): string {
  return JSON.stringify({ id: field.id, type: field.type });
}

export function parseFieldDrag(data: string): { id: string; type: 'dimension' | 'measure' } | null {
  try {
    const p = JSON.parse(data) as { id: string; type: 'dimension' | 'measure' };
    if (p.id && (p.type === 'dimension' || p.type === 'measure')) return p;
  } catch { /* ignore */ }
  return null;
}

export { DRAG_TYPE };

interface SemanticPackageTreeProps {
  catalog: SemanticCatalog | undefined;
  onAddField: (field: SemanticFieldOption, zone: 'rows' | 'columns' | 'measures') => void;
}

export function SemanticPackageTree({ catalog, onAddField }: SemanticPackageTreeProps) {
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({ Organisation: true, Finance: true });

  const packages = useMemo(() => {
    if (!catalog) return [];
    const cats = new Set([
      ...catalog.dimensions.map((d) => d.category),
      ...catalog.measures.map((m) => m.category),
    ]);
    return [...cats].sort().map((cat) => ({
      name: cat,
      dimensions: catalog.dimensions.filter((d) => d.category === cat),
      measures: catalog.measures.filter((m) => m.category === cat),
    }));
  }, [catalog]);

  const toggle = (cat: string) => setOpenCats((o) => ({ ...o, [cat]: !o[cat] }));

  if (!catalog) {
    return <p className="text-sm text-muted-foreground p-3">Chargement du package sémantique…</p>;
  }

  return (
    <div className="space-y-1 text-sm max-h-[70vh] overflow-y-auto pr-1">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground px-2 mb-2">
        Package métier — toutes les combinaisons sont autorisées
      </p>
      {packages.map((pkg) => (
        <div key={pkg.name} className="rounded-lg border border-muted/40 overflow-hidden">
          <button
            type="button"
            onClick={() => toggle(pkg.name)}
            className="flex w-full items-center gap-2 bg-muted/30 px-2 py-1.5 font-medium hover:bg-muted/50"
          >
            {openCats[pkg.name] ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            <FolderOpen className="h-3.5 w-3.5 text-brand-turquoise" />
            {pkg.name}
            <Badge variant="muted" className="ml-auto text-[9px]">
              {pkg.dimensions.length + pkg.measures.length}
            </Badge>
          </button>
          {openCats[pkg.name] && (
            <div className="p-1 space-y-0.5">
              {pkg.dimensions.map((field) => (
                <FieldTreeItem key={field.id} field={field} onAdd={onAddField} />
              ))}
              {pkg.measures.map((field) => (
                <FieldTreeItem key={field.id} field={field} onAdd={onAddField} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function FieldTreeItem({
  field,
  onAdd,
}: {
  field: SemanticFieldOption;
  onAdd: (field: SemanticFieldOption, zone: 'rows' | 'columns' | 'measures') => void;
}) {
  const isMeasure = field.type === 'measure';
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(DRAG_TYPE, fieldDragPayload(field));
        e.dataTransfer.effectAllowed = 'copy';
      }}
      className="group flex items-center gap-1.5 rounded px-2 py-1 hover:bg-muted/60 cursor-grab active:cursor-grabbing"
      title={field.description}
    >
      <GripVertical className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
      <Badge variant={isMeasure ? 'success' : 'muted'} className="text-[8px] shrink-0 px-1">
        {isMeasure ? 'M' : 'D'}
      </Badge>
      <span className="flex-1 truncate text-xs">{field.label}</span>
      <div className="hidden group-hover:flex gap-0.5">
        {!isMeasure && (
          <>
            <button type="button" className="text-[9px] text-brand-turquoise hover:underline" onClick={() => onAdd(field, 'rows')}>L</button>
            <button type="button" className="text-[9px] text-brand-turquoise hover:underline" onClick={() => onAdd(field, 'columns')}>C</button>
          </>
        )}
        {isMeasure && (
          <button type="button" className="text-[9px] text-emerald-600 hover:underline" onClick={() => onAdd(field, 'measures')}>+</button>
        )}
      </div>
    </div>
  );
}
