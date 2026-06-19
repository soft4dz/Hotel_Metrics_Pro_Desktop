import { useState } from 'react';
import { Download, FileSpreadsheet, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { notify } from '@/lib/toast';
import type { ExportKind } from '@/shared/types/export';

const QUICK_EXPORTS: Array<{ kind: ExportKind; title: string; desc: string; group: string }> = [
  { kind: 'recettes_historique', title: 'Recettes journalières', desc: 'Historique complet des lignes de recettes', group: 'Finance' },
  { kind: 'port_factures', title: 'Factures port', desc: 'Factures PortMaster avec encaissements', group: 'PortMaster' },
  { kind: 'port_creances', title: 'Créances port', desc: 'Factures avec reste à payer', group: 'PortMaster' },
  { kind: 'port_contrats', title: 'Contrats d\'amarrage', desc: 'État des contrats portuaires', group: 'PortMaster' },
  { kind: 'dashboard', title: 'Tableau de bord directionnel', desc: 'Export Excel du dashboard consolidé', group: 'Pilotage' },
];

export function QuickExportsTab() {
  const [loading, setLoading] = useState<ExportKind | 'dashboard-pdf' | null>(null);

  const dashboardFilters = { annee: new Date().getFullYear(), mois: new Date().getMonth() + 1 };

  const runExport = async (kind: ExportKind) => {
    setLoading(kind);
    try {
      const res = kind === 'dashboard'
        ? unwrapIpc(await ipcClient.export.dashboardExcel(dashboardFilters))
        : unwrapIpc(await ipcClient.export.excel(kind));
      if (res.ok && res.filePath) notify.success(`Fichier : ${res.filePath}`);
      else notify.info(res.message ?? 'Annulé');
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(null);
    }
  };

  const runDashboardPdf = async () => {
    setLoading('dashboard-pdf');
    try {
      const res = unwrapIpc(await ipcClient.export.dashboardPdf(dashboardFilters));
      if (res.ok) notify.success('PDF dashboard exporté');
      else notify.info(res.message ?? 'Annulé');
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(null);
    }
  };

  const groups = [...new Set(QUICK_EXPORTS.map((e) => e.group))];

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">Exports prédéfinis en un clic — complément aux rapports personnalisés.</p>
      {groups.map((group) => (
        <div key={group}>
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">{group}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {QUICK_EXPORTS.filter((e) => e.group === group).map((r) => (
              <Card key={r.kind} className="border-0 shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileSpreadsheet className="h-5 w-5 text-brand-turquoise" />{r.title}
                  </CardTitle>
                  <CardDescription>{r.desc}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button disabled={loading === r.kind} onClick={() => void runExport(r.kind)}>
                    <Download className="mr-2 h-4 w-4" />{loading === r.kind ? 'Export…' : 'Excel'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
      <Card className="border-0 shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><LayoutDashboard className="h-5 w-5" /> Dashboard PDF</CardTitle>
          <CardDescription>Export PDF du tableau de bord directionnel</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" disabled={loading === 'dashboard-pdf'} onClick={() => void runDashboardPdf()}>
            <Download className="mr-2 h-4 w-4" />{loading === 'dashboard-pdf' ? 'Export…' : 'Exporter PDF'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
