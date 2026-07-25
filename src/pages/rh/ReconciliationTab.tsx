import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, Download, RefreshCw, X } from 'lucide-react';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import type {
  RhReconciliationJour,
  RhReconciliationPaie,
  RhTempsAlerte,
  StatutReconciliation,
} from '@/shared/types/rh';

const STATUT_BADGE: Record<StatutReconciliation, 'success' | 'warning' | 'muted' | 'danger' | 'accent'> = {
  ok: 'success',
  ecart: 'warning',
  alerte: 'danger',
  sans_planning: 'muted',
  sans_pointage: 'accent',
};

function monthRange(periode: string): { debut: string; fin: string } {
  const [y, m] = periode.split('-');
  const debut = `${y}-${m}-01`;
  const fin = new Date(Number(y), Number(m), 0).toISOString().slice(0, 10);
  return { debut, fin };
}

export function ReconciliationTab() {
  const [periode, setPeriode] = useState(() => new Date().toISOString().slice(0, 7));
  const [reconciliations, setReconciliations] = useState<RhReconciliationJour[]>([]);
  const [alertes, setAlertes] = useState<RhTempsAlerte[]>([]);
  const [paie, setPaie] = useState<RhReconciliationPaie[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');

  const range = useMemo(() => monthRange(periode), [periode]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [recs, al, p] = await Promise.all([
        ipcClient.rh.listReconciliationsTemps({ dateDebut: range.debut, dateFin: range.fin }),
        ipcClient.rh.listTempsAlertes('ouverte'),
        ipcClient.rh.getReconciliationPaie(periode),
      ]);
      setReconciliations(unwrapIpc(recs));
      setAlertes(unwrapIpc(al));
      setPaie(unwrapIpc(p));
    } finally {
      setLoading(false);
    }
  }, [periode, range.debut, range.fin]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusy('');
    }
  };

  const recColumns: Column<RhReconciliationJour>[] = [
    { key: 'date', header: 'Date', render: (r) => r.date },
    { key: 'employe', header: 'Employé', render: (r) => r.employeNom },
    { key: 'prevu', header: 'Prévu', render: (r) => `${r.heuresPrevues} h` },
    { key: 'pointe', header: 'Pointé', render: (r) => `${r.heuresPointees} h` },
    { key: 'ecart', header: 'Écart', render: (r) => `${r.ecartHeures > 0 ? '+' : ''}${r.ecartHeures} h` },
    { key: 'retard', header: 'Retard', render: (r) => (r.retardMinutes > 0 ? `${r.retardMinutes} min` : '—') },
    { key: 'statut', header: 'Statut', render: (r) => <Badge variant={STATUT_BADGE[r.statut]}>{r.statut}</Badge> },
  ];

  const paieColumns: Column<RhReconciliationPaie>[] = [
    { key: 'employe', header: 'Employé', render: (r) => r.employeNom },
    { key: 'prevu', header: 'Prévu', render: (r) => `${r.heuresPrevues} h` },
    { key: 'pointe', header: 'Pointé', render: (r) => `${r.heuresPointees} h` },
    { key: 'alertes', header: 'Jours alerte', render: (r) => String(r.joursAlerte) },
    {
      key: 'pret',
      header: 'Prêt paie',
      render: (r) => (r.pretPaie ? <Badge variant="success">Oui</Badge> : <Badge variant="warning">Non</Badge>),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <Label>Période</Label>
          <Input type="month" value={periode} onChange={(e) => setPeriode(e.target.value)} className="w-40" />
        </div>
        <Button
          disabled={!!busy}
          onClick={() => void run('reconcil', async () => {
            const res = unwrapIpc(await ipcClient.rh.runReconciliationTemps(range.debut, range.fin));
            alert(`${res.reconciliees} jour(s) réconcilié(s), ${res.alertesCrees} alerte(s) créée(s).`);
            void load();
          })}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Lancer réconciliation
        </Button>
        <Button
          variant="outline"
          disabled={!!busy}
          onClick={() => void run('export', async () => {
            const res = unwrapIpc(await ipcClient.rh.exportReconciliationCsv(range.debut, range.fin));
            if (res.filePath) alert(`Export : ${res.filePath}`);
          })}
        >
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {alertes.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 space-y-2">
          <h3 className="font-semibold flex items-center gap-2 text-amber-900">
            <AlertTriangle className="h-4 w-4" />
            Alertes ouvertes ({alertes.length}) — seuil H+15
          </h3>
          <ul className="space-y-2 text-sm">
            {alertes.slice(0, 8).map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>{a.date} — {a.employeNom} : {a.message}</span>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" title="Traiter" onClick={() => void run(`t-${a.id}`, async () => {
                    unwrapIpc(await ipcClient.rh.traiterTempsAlerte(a.id, 'traitee'));
                    void load();
                  })}>
                    <Check className="h-4 w-4 text-emerald-600" />
                  </Button>
                  <Button size="sm" variant="ghost" title="Ignorer" onClick={() => void run(`i-${a.id}`, async () => {
                    unwrapIpc(await ipcClient.rh.traiterTempsAlerte(a.id, 'ignoree'));
                    void load();
                  })}>
                    <X className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h3 className="font-semibold mb-2">Synthèse paie — {periode}</h3>
        <DataTable columns={paieColumns} data={paie} keyExtractor={(r) => r.employeId} loading={loading} emptyMessage="Lancez la réconciliation pour alimenter la synthèse paie." />
      </div>

      <div>
        <h3 className="font-semibold mb-2">Détail journalier</h3>
        <DataTable columns={recColumns} data={reconciliations} keyExtractor={(r) => r.id} loading={loading} emptyMessage="Aucune réconciliation. Cliquez sur « Lancer réconciliation »." />
      </div>
    </div>
  );
}
