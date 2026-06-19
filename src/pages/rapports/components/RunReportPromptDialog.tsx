import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ReportFilters, ReportPrompt, ReportTemplate } from '@/shared/types/reports';
import { normalizeComposition } from '@/shared/utils/reportComposition';
import { useHotelsList } from '@/hooks/useHotelsList';

interface RunReportPromptDialogProps {
  template: ReportTemplate;
  onConfirm: (filters: ReportFilters) => void;
  onCancel: () => void;
}

export function RunReportPromptDialog({ template, onConfirm, onCancel }: RunReportPromptDialogProps) {
  const { hotels } = useHotelsList();
  const composition = template.filters.composition;
  const prompts = composition ? normalizeComposition(composition).prompts : [];
  const [filters, setFilters] = useState<ReportFilters>({ ...template.filters });

  const setPromptValue = (type: ReportPrompt['type'], value: unknown) => {
    if (type === 'hotel') setFilters((f) => ({ ...f, hotelId: value as number | null }));
    if (type === 'dateFrom') setFilters((f) => ({ ...f, dateFrom: value as string | null }));
    if (type === 'dateTo') setFilters((f) => ({ ...f, dateTo: value as string | null }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-background p-6 shadow-xl space-y-4">
        <h3 className="font-semibold">Invites — {template.name}</h3>
        <p className="text-sm text-muted-foreground">Paramètres demandés à l&apos;exécution (style Cognos)</p>
        {prompts.map((p) => (
          <div key={p.id}>
            <Label>{p.label}{p.required ? ' *' : ''}</Label>
            {p.type === 'hotel' ? (
              <select className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" value={filters.hotelId ?? ''}
                onChange={(e) => setPromptValue('hotel', e.target.value ? Number(e.target.value) : null)}>
                <option value="">—</option>
                {hotels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            ) : (
              <Input type="date" className="mt-1" value={(p.type === 'dateFrom' ? filters.dateFrom : filters.dateTo) ?? ''}
                onChange={(e) => setPromptValue(p.type, e.target.value || null)} />
            )}
          </div>
        ))}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onCancel}>Annuler</Button>
          <Button onClick={() => onConfirm({ ...filters, composition: template.filters.composition })}>Exécuter</Button>
        </div>
      </div>
    </div>
  );
}
