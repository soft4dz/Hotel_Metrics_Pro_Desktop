import { Badge } from '@/components/ui/badge';
import type { HotelAnalyseRow } from '@/shared/types/dashboard';

const config = {
  bon: { label: 'Bon', variant: 'success' as const },
  moyen: { label: 'Moyen', variant: 'warning' as const },
  critique: { label: 'Critique', variant: 'danger' as const },
};

export function StatutHotelBadge({ statut }: { statut: HotelAnalyseRow['statut'] }) {
  const c = config[statut];
  return <Badge variant={c.variant}>{c.label}</Badge>;
}
