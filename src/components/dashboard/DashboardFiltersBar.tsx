import { Filter, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useHotelsList } from '@/hooks/useHotelsList';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { useEffect, useState } from 'react';
import type { DashboardFilters } from '@/shared/types/dashboard';

interface DashboardFiltersBarProps {
  filters: DashboardFilters;
  onChange: (f: DashboardFilters) => void;
  onApply: () => void;
  onReset: () => void;
  showHotelFilter: boolean;
  hideRubriqueFilter?: boolean;
}

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const selectCls =
  'h-9 rounded-lg border border-border/60 bg-card px-2.5 text-[13px] text-foreground shadow-sm outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/10 sm:h-8';

export function DashboardFiltersBar({
  filters,
  onChange,
  onApply,
  onReset,
  showHotelFilter,
  hideRubriqueFilter,
}: DashboardFiltersBarProps) {
  const { hotels } = useHotelsList();
  const [rubriques, setRubriques] = useState<Array<{ id: number; label: string }>>([]);

  useEffect(() => {
    void (async () => {
      try {
        const rows = unwrapIpc(await ipcClient.recettes.rubriques());
        setRubriques(rows.map((r) => ({ id: r.id, label: r.label })));
      } catch {
        setRubriques([]);
      }
    })();
  }, []);

  return (
    <div className="flex w-full flex-col gap-2 rounded-lg border border-border/60 bg-card px-2.5 py-2 shadow-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-2 sm:px-3 sm:py-2">
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="shrink-0 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          Période
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-2">
      <select
        className={`${selectCls} w-full sm:w-auto`}
        value={filters.mois ?? ''}
        onChange={(e) =>
          onChange({ ...filters, mois: e.target.value ? Number(e.target.value) : undefined })
        }
      >
        <option value="">Tous les mois</option>
        {MONTHS.map((m, i) => (
          <option key={i + 1} value={i + 1}>{m}</option>
        ))}
      </select>

      {/* Année */}
      <select
        className={`${selectCls} w-full sm:w-20`}
        value={filters.annee}
        onChange={(e) => onChange({ ...filters, annee: Number(e.target.value) })}
      >
        {[new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2].map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>

      <div className="col-span-2 flex items-center gap-2 sm:col-span-1 sm:contents">
      <input
        type="date"
        className={`${selectCls} min-w-0 flex-1 sm:flex-none`}
        value={filters.dateDebut ?? ''}
        onChange={(e) => onChange({ ...filters, dateDebut: e.target.value || undefined })}
      />
      <span className="shrink-0 text-xs text-muted-foreground">→</span>
      <input
        type="date"
        className={`${selectCls} min-w-0 flex-1 sm:flex-none`}
        value={filters.dateFin ?? ''}
        onChange={(e) => onChange({ ...filters, dateFin: e.target.value || undefined })}
      />
      </div>

      {showHotelFilter && (
        <select
          className={`${selectCls} col-span-2 w-full sm:col-span-1 sm:min-w-[148px] sm:w-auto`}
            value={filters.hotelId ?? ''}
            onChange={(e) =>
              onChange({ ...filters, hotelId: e.target.value ? Number(e.target.value) : undefined })
            }
          >
            <option value="">Toutes les unités</option>
            {hotels.map((h) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
      )}

      {!hideRubriqueFilter && rubriques.length > 0 && (
        <select
          className={`${selectCls} col-span-2 w-full sm:col-span-1 sm:min-w-[130px] sm:w-auto`}
          value={filters.rubriqueId ?? ''}
          onChange={(e) =>
            onChange({ ...filters, rubriqueId: e.target.value ? Number(e.target.value) : undefined })
          }
        >
          <option value="">Toutes rubriques</option>
          {rubriques.map((r) => (
            <option key={r.id} value={r.id}>{r.label}</option>
          ))}
        </select>
      )}

      </div>

      <div className="flex w-full gap-2 sm:ml-auto sm:w-auto">
      <Button
        type="button"
        size="sm"
        onClick={onApply}
        className="h-9 flex-1 gap-1.5 px-3 text-[13px] sm:h-8 sm:flex-none"
      >
        <Filter className="h-3.5 w-3.5" />
        Appliquer
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onReset}
        className="h-9 flex-1 gap-1.5 px-3 text-[13px] sm:h-8 sm:flex-none"
      >
        <RotateCcw className="h-3 w-3" />
        Réinitialiser
      </Button>
      </div>
    </div>
  );
}
