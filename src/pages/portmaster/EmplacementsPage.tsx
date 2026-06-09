import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { EmplacementStatutBadge } from '@/components/port/EmplacementStatutBadge';
import { Card, CardContent } from '@/components/ui/card';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import type { EmplacementListItem } from '@/shared/types/portmaster';

export function EmplacementsPage() {  const [items, setItems] = useState<EmplacementListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(unwrapIpc(await ipcClient.portmaster.listEmplacements()));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const byZone = items.reduce<Record<string, EmplacementListItem[]>>((acc, e) => {
    const z = e.zone ?? 'Autre';
    if (!acc[z]) acc[z] = [];
    acc[z].push(e);
    return acc;
  }, {});

  return (
    <div>
      <PageHeader
        title="Emplacements"
        description="Postes d'amarrage et occupation"
        backTo="/portmaster"
      />

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">Chargement…</p>}

      <div className="page-shell">
        {Object.entries(byZone).map(([zone, emps]) => (
          <div key={zone}>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {zone}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {emps.map((e) => (
                <Card key={e.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-lg font-bold">{e.code}</span>
                      <EmplacementStatutBadge statut={e.statut} />
                    </div>
                    <p className="mt-1 text-sm">{e.label}</p>
                    {e.longueurMaxM != null && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Long. max {e.longueurMaxM} m
                      </p>
                    )}
                    {e.bateauNom && (
                      <p className="mt-2 rounded bg-muted/50 px-2 py-1 text-xs">
                        {e.bateauNom}
                        {e.contratNumero && (
                          <span className="text-muted-foreground"> — {e.contratNumero}</span>
                        )}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
