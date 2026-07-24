import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { notify } from '@/lib/toast';
import { useHotelsList } from '@/hooks/useHotelsList';
import { formatMoney } from '@/lib/formatters';
import type { DailyClosure } from '@/shared/types/phase2';
import { CalendarCheck } from 'lucide-react';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function ClotureJournalierePage() {
  const qc = useQueryClient();
  const { hotels, defaultHotelId } = useHotelsList();
  const [hotelId, setHotelId] = useState<number>(defaultHotelId || 0);
  const [dateJournal, setDateJournal] = useState(todayIso());
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data: closures = [], isLoading } = useQuery({
    queryKey: ['clotures', hotelId],
    queryFn: async () =>
      unwrapIpc(await ipcClient.cloture.list(hotelId, undefined, undefined)) as DailyClosure[],
    enabled: hotelId > 0,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['clotures'] });

  const create = useMutation({
    mutationFn: async () => unwrapIpc(await ipcClient.cloture.create(hotelId, dateJournal)),
    onSuccess: (data) => {
      invalidate();
      setSelectedId((data as DailyClosure).id);
      notify.success('Clôture créée');
    },
    onError: () => notify.error('Erreur création clôture'),
  });

  const prefill = useMutation({
    mutationFn: async () => unwrapIpc(await ipcClient.cloture.prefill(selectedId!)),
    onSuccess: () => { invalidate(); notify.success('Préremplissage effectué'); },
    onError: () => notify.error('Erreur préremplissage'),
  });

  const submit = useMutation({
    mutationFn: async () => unwrapIpc(await ipcClient.cloture.submit(selectedId!)),
    onSuccess: () => { invalidate(); notify.success('Clôture soumise'); },
    onError: () => notify.error('Erreur soumission'),
  });

  const validateUnit = useMutation({
    mutationFn: async () => unwrapIpc(await ipcClient.cloture.validateUnit(selectedId!)),
    onSuccess: () => { invalidate(); notify.success('Validation unité'); },
    onError: () => notify.error('Erreur validation unité'),
  });

  const validateDec = useMutation({
    mutationFn: async () => unwrapIpc(await ipcClient.cloture.validateDec(selectedId!)),
    onSuccess: () => { invalidate(); notify.success('Validation DEC'); },
    onError: () => notify.error('Erreur validation DEC'),
  });

  const close = useMutation({
    mutationFn: async () => unwrapIpc(await ipcClient.cloture.close(selectedId!)),
    onSuccess: () => { invalidate(); notify.success('Clôture finalisée'); },
    onError: () => notify.error('Erreur clôture'),
  });

  const selected = closures.find((c) => c.id === selectedId);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <CalendarCheck className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Clôture journalière</h1>
          <p className="text-sm text-muted-foreground">Création et validation des clôtures quotidiennes</p>
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
          Créer clôture
        </button>
      </div>

      {selectedId && (
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Préremplir', mut: prefill },
            { label: 'Soumettre', mut: submit },
            { label: 'Valider unité', mut: validateUnit },
            { label: 'Valider DEC', mut: validateDec },
            { label: 'Clôturer', mut: close },
          ].map(({ label, mut }) => (
            <button
              key={label}
              onClick={() => mut.mutate()}
              disabled={mut.isPending}
              className="border rounded-lg px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="bg-card border rounded-xl p-4 text-sm grid grid-cols-2 md:grid-cols-4 gap-3">
          <div><span className="text-muted-foreground">CA déclaré</span><p className="font-semibold">{formatMoney(selected.caDeclare)}</p></div>
          <div><span className="text-muted-foreground">Encaissé</span><p className="font-semibold">{formatMoney(selected.montantEncaisse)}</p></div>
          <div><span className="text-muted-foreground">Créances</span><p className="font-semibold">{formatMoney(selected.montantCreance)}</p></div>
          <div><span className="text-muted-foreground">Écart</span><p className="font-semibold">{formatMoney(selected.ecart)}</p></div>
        </div>
      )}

      {isLoading ? (
        <div className="h-40 rounded-xl bg-muted animate-pulse" />
      ) : (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold">Historique des clôtures</h2>
          {closures.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune clôture enregistrée.</p>
          ) : (
            closures.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`bg-card border rounded-xl p-4 flex justify-between cursor-pointer ${selectedId === c.id ? 'ring-2 ring-primary' : ''}`}
              >
                <div>
                  <span className="font-medium text-sm">{c.dateJournal}</span>
                  <span className="text-xs text-muted-foreground ml-2">· {c.hotelName}</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground mr-2">{c.statut}</span>
                  <span>{formatMoney(c.caDeclare)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
