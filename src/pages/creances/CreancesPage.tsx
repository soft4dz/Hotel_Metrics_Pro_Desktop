import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { notify } from '@/lib/toast';
import { useHotelsList } from '@/hooks/useHotelsList';
import { formatMoney } from '@/lib/formatters';
import type { GlobalCreance, BalanceAgeeLigne } from '@/shared/types/phase2';
import { Wallet, Mail, RefreshCw } from 'lucide-react';

export default function CreancesPage() {
  const qc = useQueryClient();
  const { hotels } = useHotelsList();
  const [hotelId, setHotelId] = useState<number | undefined>();

  const { data: relancesAuto = true } = useQuery({
    queryKey: ['creances-relances-auto'],
    queryFn: async () => unwrapIpc(await ipcClient.creances.getRelancesAuto()) as boolean,
  });

  const { data: creances = [], isLoading } = useQuery({
    queryKey: ['creances', hotelId],
    queryFn: async () =>
      unwrapIpc(await ipcClient.creances.list({ hotelId })) as GlobalCreance[],
  });

  const { data: balanceAgee = [] } = useQuery({
    queryKey: ['creances-balance', hotelId],
    queryFn: async () =>
      unwrapIpc(await ipcClient.creances.balanceAgee(hotelId)) as BalanceAgeeLigne[],
  });

  const relance = useMutation({
    mutationFn: async (creanceId: number) =>
      unwrapIpc(await ipcClient.creances.relance(creanceId, { canal: 'email', objet: 'Relance paiement' })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['creances'] });
      notify.success('Relance enregistrée');
    },
    onError: () => notify.error('Erreur relance'),
  });

  const toggleRelancesAuto = useMutation({
    mutationFn: async (actif: boolean) => unwrapIpc(await ipcClient.creances.setRelancesAuto(actif)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['creances-relances-auto'] }); notify.success('Préférence enregistrée'); },
  });

  const runRelancesAuto = useMutation({
    mutationFn: async () => unwrapIpc(await ipcClient.creances.runRelancesAuto()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['creances'] }); notify.success('Relances automatiques exécutées'); },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Wallet className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Créances clients</h1>
            <p className="text-sm text-muted-foreground">Suivi et relance des impayés</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={relancesAuto} onChange={(e) => toggleRelancesAuto.mutate(e.target.checked)} />
            Relances automatiques
          </label>
          <button onClick={() => runRelancesAuto.mutate()} disabled={runRelancesAuto.isPending} className="flex items-center gap-1 text-xs border px-3 py-1.5 rounded-lg hover:bg-muted">
            <RefreshCw className="w-3 h-3" /> Exécuter relances
          </button>
        </div>
      </div>

      <select
        value={hotelId ?? ''}
        onChange={(e) => setHotelId(e.target.value ? Number(e.target.value) : undefined)}
        className="border rounded-lg px-3 py-2 text-sm bg-background"
      >
        <option value="">Tous les hôtels</option>
        {hotels.map((h) => (
          <option key={h.id} value={h.id}>{h.name}</option>
        ))}
      </select>

      {balanceAgee.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {balanceAgee.map((b) => (
            <div key={b.tranche} className="bg-card border rounded-xl p-4">
              <p className="text-xs text-muted-foreground">{b.tranche}</p>
              <p className="text-lg font-bold">{formatMoney(b.montant)}</p>
              <p className="text-xs text-muted-foreground">{b.count} créance(s)</p>
            </div>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : creances.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Wallet className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Aucune créance trouvée</p>
        </div>
      ) : (
        <div className="space-y-3">
          {creances.map((c) => (
            <div key={c.id} className="bg-card border rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="font-semibold text-sm">{c.clientLabel}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {c.referencePiece && <span>{c.referencePiece} · </span>}
                  {c.dateEcheance && <span>Échéance {c.dateEcheance} · </span>}
                  <span className="capitalize">{c.statut}</span>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right">
                  <p className="font-bold text-sm">{formatMoney(c.montantRestant)}</p>
                  <p className="text-xs text-muted-foreground">sur {formatMoney(c.montantTotal)}</p>
                </div>
                {c.montantRestant > 0 && c.statut !== 'reglee' && (
                  <button
                    onClick={() => relance.mutate(c.id)}
                    disabled={relance.isPending}
                    className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-100"
                  >
                    <Mail className="w-3 h-3" /> Relancer
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
