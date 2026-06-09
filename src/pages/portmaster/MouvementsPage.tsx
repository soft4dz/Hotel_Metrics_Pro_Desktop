import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import type { BateauOption, EmplacementOption, MouvementListItem } from '@/shared/types/portmaster';

const TYPE_LABELS: Record<string, string> = {
  arrivee: 'Arrivée',
  depart: 'Départ',
  changement_emplacement: 'Changement d\'emplacement',
};

export function MouvementsPage() {
  const [items, setItems] = useState<MouvementListItem[]>([]);
  const [bateaux, setBateaux] = useState<BateauOption[]>([]);
  const [emplacements, setEmplacements] = useState<EmplacementOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  const [bateauId, setBateauId] = useState(0);
  const [typeMouvement, setTypeMouvement] = useState<'arrivee' | 'depart' | 'changement_emplacement'>('arrivee');
  const [fromId, setFromId] = useState(0);
  const [toId, setToId] = useState(0);
  const [dateMouvement, setDateMouvement] = useState(new Date().toISOString().slice(0, 10));
  const [motif, setMotif] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, b, e] = await Promise.all([
        ipcClient.portmaster.listMouvements(),
        ipcClient.portmaster.bateauxOptions(),
        ipcClient.portmaster.listEmplacementsLibres(),
      ]);
      setItems(unwrapIpc(m));
      setBateaux(unwrapIpc(b));
      setEmplacements(unwrapIpc(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bateauId) {
      setError('Sélectionnez un bateau.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      unwrapIpc(
        await ipcClient.portmaster.createMouvement({
          bateauId,
          typeMouvement,
          emplacementFromId: fromId || null,
          emplacementToId: toId || null,
          dateMouvement,
          motif: motif || null,
        }),
      );
      setShowForm(false);
      setMotif('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<MouvementListItem>[] = [
    { key: 'date', header: 'Date', render: (m) => m.dateMouvement },
    { key: 'bateau', header: 'Bateau', render: (m) => m.bateauNom },
    { key: 'type', header: 'Type', render: (m) => TYPE_LABELS[m.typeMouvement] ?? m.typeMouvement },
    {
      key: 'from',
      header: 'De',
      render: (m) => m.emplacementFromCode ?? '—',
    },
    {
      key: 'to',
      header: 'Vers',
      render: (m) => m.emplacementToCode ?? '—',
    },
    { key: 'motif', header: 'Motif', render: (m) => m.motif ?? '—' },
  ];

  return (
    <div className="page-shell">
      <PageHeader
        title="Mouvements bateaux"
        description="Arrivées, départs et changements d'emplacement"
        action={
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau mouvement
          </Button>
        }
      />

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Enregistrer un mouvement</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={(ev) => void handleCreate(ev)} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Bateau *</Label>
                <select
                  className="flex h-10 w-full rounded-md border px-3 text-sm"
                  value={bateauId || ''}
                  onChange={(ev) => setBateauId(Number(ev.target.value))}
                  required
                >
                  <option value="">—</option>
                  {bateaux.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nom}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Type *</Label>
                <select
                  className="flex h-10 w-full rounded-md border px-3 text-sm"
                  value={typeMouvement}
                  onChange={(ev) =>
                    setTypeMouvement(ev.target.value as typeof typeMouvement)
                  }
                >
                  <option value="arrivee">Arrivée</option>
                  <option value="depart">Départ</option>
                  <option value="changement_emplacement">Changement emplacement</option>
                </select>
              </div>
              {(typeMouvement === 'depart' || typeMouvement === 'changement_emplacement') && (
                <div className="space-y-2">
                  <Label>Emplacement départ</Label>
                  <select
                    className="flex h-10 w-full rounded-md border px-3 text-sm"
                    value={fromId || ''}
                    onChange={(ev) => setFromId(Number(ev.target.value))}
                  >
                    <option value="">—</option>
                    {emplacements.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.code} — {emp.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {(typeMouvement === 'arrivee' || typeMouvement === 'changement_emplacement') && (
                <div className="space-y-2">
                  <Label>Emplacement destination</Label>
                  <select
                    className="flex h-10 w-full rounded-md border px-3 text-sm"
                    value={toId || ''}
                    onChange={(ev) => setToId(Number(ev.target.value))}
                  >
                    <option value="">—</option>
                    {emplacements.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.code} — {emp.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={dateMouvement}
                  onChange={(ev) => setDateMouvement(ev.target.value)}
                  required
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Motif</Label>
                <Input value={motif} onChange={(ev) => setMotif(ev.target.value)} />
              </div>
              {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}
              <div className="sm:col-span-2">
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enregistrer
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : (
        <DataTable columns={columns} data={items} keyExtractor={(m) => String(m.id)} />
      )}
    </div>
  );
}
