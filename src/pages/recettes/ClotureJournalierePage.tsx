import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { notify } from '@/lib/toast';
import { useHotelsList } from '@/hooks/useHotelsList';
import { formatMoney } from '@/lib/formatters';
import type { DailyClosure, HotelBusinessDate, NightAuditReport } from '@/shared/types/phase2';
import type { PosHotelClosureStatus } from '@/shared/types/pos';
import { CalendarCheck, AlertTriangle, CheckCircle2, Moon, RotateCcw, ShieldCheck, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function mutationError(error: Error) {
  return error.message || 'Une erreur est survenue';
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

  const { data: posStatus } = useQuery({
    queryKey: ['cloture-pos-status', hotelId, dateJournal],
    queryFn: async () =>
      unwrapIpc(await ipcClient.cloture.getPosStatus(hotelId, dateJournal)) as PosHotelClosureStatus,
    enabled: hotelId > 0,
  });

  const { data: businessDate } = useQuery({
    queryKey: ['hotel-business-date', hotelId],
    queryFn: async () =>
      unwrapIpc(await ipcClient.cloture.getBusinessDate(hotelId)) as HotelBusinessDate,
    enabled: hotelId > 0,
  });

  const { data: nightAudit } = useQuery({
    queryKey: ['night-audit', selectedId],
    queryFn: async () =>
      unwrapIpc(await ipcClient.cloture.getNightAudit(selectedId!)) as NightAuditReport | null,
    enabled: selectedId != null,
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['clotures'] });
    void qc.invalidateQueries({ queryKey: ['night-audit'] });
    void qc.invalidateQueries({ queryKey: ['hotel-business-date'] });
  };

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
    onSuccess: () => { invalidate(); notify.success('Night Audit clôturé et date hôtelière avancée'); },
    onError: (error: Error) => notify.error(mutationError(error)),
  });

  const runNightAudit = useMutation({
    mutationFn: async () => unwrapIpc(await ipcClient.cloture.runNightAudit(selectedId!)),
    onSuccess: (report) => {
      invalidate();
      const result = report as NightAuditReport;
      if (result.blockersCount > 0) notify.error(`${result.blockersCount} blocage(s) détecté(s)`);
      else notify.success(`Contrôle terminé${result.warningsCount ? ` — ${result.warningsCount} avertissement(s)` : ''}`);
    },
    onError: (error: Error) => notify.error(mutationError(error)),
  });

  const reopenNightAudit = useMutation({
    mutationFn: async (motif: string) => unwrapIpc(await ipcClient.cloture.reopenNightAudit(selectedId!, motif)),
    onSuccess: () => { invalidate(); notify.success('Journée réouverte'); },
    onError: (error: Error) => notify.error(mutationError(error)),
  });

  const selected = closures.find((c) => c.id === selectedId);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <CalendarCheck className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Clôture journalière</h1>
          <p className="text-sm text-muted-foreground">Ordre requis : clôtures POS → préremplir → soumettre → valider → clôturer</p>
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
        {businessDate && (
          <Badge variant={dateJournal === businessDate.currentBusinessDate ? 'success' : 'warning'} className="self-center py-1.5 px-3">
            Date hôtelière : {businessDate.currentBusinessDate}
          </Badge>
        )}
      </div>

      {businessDate && dateJournal !== businessDate.currentBusinessDate && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-3 text-sm flex gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          La séquence Night Audit attend le {businessDate.currentBusinessDate}. La clôture du {dateJournal} sera bloquée.
        </div>
      )}

      {posStatus?.required && (
        <div className={`rounded-xl border p-4 text-sm space-y-2 ${posStatus.allClosed ? 'border-green-300 bg-green-50 dark:bg-green-950/20' : 'border-amber-300 bg-amber-50 dark:bg-amber-950/20'}`}>
          <div className="flex items-center gap-2 font-medium">
            {posStatus.allClosed ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <AlertTriangle className="w-4 h-4 text-amber-600" />}
            Statut POS — {dateJournal}
          </div>
          <ul className="space-y-1">
            {posStatus.points.map((p) => (
              <li key={p.pointVenteId} className="flex justify-between gap-2">
                <span>{p.nom}</span>
                <Badge variant={p.closed && p.openSessions === 0 ? 'success' : 'danger'}>
                  {p.closed ? (p.openSessions > 0 ? 'Session ouverte' : 'Clôturé') : 'Non clôturé'}
                </Badge>
              </li>
            ))}
          </ul>
          {!posStatus.allClosed && (
            <p className="text-xs text-muted-foreground">La soumission / clôture hôtel est bloquée tant que tous les points de vente ne sont pas clôturés.</p>
          )}
        </div>
      )}

      {selectedId && (
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Préremplir', mut: prefill },
            { label: 'Soumettre', mut: submit },
            { label: 'Valider unité', mut: validateUnit },
            { label: 'Valider DEC', mut: validateDec },
            { label: 'Clôturer Night Audit', mut: close },
          ].map(({ label, mut }) => (
            <button
              key={label}
              onClick={() => mut.mutate()}
              disabled={mut.isPending || (label === 'Clôturer Night Audit' && Boolean(nightAudit?.blockersCount))}
              className="border rounded-lg px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => runNightAudit.mutate()}
            disabled={runNightAudit.isPending || selected?.statut === 'cloture'}
            className="border border-primary text-primary rounded-lg px-3 py-1.5 text-sm hover:bg-primary/5 disabled:opacity-50 flex items-center gap-1.5"
          >
            <ShieldCheck className="w-4 h-4" /> Contrôler Night Audit
          </button>
          {selected?.statut === 'cloture' && (
            <button
              onClick={() => {
                const motif = window.prompt('Motif obligatoire de réouverture :')?.trim();
                if (motif) reopenNightAudit.mutate(motif);
              }}
              disabled={reopenNightAudit.isPending}
              className="border border-amber-500 text-amber-700 rounded-lg px-3 py-1.5 text-sm hover:bg-amber-50 disabled:opacity-50 flex items-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" /> Réouvrir
            </button>
          )}
        </div>
      )}

      {selected && (
        <div className="bg-card border rounded-xl p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Moon className="w-5 h-5 text-primary" />
              <div>
                <h2 className="font-semibold">Night Audit — {selected.dateJournal}</h2>
                <p className="text-xs text-muted-foreground">Arrivées, départs, folios, police, POS, chambres et caisse</p>
              </div>
            </div>
            {nightAudit ? (
              <div className="flex gap-2">
                <Badge variant={nightAudit.blockersCount ? 'danger' : 'success'}>{nightAudit.blockersCount} blocage(s)</Badge>
                <Badge variant={nightAudit.warningsCount ? 'warning' : 'muted'}>{nightAudit.warningsCount} avertissement(s)</Badge>
                <Badge variant="muted">{nightAudit.statut}</Badge>
              </div>
            ) : (
              <Badge variant="muted">Non contrôlé</Badge>
            )}
          </div>

          {nightAudit && (
            <>
              <div className="grid md:grid-cols-2 gap-2">
                {nightAudit.controls.map((item) => (
                  <div key={item.code} className={`rounded-lg border p-3 text-sm ${item.statut === 'failed' ? 'border-red-200 bg-red-50/60 dark:bg-red-950/20' : ''}`}>
                    <div className="flex items-center gap-2 font-medium">
                      {item.statut === 'ok'
                        ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                        : <XCircle className={`w-4 h-4 ${item.severity === 'blocking' ? 'text-red-600' : 'text-amber-600'}`} />}
                      <span>{item.libelle}</span>
                      {item.statut === 'failed' && <Badge variant={item.severity === 'blocking' ? 'danger' : 'warning'}>{item.occurrences}</Badge>}
                    </div>
                    {item.details.length > 0 && (
                      <ul className="mt-2 ml-6 list-disc text-xs text-muted-foreground space-y-1">
                        {item.details.slice(0, 5).map((detail) => <li key={detail}>{detail}</li>)}
                        {item.details.length > 5 && <li>+ {item.details.length - 5} autre(s)</li>}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
              {nightAudit.statut === 'cloture' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 border-t pt-3 text-sm">
                  <div><span className="text-muted-foreground">Chambres occupées</span><p className="font-semibold">{nightAudit.occupiedRooms}</p></div>
                  <div><span className="text-muted-foreground">Nuitées comptabilisées</span><p className="font-semibold">{nightAudit.roomChargesPosted}</p></div>
                  <div><span className="text-muted-foreground">Revenu hébergement</span><p className="font-semibold">{formatMoney(nightAudit.roomRevenue)}</p></div>
                  <div><span className="text-muted-foreground">Taxe de séjour</span><p className="font-semibold">{formatMoney(nightAudit.stayTaxTotal)}</p></div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {selected && (
        <div className="space-y-3">
          <div className="bg-card border rounded-xl p-4 text-sm grid grid-cols-2 md:grid-cols-4 gap-3">
            <div><span className="text-muted-foreground">CA déclaré</span><p className="font-semibold">{formatMoney(selected.caDeclare)}</p></div>
            <div><span className="text-muted-foreground">Encaissé</span><p className="font-semibold">{formatMoney(selected.encaissementsTotal ?? selected.montantEncaisse ?? 0)}</p></div>
            <div><span className="text-muted-foreground">Créances</span><p className="font-semibold">{formatMoney(selected.creancesTotal ?? selected.montantCreance ?? 0)}</p></div>
            <div><span className="text-muted-foreground">Écart</span><p className="font-semibold">{formatMoney(selected.ecartCaisse ?? selected.ecart ?? 0)}</p></div>
          </div>
          {(selected.items?.length ?? 0) > 0 && (
            <div className="border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50"><tr><th className="p-2 text-left">Rubrique</th><th>Montant</th><th>Source</th><th>Obs.</th></tr></thead>
                <tbody>
                  {selected.items!.map((i) => (
                    <tr key={i.id} className="border-t">
                      <td className="p-2">{i.rubrique}</td>
                      <td>{typeof i.montant === 'number' ? formatMoney(i.montant) : i.montant}</td>
                      <td className="text-muted-foreground">{i.sourceModule ?? '—'}</td>
                      <td className="text-xs text-muted-foreground">{i.observation ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
