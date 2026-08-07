export type LicenseEdition = 'STANDARD' | 'PRO' | 'ENTERPRISE';

export type BusinessSectorId =
  | 'hotel'
  | 'restaurant'
  | 'commerce'
  | 'services'
  | 'industrie'
  | 'port'
  | 'generic';

export const EDITIONS: LicenseEdition[] = ['STANDARD', 'PRO', 'ENTERPRISE'];

export const SECTOR_OPTIONS: Array<{
  id: BusinessSectorId;
  code: string;
  label: string;
}> = [
  { id: 'hotel', code: 'HOTL', label: 'Hôtellerie & tourisme' },
  { id: 'restaurant', code: 'REST', label: 'Restauration & production' },
  { id: 'commerce', code: 'COMM', label: 'Commerce & distribution' },
  { id: 'services', code: 'SERV', label: 'Services & BTP' },
  { id: 'industrie', code: 'INDU', label: 'Industrie & production' },
  { id: 'port', code: 'PORT', label: 'Port & marina' },
  { id: 'generic', code: 'GENR', label: 'Entreprise générique' },
];

export function sectorCodeFor(id: BusinessSectorId): string {
  return SECTOR_OPTIONS.find((s) => s.id === id)?.code ?? 'HOTL';
}

export function sectorLabelFor(id: BusinessSectorId): string {
  return SECTOR_OPTIONS.find((s) => s.id === id)?.label ?? id;
}
