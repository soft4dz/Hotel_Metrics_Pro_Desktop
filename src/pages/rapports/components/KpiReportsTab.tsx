import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Download, Eye } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { notify } from '@/lib/toast';
import { useHotelsList } from '@/hooks/useHotelsList';
import type { KpiReportMeta, ReportFilters, ReportPreviewResult } from '@/shared/types/reports';

export function KpiReportsTab() {
  const { hotels } = useHotelsList();
  const [selectedKpi, setSelectedKpi] = useState<KpiReportMeta | null>(null);
  const [filters, setFilters] = useState<ReportFilters>({});
  const [preview, setPreview] = useState<ReportPreviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const { data: catalog } = useQuery({
    queryKey: ['reports-catalog'],
    queryFn: async () => unwrapIpc(await ipcClient.reports.catalog()),
  });

  const kpis = catalog?.kpis ?? [];
  const byCategory = new Map<string, KpiReportMeta[]>();
  for (const k of kpis) {
    if (!byCategory.has(k.category)) byCategory.set(k.category, []);
    byCategory.get(k.category)!.push(k);
  }

  const runPreview = async () => {
    if (!selectedKpi) return;
    setLoading(true);
    try {
      setPreview(unwrapIpc(await ipcClient.reports.previewKpi(selectedKpi.id, filters)));
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Erreur aperçu');
    } finally {
      setLoading(false);
    }
  };

  const runExport = async () => {
    if (!selectedKpi) return;
    setExporting(true);
    try {
      const res = unwrapIpc(await ipcClient.reports.exportKpi(selectedKpi.id, filters));
      if (res.ok) notify.success(`Export KPI : ${res.rowCount ?? 0} lignes`);
      else notify.info(res.message ?? 'Annulé');
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Erreur export');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        {Array.from(byCategory.entries()).map(([cat, items]) => (
          <div key={cat}>
            <h3 className="mb-2 text-sm font-semibold text-muted-foreground">{cat}</h3>
            <div className="space-y-2">
              {items.map((kpi) => (
                <button
                  key={kpi.id}
                  type="button"
                  onClick={() => { setSelectedKpi(kpi); setPreview(null); }}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${selectedKpi?.id === kpi.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                >
                  <p className="flex items-center gap-2 font-medium text-sm">
                    <BarChart3 className="h-4 w-4 text-brand-turquoise" />
                    {kpi.label}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{kpi.description}</p>
                </button>
              ))}
            </div>
          </div>
        ))}

        {selectedKpi && (
          <Card className="border-0 shadow-card">
            <CardHeader><CardTitle className="text-sm">Filtres</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Hôtel</Label>
                <select className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" value={filters.hotelId ?? ''} onChange={(e) => setFilters((f) => ({ ...f, hotelId: e.target.value ? Number(e.target.value) : null }))}>
                  <option value="">Tous (selon droits)</option>
                  {hotels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </div>
              <div>
                <Label>Date début</Label>
                <Input type="date" value={filters.dateFrom ?? ''} onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value || null }))} />
              </div>
              <div>
                <Label>Date fin</Label>
                <Input type="date" value={filters.dateTo ?? ''} onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value || null }))} />
              </div>
              <div>
                <Label>Année</Label>
                <Input type="number" placeholder={String(new Date().getFullYear())} value={filters.annee ?? ''} onChange={(e) => setFilters((f) => ({ ...f, annee: e.target.value ? Number(e.target.value) : null }))} />
              </div>
              <div>
                <Label>Mois</Label>
                <Input type="number" min={1} max={12} placeholder="1-12" value={filters.mois ?? ''} onChange={(e) => setFilters((f) => ({ ...f, mois: e.target.value ? Number(e.target.value) : null }))} />
              </div>
              <div>
                <Label>Période paie (YYYY-MM)</Label>
                <Input placeholder="2025-06" value={filters.periode ?? ''} onChange={(e) => setFilters((f) => ({ ...f, periode: e.target.value || null }))} />
              </div>
            </CardContent>
          </Card>
        )}

        {selectedKpi && (
          <div className="flex gap-2">
            <Button variant="outline" disabled={loading} onClick={() => void runPreview()}>
              <Eye className="mr-2 h-4 w-4" />{loading ? 'Aperçu…' : 'Aperçu'}
            </Button>
            <Button disabled={exporting} onClick={() => void runExport()}>
              <Download className="mr-2 h-4 w-4" />{exporting ? 'Export…' : 'Exporter Excel'}
            </Button>
          </div>
        )}
      </div>

      <Card className="border-0 shadow-card">
        <CardHeader>
          <CardTitle className="text-base">{selectedKpi?.label ?? 'Aperçu KPI'}</CardTitle>
          {preview && <CardDescription>{preview.totalRows} ligne(s)</CardDescription>}
        </CardHeader>
        <CardContent>
          {!preview ? (
            <p className="text-sm text-muted-foreground">Sélectionnez un rapport synthétique et cliquez sur Aperçu.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b bg-muted/40">{preview.columns.map((c) => <th key={c.key} className="px-2 py-1.5 text-left font-medium">{c.label}</th>)}</tr></thead>
                <tbody>
                  {preview.rows.map((row, i) => (
                    <tr key={i} className="border-b border-muted/30">
                      {preview.columns.map((c) => <td key={c.key} className="px-2 py-1.5">{String(row[c.key] ?? '—')}</td>)}
                    </tr>
                  ))}
                  {preview.summary && (
                    <tr className="bg-muted/50 font-semibold">
                      {preview.columns.map((c) => <td key={c.key} className="px-2 py-1.5">{String(preview.summary![c.key] ?? '')}</td>)}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
