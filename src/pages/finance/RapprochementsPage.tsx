import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { notify } from '@/lib/toast';
import { useHotelsList } from '@/hooks/useHotelsList';
import { formatMoney } from '@/lib/formatters';
import type { FinanceReconciliation } from '@/shared/types/phase2';
import { Scale } from 'lucide-react';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function RapprochementsPage() {
  const qc = useQueryClient();
  const { hotels, defaultHotelId } = useHotelsList();
  const [hotelId, setHotelId] = useState<number>(defaultHotelId || 0);
  const [dateJournal, setDateJournal] = useState(todayIso());
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [justification, setJustification] = useState('');

  const { data: reconciliations = [], isLoading } = useQuery({
    queryKey: ['reconciliations', hotelId],
    queryFn: async () =>
      unwrapIpc(await ipcClient.reconciliation.list(hotelId, undefined, undefined)) as FinanceReconciliation[],
    enabled: hotelId > 0,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['reconciliations'] });

  const create = useMutation({
    mutationFn: async () => unwrapIpc(await ipcClient.reconciliation.create(hotelId, dateJournal)),
    onSuccess: (data) => {
      invalidate();
      setSelectedId((data as FinanceReconciliation).id);
      notify.success('Rapprochement créé');
    },
    onError: () => notify.error('Erreur création rapprochement'),
  });

  const prefill = useMutation({
    mutationFn: async () => unwrapIpc(await ipcClient.reconciliation.prefill(selectedId!)),
    onSuccess: () => { invalidate(); notify.success('Préremplissage effectué'); },
    onError: () => notify.error('Erreur préremplissage'),
  });

  const justify = useMutation({
    mutationFn: async () => unwrapIpc(await ipcClient.reconciliation.justify(selectedId!, justification)),
    onSuccess: () => { invalidate(); notify.success('Écart justifié'); },
    onError: () => notify.error('Erreur justification'),
  });

  const validate = useMutation({
    mutationFn: async () => unwrapIpc(await ipcClient.reconciliation.validate(selectedId!)),
    onSuccess: () => { invalidate(); notify.success('Rapprochement validé'); },
    onError: () => notify.error('Erreur validation'),
  });

  const selected = reconciliations.find((r) => r.id === selectedId);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Scale className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Rapprochements financiers</h1>
          <p className="text-sm text-muted-foreground">Contrôle caisse et modes de paiement</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          value={hotelId || ''}
          onChange={(e) => setHotelId(Number(e.target.value))}
          className="border rounded-lg px-3 py-2 text-sm bg-background"
        >
          <option value="">Sélectionner un hôtel</option>
          {hotels.map((h) => (
            <option key={h.id} value={h.id}>{h.name}</option>
          ))}
        </select>
        <input
          type="date"
          value={dateJournal}
          onChange={(e) => setDateJournal(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm bg-background"
        />
        <button
          onClick={() => create.mutate()}
          disabled={!hotelId || create.isPending}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          Créer rapprochement
        </button>
      </div>

      {selectedId && (
        <div className="bg-card border rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => prefill.mutate()} disabled={prefill.isPending} className="border rounded-lg px-3 py-1.5 text-sm hover:bg-muted">
              Préremplir
            </button>
            <button onClick={() => validate.mutate()} disabled={validate.isPending} className="border rounded-lg px-3 py-1.5 text-sm hover:bg-muted">
              Valider
            </button>
          </div>
          <textarea
            placeholder="Justification de l'écart"
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            rows={2}
            className="w-full border rounded-lg px-3 py-2 text-sm bg-background resize-none"
          />
          <button
            onClick={() => justify.mutate()}
            disabled={!justification.trim() || justify.isPending}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm hover:opacity-90 disabled:opacity-50"
          >
            Justifier l'écart
          </button>
        </div>
      )}

      {selected && (
        <div className="bg-card border rounded-xl p-4 text-sm grid grid-cols-2 md:grid-cols-4 gap-3">
          <div><span className="text-muted-foreground">CA déclaré</span><p className="font-semibold">{formatMoney(selected.caDeclare)}</p></div>
          <div><span className="text-muted-foreground">Total rapproché</span><p className="font-semibold">{formatMoney(selected.totalRapproche)}</p></div>
          <div><span className="text-muted-foreground">Écart</span><p className="font-semibold">{formatMoney(selected.ecart)}</p></div>
          <div><span className="text-muted-foreground">Statut</span><p className="font-semibold">{selected.statut}</p></div>
        </div>
      )}

      {isLoading ? (
        <div className="h-40 rounded-xl bg-muted animate-pulse" />
      ) : (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold">Liste des rapprochements</h2>
          {reconciliations.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun rapprochement.</p>
          ) : (
            reconciliations.map((r) => (
              <div
                key={r.id}
                onClick={() => setSelectedId(r.id)}
                className={`bg-card border rounded-xl p-4 flex justify-between cursor-pointer ${selectedId === r.id ? 'ring-2 ring-primary' : ''}`}
              >
                <div>
                  <span className="font-medium text-sm">{r.dateJournal}</span>
                  <span className="text-xs text-muted-foreground ml-2">· {r.hotelName}</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground mr-2">{r.statut}</span>
                  <span className={r.ecart !== 0 ? 'text-orange-600' : ''}>{formatMoney(r.ecart)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
