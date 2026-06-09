import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { formatMoney } from '@/lib/formatters';
import type { TarifDto, TarifListItem } from '@/shared/types/portmaster';

export function TarifsPage() {  const [tarifs, setTarifs] = useState<TarifListItem[]>([]);
  const [detail, setDetail] = useState<TarifDto | null>(null);
  const [simLongueur, setSimLongueur] = useState('12');
  const [simResult, setSimResult] = useState('');

  useEffect(() => {
    void ipcClient.portmaster.listTarifs().then((r) => {
      if (r.ok && r.data) setTarifs(r.data);
    });
  }, []);

  const loadDetail = async (id: number) => {
    setDetail(unwrapIpc(await ipcClient.portmaster.getTarif(id)));
  };

  const simuler = async (tarifId: number) => {
    const r = unwrapIpc(
      await ipcClient.portmaster.simulerTarif(tarifId, parseFloat(simLongueur) || 0),
    );
    setSimResult(`${formatMoney(r.montant)} (${r.tranche})`);
  };

  return (
    <div>
      <PageHeader
        title="Tarification portuaire"
        description="Grilles par longueur — séparées des contrats"
        backTo="/portmaster"
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Tarifs actifs</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {tarifs.map((t) => (
              <button
                key={t.id}
                type="button"
                className="block w-full rounded-md border px-3 py-2 text-left text-sm hover:bg-muted/50"
                onClick={() => void loadDetail(t.id)}
              >
                <span className="font-mono font-semibold">{t.code}</span> — {t.label}
              </button>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Tranches</CardTitle></CardHeader>
          <CardContent>
            {detail ? (
              <>
                <p className="mb-3 text-sm font-medium">{detail.label}</p>
                <ul className="space-y-1 text-sm">
                  {detail.tranches.map((tr, i) => (
                    <li key={i}>
                      {tr.longueurMinM}–{tr.longueurMaxM ?? '∞'} m : {formatMoney(tr.montantPeriode)}
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex gap-2">
                  <input
                    className="h-9 w-20 rounded border px-2 text-sm"
                    value={simLongueur}
                    onChange={(e) => setSimLongueur(e.target.value)}
                  />
                  <button
                    type="button"
                    className="rounded bg-brand-night px-3 py-1 text-sm text-white"
                    onClick={() => void simuler(detail.id)}
                  >
                    Simuler
                  </button>
                </div>
                {simResult && <p className="mt-2 text-sm font-semibold">{simResult}</p>}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Sélectionnez un tarif.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
