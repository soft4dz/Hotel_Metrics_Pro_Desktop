import type { ReactNode } from 'react';
import { Calendar } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';

interface FilterToolbarProps {
  annee: number;
  mois: number;
  onAnneeChange: (y: number) => void;
  onMoisChange: (m: number) => void;
  anneeOptions?: number[];
  children?: ReactNode;
  className?: string;
}

export function FilterToolbar({
  annee,
  mois,
  onAnneeChange,
  onMoisChange,
  anneeOptions,
  children,
  className,
}: FilterToolbarProps) {
  const { t } = useTranslation();
  const years = anneeOptions ?? [new Date().getFullYear(), new Date().getFullYear() - 1];

  return (
    <div
      className={cn(
        'app-surface flex flex-wrap items-end gap-4 border-primary/10 px-4 py-3.5',
        className,
      )}
    >
      <div className="flex items-center gap-2 text-foreground">
        <Calendar className="h-4 w-4 text-primary" strokeWidth={1.75} />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t('Période')}
        </span>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-[11px] font-medium text-muted-foreground">{t('Année')}</Label>
          <select
            className="app-input min-w-[88px] cursor-pointer"
            value={annee}
            onChange={(e) => onAnneeChange(Number(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] font-medium text-muted-foreground">{t('Mois')}</Label>
          <select
            className="app-input min-w-[88px] cursor-pointer"
            value={mois}
            onChange={(e) => onMoisChange(Number(e.target.value))}
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {String(i + 1).padStart(2, '0')}
              </option>
            ))}
          </select>
        </div>
        {children}
      </div>
    </div>
  );
}
