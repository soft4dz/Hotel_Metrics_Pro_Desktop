import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Trash2, Copy, History, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { notify } from '@/lib/toast';
import type { ReportFilters, ReportTemplate } from '@/shared/types/reports';
import { COMPOSED_REPORT_SOURCE } from '@/shared/types/reports';
import { normalizeComposition } from '@/shared/utils/reportComposition';
import { RunReportPromptDialog } from './RunReportPromptDialog';

export function MyReportsTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [exportingId, setExportingId] = useState<number | null>(null);
  const [promptTemplate, setPromptTemplate] = useState<ReportTemplate | null>(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['report-templates'],
    queryFn: async () => unwrapIpc(await ipcClient.reports.listTemplates()),
  });

  const { data: runs = [] } = useQuery({
    queryKey: ['report-runs'],
    queryFn: async () => unwrapIpc(await ipcClient.reports.listRuns(20)),
  });

  const filtered = templates.filter((t) =>
    !search.trim() || t.name.toLowerCase().includes(search.toLowerCase()) || t.dataSource.includes(search.toLowerCase()),
  );

  const deleteMut = useMutation({
    mutationFn: async (id: number) => unwrapIpc(await ipcClient.reports.deleteTemplate(id)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['report-templates'] }); notify.success('Supprimé'); },
  });

  const duplicateMut = useMutation({
    mutationFn: async (t: ReportTemplate) => unwrapIpc(await ipcClient.reports.duplicateTemplate(t.id)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['report-templates'] }); notify.success('Copie créée'); },
  });

  const runExport = async (template: ReportTemplate, overrideFilters?: ReportFilters) => {
    setExportingId(template.id);
    try {
      let res;
      if (template.dataSource === COMPOSED_REPORT_SOURCE && template.filters.composition && overrideFilters) {
        res = unwrapIpc(await ipcClient.reports.exportComposed(
          template.filters.composition,
          overrideFilters,
          template.name,
        ));
      } else {
        res = unwrapIpc(await ipcClient.reports.exportTemplate(template.id));
      }
      if (res.ok) { notify.success(`${res.rowCount ?? 0} lignes`); qc.invalidateQueries({ queryKey: ['report-runs', 'reports-overview'] }); }
      else notify.info(res.message ?? 'Annulé');
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setExportingId(null);
      setPromptTemplate(null);
    }
  };

  const startExport = (template: ReportTemplate) => {
    const prompts = template.filters.composition
      ? normalizeComposition(template.filters.composition).prompts
      : [];
    if (prompts.length) setPromptTemplate(template);
    else void runExport(template);
  };

  const formatComposition = (template: ReportTemplate) => {
    const c = template.filters.composition;
    if (!c) return `${template.dataSource} · ${template.columns.length} col.`;
    const n = normalizeComposition(c);
    const layout = n.layout === 'crosstab' ? 'Croisé' : n.layout === 'chart' ? 'Graphique' : 'Liste';
    return `${layout} · ${[...n.rows, ...n.columns, ...n.measures].join(' → ')}`;
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement…</p>;

  return (
    <div className="space-y-6">
      {promptTemplate && (
        <RunReportPromptDialog
          template={promptTemplate}
          onConfirm={(filters) => void runExport(promptTemplate, filters)}
          onCancel={() => setPromptTemplate(null)}
        />
      )}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Rechercher un modèle…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-12 text-center text-muted-foreground">Aucun modèle sauvegardé.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((t) => (
            <Card key={t.id} className="border-0 shadow-card">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{t.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t.dataSource === COMPOSED_REPORT_SOURCE && t.filters.composition
                        ? formatComposition(t)
                        : `${t.dataSource} · ${t.columns.length} col.`}
                    {t.isShared ? ' · Partagé' : ''} · {t.createdByName ?? 'Moi'}
                  </p>
                  {t.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{t.description}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" disabled={exportingId === t.id} onClick={() => startExport(t)}>
                    <Download className="mr-1 h-4 w-4" />{exportingId === t.id ? '…' : 'Export'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => duplicateMut.mutate(t)}><Copy className="h-4 w-4" /></Button>
                  <Button size="sm" variant="outline" className="text-destructive" onClick={() => confirm(`Supprimer « ${t.name} » ?`) && deleteMut.mutate(t.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {runs.length > 0 && (
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><History className="h-4 w-4" /> Historique</h3>
          <div className="overflow-x-auto rounded-lg border text-sm">
            <table className="w-full">
              <thead className="bg-muted/50"><tr>
                <th className="px-3 py-2 text-left">Rapport</th><th className="px-3 py-2 text-left">Par</th>
                <th className="px-3 py-2 text-right">Lignes</th><th className="px-3 py-2 text-left">Date</th>
              </tr></thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-2">{r.templateName}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.runByName ?? '—'}</td>
                    <td className="px-3 py-2 text-right">{r.rowCount}</td>
                    <td className="px-3 py-2 text-muted-foreground">{new Date(r.executedAt).toLocaleString('fr-FR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
