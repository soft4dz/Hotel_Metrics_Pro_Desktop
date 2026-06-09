import { useState } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import type { ExportKind } from '@/shared/types/export';

const REPORTS: Array<{ kind: ExportKind; title: string; desc: string }> = [
  {
    kind: 'recettes_historique',
    title: 'Recettes journalières',
    desc: 'Export Excel des lignes de recettes (5000 max)',
  },
  {
    kind: 'port_factures',
    title: 'Factures port',
    desc: 'Liste des factures avec encaissements',
  },
  {
    kind: 'port_creances',
    title: 'Créances port',
    desc: 'Factures avec reste à payer',
  },
  {
    kind: 'port_contrats',
    title: 'Contrats d\'amarrage',
    desc: 'État des contrats portuaires',
  },
];

export function RapportsPage() {  const [loading, setLoading] = useState<ExportKind | null>(null);
  const [message, setMessage] = useState('');

  const runExport = async (kind: ExportKind) => {
    setLoading(kind);
    setMessage('');
    try {
      const res = unwrapIpc(await ipcClient.export.excel(kind));
      if (res.ok && res.filePath) {
        setMessage(`Fichier enregistré : ${res.filePath}`);
      } else {
        setMessage(res.message ?? 'Export annulé.');
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Erreur export');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Rapports & exports"
        description="Exports Excel — Phase 7"
      />
      {message && (
        <p className="mb-4 rounded-md bg-muted px-3 py-2 text-sm">{message}</p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {REPORTS.map((r) => (
          <Card key={r.kind} className="border-0 shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileSpreadsheet className="h-5 w-5 text-brand-turquoise" />
                {r.title}
              </CardTitle>
              <CardDescription>{r.desc}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                disabled={loading === r.kind}
                onClick={() => void runExport(r.kind)}
              >
                <Download className="mr-2 h-4 w-4" />
                {loading === r.kind ? 'Export…' : 'Exporter Excel'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
