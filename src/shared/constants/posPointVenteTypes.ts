export const POS_POINT_VENTE_TYPE_LABELS = {
  restaurant: 'Restaurant',
  bar: 'Bar',
  room_service: 'Room service',
  autre: 'Autre',
} as const;

export type PosPointVenteType = keyof typeof POS_POINT_VENTE_TYPE_LABELS;

export const POS_FOOD_SERVICE_TYPES: PosPointVenteType[] = ['restaurant', 'bar', 'room_service', 'autre'];

export const POS_ANNEX_TYPES: PosPointVenteType[] = [];

export function isAnnexPosType(type: PosPointVenteType): boolean {
  return POS_ANNEX_TYPES.includes(type);
}
