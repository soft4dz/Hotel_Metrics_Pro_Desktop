import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string | number;
  emptyMessage?: string;
  loading?: boolean;
  /** Sans bordure externe — à utiliser dans SectionBlock */
  embedded?: boolean;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage,
  loading = false,
  embedded = false,
}: DataTableProps<T>) {
  const { t } = useTranslation();
  const resolvedEmptyMessage = emptyMessage ?? t('Aucune donnée');

  if (loading) {
    return (
      <div
        className={cn(
          'p-12 text-center text-sm text-muted-foreground',
          !embedded && 'app-surface',
        )}
      >
        {t('Chargement')}…
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div
        className={cn(
          'rounded-xl border border-dashed border-border/80 bg-secondary/20 p-12 text-center text-sm text-muted-foreground',
          !embedded && 'app-surface',
        )}
      >
        {resolvedEmptyMessage}
      </div>
    );
  }

  return (
    <div className={cn('overflow-hidden', !embedded && 'app-surface')}>
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-[1]">
            <tr className="border-b border-border bg-gradient-to-r from-secondary/80 to-secondary/40">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground',
                    col.className,
                  )}
                >
                  {t(col.header)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {data.map((row) => (
              <tr
                key={keyExtractor(row)}
                className="bg-card transition-colors duration-150 hover:bg-secondary/30"
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn('px-4 py-3.5 text-foreground', col.className)}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
