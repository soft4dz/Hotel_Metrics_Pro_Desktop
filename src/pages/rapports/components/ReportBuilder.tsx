import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Eye, Save, BarChart3, CheckSquare } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { notify } from '@/lib/toast';
import { useHotelsList } from '@/hooks/useHotelsList';
import type { CreateReportTemplateInput, ReportDataSourceMeta, ReportFilters, ReportPreviewResult } from '@/shared/types/reports';

interface ReportBuilderProps {
  initialSource?: ReportDataSourceMeta | null;
}

export function ReportBuilder({ initialSource }: ReportBuilderProps) {
  const qc = useQueryClient();
  const { hotels } = useHotelsList();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dataSource, setDataSource] = useState('');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [filters, setFilters] = useState<ReportFilters>({});
  const [isShared, setIsShared] = useState(false);
  const [preview, setPreview] = useState<ReportPreviewResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const { data: sources = [] } = useQuery({
    queryKey: ['report-sources'],
    queryFn: async () => unwrapIpc(await ipcClient.reports.listSources()),
  });

  useEffect(() => {
    if (initialSource) {
      setDataSource(initialSource.id);
      setSelectedColumns(initialSource.columns.map((c) => c.key));
      setPreview(null);
    }
  }, [initialSource]);

  const activeSource = useMemo(
    () => sources.find((s) => s.id === dataSource) ?? initialSource,
    [sources, dataSource, initialSource],
  );

  const onSourceChange = (id: string) => {
    setDataSource(id);
    const src = sources.find((s) => s.id === id);
    setSelectedColumns(src ? src.columns.map((c) => c.key) : []);
    setPreview(null);
    setFilters({});
  };

  const toggleColumn = (key: string) => {
    setSelectedColumns((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
    setPreview(null);
  };

  const selectAllColumns = () => {
    if (activeSource) setSelectedColumns(activeSource.columns.map((c) => c.key));
    setPreview(null);
  };

  const createMut = useMutation({
    mutationFn: async (input: CreateReportTemplateInput) => unwrapIpc(await ipcClient.reports.createTemplate(input)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['report-templates'] });
      qc.invalidateQueries({ queryKey: ['reports-overview'] });
      notify.success('Modèle enregistré');
      setName(''); setDescription(''); setPreview(null);
    },
    onError: (e: Error) => notify.error(e.message),
  });

  const runPreview = async () => {
    if (!dataSource || !selectedColumns.length) return notify.error('Source et colonnes requises');
    setPreviewLoading(true);
    try {
      setPreview(unwrapIpc(await ipcClient.reports.preview(dataSource, selectedColumns, filters)));
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setPreviewLoading(false);
    }
  };

  const runExport = async () => {
    if (!dataSource || !selectedColumns.length) return;
    setExportLoading(true);
    try {
      const res = unwrapIpc(await ipcClient.reports.exportAdHoc(dataSource, selectedColumns, filters, name || 'rapport'));
      if (res.ok) notify.success(`${res.rowCount ?? 0} lignes exportées`);
      else notify.info(res.message ?? 'Annulé');
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-5">
      <div className="xl:col-span-3 space-y-4">
        <Card className="border-0 shadow-card">
          <CardHeader><CardTitle className="text-base">Informations du rapport</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Nom *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. CA mensuel par rubrique" />
            </div>
            <div className="sm:col-span-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <Checkbox checked={isShared} onCheckedChange={(v) => setIsShared(Boolean(v))} />
              Partager avec les utilisateurs autorisés sur cette source
            </label>
          </CardContent>
        </Card>

        {!initialSource && (
          <Card className="border-0 shadow-card">
            <CardHeader>
              <CardTitle className="text-base">Source ({sources.length} disponibles)</CardTitle>
            </CardHeader>
            <CardContent className="max-h-48 overflow-y-auto space-y-1">
              {sources.map((s) => (
                <button key={s.id} type="button" onClick={() => onSourceChange(s.id)}
                  className={`w-full rounded-md px-3 py-2 text-left text-sm ${dataSource === s.id ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'}`}>
                  {s.label} <span className="text-muted-foreground">— {s.category}</span>
                </button>
              ))}
            </CardContent>
          </Card>
        )}

        {activeSource && (
          <>
            <Card className="border-0 shadow-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Colonnes ({selectedColumns.length}/{activeSource.columns.length})</CardTitle>
                <Button variant="ghost" size="sm" onClick={selectAllColumns}>
                  <CheckSquare className="mr-1 h-3 w-3" /> Tout sélectionner
                </Button>
              </CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {activeSource.columns.map((col) => (
                  <label key={col.key} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={selectedColumns.includes(col.key)} onCheckedChange={() => toggleColumn(col.key)} />
                    {col.label}
                  </label>
                ))}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-card">
              <CardHeader><CardTitle className="text-base">Filtres</CardTitle></CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {activeSource.supportsHotelFilter && (
                  <div>
                    <Label>Hôtel</Label>
                    <select className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" value={filters.hotelId ?? ''} onChange={(e) => setFilters((f) => ({ ...f, hotelId: e.target.value ? Number(e.target.value) : null }))}>
                      <option value="">Tous (selon droits)</option>
                      {hotels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                    </select>
                  </div>
                )}
                {activeSource.supportsDateFilter && (
                  <>
                    <div><Label>Date début</Label><Input type="date" value={filters.dateFrom ?? ''} onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value || null }))} /></div>
                    <div><Label>Date fin</Label><Input type="date" value={filters.dateTo ?? ''} onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value || null }))} /></div>
                  </>
                )}
                {activeSource.supportsMoisFilter && (
                  <>
                    <div><Label>Année</Label><Input type="number" value={filters.annee ?? ''} onChange={(e) => setFilters((f) => ({ ...f, annee: e.target.value ? Number(e.target.value) : null }))} /></div>
                    <div><Label>Mois</Label><Input type="number" min={1} max={12} value={filters.mois ?? ''} onChange={(e) => setFilters((f) => ({ ...f, mois: e.target.value ? Number(e.target.value) : null }))} /></div>
                  </>
                )}
                {activeSource.supportsPeriodeFilter && (
                  <div><Label>Période (YYYY-MM)</Label><Input value={filters.periode ?? ''} onChange={(e) => setFilters((f) => ({ ...f, periode: e.target.value || null }))} /></div>
                )}
                {activeSource.supportsStatutFilter && activeSource.statutOptions && (
                  <div>
                    <Label>Statut</Label>
                    <select className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" value={filters.statut ?? ''} onChange={(e) => setFilters((f) => ({ ...f, statut: e.target.value || null }))}>
                      <option value="">Tous</option>
                      {activeSource.statutOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                )}
                {activeSource.supportsCategorieFilter && activeSource.categorieOptions && (
                  <div>
                    <Label>Catégorie</Label>
                    <select className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" value={filters.categorie ?? ''} onChange={(e) => setFilters((f) => ({ ...f, categorie: e.target.value || null }))}>
                      <option value="">Toutes</option>
                      {activeSource.categorieOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={!dataSource || previewLoading} onClick={() => void runPreview()}>
            <Eye className="mr-2 h-4 w-4" />{previewLoading ? 'Aperçu…' : 'Aperçu'}
          </Button>
          <Button variant="outline" disabled={!dataSource || exportLoading} onClick={() => void runExport()}>
            <Download className="mr-2 h-4 w-4" />{exportLoading ? 'Export…' : 'Exporter'}
          </Button>
          <Button disabled={!name.trim() || createMut.isPending} onClick={() => createMut.mutate({
            name: name.trim(), description: description.trim() || null, dataSource, columns: selectedColumns,
            filters, isShared, hotelId: filters.hotelId ?? null,
          })}>
            <Save className="mr-2 h-4 w-4" />{createMut.isPending ? 'Enregistrement…' : 'Sauvegarder modèle'}
          </Button>
        </div>
      </div>

      <Card className="border-0 shadow-card xl:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-5 w-5 text-brand-turquoise" />
            Aperçu {preview ? `(${preview.totalRows} lignes)` : ''}
          </CardTitle>
          {preview?.truncated && <CardDescription>Affichage limité à {preview.rows.length} lignes</CardDescription>}
        </CardHeader>
        <CardContent>
          {!preview ? (
            <p className="text-sm text-muted-foreground">L&apos;aperçu affiche jusqu&apos;à 100 lignes avec ligne de totaux numériques.</p>
          ) : preview.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune donnée pour ces critères.</p>
          ) : (
            <div className="overflow-x-auto max-h-[60vh]">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-background">
                  <tr className="border-b">{preview.columns.map((c) => <th key={c.key} className="px-2 py-1.5 text-left font-medium whitespace-nowrap">{c.label}</th>)}</tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, i) => (
                    <tr key={i} className="border-b border-muted/30 hover:bg-muted/20">
                      {preview.columns.map((c) => <td key={c.key} className="px-2 py-1 whitespace-nowrap">{String(row[c.key] ?? '—')}</td>)}
                    </tr>
                  ))}
                  {preview.summary && (
                    <tr className="bg-primary/5 font-semibold sticky bottom-0">
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
