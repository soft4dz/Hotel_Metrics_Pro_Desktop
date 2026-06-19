import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import type { RhAbsence, RhEmploye, RhSoldeConges, TypeAbsence } from '@/shared/types/rh';

interface Props {
  canValidate: boolean;
}

type ViewMode = 'liste' | 'calendrier' | 'soldes';

const SOLDE_TYPES: TypeAbsence[] = ['CP', 'RTT', 'Maladie'];

export function AbsencesTab({ canValidate }: Props) {
  const [view, setView] = useState<ViewMode>('liste');
  const [items, setItems] = useState<RhAbsence[]>([]);
  const [soldes, setSoldes] = useState<RhSoldeConges[]>([]);
  const [employes, setEmployes] = useState<RhEmploye[]>([]);
  const [loading, setLoading] = useState(true);
  const [mois, setMois] = useState(() => new Date().toISOString().slice(0, 7));
  const [anneeSoldes, setAnneeSoldes] = useState(() => new Date().getFullYear());
  const [showSoldeForm, setShowSoldeForm] = useState(false);
  const [soldeForm, setSoldeForm] = useState({ employeId: '', type: 'CP' as TypeAbsence, acquis: '25', pris: '0' });

  const calendrierRange = useMemo(() => {
    const [y, m] = mois.split('-').map(Number);
    const dateDebut = `${mois}-01`;
    const dateFin = new Date(y, m, 0).toISOString().slice(0, 10);
    return { dateDebut, dateFin };
  }, [mois]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const abs = await ipcClient.rh.listAbsences(
        undefined,
        view === 'calendrier' ? calendrierRange : undefined,
      );
      const emps = await ipcClient.rh.listEmployes();
      setItems(unwrapIpc(abs));
      setEmployes(unwrapIpc(emps).filter((e) => e.statutRh === 'actif'));
      if (view === 'soldes') {
        setSoldes(unwrapIpc(await ipcClient.rh.listSoldesConges({ annee: anneeSoldes })));
      }
    } finally {
      setLoading(false);
    }
  }, [view, calendrierRange, anneeSoldes]);

  useEffect(() => {
    void load();
  }, [load]);

  const decider = async (id: number, approuve: boolean) => {
    try {
      unwrapIpc(await ipcClient.rh.deciderAbsence(id, approuve));
      void load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const handleUpsertSolde = async () => {
    if (!soldeForm.employeId) return;
    try {
      unwrapIpc(
        await ipcClient.rh.upsertSoldeConges({
          employeId: Number(soldeForm.employeId),
          annee: anneeSoldes,
          type: soldeForm.type,
          acquis: Number(soldeForm.acquis),
          pris: Number(soldeForm.pris),
        }),
      );
      setShowSoldeForm(false);
      void load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const statutBadge = (s: RhAbsence['statut']) => {
    if (s === 'approuvee') return <Badge variant="success">Approuvée</Badge>;
    if (s === 'refusee') return <Badge variant="danger">Refusée</Badge>;
    return <Badge variant="warning">Demandée</Badge>;
  };

  const typeLabel = (t: TypeAbsence) => (t === 'RTT' ? 'Récupération' : t);

  const n1Badge = (s: RhAbsence['statutN1']) => {
    if (s === 'approuve') return <Badge variant="success">N+1 OK</Badge>;
    if (s === 'refuse') return <Badge variant="danger">N+1 refusé</Badge>;
    return <Badge variant="warning">N+1 en attente</Badge>;
  };

  const columns: Column<RhAbsence>[] = [
    { key: 'employe', header: 'Employé', render: (a) => a.employeNom },
    { key: 'type', header: 'Type', render: (a) => typeLabel(a.type) },
    { key: 'periode', header: 'Période', render: (a) => `${a.dateDebut} → ${a.dateFin}` },
    { key: 'motif', header: 'Motif', render: (a) => a.motif ?? '—' },
    { key: 'n1', header: 'N+1', render: (a) => n1Badge(a.statutN1) },
    { key: 'statut', header: 'Statut RH', render: (a) => statutBadge(a.statut) },
    {
      key: 'actions',
      header: '',
      className: 'w-24 text-right',
      render: (a) =>
        canValidate && a.statut === 'demandee' && a.statutN1 === 'approuve' ? (
          <div className="flex justify-end gap-1">
            <Button size="sm" variant="ghost" onClick={() => void decider(a.id, true)}><Check className="h-4 w-4 text-emerald-600" /></Button>
            <Button size="sm" variant="ghost" onClick={() => void decider(a.id, false)}><X className="h-4 w-4 text-red-500" /></Button>
          </div>
        ) : null,
    },
  ];

  const soldeColumns: Column<RhSoldeConges>[] = [
    { key: 'employe', header: 'Employé', render: (s) => s.employeNom },
    { key: 'type', header: 'Type', render: (s) => s.type },
    { key: 'acquis', header: 'Acquis', render: (s) => s.acquis },
    { key: 'pris', header: 'Pris', render: (s) => s.pris },
    {
      key: 'reste',
      header: 'Reste',
      render: (s) => (
        <span className={s.reste < 0 ? 'text-destructive font-medium' : ''}>{s.reste}</span>
      ),
    },
  ];

  const absencesCalendrier = items.filter((a) => a.statut !== 'refusee');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(['liste', 'calendrier', 'soldes'] as const).map((v) => (
          <Button key={v} size="sm" variant={view === v ? 'default' : 'outline'} onClick={() => setView(v)}>
            {v === 'liste' ? 'Liste' : v === 'calendrier' ? 'Calendrier' : 'Soldes congés'}
          </Button>
        ))}
      </div>

      {view === 'calendrier' && (
        <div className="flex items-end gap-3">
          <div>
            <Label>Mois</Label>
            <Input type="month" value={mois} onChange={(e) => setMois(e.target.value)} className="w-44" />
          </div>
        </div>
      )}

      {view === 'soldes' && (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Label>Année</Label>
            <Input type="number" value={anneeSoldes} onChange={(e) => setAnneeSoldes(Number(e.target.value))} className="w-28" />
          </div>
          {canValidate && (
            <Button size="sm" onClick={() => setShowSoldeForm((v) => !v)}>
              <Plus className="mr-1 h-4 w-4" />
              Solde
            </Button>
          )}
        </div>
      )}

      {showSoldeForm && view === 'soldes' && (
        <div className="rounded-lg border p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label>Employé</Label>
            <select className="mt-1 w-full rounded-md border px-3 py-2 text-sm" value={soldeForm.employeId} onChange={(e) => setSoldeForm((f) => ({ ...f, employeId: e.target.value }))}>
              <option value="">—</option>
              {employes.map((e) => <option key={e.id} value={e.id}>{e.prenom} {e.nom}</option>)}
            </select>
          </div>
          <div>
            <Label>Type</Label>
            <select className="mt-1 w-full rounded-md border px-3 py-2 text-sm" value={soldeForm.type} onChange={(e) => setSoldeForm((f) => ({ ...f, type: e.target.value as TypeAbsence }))}>
              {SOLDE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div><Label>Acquis (jours)</Label><Input type="number" value={soldeForm.acquis} onChange={(e) => setSoldeForm((f) => ({ ...f, acquis: e.target.value }))} /></div>
          <div><Label>Pris (jours)</Label><Input type="number" value={soldeForm.pris} onChange={(e) => setSoldeForm((f) => ({ ...f, pris: e.target.value }))} /></div>
          <div className="sm:col-span-2 flex gap-2">
            <Button onClick={() => void handleUpsertSolde()}>Enregistrer</Button>
            <Button variant="outline" onClick={() => setShowSoldeForm(false)}>Annuler</Button>
          </div>
        </div>
      )}

      {view === 'liste' && (
        <DataTable columns={columns} data={items} keyExtractor={(a) => a.id} loading={loading} emptyMessage="Aucune absence enregistrée." />
      )}

      {view === 'calendrier' && (
        <div className="rounded-lg border divide-y">
          {loading ? (
            <p className="p-4 text-sm text-muted-foreground">Chargement…</p>
          ) : absencesCalendrier.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Aucune absence sur cette période.</p>
          ) : (
            absencesCalendrier.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <div>
                  <span className="font-medium">{a.employeNom}</span>
                  <span className="text-muted-foreground"> — {a.type}</span>
                  <p className="text-xs text-muted-foreground">{a.dateDebut} → {a.dateFin}</p>
                </div>
                {statutBadge(a.statut)}
              </div>
            ))
          )}
        </div>
      )}

      {view === 'soldes' && (
        <DataTable columns={soldeColumns} data={soldes} keyExtractor={(s) => s.id} loading={loading} emptyMessage="Aucun solde défini pour cette année." />
      )}
    </div>
  );
}
