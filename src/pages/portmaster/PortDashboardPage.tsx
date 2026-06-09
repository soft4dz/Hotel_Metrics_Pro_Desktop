import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Anchor,
  CheckCircle2,
  FileText,
  Loader2,
  MapPin,
  Ship,
  Users,
  Wallet,
} from 'lucide-react';
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { PageHeader } from '@/components/common/PageHeader';
import { KpiCard } from '@/components/common/KpiCard';
import { CHART } from '@/lib/chartTheme';
import { EmplacementStatutBadge } from '@/components/port/EmplacementStatutBadge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ipcClient } from '@/lib/ipcClient';
import { unwrapIpc } from '@/lib/ipcHelpers';
import { formatMoney } from '@/lib/formatters';
import type { PortDashboardDto } from '@/shared/types/portmaster';

const PIE_COLORS = CHART.series;

const alerteBorder = {
  danger: 'border-l-brand-danger',
  warning: 'border-l-brand-warning',
  info: 'border-l-brand-turquoise',
};

export function PortDashboardPage() {  const [data, setData] = useState<PortDashboardDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(unwrapIpc(await ipcClient.portmaster.dashboard()));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Chargement PortMaster…
      </p>
    );
  }

  if (error) return <p className="status-banner-error">{error}</p>;
  if (!data) return null;

  const tauxOccupation =
    data.emplacementsTotal > 0
      ? Math.round((data.emplacementsOccupes / data.emplacementsTotal) * 100)
      : 0;

  return (
    <div className="page-shell">
      <PageHeader
        title="PortMaster"
        description="Vue d'ensemble du port : emplacements, contrats, créances et alertes."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="cursor-pointer" asChild>
              <Link to="/portmaster/referentiel">
                <MapPin className="mr-2 h-4 w-4" />
                Référentiel
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="cursor-pointer" asChild>
              <Link to="/portmaster/clients">
                <Users className="mr-2 h-4 w-4" />
                Clients
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="cursor-pointer" asChild>
              <Link to="/portmaster/bateaux">
                <Ship className="mr-2 h-4 w-4" />
                Bateaux
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="cursor-pointer" asChild>
              <Link to="/portmaster/contrats">
                <FileText className="mr-2 h-4 w-4" />
                Contrats
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        <KpiCard
          title="Emplacements"
          value={`${data.emplacementsOccupes}/${data.emplacementsTotal}`}
          subtitle={`${data.emplacementsLibres} dispo. — ${tauxOccupation} % occupés`}
          icon={Anchor}
          variant="accent"
        />
        <KpiCard
          title="Contrats actifs"
          value={String(data.contratsActifs)}
          subtitle={`${data.contratsExpiresProches} expirent sous 30 j`}
          icon={FileText}
          variant="default"
        />
        <KpiCard
          title="Bateaux présents"
          value={String(data.bateauxPresents)}
          subtitle={`${data.bateauxIrreguliers} irrégulier(s)`}
          icon={Ship}
          variant={data.bateauxIrreguliers > 0 ? 'warning' : 'success'}
        />
        <KpiCard
          title="Créances"
          value={formatMoney(data.creancesClients)}
          subtitle={`Reste contrats : ${formatMoney(data.resteARecouvrer)}`}
          icon={Wallet}
          variant="warning"
        />
        <KpiCard
          title="Validations"
          value={String(data.validationsEnAttente)}
          subtitle="Contrats / files d'attente"
          icon={CheckCircle2}
          variant={data.validationsEnAttente > 0 ? 'warning' : 'default'}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <KpiCard
          title="CA facturé (cumul)"
          value={formatMoney(data.caFacture)}
          subtitle="Contrats + factures"
          icon={Wallet}
          variant="default"
        />
        <KpiCard
          title="Encaissements"
          value={formatMoney(data.encaissementsRealises)}
          subtitle={`Ce mois : ${formatMoney(data.encaissementsMois)}`}
          icon={Wallet}
          variant="success"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Alertes administratives</CardTitle>
            <CardDescription>
              Contrats, documents, créances, situations irrégulières
            </CardDescription>
          </CardHeader>
          <CardContent className="max-h-72 space-y-2 overflow-y-auto">
            {data.alertes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune alerte active.</p>
            ) : (
              data.alertes.map((a) => (
                <div
                  key={a.id}
                  className={`border-l-4 bg-white/90 px-3 py-2 text-sm ${alerteBorder[a.severite]}`}
                >
                  <span className="text-xs font-medium uppercase text-muted-foreground">
                    {a.categorie}
                  </span>
                  {a.link ? (
                    <Link to={a.link} className="mt-0.5 block hover:text-brand-turquoise">
                      {a.message}
                    </Link>
                  ) : (
                    <p className="mt-0.5">{a.message}</p>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Types de navires</CardTitle>
          </CardHeader>
          <CardContent>
            {data.repartitionTypes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune donnée.</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={data.repartitionTypes}
                    dataKey="count"
                    nameKey="type"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                  >
                    {data.repartitionTypes.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-brand-warning" />
            Plan d&apos;amarrage (synthèse)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {data.emplacements.map((e) => (
              <div
                key={e.id}
                className="rounded-lg border border-border/80 bg-white/70 px-3 py-2 text-sm backdrop-blur-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-semibold">{e.code}</span>
                  <EmplacementStatutBadge statut={e.statut} />
                </div>
                {e.bateauNom && <p className="mt-1 text-xs">{e.bateauNom}</p>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
