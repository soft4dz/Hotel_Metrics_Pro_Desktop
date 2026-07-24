import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader2, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { notify } from '@/lib/toast';
import type { SifecConfig } from '@/shared/types/sifec';

const inputCls = 'h-8 w-full rounded-lg border border-border/60 bg-white px-2.5 text-[13px] shadow-sm outline-none focus:border-primary/50';

export function SifecConfigPage() {
  const qc = useQueryClient();
  const { data: config, isLoading } = useQuery({
    queryKey: ['sifec-config'],
    queryFn: async () => unwrapIpc(await ipcClient.sifec.getConfig()) as SifecConfig,
  });

  const [form, setForm] = useState<Partial<SifecConfig>>({});

  useEffect(() => {
    if (config) setForm(config);
  }, [config]);

  const saveMut = useMutation({
    mutationFn: async () => unwrapIpc(await ipcClient.sifec.updateConfig({
      mode: form.mode,
      apiBaseUrl: form.apiBaseUrl,
      apiKeyRef: form.apiKeyRef,
      nifDeclarant: form.nifDeclarant,
      actif: form.actif,
    })),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sifec-config'] }); notify.success('Configuration SIFEC enregistrée'); },
    onError: (e: Error) => notify.error(e.message),
  });

  const testMut = useMutation({
    mutationFn: async () => unwrapIpc(await ipcClient.sifec.testConnection()),
    onSuccess: (r) => (r.ok ? notify.success(r.message) : notify.error(r.message)),
    onError: (e: Error) => notify.error(e.message),
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <div className="max-w-lg space-y-4 rounded-xl border bg-white p-5 shadow-sm">
      <div>
        <label className="text-xs font-medium text-muted-foreground">Mode</label>
        <select className={inputCls} value={form.mode ?? 'sandbox'} onChange={(e) => setForm({ ...form, mode: e.target.value as SifecConfig['mode'] })}>
          <option value="sandbox">Sandbox (simulation locale)</option>
          <option value="production">Production (API DGI)</option>
        </select>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">URL API DGI</label>
        <input className={inputCls} value={form.apiBaseUrl ?? ''} onChange={(e) => setForm({ ...form, apiBaseUrl: e.target.value || null })} placeholder="https://api-sifec.dgi.dz/..." />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Référence clé API (vault)</label>
        <input className={inputCls} value={form.apiKeyRef ?? ''} onChange={(e) => setForm({ ...form, apiKeyRef: e.target.value || null })} placeholder="sifec-api-key-prod" />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">NIF déclarant</label>
        <input className={inputCls} value={form.nifDeclarant ?? ''} onChange={(e) => setForm({ ...form, nifDeclarant: e.target.value || null })} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.actif ?? false} onChange={(e) => setForm({ ...form, actif: e.target.checked })} />
        Connecteur actif
      </label>
      {config?.dernierTestAt && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          {config.dernierTestOk ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : null}
          Dernier test : {config.dernierTestAt} — {config.dernierTestOk ? 'OK' : 'Échec'}
        </p>
      )}
      <div className="flex gap-2 pt-2">
        <Button size="sm" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>Enregistrer</Button>
        <Button size="sm" variant="outline" onClick={() => testMut.mutate()} disabled={testMut.isPending} className="gap-1.5">
          {testMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wifi className="h-3.5 w-3.5" />}
          Tester connexion
        </Button>
      </div>
    </div>
  );
}
