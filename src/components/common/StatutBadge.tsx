import { Badge } from '@/components/ui/badge';
import type { RecetteStatut } from '@/shared/types/recettes';

const CONFIG: Record<
  RecetteStatut,
  { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'muted' | 'accent' }
> = {
  brouillon: { label: 'Brouillon', variant: 'muted' },
  soumis: { label: 'En attente', variant: 'warning' },
  valide: { label: 'Validé', variant: 'success' },
  refuse: { label: 'Refusé', variant: 'danger' },
};

export function StatutBadge({ statut }: { statut: RecetteStatut | string }) {
  const cfg = CONFIG[statut as RecetteStatut] ?? { label: statut, variant: 'default' as const };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}
