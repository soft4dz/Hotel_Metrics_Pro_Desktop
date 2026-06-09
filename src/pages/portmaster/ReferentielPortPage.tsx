import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { EmplacementStatutBadge } from '@/components/port/EmplacementStatutBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import type { BassinItem, EmplacementDetailItem, QuaiItem } from '@/shared/types/portmaster';

export function ReferentielPortPage() {  const [bassins, setBassins] = useState<BassinItem[]>([]);
  const [quais, setQuais] = useState<QuaiItem[]>([]);
  const [emplacements, setEmplacements] = useState<EmplacementDetailItem[]>([]);
  const [bassinId, setBassinId] = useState<number | ''>('');
  const [quaiId, setQuaiId] = useState<number | ''>('');
  const [search, setSearch] = useState('');
  const [globalSearch, setGlobalSearch] = useState('');
  const [searchResults, setSearchResults] = useState<{
    emplacements: EmplacementDetailItem[];
    bateaux: Array<{ id: number; nom: string }>;
    clients: Array<{ id: number; label: string }>;
  } | null>(null);

  const load = useCallback(async () => {
    const b = unwrapIpc(await ipcClient.portmaster.listBassins());
    setBassins(b);
    const q = unwrapIpc(
      await ipcClient.portmaster.listQuais(bassinId ? Number(bassinId) : undefined),
    );
    setQuais(q);
    const e = unwrapIpc(
      await ipcClient.portmaster.listEmplacementsDetail({
        bassinId: bassinId ? Number(bassinId) : undefined,
        quaiId: quaiId ? Number(quaiId) : undefined,
        search: search || undefined,
      }),
    );
    setEmplacements(e);
  }, [bassinId, quaiId, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const runGlobalSearch = async () => {
    if (!globalSearch.trim()) {
      setSearchResults(null);
      return;
    }
    const r = unwrapIpc(await ipcClient.portmaster.searchReferentiel(globalSearch));
    setSearchResults(r);
  };

  return (
    <div className="page-shell">
      <PageHeader
        title="Référentiel portuaire"
        description="Bassins, quais, emplacements — plan d'amarrage numérique"
        backTo="/portmaster"
      />

      <Card className="border-brand-turquoise/30 bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="h-4 w-4" />
            Recherche globale
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Input
            className="max-w-md"
            placeholder="Bassin, quai, emplacement, bateau, client…"
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void runGlobalSearch()}
          />
          <button
            type="button"
            className="rounded-md bg-brand-night px-4 py-2 text-sm text-white"
            onClick={() => void runGlobalSearch()}
          >
            Rechercher
          </button>
        </CardContent>
        {searchResults && (
          <CardContent className="border-t pt-4 text-sm">
            {searchResults.emplacements.length > 0 && (
              <p className="mb-2">
                <strong>Emplacements :</strong>{' '}
                {searchResults.emplacements.map((e) => e.code).join(', ')}
              </p>
            )}
            {searchResults.bateaux.map((b) => (
              <Link key={b.id} className="mr-3 text-brand-turquoise hover:underline" to={`/portmaster/bateaux/${b.id}`}>
                {b.nom}
              </Link>
            ))}
            {searchResults.clients.map((c) => (
              <Link key={c.id} className="mr-3 text-brand-turquoise hover:underline" to={`/portmaster/clients/${c.id}`}>
                {c.label}
              </Link>
            ))}
          </CardContent>
        )}
      </Card>

      <div className="flex flex-wrap gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Bassin</Label>
          <select
            className="h-9 rounded-md border px-2 text-sm"
            value={bassinId}
            onChange={(e) => {
              setBassinId(e.target.value ? Number(e.target.value) : '');
              setQuaiId('');
            }}
          >
            <option value="">Tous</option>
            {bassins.map((b) => (
              <option key={b.id} value={b.id}>
                {b.code} — {b.label} ({b.emplacementCount} postes)
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Quai</Label>
          <select
            className="h-9 min-w-[160px] rounded-md border px-2 text-sm"
            value={quaiId}
            onChange={(e) => setQuaiId(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">Tous</option>
            {quais.map((q) => (
              <option key={q.id} value={q.id}>
                {q.code} ({q.occupes}/{q.emplacementCount})
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Filtre emplacement</Label>
          <Input
            className="h-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Code, bateau…"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {emplacements.map((e) => (
          <Card key={e.id} className="overflow-hidden">
            <CardContent className="pt-4">
              <div className="flex justify-between">
                <span className="font-mono font-bold">{e.code}</span>
                <EmplacementStatutBadge statut={e.statut} />
              </div>
              <p className="text-xs text-muted-foreground">
                {e.bassinCode} / {e.quaiCode}
              </p>
              <p className="mt-1 text-sm">{e.label}</p>
              {e.longueurMaxM != null && (
                <p className="text-xs text-muted-foreground">L max {e.longueurMaxM} m</p>
              )}
              {e.bateauNom && (
                <p className="mt-2 rounded bg-muted/60 px-2 py-1 text-xs font-medium">{e.bateauNom}</p>
              )}
              {e.clientName && (
                <p className="text-xs text-muted-foreground">{e.clientName}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
