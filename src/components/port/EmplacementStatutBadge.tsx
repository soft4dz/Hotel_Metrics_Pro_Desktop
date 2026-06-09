import { Badge } from '@/components/ui/badge';

const styles: Record<string, 'success' | 'default' | 'warning' | 'muted'> = {
  libre: 'success',
  disponible: 'success',
  occupe: 'default',
  reserve: 'warning',
  bloque: 'muted',
  maintenance: 'warning',
};

const labels: Record<string, string> = {
  libre: 'Disponible',
  disponible: 'Disponible',
  occupe: 'Occupé',
  reserve: 'Réservé',
  bloque: 'Bloqué',
  maintenance: 'Maintenance',
};

export function EmplacementStatutBadge({ statut }: { statut: string }) {
  return (
    <Badge variant={styles[statut] ?? 'muted'}>{labels[statut] ?? statut}</Badge>
  );
}
