import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Download,
  FileSpreadsheet,
  Trash2,
  Eye,
  Save,
  History,
  BarChart3,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { notify } from '@/lib/toast';
import { useHotelsList } from '@/hooks/useHotelsList';
import type { ExportKind } from '@/shared/types/export';
import type {
  CreateReportTemplateInput,
  ReportDataSourceMeta,
  ReportFilters,
  ReportPreviewResult,
  ReportTemplate,
} from '@/shared/types/reports';

const QUICK_EXPORTS: Array<{ kind: ExportKind; title: string; desc: string }> = [
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

function QuickExportsTab() {
  const [loading, setLoading] = useState<ExportKind | null>(null);
  const [message, setMessage] = useState('');

  const runExport = async (kind: ExportKind) => {
    setLoading(kind);
    setMessage('');
    try {
      const res = unwrapIpc(await ipcClient.export.excel(kind));
      if (res.ok && res.filePath) {
        setMessage(`Fichier enregistré : ${res.filePath}`);
        notify.success('Export terminé');
      } else {
        setMessage(res.message ?? 'Export annulé.');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur export';
      setMessage(msg);
      notify.error(msg);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div>
      {message && (
        <p className="mb-4 rounded-md bg-muted px-3 py-2 text-sm">{message}</p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {QUICK_EXPORTS.map((r) => (
          <Card key={r.kind} className="border-0 shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileSpreadsheet className="h-5 w-5 text-brand-turquoise" />
                {r.title}
              </CardTitle>
              <CardDescription>{r.desc}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button disabled={loading === r.kind} onClick={() => void runExport(r.kind)}>
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

function MyReportsTab() {
  const qc = useQueryClient();
  const [exportingId, setExportingId] = useState<number | null>(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['report-templates'],
    queryFn: async () => unwrapIpc(await ipcClient.reports.listTemplates()),
  });

  const { data: runs = [] } = useQuery({
    queryKey: ['report-runs'],
    queryFn: async () => unwrapIpc(await ipcClient.reports.listRuns(15)),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: number) => unwrapIpc(await ipcClient.reports.deleteTemplate(id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['report-templates'] });
      notify.success('Rapport supprimé');
    },
    onError: () => notify.error('Suppression impossible'),
  });

  const runExport = async (template: ReportTemplate) => {
    setExportingId(template.id);
    try {
      const res = unwrapIpc(await ipcClient.reports.exportTemplate(template.id));
      if (res.ok && res.filePath) {
        notify.success(`Export : ${res.rowCount ?? 0} lignes`);
        qc.invalidateQueries({ queryKey: ['report-runs'] });
      } else {
        notify.info(res.message ?? 'Export annulé');
      }
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Erreur export');
    } finally {
      setExportingId(null);
    }
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Chargement…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Mes modèles sauvegardés</h3>
        {templates.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Aucun rapport personnalisé. Créez-en un dans l'onglet « Créer un rapport ».
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {templates.map((t) => (
              <Card key={t.id} className="border-0 shadow-card">
                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div>
                    <p className="font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.dataSource} · {t.columns.length} colonne(s)
                      {t.isShared ? ' · Partagé' : ''}
                      {t.createdByName ? ` · par ${t.createdByName}` : ''}
                    </p>
                    {t.description && (
                      <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={exportingId === t.id}
                      onClick={() => void runExport(t)}
                    >
                      <Download className="mr-1 h-4 w-4" />
                      {exportingId === t.id ? 'Export…' : 'Exporter'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive"
                      onClick={() => {
                        if (confirm(`Supprimer le rapport « ${t.name} » ?`)) {
                          deleteMut.mutate(t.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {runs.length > 0 && (
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <History className="h-4 w-4" /> Historique récent
          </h3>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Rapport</th>
                  <th className="px-3 py-2 text-left font-medium">Par</th>
                  <th className="px-3 py-2 text-right font-medium">Lignes</th>
                  <th className="px-3 py-2 text-left font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-2">{r.templateName}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.runByName ?? '—'}</td>
                    <td className="px-3 py-2 text-right">{r.rowCount}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {new Date(r.executedAt).toLocaleString('fr-FR')}
                    </td>
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

function CreateReportTab() {
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

  const activeSource: ReportDataSourceMeta | undefined = useMemo(
    () => sources.find((s) => s.id === dataSource),
    [sources, dataSource],
  );

  const onSourceChange = (id: string) => {
    setDataSource(id);
    const src = sources.find((s) => s.id === id);
    setSelectedColumns(src ? src.columns.map((c) => c.key) : []);
    setPreview(null);
    setFilters({});
  };

  const toggleColumn = (key: string) => {
    setSelectedColumns((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
    setPreview(null);
  };

  const createMut = useMutation({
    mutationFn: async (input: CreateReportTemplateInput) =>
      unwrapIpc(await ipcClient.reports.createTemplate(input)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['report-templates'] });
      notify.success('Modèle de rapport enregistré');
      setName('');
      setDescription('');
      setDataSource('');
      setSelectedColumns([]);
      setFilters({});
      setIsShared(false);
      setPreview(null);
    },
    onError: (e: Error) => notify.error(e.message || 'Erreur enregistrement'),
  });

  const runPreview = async () => {
    if (!dataSource || selectedColumns.length === 0) {
      notify.error('Sélectionnez une source et au moins une colonne');
      return;
    }
    setPreviewLoading(true);
    try {
      const res = unwrapIpc(
        await ipcClient.reports.preview(dataSource, selectedColumns, filters),
      );
      setPreview(res);
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Erreur aperçu');
    } finally {
      setPreviewLoading(false);
    }
  };

  const runAdHocExport = async () => {
    if (!dataSource || selectedColumns.length === 0) return;
    setExportLoading(true);
    try {
      const res = unwrapIpc(
        await ipcClient.reports.exportAdHoc(
          dataSource,
          selectedColumns,
          filters,
          name || 'rapport',
        ),
      );
      if (res.ok) {
        notify.success(`Export : ${res.rowCount ?? 0} lignes`);
      } else {
        notify.info(res.message ?? 'Export annulé');
      }
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Erreur export');
    } finally {
      setExportLoading(false);
    }
  };

  const saveTemplate = () => {
    if (!name.trim()) {
      notify.error('Nom du rapport requis');
      return;
    }
    if (!dataSource || selectedColumns.length === 0) {
      notify.error('Source et colonnes requises');
      return;
    }
    createMut.mutate({
      name: name.trim(),
      description: description.trim() || null,
      dataSource,
      columns: selectedColumns,
      filters,
      isShared,
      hotelId: filters.hotelId ?? null,
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <Card className="border-0 shadow-card">
          <CardHeader>
            <CardTitle className="text-base">1. Informations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="report-name">Nom du rapport</Label>
              <Input
                id="report-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex. Recettes mensuelles hôtel A"
              />
            </div>
            <div>
              <Label htmlFor="report-desc">Description (optionnel)</Label>
              <Textarea
                id="report-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={isShared} onCheckedChange={(v) => setIsShared(Boolean(v))} />
              Partager avec les utilisateurs autorisés
            </label>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-card">
          <CardHeader>
            <CardTitle className="text-base">2. Source de données</CardTitle>
            <CardDescription>
              Seules les sources accessibles selon vos droits sont proposées.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sources.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune source disponible pour votre profil.</p>
            ) : (
              <div className="space-y-2">
                {sources.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onSourceChange(s.id)}
                    className={`w-full rounded-lg border p-3 text-left transition-colors ${
                      dataSource === s.id
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <p className="font-medium">{s.label}</p>
                    <p className="text-xs text-muted-foreground">{s.description}</p>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {activeSource && (
          <>
            <Card className="border-0 shadow-card">
              <CardHeader>
                <CardTitle className="text-base">3. Colonnes</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-2">
                {activeSource.columns.map((col) => (
                  <label key={col.key} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={selectedColumns.includes(col.key)}
                      onCheckedChange={() => toggleColumn(col.key)}
                    />
                    {col.label}
                  </label>
                ))}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-card">
              <CardHeader>
                <CardTitle className="text-base">4. Filtres</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {activeSource.supportsHotelFilter && (
                  <div>
                    <Label>Hôtel</Label>
                    <select
                      className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={filters.hotelId ?? ''}
                      onChange={(e) =>
                        setFilters((f) => ({
                          ...f,
                          hotelId: e.target.value ? Number(e.target.value) : null,
                        }))
                      }
                    >
                      <option value="">Tous (selon vos droits)</option>
                      {hotels.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {activeSource.supportsDateFilter && (
                  <>
                    <div>
                      <Label>Date début</Label>
                      <Input
                        type="date"
                        value={filters.dateFrom ?? ''}
                        onChange={(e) =>
                          setFilters((f) => ({ ...f, dateFrom: e.target.value || null }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Date fin</Label>
                      <Input
                        type="date"
                        value={filters.dateTo ?? ''}
                        onChange={(e) =>
                          setFilters((f) => ({ ...f, dateTo: e.target.value || null }))
                        }
                      />
                    </div>
                  </>
                )}
                {activeSource.supportsStatutFilter && activeSource.statutOptions && (
                  <div>
                    <Label>Statut</Label>
                    <select
                      className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={filters.statut ?? ''}
                      onChange={(e) =>
                        setFilters((f) => ({ ...f, statut: e.target.value || null }))
                      }
                    >
                      <option value="">Tous</option>
                      {activeSource.statutOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={!dataSource || previewLoading} onClick={() => void runPreview()}>
            <Eye className="mr-2 h-4 w-4" />
            {previewLoading ? 'Aperçu…' : 'Aperçu'}
          </Button>
          <Button variant="outline" disabled={!dataSource || exportLoading} onClick={() => void runAdHocExport()}>
            <Download className="mr-2 h-4 w-4" />
            {exportLoading ? 'Export…' : 'Exporter sans sauvegarder'}
          </Button>
          <Button disabled={!name.trim() || createMut.isPending} onClick={saveTemplate}>
            <Save className="mr-2 h-4 w-4" />
            {createMut.isPending ? 'Enregistrement…' : 'Enregistrer le modèle'}
          </Button>
        </div>
      </div>

      <div>
        <Card className="border-0 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-5 w-5 text-brand-turquoise" />
              Aperçu des données
            </CardTitle>
            {preview && (
              <CardDescription>
                {preview.totalRows} ligne(s) au total
                {preview.truncated ? ` — affichage limité à ${preview.rows.length}` : ''}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {!preview ? (
              <p className="text-sm text-muted-foreground">
                Cliquez sur « Aperçu » pour visualiser les données avant export.
              </p>
            ) : preview.rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune donnée pour ces critères.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      {preview.columns.map((c) => (
                        <th key={c.key} className="px-2 py-1.5 text-left font-medium">
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row, i) => (
                      <tr key={i} className="border-b border-muted/30">
                        {preview.columns.map((c) => (
                          <td key={c.key} className="px-2 py-1.5 text-muted-foreground">
                            {String(row[c.key] ?? '—')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function RapportsPage() {
  return (
    <div>
      <PageHeader
        title="Rapports & exports"
        description="Créez des rapports personnalisés selon vos droits d'accès, ou lancez des exports rapides."
      />
      <Tabs defaultValue="create" className="space-y-4">
        <TabsList>
          <TabsTrigger value="create">Créer un rapport</TabsTrigger>
          <TabsTrigger value="mine">Mes rapports</TabsTrigger>
          <TabsTrigger value="quick">Exports rapides</TabsTrigger>
        </TabsList>
        <TabsContent value="create">
          <CreateReportTab />
        </TabsContent>
        <TabsContent value="mine">
          <MyReportsTab />
        </TabsContent>
        <TabsContent value="quick">
          <QuickExportsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
