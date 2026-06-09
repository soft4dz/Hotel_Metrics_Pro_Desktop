import { useCallback, useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import type { ValidationQueueItem } from '@/shared/types/portmaster';

export function ValidationsPortPage() {  const [items, setItems] = useState<ValidationQueueItem[]>([]);

  const load = useCallback(async () => {
    setItems(unwrapIpc(await ipcClient.portmaster.listValidations()));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const valider = async (item: ValidationQueueItem) => {
    unwrapIpc(
      await ipcClient.portmaster.validerEntite(item.entityType, item.entityId),
    );
    void load();
  };

  const rejeter = async (item: ValidationQueueItem) => {
    const motif = window.prompt('Motif de rejet :');
    if (!motif?.trim()) return;
    unwrapIpc(
      await ipcClient.portmaster.rejeterEntite(item.entityType, item.entityId, motif),
    );
    void load();
  };

  return (
    <div>
      <PageHeader
        title="Validations PortMaster"
        description="Contrats et factures en attente"
        backTo="/portmaster"
      />
      <div className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune validation en attente.</p>
        ) : (
          items.map((item, idx) => (
            <Card key={`${item.entityType}-${item.entityId}-${idx}`}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.entityType}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => void valider(item)}>
                    <Check className="mr-1 h-4 w-4" />
                    Valider
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void rejeter(item)}>
                    <X className="mr-1 h-4 w-4" />
                    Rejeter
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
