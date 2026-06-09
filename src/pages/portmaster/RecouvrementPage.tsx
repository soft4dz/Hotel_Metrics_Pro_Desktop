import { useCallback, useEffect, useState } from 'react';
import { Bell, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { formatMoney } from '@/lib/formatters';
import type { CreanceItem, RecouvrementSummary, RelanceListItem } from '@/shared/types/portmaster';

export function RecouvrementPage() {
  const [summary, setSummary] = useState<RecouvrementSummary | null>(null);
  const [creances, setCreances] = useState<CreanceItem[]>([]);
  const [relances, setRelances] = useState<RelanceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [factureId, setFactureId] = useState('');
  const [contratId, setContratId] = useState('');
  const [dateRelance, setDateRelance] = useState(new Date().toISOString().slice(0, 10));
  const [niveau, setNiveau] = useState('1');
  const [commentaire, setCommentaire] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, c, r] = await Promise.all([
        ipcClient.portmaster.recouvrementSummary(),
        ipcClient.portmaster.listCreances(),
        ipcClient.portmaster.listRelances(),
      ]);
      setSummary(unwrapIpc(s));
      setCreances(unwrapIpc(c));
      setRelances(unwrapIpc(r));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const planifierRelance = async (c: CreanceItem) => {
    setSaving(true);
    try {
      unwrapIpc(
        await ipcClient.portmaster.createRelance({
          factureId: c.kind === 'facture' ? c.id : null,
          contratId: c.kind === 'contrat' ? c.id : null,
          dateRelance,
          niveau: parseInt(niveau, 10) || 1,
          typeRelance: 'courrier',
          commentaire: `Relance créance ${c.reference}`,
        }),
      );
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleRelanceManuelle = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      unwrapIpc(
        await ipcClient.portmaster.createRelance({
          factureId: factureId ? Number(factureId) : null,
          contratId: contratId ? Number(contratId) : null,
          dateRelance,
          niveau: parseInt(niveau, 10) || 1,
          commentaire: commentaire || null,
        }),
      );
      setFactureId('');
      setContratId('');
      setCommentaire('');
      await load();
    } finally {
      setSaving(false);
    }
  };

  const creanceColumns: Column<CreanceItem>[] = [
    { key: 'ref', header: 'Réf.', render: (c) => c.reference },
    { key: 'kind', header: 'Type', render: (c) => (c.kind === 'facture' ? 'Facture' : 'Contrat') },
    { key: 'client', header: 'Client', render: (c) => c.clientName },
    { key: 'reste', header: 'Reste', render: (c) => formatMoney(c.reste) },
    { key: 'retard', header: 'Retard (j)', render: (c) => c.joursRetard },
    {
      key: 'tranche',
      header: 'Tranche',
      render: (c) => (
        <Badge variant={c.tranche === '60+' ? 'danger' : 'muted'}>{c.tranche} j</Badge>
      ),
    },
    {
      key: 'act',
      header: '',
      render: (c) => (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={saving}
          onClick={() => void planifierRelance(c)}
        >
          Relancer
        </Button>
      ),
    },
  ];

  const relanceColumns: Column<RelanceListItem>[] = [
    { key: 'date', header: 'Date', render: (r) => r.dateRelance },
    { key: 'client', header: 'Client', render: (r) => r.clientName },
    { key: 'ref', header: 'Réf.', render: (r) => r.reference },
    { key: 'niveau', header: 'Niveau', render: (r) => r.niveau },
    { key: 'statut', header: 'Statut', render: (r) => r.statut },
    {
      key: 'act',
      header: '',
      render: (r) =>
        r.statut === 'planifiee' ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={saving}
            onClick={async () => {
              unwrapIpc(await ipcClient.portmaster.marquerRelanceEnvoyee(r.id));
              await load();
            }}
          >
            Marquer envoyée
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="page-shell">
      <PageHeader
        title="Recouvrement"
        description="Créances, ancienneté et relances clients"
      />

      {summary && (
        <div className="grid gap-3 sm:grid-cols-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Total créances</p>
              <p className="text-xl font-semibold">{formatMoney(summary.totalCreances)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">0–30 jours</p>
              <p className="text-lg font-medium">{formatMoney(summary.tranche030)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">31–60 jours</p>
              <p className="text-lg font-medium text-brand-warning">{formatMoney(summary.tranche3160)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">60+ jours</p>
              <p className="text-lg font-medium text-destructive">{formatMoney(summary.tranche60plus)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4" />
            Planifier une relance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => void handleRelanceManuelle(e)}
            className="flex flex-wrap items-end gap-3"
          >
            <div className="space-y-1">
              <Label className="text-xs">ID facture</Label>
              <Input value={factureId} onChange={(e) => setFactureId(e.target.value)} placeholder="opt." />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">ID contrat</Label>
              <Input value={contratId} onChange={(e) => setContratId(e.target.value)} placeholder="opt." />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date</Label>
              <Input type="date" value={dateRelance} onChange={(e) => setDateRelance(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Niveau</Label>
              <Input type="number" min={1} max={3} value={niveau} onChange={(e) => setNiveau(e.target.value)} />
            </div>
            <div className="min-w-[200px] space-y-1">
              <Label className="text-xs">Commentaire</Label>
              <Input value={commentaire} onChange={(e) => setCommentaire(e.target.value)} />
            </div>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Créer
            </Button>
          </form>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : (
        <>
          <div>
            <h3 className="mb-2 text-sm font-medium">Créances ouvertes</h3>
            <DataTable columns={creanceColumns} data={creances} keyExtractor={(c) => `${c.kind}-${c.id}`} />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-medium">Historique relances</h3>
            <DataTable columns={relanceColumns} data={relances} keyExtractor={(r) => String(r.id)} />
          </div>
        </>
      )}
    </div>
  );
}
