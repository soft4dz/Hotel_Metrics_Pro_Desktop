import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Database, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { REPORT_MODULE_LABELS, type ReportDataSourceMeta } from '@/shared/types/reports';

interface ReportCatalogProps {
  onSelectSource: (source: ReportDataSourceMeta) => void;
}

export function ReportCatalog({ onSelectSource }: ReportCatalogProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const { data: catalog } = useQuery({
    queryKey: ['reports-catalog'],
    queryFn: async () => unwrapIpc(await ipcClient.reports.catalog()),
  });

  const sources = catalog?.sources ?? [];
  const categories = catalog?.categories ?? [];

  const filtered = useMemo(() => {
    let list = sources;
    if (activeCategory) list = list.filter((s) => s.category === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((s) =>
        s.label.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.module.toLowerCase().includes(q),
      );
    }
    return list;
  }, [sources, activeCategory, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, ReportDataSourceMeta[]>();
    for (const s of filtered) {
      const cat = s.category ?? 'Autre';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(s);
    }
    return map;
  }, [filtered]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Rechercher une source…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setActiveCategory(null)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${!activeCategory ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
          >
            Tous ({sources.length})
          </button>
          {categories.map((cat) => {
            const count = sources.filter((s) => s.category === cat).length;
            if (!count) return null;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${activeCategory === cat ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Aucune source ne correspond à votre recherche ou vos droits.</p>
      ) : (
        Array.from(grouped.entries()).map(([category, items]) => (
          <div key={category}>
            <h3 className="mb-2 text-sm font-semibold text-muted-foreground">{category}</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((src) => (
                <Card
                  key={src.id}
                  className="cursor-pointer border-0 shadow-card transition-shadow hover:shadow-md"
                  onClick={() => onSelectSource(src)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="flex items-center gap-2 text-sm font-medium">
                        <Database className="h-4 w-4 shrink-0 text-brand-turquoise" />
                        {src.label}
                      </CardTitle>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <Badge variant="muted" className="w-fit text-[10px]">
                      {REPORT_MODULE_LABELS[src.module] ?? src.module}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-xs line-clamp-2">{src.description}</CardDescription>
                    <p className="mt-2 text-[10px] text-muted-foreground">{src.columns.length} colonnes disponibles</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
