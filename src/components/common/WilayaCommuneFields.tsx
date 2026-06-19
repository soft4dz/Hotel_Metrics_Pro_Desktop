import { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  WILAYAS_ALGERIE,
  communesForSelect,
} from '@/shared/constants/algerieGeo';

const defaultSelectCls =
  'mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/10';

interface WilayaCommuneFieldsProps {
  wilaya: string;
  commune: string;
  onWilayaChange: (wilaya: string) => void;
  onCommuneChange: (commune: string) => void;
  /** Libellé du champ commune (ex. « Commune » ou « Ville / Commune ») */
  communeLabel?: string;
  wilayaLabel?: string;
  className?: string;
  selectClassName?: string;
  disabled?: boolean;
  required?: boolean;
}

export function WilayaCommuneFields({
  wilaya,
  commune,
  onWilayaChange,
  onCommuneChange,
  communeLabel = 'Commune',
  wilayaLabel = 'Wilaya',
  className,
  selectClassName,
  disabled = false,
  required = false,
}: WilayaCommuneFieldsProps) {
  const communes = useMemo(
    () => communesForSelect(wilaya, commune),
    [wilaya, commune],
  );

  const handleWilayaChange = (value: string) => {
    onWilayaChange(value);
    const nextCommunes = communesForSelect(value, '');
    if (commune && !nextCommunes.includes(commune)) {
      onCommuneChange('');
    }
  };

  return (
    <>
      <div className={className}>
        <Label>
          {wilayaLabel}
          {required && ' *'}
        </Label>
        <select
          className={cn(defaultSelectCls, selectClassName)}
          value={wilaya}
          disabled={disabled}
          required={required}
          onChange={(e) => handleWilayaChange(e.target.value)}
        >
          <option value="">— Sélectionner —</option>
          {WILAYAS_ALGERIE.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
      </div>
      <div className={className}>
        <Label>
          {communeLabel}
          {required && ' *'}
        </Label>
        <select
          className={cn(defaultSelectCls, selectClassName)}
          value={commune}
          disabled={disabled || !wilaya}
          required={required}
          onChange={(e) => onCommuneChange(e.target.value)}
        >
          <option value="">{wilaya ? '— Sélectionner —' : '— Choisir une wilaya —'}</option>
          {communes.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
