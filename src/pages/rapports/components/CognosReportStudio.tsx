import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDown, ArrowUp, BarChart3, Download, Eye, LayoutGrid, List, Save, Table2, Trash2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { notify } from '@/lib/toast';
import { useHotelsList } from '@/hooks/useHotelsList';
import {
  COMPOSED_REPORT_SOURCE,
  type ReportChartType,
  type ReportComposition,
  type ReportFilters,
  type ReportLayoutType,
  type ReportPreviewResult,
  type ReportPrompt,
  type SemanticFieldOption,
} from '@/shared/types/reports';
import { SemanticPackageTree, DRAG_TYPE, parseFieldDrag } from './SemanticPackageTree';
import { ReportPreviewPanel } from './ReportPreviewPanel';

type DropZone = 'rows' | 'columns' | 'measures';

const LAYOUT_OPTIONS: { id: ReportLayoutType; label: string; icon: typeof List }[] = [
  { id: 'list', label: 'Liste', icon: List },
  { id: 'crosstab', label: 'Croisé dynamique', icon: Table2 },
  { id: 'chart', label: 'Graphique', icon: BarChart3 },
];

export function CognosReportStudio() {
  const qc = useQueryClient();
  const { hotels } = useHotelsList();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rows, setRows] = useState<string[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [measures, setMeasures] = useState<string[]>([]);
  const [layout, setLayout] = useState<ReportLayoutType>('list');
  const [chartType, setChartType] = useState<ReportChartType>('bar');
  const [prompts, setPrompts] = useState<ReportPrompt[]>([]);
  const [filters, setFilters] = useState<ReportFilters>({});
  const [isShared, setIsShared] = useState(false);
  const [preview, setPreview] = useState<ReportPreviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [dragOver, setDragOver] = useState<DropZone | null>(null);

  const composition: ReportComposition = useMemo(
    () => ({ rows, columns, measures, layout, chartType, prompts }),
    [rows, columns, measures, layout, chartType, prompts],
  );

  const allDimensions = useMemo(() => [...rows, ...columns], [rows, columns]);

  const { data: catalog } = useQuery({
    queryKey: ['semantic-catalog'],
    queryFn: async () => unwrapIpc(await ipcClient.reports.semanticCatalog()),
  });

  const { data: compatible } = useQuery({
    queryKey: ['compatible-fields', allDimensions, measures],
    queryFn: async () => unwrapIpc(await ipcClient.reports.compatibleFields(allDimensions, measures)),
  });

  const compatibleFactCount = compatible?.commonFacts.length ?? 0;

  const labels = useMemo(() => {
    const map = new Map<string, string>();
    catalog?.dimensions.forEach((d) => map.set(d.id, d.label));
    catalog?.measures.forEach((m) => map.set(m.id, m.label));
    return map;
  }, [catalog]);

  const structureLabel = useMemo(() => {
    const parts = [
      ...rows.map((id) => labels.get(id) ?? id),
      ...columns.map((id) => `[${labels.get(id) ?? id}]`),
      ...measures.map((id) => labels.get(id) ?? id),
    ];
    return parts.length ? parts.join(' → ') : 'Déposez des champs dans les zones…';
  }, [rows, columns, measures, labels]);

  const canPreview = allDimensions.length > 0 && measures.length > 0
    && (layout !== 'crosstab' || (rows.length > 0 && columns.length > 0));

  const addField = useCallback((field: SemanticFieldOption, zone: DropZone) => {
    if (field.type === 'measure') {
      if (zone !== 'measures') return;
      setMeasures((m) => (m.includes(field.id) ? m : [...m, field.id]));
    } else if (zone === 'rows') {
      setRows((r) => (r.includes(field.id) ? r : [...r, field.id]));
    } else if (zone === 'columns') {
      setColumns((c) => (c.includes(field.id) ? c : [...c, field.id]));
    }
    setPreview(null);
  }, []);

  const handleDrop = (zone: DropZone, e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(null);
    const parsed = parseFieldDrag(e.dataTransfer.getData(DRAG_TYPE));
    if (!parsed) return;
    const field = [...(catalog?.dimensions ?? []), ...(catalog?.measures ?? [])].find((f) => f.id === parsed.id);
    if (!field) return;
    if (parsed.type === 'measure' && zone !== 'measures') {
      notify.error('Les mesures vont dans la zone Valeurs');
      return;
    }
    if (parsed.type === 'dimension' && zone === 'measures') {
      notify.error('Les dimensions vont en Lignes ou Colonnes');
      return;
    }
    addField(field, zone);
  };

  const togglePrompt = (type: ReportPrompt['type'], label: string) => {
    setPrompts((prev) => {
      if (prev.find((p) => p.type === type)) return prev.filter((p) => p.type !== type);
      return [...prev, { id: type, type, label, required: false }];
    });
  };

  const createMut = useMutation({
    mutationFn: async () => unwrapIpc(await ipcClient.reports.createTemplate({
      name: name.trim(),
      description: description.trim() || null,
      dataSource: COMPOSED_REPORT_SOURCE,
      composition,
      filters: { ...filters, composition },
      isShared,
      hotelId: filters.hotelId ?? null,
    })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['report-templates', 'reports-overview'] });
      notify.success('Modèle enregistré');
      setName('');
      setDescription('');
    },
    onError: (e: Error) => notify.error(e.message),
  });

  const runPreview = async () => {
    if (!canPreview) return notify.error('Complétez lignes, colonnes (si croisé) et mesures');
    setLoading(true);
    try {
      setPreview(unwrapIpc(await ipcClient.reports.previewComposed(composition, filters)));
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  const runExport = async () => {
    if (!canPreview) return;
    setExporting(true);
    try {
      const res = unwrapIpc(await ipcClient.reports.exportComposed(composition, filters, name || 'rapport'));
      if (res.ok) notify.success(`${res.rowCount ?? 0} lignes exportées`);
      else notify.info(res.message ?? 'Annulé');
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-12">
      <Card className="border-0 shadow-card xl:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <LayoutGrid className="h-4 w-4 text-brand-turquoise" />
            Package
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <SemanticPackageTree catalog={catalog} onAddField={(f, z) => addField(f, z)} />
        </CardContent>
      </Card>

      <div className="xl:col-span-5 space-y-4">
        <Card className="border-0 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Type de rapport</CardTitle>
            <div className="flex flex-wrap gap-2 pt-2">
              {LAYOUT_OPTIONS.map((opt) => (
                <Button key={opt.id} type="button" size="sm" variant={layout === opt.id ? 'default' : 'outline'}
                  onClick={() => { setLayout(opt.id); setPreview(null); }}>
                  <opt.icon className="mr-1.5 h-3.5 w-3.5" />{opt.label}
                </Button>
              ))}
            </div>
            {layout === 'chart' && (
              <div className="flex gap-2 pt-2">
                {(['bar', 'line', 'pie'] as ReportChartType[]).map((t) => (
                  <Button key={t} size="sm" variant={chartType === t ? 'secondary' : 'ghost'} onClick={() => setChartType(t)}>
                    {t === 'bar' ? 'Barres' : t === 'line' ? 'Courbes' : 'Secteurs'}
                  </Button>
                ))}
              </div>
            )}
          </CardHeader>
        </Card>

        <DropZoneCard title="Lignes" hint="Dimensions en lignes" items={rows} labels={labels}
          dragOver={dragOver === 'rows'} badge="Ligne" colorClass="bg-blue-50 dark:bg-blue-950/30"
          onDragOver={(e) => { e.preventDefault(); setDragOver('rows'); }} onDragLeave={() => setDragOver(null)}
          onDrop={(e) => handleDrop('rows', e)}
          onRemove={(i) => { setRows((r) => r.filter((_, j) => j !== i)); setPreview(null); }}
          onMove={(i, dir) => { setRows((r) => reorder(r, i, dir)); setPreview(null); }} />

        <DropZoneCard title="Colonnes" hint="En-têtes du tableau croisé" items={columns} labels={labels}
          dragOver={dragOver === 'columns'} badge="Col." colorClass="bg-violet-50 dark:bg-violet-950/30"
          onDragOver={(e) => { e.preventDefault(); setDragOver('columns'); }} onDragLeave={() => setDragOver(null)}
          onDrop={(e) => handleDrop('columns', e)}
          onRemove={(i) => { setColumns((c) => c.filter((_, j) => j !== i)); setPreview(null); }}
          onMove={(i, dir) => { setColumns((c) => reorder(c, i, dir)); setPreview(null); }} />

        <DropZoneCard title="Valeurs (mesures)" hint="CA, encaissements…" items={measures} labels={labels}
          dragOver={dragOver === 'measures'} badge="Mesure" colorClass="bg-emerald-50 dark:bg-emerald-950/30" hideReorder
          onDragOver={(e) => { e.preventDefault(); setDragOver('measures'); }} onDragLeave={() => setDragOver(null)}
          onDrop={(e) => handleDrop('measures', e)}
          onRemove={(i) => { setMeasures((m) => m.filter((_, j) => j !== i)); setPreview(null); }}
          onMove={() => {}} />

        {compatibleFactCount > 0 && (
          <p className="text-[10px] text-muted-foreground px-1">
            Sources de données impliquées : {compatibleFactCount}
          </p>
        )}

        <Card className="border-0 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Filtres & invites</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Nom du rapport</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Hôtel</Label>
              <select className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" value={filters.hotelId ?? ''}
                onChange={(e) => setFilters((f) => ({ ...f, hotelId: e.target.value ? Number(e.target.value) : null }))}>
                <option value="">Tous</option>
                {hotels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
              <PromptCheck checked={prompts.some((p) => p.type === 'hotel')} onChange={() => togglePrompt('hotel', 'Hôtel')} />
            </div>
            <div>
              <Label>Date début</Label>
              <Input type="date" value={filters.dateFrom ?? ''} onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value || null }))} />
              <PromptCheck checked={prompts.some((p) => p.type === 'dateFrom')} onChange={() => togglePrompt('dateFrom', 'Date début')} />
            </div>
            <div>
              <Label>Date fin</Label>
              <Input type="date" value={filters.dateTo ?? ''} onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value || null }))} />
              <PromptCheck checked={prompts.some((p) => p.type === 'dateTo')} onChange={() => togglePrompt('dateTo', 'Date fin')} />
            </div>
            <div className="sm:col-span-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <Checkbox checked={isShared} onCheckedChange={(v) => setIsShared(Boolean(v))} /> Partager
            </label>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={loading || !canPreview} onClick={() => void runPreview()}>
            <Eye className="mr-2 h-4 w-4" />{loading ? '…' : 'Exécuter'}
          </Button>
          <Button variant="outline" disabled={exporting || !canPreview} onClick={() => void runExport()}>
            <Download className="mr-2 h-4 w-4" />Excel
          </Button>
          <Button disabled={!name.trim() || createMut.isPending || !canPreview} onClick={() => createMut.mutate()}>
            <Save className="mr-2 h-4 w-4" />Enregistrer
          </Button>
        </div>
      </div>

      <Card className="border-0 shadow-card xl:col-span-5">
        <CardHeader>
          <CardTitle className="text-base">Résultat</CardTitle>
          <CardDescription>{structureLabel}</CardDescription>
        </CardHeader>
        <CardContent>
          <ReportPreviewPanel preview={preview} composition={composition} labels={labels} structureLabel={structureLabel} />
        </CardContent>
      </Card>
    </div>
  );
}

