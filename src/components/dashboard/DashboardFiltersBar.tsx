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
}

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const selectCls =
  'h-8 rounded-lg border border-border/60 bg-white px-2.5 text-[13px] text-foreground shadow-sm outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/10';

export function DashboardFiltersBar({
  filters,
  onChange,
  onApply,
  onReset,
  showHotelFilter,
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
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-white px-4 py-2.5 shadow-sm">
      {/* Icone filtre */}
      <Filter className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      <span className="mr-1 shrink-0 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
        Période
      </span>

      {/* Mois */}
      <select
        className={selectCls}
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
        className={`${selectCls} w-20`}
        value={filters.annee}
        onChange={(e) => onChange({ ...filters, annee: Number(e.target.value) })}
      >
        {[new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2].map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>

      <div className="mx-1 h-4 w-px shrink-0 bg-border/70" />

      {/* Dates */}
      <input
        type="date"
        className={selectCls}
        value={filters.dateDebut ?? ''}
        onChange={(e) => onChange({ ...filters, dateDebut: e.target.value || undefined })}
      />
      <span className="shrink-0 text-xs text-slate-400">→</span>
      <input
        type="date"
        className={selectCls}
        value={filters.dateFin ?? ''}
        onChange={(e) => onChange({ ...filters, dateFin: e.target.value || undefined })}
      />

      {showHotelFilter && (
        <>
          <div className="mx-1 h-4 w-px shrink-0 bg-border/70" />
          <select
            className={`${selectCls} min-w-[148px]`}
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
        </>
      )}

      {rubriques.length > 0 && (
        <select
          className={`${selectCls} min-w-[130px]`}
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

      <div className="flex-1" />

      <Button
        type="button"
        size="sm"
        onClick={onApply}
        className="h-8 gap-1.5 px-3 text-[13px]"
      >
        <Filter className="h-3.5 w-3.5" />
        Appliquer
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onReset}
        className="h-8 gap-1.5 px-3 text-[13px]"
      >
        <RotateCcw className="h-3 w-3" />
        Réinitialiser
      </Button>
    </div>
  );
}
