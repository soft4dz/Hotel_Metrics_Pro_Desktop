import { useCallback, useEffect, useState } from 'react';
import { BarChart3, Brain, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { KpiCard } from '@/components/common/KpiCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import type { HotelListItem } from '@/shared/types/admin';
import type { RhAiAnalysisResult, RhAiConfig, RhAiProvider } from '@/shared/types/rh';

const ALERTE_VARIANT: Record<string, 'danger' | 'warning' | 'accent' | 'muted'> = {
  critique: 'danger',
  urgent: 'warning',
  attention: 'accent',
  info: 'muted',
};

const PROVIDER_LABEL: Record<RhAiProvider, string> = {
  gemini: 'Google Gemini',
  openai: 'OpenAI',
  local: 'Analyse locale (sans IA)',
};

export function AnalyseIaTab() {
  const [config, setConfig] = useState<RhAiConfig | null>(null);
  const [hotels, setHotels] = useState<HotelListItem[]>([]);
  const [hotelId, setHotelId] = useState('');
  const [provider, setProvider] = useState<RhAiProvider | ''>('');
  const [result, setResult] = useState<RhAiAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadConfig = useCallback(async () => {
    const [cfg, htls] = await Promise.all([
      ipcClient.rh.getRhAiConfig(),
      ipcClient.hotels.list(),
    ]);
    const c = unwrapIpc(cfg);
    setConfig(c);
    setProvider(c.provider);
    setHotels(unwrapIpc(htls).filter((h) => h.isActive));
  }, []);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  const runAnalysis = async () => {
    setLoading(true);
    setError('');
    try {
      const res = unwrapIpc(
        await ipcClient.rh.generateRhAiAnalysis({
          hotelId: hotelId ? Number(hotelId) : undefined,
          provider: provider || undefined,
        }),
      );
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur analyse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-gradient-to-br from-violet-50 to-slate-50 dark:from-violet-950/30 dark:to-slate-900/50 p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-violet-100 dark:bg-violet-900/50 p-2">
            <Brain className="h-6 w-6 text-violet-700 dark:text-violet-300" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-lg">Analyses IA — aide à la décision RH</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Agrège effectifs, recettes, organisation, paie, formations, planning, PortMaster et prévisions.
              L&apos;IA produit synthèse, alertes priorisées et plan d&apos;actions.
            </p>
            {config && (
              <p className="text-xs mt-2 text-muted-foreground">
                Moteur : {PROVIDER_LABEL[config.provider]}
                {config.hasGemini && ' · Gemini configuré'}
                {config.hasOpenai && ' · OpenAI configuré'}
                {!config.hasGemini && !config.hasOpenai && ' · Ajoutez GEMINI_API_KEY ou OPENAI_API_KEY dans .env'}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <div>
            <Label>Périmètre</Label>
            <select
              className="mt-1 flex h-9 w-56 rounded-md border border-input bg-background px-3 text-sm"
              value={hotelId}
              onChange={(e) => setHotelId(e.target.value)}
            >
              <option value="">Toutes les unités</option>
              {hotels.map((h) => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Moteur IA</Label>
            <select
              className="mt-1 flex h-9 w-48 rounded-md border border-input bg-background px-3 text-sm"
              value={provider}
              onChange={(e) => setProvider(e.target.value as RhAiProvider)}
            >
              <option value="gemini" disabled={!config?.hasGemini}>Gemini</option>
              <option value="openai" disabled={!config?.hasOpenai}>OpenAI</option>
              <option value="local">Local (règles métier)</option>
            </select>
          </div>
          <Button onClick={() => void runAnalysis()} disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Lancer l&apos;analyse
          </Button>
          {result && (
            <Button variant="outline" size="sm" onClick={() => void runAnalysis()} disabled={loading}>
              <RefreshCw className="mr-1 h-4 w-4" />
              Actualiser
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {result && (
        <>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="accent">{PROVIDER_LABEL[result.provider]}</Badge>
            <span>Généré le {new Date(result.generatedAt).toLocaleString('fr-FR')}</span>
            {result.erreurIa && <span className="text-amber-700">Fallback local : {result.erreurIa}</span>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {result.indicateursCles.map((k) => (
              <KpiCard key={k.label} title={k.label} value={k.valeur} subtitle={k.tendance} icon={BarChart3} accent="primary" />
            ))}
          </div>

          <div className="rounded-lg border bg-card p-5">
            <h3 className="font-semibold mb-2">Synthèse exécutive</h3>
            <p className="text-sm leading-relaxed">{result.synthese}</p>
          </div>

          {result.alertes.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold">Alertes ({result.alertes.length})</h3>
              <div className="grid gap-3 md:grid-cols-2">
                {result.alertes.map((a, i) => (
                  <div key={i} className="rounded-lg border p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={ALERTE_VARIANT[a.niveau] ?? 'muted'}>{a.niveau}</Badge>
                      <span className="font-medium text-sm">{a.titre}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{a.description}</p>
                    <p className="text-xs font-medium text-primary">→ {a.action}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.recommandations.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold">Recommandations priorisées</h3>
              <ol className="space-y-3">
                {result.recommandations.map((r, i) => (
                  <li key={i} className="rounded-lg border p-4">
                    <div className="flex flex-wrap gap-2 items-center mb-1">
                      <Badge variant="muted">P{r.priorite}</Badge>
                      <Badge variant="accent">{r.domaine}</Badge>
                      <span className="font-medium">{r.titre}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{r.detail}</p>
                    <p className="text-xs mt-2 text-emerald-700 dark:text-emerald-400">Impact : {r.impact}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {result.markdown && (
            <div className="rounded-lg border bg-card p-5">
              <h3 className="font-semibold mb-3">Rapport détaillé</h3>
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm">
                {result.markdown}
              </div>
            </div>
          )}

          <details className="rounded-lg border p-4">
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
              Données sources (JSON agrégé)
            </summary>
            <pre className="mt-3 max-h-96 overflow-auto text-xs bg-muted/50 p-3 rounded">
              {JSON.stringify(result.context, null, 2)}
            </pre>
          </details>
        </>
      )}

      {!result && !loading && (
        <p className="text-sm text-center text-muted-foreground py-12">
          Cliquez sur « Lancer l&apos;analyse » pour obtenir un rapport de décision complet.
        </p>
      )}
    </div>
  );
}