function reorder(arr: string[], index: number, dir: -1 | 1): string[] {
  const next = [...arr];
  const target = index + dir;
  if (target < 0 || target >= next.length) return arr;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function PromptCheck({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <label className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
      <Checkbox checked={checked} onCheckedChange={onChange} /> Invite à l&apos;exécution
    </label>
  );
}

function DropZoneCard({
  title, hint, items, labels, dragOver, onDragOver, onDragLeave, onDrop, onRemove, onMove, badge, colorClass, hideReorder,
}: {
  title: string; hint: string; items: string[]; labels: Map<string, string>; dragOver: boolean;
  onDragOver: (e: React.DragEvent) => void; onDragLeave: () => void; onDrop: (e: React.DragEvent) => void;
  onRemove: (index: number) => void; onMove: (index: number, dir: -1 | 1) => void;
  badge: string; colorClass: string; hideReorder?: boolean;
}) {
  return (
    <Card className={`border-0 shadow-card border-2 border-dashed ${dragOver ? 'border-brand-turquoise bg-brand-turquoise/5' : 'border-transparent'}`}
      onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
      <CardHeader className="py-2 px-4">
        <CardTitle className="text-sm">{title}</CardTitle>
        <CardDescription className="text-[10px]">{hint}</CardDescription>
      </CardHeader>
      <CardContent className="px-4 pb-3 min-h-[52px]">
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2">Déposez ici</p>
        ) : (
          <div className="space-y-1">
            {items.map((id, i) => (
              <div key={`${id}-${i}`} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${colorClass}`}>
                <Badge variant="muted" className="text-[9px]">{badge}</Badge>
                <span className="flex-1 text-xs font-medium truncate">{labels.get(id) ?? id}</span>
                {!hideReorder && (
                  <>
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => onMove(i, -1)} disabled={i === 0}><ArrowUp className="h-3 w-3" /></Button>
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => onMove(i, 1)} disabled={i === items.length - 1}><ArrowDown className="h-3 w-3" /></Button>
                  </>
                )}
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => onRemove(i)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
