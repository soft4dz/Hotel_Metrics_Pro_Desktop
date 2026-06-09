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
    <div className="app-surface flex flex-wrap items-center gap-2 px-4 py-3 shadow-card">
      <span className="section-label mr-1 shrink-0">Période</span>

      {/* Mois */}
      <select
        className="app-input h-9 min-w-0 flex-shrink-0 text-[13px]"
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
        className="app-input h-9 w-24 shrink-0 text-[13px]"
        value={filters.annee}
        onChange={(e) => onChange({ ...filters, annee: Number(e.target.value) })}
      >
        {[new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2].map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>

      <div className="mx-1 h-5 w-px shrink-0 bg-border" />

      {/* Date debut / fin */}
      <input
        type="date"
        className="app-input h-9 shrink-0 text-[13px]"
        value={filters.dateDebut ?? ''}
        onChange={(e) => onChange({ ...filters, dateDebut: e.target.value || undefined })}
      />
      <span className="shrink-0 text-xs text-muted-foreground">→</span>
      <input
        type="date"
        className="app-input h-9 shrink-0 text-[13px]"
        value={filters.dateFin ?? ''}
        onChange={(e) => onChange({ ...filters, dateFin: e.target.value || undefined })}
      />

      {showHotelFilter && (
        <>
          <div className="mx-1 h-5 w-px shrink-0 bg-border" />
          <select
            className="app-input h-9 min-w-[160px] shrink-0 text-[13px]"
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
          className="app-input h-9 min-w-[140px] shrink-0 text-[13px]"
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

      {/* Spacer */}
      <div className="flex-1" />

      <Button
        type="button"
        size="sm"
        onClick={onApply}
        className="h-9 cursor-pointer gap-1.5 transition-colors duration-200"
      >
        <Filter className="h-3.5 w-3.5" />
        Appliquer
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onReset}
        className="h-9 cursor-pointer gap-1.5 transition-colors duration-200"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Réinitialiser
      </Button>
    </div>
  );
}
